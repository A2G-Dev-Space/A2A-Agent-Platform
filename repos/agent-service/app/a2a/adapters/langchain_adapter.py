"""
Langchain Framework Adapter

Transforms between A2A Protocol and Langchain format.
"""

from typing import Dict, Any, AsyncGenerator
import json
from . import FrameworkAdapter


class LangchainAdapter(FrameworkAdapter):
    """
    Adapter for Langchain framework

    Langchain endpoint format:
    - Request: POST /invoke with {"input": {"question": "..."}, "config": {...}}
    - Response: {"output": "...", "metadata": {...}}
    """

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform A2A request to Langchain format

        A2A format → Langchain format
        """
        params = a2a_request.get("params", {})
        message = params.get("message", {})
        parts = message.get("parts", [])

        # Extract text from parts
        text_parts = [p.get("text", "") for p in parts if p.get("kind") == "text"]
        input_text = " ".join(text_parts)

        # Build Langchain request
        langchain_request = {
            "input": {
                "question": input_text
            },
            "config": {
                "metadata": {
                    "message_id": message.get("messageId", "unknown"),
                    "context_id": message.get("contextId"),
                    "task_id": message.get("taskId")
                }
            }
        }

        return langchain_request

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform Langchain response to A2A format

        Langchain format:
        {
          "output": "Response text",
          "metadata": {...}
        }

        A2A format (JSON-RPC 2.0)
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
                        "text": str(output)
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
        Stream Langchain response chunks and transform to A2A format

        Langchain streaming format (SSE or newline-delimited JSON):
        {"output": "chunk text", "metadata": {...}}
        {"output": "more text", "metadata": {...}}

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
            if not line or line.strip() == "":
                continue

            # Remove "data: " prefix if present (SSE format)
            data_str = line[6:] if line.startswith("data: ") else line

            # Handle [DONE] signal
            if data_str.strip() == "[DONE]":
                break

            try:
                chunk_data = json.loads(data_str)
                output = chunk_data.get("output", "")
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
                                "accumulated_length": len(accumulated_text)
                            }
                        },
                        "id": request_id
                    }

                    chunk_index += 1

            except json.JSONDecodeError:
                # Skip invalid JSON
                continue
