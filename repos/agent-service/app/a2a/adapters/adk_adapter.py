"""
Google ADK Framework Adapter

Transforms between A2A Protocol and Google ADK format.
"""

from typing import Dict, Any, AsyncGenerator
import json
from . import FrameworkAdapter


class ADKAdapter(FrameworkAdapter):
    """
    Adapter for Google ADK framework

    ADK is natively A2A-compliant, but may use slightly different field names.
    """

    def get_endpoint_path(self) -> str:
        """
        Get the endpoint path for ADK

        ADK agent's original_endpoint is already the full URL,
        so no additional path is needed.
        """
        return ""

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform A2A request to ADK format

        Since ADK is A2A-compliant, minimal transformation is needed.
        """
        # ADK expects standard A2A format
        # Only minor adjustments if needed
        return a2a_request

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform ADK response to A2A format

        ADK returns standard A2A format, so pass through.
        """
        return framework_response

    async def stream_response(
        self,
        response_stream,
        original_request: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream ADK response chunks

        ADK is A2A-native, so streaming responses are already in A2A format.
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
                # ADK already returns A2A JSON-RPC 2.0 format
                chunk_data = json.loads(data_str)
                yield chunk_data

            except json.JSONDecodeError:
                # Skip invalid JSON
                continue
