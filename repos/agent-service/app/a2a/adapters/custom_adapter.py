"""
Custom Framework Adapter

Pass-through adapter for custom A2A-compliant agents.
"""

from typing import Dict, Any, AsyncGenerator
import json
from . import FrameworkAdapter


class CustomAdapter(FrameworkAdapter):
    """
    Pass-through adapter for custom A2A-compliant agents

    Assumes the custom agent already implements A2A Protocol correctly.
    """

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        No transformation needed for A2A-compliant agents
        """
        return a2a_request

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        No transformation needed for A2A-compliant agents
        """
        return framework_response

    async def stream_response(
        self,
        response_stream,
        original_request: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream Custom A2A agent response chunks

        Custom agents implement A2A Protocol, so responses are already in A2A format.
        Simply parse and forward each chunk.
        """
        async for line in response_stream.aiter_lines():
            if not line or line.strip() == "":
                continue

            # Remove "data: " prefix if present (SSE format)
            data_str = line[6:] if line.startswith("data: ") else line

            # Handle [DONE] signal
            if data_str.strip() == "[DONE]":
                break

            try:
                # Custom agents return A2A JSON-RPC 2.0 format
                chunk_data = json.loads(data_str)
                yield chunk_data

            except json.JSONDecodeError:
                # Skip invalid JSON
                continue
