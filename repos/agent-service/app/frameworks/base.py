"""
Base framework adapter interface
All framework adapters must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
import httpx


class BaseFrameworkAdapter(ABC):
    """
    Base class for framework adapters.
    Each framework (Agno, ADK, Langchain, etc.) has different API structures.
    """

    @abstractmethod
    async def validate_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """
        Validate the agent endpoint and return available resources.

        Args:
            endpoint: Agent endpoint URL

        Returns:
            Validation result dictionary containing:
            - status: "ok" or "error"
            - framework: Framework name
            - endpoint_type: Type of endpoint (e.g., "teams", "agents", "root")
            - teams: List of available teams (for Agno)
            - agents: List of available agents (for Agno)
            - error: Error message if validation failed

        Raises:
            Exception: If endpoint validation fails
        """
        pass

    @abstractmethod
    def get_chat_config(self, validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get framework-specific chat configuration.

        Args:
            validation_result: Result from validate_endpoint()

        Returns:
            Chat configuration dictionary for frontend
        """
        pass

    @abstractmethod
    def build_chat_endpoint(self, base_url: str, selected_resource: str) -> str:
        """
        Build the chat endpoint URL for this framework.

        Args:
            base_url: Agent base URL
            selected_resource: Selected team/agent/resource ID

        Returns:
            Full chat endpoint URL
        """
        pass

    def _get_validation_endpoint(self, endpoint: str) -> str:
        """
        Transform localhost to host.docker.internal for Docker environments.

        Args:
            endpoint: Original endpoint URL

        Returns:
            Transformed endpoint for validation
        """
        return endpoint.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
