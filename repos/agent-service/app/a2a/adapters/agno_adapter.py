"""
Agno Framework Adapter

Transforms between A2A Protocol and Agno framework format.
"""

from typing import Dict, Any, AsyncGenerator
import json
from . import FrameworkAdapter


class AgnoAdapter(FrameworkAdapter):
    """
    Adapter for Agno framework

    Agno endpoint format:
    - Request: POST /agent with {"input": "...", "session_id": "...", "stream": false}
    - Response: {"output": "...", "metadata": {...}}
    """

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform A2A request to Agno format

        A2A format (JSON-RPC 2.0):
        {
          "jsonrpc": "2.0",
          "method": "sendMessage",
          "params": {
            "message": {
              "messageId": "...",
              "role": "user",
              "parts": [{"kind": "text", "text": "Hello"}],
              "kind": "message",
              "contextId": "...",
              "taskId": "..."
            },
            "configuration": {
              "blocking": true,
              "acceptedOutputModes": ["text/plain"]
            }
          },
          "id": "request-123"
        }

        Agno format:
        {
          "input": "Hello",
          "session_id": "...",
          "stream": false,
          "context": {...}
        }
        """
        params = a2a_request.get("params", {})
        message = params.get("message", {})
        parts = message.get("parts", [])

        # Extract text from parts
        text_parts = [p.get("text", "") for p in parts if p.get("kind") == "text"]
        input_text = " ".join(text_parts)

        # Determine session ID
        session_id = message.get("contextId") or message.get("messageId", "default")

        # Check if streaming is requested
        configuration = params.get("configuration", {})
        blocking = configuration.get("blocking", True)
        stream = not blocking  # Agno uses stream flag

        # Build Agno request
        agno_request = {
            "input": input_text,
            "session_id": session_id,
            "stream": stream
        }

        # Add optional context
        if message.get("taskId"):
            agno_request["context"] = {
                "task_id": message.get("taskId")
            }

        return agno_request

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform Agno response to A2A format

        Agno format:
        {
          "output": "Response text",
          "metadata": {
            "tokens_used": 100,
            "execution_time_ms": 500
          }
        }

        A2A format:
        {
          "jsonrpc": "2.0",
          "result": {
            "kind": "message",
            "messageId": "response-...",
            "role": "agent",
            "parts": [{"kind": "text", "text": "Response text"}],
            "metadata": {...}
          },
          "id": "request-123"
        }
        """
        output = framework_response.get("output", "")
        metadata = framework_response.get("metadata", {})
        request_id = original_request.get("id", "unknown")

        # Generate response message ID
        original_params = original_request.get("params", {})
        original_message = original_params.get("message", {})
        original_message_id = original_message.get("messageId", "unknown")
        response_message_id = f"response-{original_message_id}"

        return {
            "jsonrpc": "2.0",
            "result": {
                "kind": "message",
                "messageId": response_message_id,
                "role": "agent",
                "parts": [
                    {
                        "kind": "text",
                        "text": output
                    }
                ],
                "metadata": metadata
            },
            "id": request_id
        }

    async def stream_response(
        self,
        response_stream,
        original_request: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream Agno response chunks and transform to A2A format

        Agno streaming format (SSE):
        data: {"output": "chunk text", "done": false}
        data: {"output": "", "done": true, "metadata": {...}}

        A2A streaming format:
        Each chunk is a complete JSON-RPC 2.0 response with partial content
        """
        request_id = original_request.get("id", "unknown")
        original_params = original_request.get("params", {})
        original_message = original_params.get("message", {})
        original_message_id = original_message.get("messageId", "unknown")
        response_message_id = f"response-{original_message_id}"

        accumulated_text = ""
        chunk_index = 0

        async for line in response_stream.aiter_lines():
            # Skip empty lines
            if not line or line.strip() == "":
                continue

            # Parse SSE format
            if line.startswith("data: "):
                data_str = line[6:]  # Remove "data: " prefix

                # Handle [DONE] signal
                if data_str.strip() == "[DONE]":
                    break

                try:
                    chunk_data = json.loads(data_str)
                    output = chunk_data.get("output", "")
                    done = chunk_data.get("done", False)
                    metadata = chunk_data.get("metadata", {})

                    if output:
                        accumulated_text += output

                    # Yield A2A format chunk
                    yield {
                        "jsonrpc": "2.0",
                        "result": {
                            "kind": "message",
                            "messageId": f"{response_message_id}-chunk-{chunk_index}",
                            "role": "agent",
                            "parts": [
                                {
                                    "kind": "text",
                                    "text": output
                                }
                            ],
                            "metadata": {
                                **metadata,
                                "streaming": True,
                                "done": done,
                                "accumulated_length": len(accumulated_text)
                            }
                        },
                        "id": request_id
                    }

                    chunk_index += 1

                    if done:
                        break

                except json.JSONDecodeError:
                    # Skip invalid JSON
                    continue
