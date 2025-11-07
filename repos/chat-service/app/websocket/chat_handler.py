"""
Enhanced WebSocket handler for chat with LLM proxy integration
"""
import asyncio
import httpx
import json
import logging
from typing import Dict, Any, Optional, List
from fastapi import WebSocket
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import ChatSession, ChatMessage, async_session_maker
from app.websocket.manager import ConnectionManager
from app.llm.proxy import LLMProxy

logger = logging.getLogger(__name__)


class ChatWebSocketHandler:
    """WebSocket handler that integrates with LLM proxy for streaming chat"""

    def __init__(self, manager: ConnectionManager):
        self.manager = manager
        self.agent_service_url = "http://agent-service:8002"
        self.tracing_service_url = "http://tracing-service:8004"
        self.llm_proxy = LLMProxy()

    async def handle_connection(
        self,
        websocket: WebSocket,
        session_id: str,
        token: str  # JWT token from query param
    ):
        """Handle WebSocket connection for a chat session"""
        logger.info(f"[WebSocket] Starting connection handler for session {session_id}")

        try:
            await self.manager.connect(websocket, session_id)
            logger.info(f"[WebSocket] Manager connected for session {session_id}")

            # Get session info
            async with async_session_maker() as db:
                session = await self._get_session(db, session_id)
                if not session:
                    logger.error(f"[WebSocket] Session {session_id} not found in database")
                    await self._send_error(websocket, "Session not found")
                    return

                trace_id = session.trace_id
                agent_id = session.agent_id
                logger.info(f"[WebSocket] Session {session_id} found - trace_id: {trace_id}, agent_id: {agent_id}")

            # Send connection success message
            await websocket.send_json({
                "type": "connected",
                "session_id": session_id,
                "trace_id": trace_id
            })
            logger.info(f"[WebSocket] Sent connected message for session {session_id}")

            # Main message loop
            logger.info(f"[WebSocket] Entering message loop for session {session_id}")
            while True:
                try:
                    logger.debug(f"[WebSocket] Waiting for message from session {session_id}")
                    data = await websocket.receive_text()
                    logger.info(f"[WebSocket] Received message from session {session_id}: {data[:100]}")
                    message_data = json.loads(data)

                    if message_data.get("type") == "chat_message":
                        await self._handle_chat_message(
                            websocket,
                            session_id,
                            trace_id,
                            agent_id,
                            message_data.get("content", ""),
                            token
                        )
                    elif message_data.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except json.JSONDecodeError as e:
                    logger.warning(f"[WebSocket] Invalid JSON received for session {session_id}: {e}")
                    continue
                except Exception as inner_e:
                    logger.error(f"[WebSocket] Error in message loop for session {session_id}: {inner_e}")
                    raise

        except asyncio.CancelledError:
            logger.info(f"[WebSocket] Connection cancelled for session {session_id}")
        except Exception as e:
            logger.error(f"[WebSocket] Connection error for session {session_id}: {type(e).__name__}: {e}", exc_info=True)
            try:
                await self._send_error(websocket, str(e))
            except Exception as send_err:
                logger.error(f"[WebSocket] Failed to send error message: {send_err}")
        finally:
            logger.info(f"[WebSocket] Cleaning up connection for session {session_id}")
            self.manager.disconnect(session_id)

    async def _handle_chat_message(
        self,
        websocket: WebSocket,
        session_id: str,
        trace_id: str,
        agent_id: int,
        content: str,
        token: str
    ):
        """Handle incoming chat message and stream LLM response"""

        # 1. Get conversation history
        messages = await self._get_conversation_history(session_id)
        messages.append({"role": "user", "content": content})

        # 2. Save user message
        async with async_session_maker() as db:
            user_msg = ChatMessage(
                session_id=session_id,
                role="user",
                content=content,
                user_id="current_user"  # TODO: Extract from token
            )
            db.add(user_msg)
            await db.commit()

        # 3. Log user message to tracing
        await self._log_to_tracing(
            trace_id=trace_id,
            level="INFO",
            log_type="SYSTEM",
            message=f"User message: {content[:100]}",
            metadata={"message_length": len(content), "session_id": session_id}
        )

        # 4. Stream LLM response
        await self._send_ws_message(websocket, {
            "type": "stream_start",
            "session_id": session_id
        })

        accumulated_response = ""
        token_count = 0

        # Use Gemini for now (later we'll make this configurable from frontend)
        provider = "google"
        model_name = "gemini-2.0-flash-exp"

        try:
            # Log LLM call start
            await self._log_to_tracing(
                trace_id=trace_id,
                level="INFO",
                log_type="LLM",
                message=f"Calling LLM: {provider}/{model_name}",
                metadata={"provider": provider, "model": model_name, "session_id": session_id}
            )

            # Stream from LLM proxy (using admin's API key)
            async for text_chunk in self.llm_proxy.stream_completion(
                provider=provider,
                model_name=model_name,
                messages=messages
            ):
                accumulated_response += text_chunk
                token_count += 1

                # Send token to frontend
                await self._send_ws_message(websocket, {
                    "type": "token",
                    "content": text_chunk,
                    "index": token_count,
                    "session_id": session_id
                })

        except ValueError as e:
            # API key not found or invalid provider
            error_msg = str(e)
            logger.error(f"LLM configuration error: {error_msg}")
            await self._send_error(websocket, error_msg)
            await self._log_to_tracing(
                trace_id=trace_id,
                level="ERROR",
                log_type="SYSTEM",
                message=error_msg,
                metadata={"provider": provider, "model": model_name}
            )
            return

        except Exception as e:
            error_msg = f"Error calling LLM: {str(e)}"
            logger.error(error_msg, exc_info=True)
            await self._send_error(websocket, error_msg)
            await self._log_to_tracing(
                trace_id=trace_id,
                level="ERROR",
                log_type="SYSTEM",
                message=error_msg,
                metadata={"error": str(e), "provider": provider, "model": model_name}
            )
            return

        # 5. Save assistant message
        async with async_session_maker() as db:
            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=accumulated_response,
                user_id="system"
            )
            db.add(assistant_msg)
            await db.commit()

        # 6. Log completion
        await self._log_to_tracing(
            trace_id=trace_id,
            level="INFO",
            log_type="LLM",
            message="LLM response completed",
            metadata={
                "tokens": token_count,
                "response_length": len(accumulated_response),
                "provider": provider,
                "model": model_name
            }
        )

        # 7. Send stream end
        await self._send_ws_message(websocket, {
            "type": "stream_end",
            "session_id": session_id,
            "total_tokens": token_count
        })

    async def _get_conversation_history(self, session_id: str) -> List[Dict[str, str]]:
        """Get conversation history for context"""
        messages = []
        async with async_session_maker() as db:
            result = await db.execute(
                select(ChatMessage)
                .where(ChatMessage.session_id == session_id)
                .order_by(ChatMessage.timestamp.asc())
            )
            chat_messages = result.scalars().all()

            for msg in chat_messages:
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

        return messages

    def _build_a2a_request(self, content: str, session_id: str) -> Dict[str, Any]:
        """Build A2A JSON-RPC 2.0 request"""
        import time
        return {
            "jsonrpc": "2.0",
            "method": "sendMessage",
            "params": {
                "message": {
                    "messageId": f"msg-{session_id}-{int(time.time() * 1000)}",
                    "role": "user",
                    "parts": [
                        {
                            "kind": "text",
                            "text": content
                        }
                    ],
                    "kind": "message",
                    "contextId": session_id
                },
                "configuration": {
                    "blocking": False,  # Enable streaming
                    "acceptedOutputModes": ["text/plain"]
                }
            },
            "id": f"req-{session_id}"
        }

    async def _log_to_tracing(
        self,
        trace_id: str,
        level: str,
        log_type: str,
        message: str,
        metadata: Dict[str, Any]
    ):
        """Send log to tracing service"""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    f"{self.tracing_service_url}/api/tracing/logs",
                    json={
                        "trace_id": trace_id,
                        "service_name": "chat-service",
                        "level": level,
                        "log_type": log_type,
                        "message": message,
                        "metadata": metadata
                    }
                )
        except Exception as e:
            logger.error(f"Failed to log to tracing: {e}")

    async def _send_ws_message(self, websocket: WebSocket, data: Dict[str, Any]):
        """Send message via WebSocket"""
        try:
            await websocket.send_json(data)
        except Exception as e:
            logger.error(f"Failed to send WebSocket message: {e}")

    async def _send_error(self, websocket: WebSocket, error_msg: str):
        """Send error message"""
        try:
            await websocket.send_json({
                "type": "error",
                "error": {
                    "code": "CHAT_ERROR",
                    "message": error_msg
                }
            })
        except Exception as e:
            logger.error(f"Failed to send error message: {e}")

    async def _get_session(self, db: AsyncSession, session_id: str) -> Optional[ChatSession]:
        """Get session from database"""
        result = await db.execute(
            select(ChatSession).where(ChatSession.session_id == session_id)
        )
        return result.scalar_one_or_none()
