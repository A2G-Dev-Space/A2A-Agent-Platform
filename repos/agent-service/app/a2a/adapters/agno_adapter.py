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
    - Team-based: POST /teams/{team_id}/runs
    - Agent-based: POST /agents/{agent_id}/runs
    - Request: multipart/form-data with message, stream, monitor, user_id
    - Response: {"content": "...", "metrics": {...}}
    """

    def get_endpoint_path(self, resource_type: str = None, resource_id: str = None) -> str:
        """
        Get the endpoint path for Agno

        Agno uses dynamic endpoints based on team or agent:
        - /teams/{team_id}/runs
        - /agents/{agent_id}/runs
        - /runs (fallback)

        Args:
            resource_type: "team" or "agent"
            resource_id: team_id or agent_id

        Returns:
            Endpoint path
        """
        if resource_type == "team" and resource_id:
            return f"/teams/{resource_id}/runs"
        elif resource_type == "agent" and resource_id:
            return f"/agents/{resource_id}/runs"
        else:
            # Fallback to base runs endpoint
            return "/runs"

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
          "method": "message/send",
          "params": {
            "message": {
              "messageId": "...",
              "role": "user",
              "parts": [{"type": "text", "text": "Hello"}],
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

        Agno format (multipart/form-data fields):
        {
          "message": "Hello",
          "stream": "false",
          "monitor": "false",
          "user_id": "..."
        }
        """
        params = a2a_request.get("params", {})
        message = params.get("message", {})
        parts = message.get("parts", [])

        # Extract text from parts (support both "kind" and "type" fields)
        text_parts = [
            p.get("text", "")
            for p in parts
            if p.get("kind") == "text" or p.get("type") == "text"
        ]
        message_text = " ".join(text_parts)

        # Determine session ID (use contextId as user_id)
        user_id = message.get("contextId") or message.get("messageId", "a2a_user")

        # Check if streaming is requested
        configuration = params.get("configuration", {})
        blocking = configuration.get("blocking", True)
        stream = "false" if blocking else "true"

        # Build Agno form-data request
        # NOTE: Agno expects string values for form fields
        agno_request = {
            "message": message_text,
            "stream": stream,
            "monitor": "false",  # Disable monitoring for A2A
            "user_id": user_id
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
          "run_id": "...",
          "content": "Response text",
          "content_type": "str",
          "metrics": {
            "input_tokens": 100,
            "output_tokens": 50,
            "duration": 2.5
          },
          "status": "COMPLETED"
        }

        A2A format:
        {
          "jsonrpc": "2.0",
          "result": {
            "kind": "message",
            "messageId": "response-...",
            "role": "agent",
            "parts": [{"type": "text", "text": "Response text"}],
            "metadata": {...}
          },
          "id": "request-123"
        }
        """
        # Agno uses "content" field, not "output"
        content = framework_response.get("content", "")
        metrics = framework_response.get("metrics", {})
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
                        "type": "text",
                        "text": content
                    }
                ],
                "metadata": {
                    "agno_run_id": framework_response.get("run_id"),
                    "agno_status": framework_response.get("status"),
                    "metrics": metrics
                }
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
