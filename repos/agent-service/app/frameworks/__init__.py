"""
Framework adapters for different agent frameworks (Agno, ADK, Langchain, etc.)
Each adapter implements framework-specific validation and configuration logic.
"""

from app.frameworks.base import BaseFrameworkAdapter
from app.frameworks.agno import AgnoFrameworkAdapter
from app.frameworks.adk import ADKFrameworkAdapter
from app.core.database import AgentFramework

# Framework adapter registry
FRAMEWORK_ADAPTERS = {
    AgentFramework.AGNO: AgnoFrameworkAdapter,
    AgentFramework.ADK: ADKFrameworkAdapter,
    # AgentFramework.LANGCHAIN: LangchainFrameworkAdapter,  # TODO: Add when needed
    # AgentFramework.CUSTOM: CustomFrameworkAdapter,  # TODO: Add when needed
}


def get_framework_adapter(framework: AgentFramework) -> BaseFrameworkAdapter:
    """
    Get the appropriate framework adapter for the given framework.

    Args:
        framework: Agent framework type

    Returns:
        Framework adapter instance

    Raises:
        ValueError: If framework is not supported
    """
    adapter_class = FRAMEWORK_ADAPTERS.get(framework)
    if not adapter_class:
        raise ValueError(f"Unsupported framework: {framework}")
    return adapter_class()
