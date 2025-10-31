"""
Framework Adapters for A2A Protocol

This module provides adapters to translate between A2A Protocol and
framework-specific formats (Agno, ADK, Langchain, Custom).
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, AsyncGenerator
from enum import Enum
import json


class AgentFramework(str, Enum):
    """Supported agent frameworks"""
    AGNO = "Agno"
    ADK = "ADK"
    LANGCHAIN = "Langchain"
    CUSTOM = "Custom"


class FrameworkAdapter(ABC):
    """
    Base class for framework adapters

    Adapters are responsible for:
    1. Transforming A2A requests to framework-specific formats
    2. Transforming framework responses back to A2A formats
    """

    @abstractmethod
    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform A2A Protocol request to framework-specific format

        Args:
            a2a_request: A2A Protocol request (JSON-RPC 2.0)
            agent_card: Agent metadata for context

        Returns:
            Framework-specific request format
        """
        pass

    @abstractmethod
    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform framework response to A2A Protocol format

        Args:
            framework_response: Response from framework
            original_request: Original A2A request for context

        Returns:
            A2A Protocol response (JSON-RPC 2.0)
        """
        pass

    @abstractmethod
    async def stream_response(
        self,
        response_stream,
        original_request: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Stream framework response chunks and transform to A2A format

        Args:
            response_stream: HTTP response stream from framework endpoint
            original_request: Original A2A request (for context)

        Yields:
            A2A Protocol response chunks (JSON-RPC 2.0)
        """
        pass


def get_framework_adapter(framework: str) -> FrameworkAdapter:
    """
    Factory function to get appropriate adapter

    Args:
        framework: Framework name (Agno, ADK, Langchain, Custom)

    Returns:
        Adapter instance

    Raises:
        ValueError: If framework is unsupported
    """
    from .agno_adapter import AgnoAdapter
    from .adk_adapter import ADKAdapter
    from .langchain_adapter import LangchainAdapter
    from .custom_adapter import CustomAdapter

    adapters = {
        "Agno": AgnoAdapter(),
        "ADK": ADKAdapter(),
        "Langchain": LangchainAdapter(),
        "Custom": CustomAdapter()
    }

    adapter = adapters.get(framework)
    if not adapter:
        raise ValueError(f"Unsupported framework: {framework}")

    return adapter


__all__ = [
    "AgentFramework",
    "FrameworkAdapter",
    "get_framework_adapter"
]
