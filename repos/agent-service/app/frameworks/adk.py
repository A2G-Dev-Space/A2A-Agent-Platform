"""
ADK Framework Adapter
Handles ADK (Agent Development Kit) specific API structure: A2A Protocol (JSON-RPC)
"""

import httpx
import logging
from typing import Dict, Any

from app.frameworks.base import BaseFrameworkAdapter

logger = logging.getLogger(__name__)


class ADKFrameworkAdapter(BaseFrameworkAdapter):
    """
    Adapter for ADK framework.

    ADK uses A2A Protocol (JSON-RPC):
    - Single endpoint (usually /)
    - JSON-RPC 2.0 format for all operations
    - No separate teams/agents structure
    """

    async def validate_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """
        Validate ADK endpoint by checking basic connectivity.

        ADK agents typically respond to any endpoint, so we just check
        if the server is reachable.
        """
        validation_endpoint = self._get_validation_endpoint(endpoint)
        logger.info(f"[ADK] Validating endpoint: {validation_endpoint}")

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try root endpoint
                try:
                    root_response = await client.get(f"{validation_endpoint}/")
                    # 200 or 404 both indicate server is running
                    # (404 just means GET / is not implemented, which is fine for ADK)
                    if root_response.status_code in [200, 404, 405]:
                        logger.info(f"[ADK] Endpoint is accessible")
                        return {
                            "status": "ok",
                            "framework": "ADK",
                            "endpoint_type": "root"
                        }
                except Exception as e:
                    logger.warning(f"[ADK] Root endpoint failed: {e}")

        except Exception as e:
            logger.error(f"[ADK] Validation failed: {e}")

        raise Exception("ADK endpoint not accessible")

    def get_chat_config(self, validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get ADK chat configuration.

        ADK doesn't have dropdown - single endpoint for all operations.
        """
        return {
            "type": "none",  # No selection needed
            "label": "Ready to chat",
            "endpoint_template": "/"  # Single endpoint
        }

    def build_chat_endpoint(self, base_url: str, selected_resource: str = None) -> str:
        """
        Build ADK chat endpoint.

        ADK uses single endpoint (root) for all operations.
        """
        return f"{base_url}/"
