"""
Framework Template System

Provides pre-defined templates for known agent frameworks (Agno, ADK, Langchain).
Users can select a framework and the system automatically applies the template.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


class FormField(BaseModel):
    """Form field definition for UI"""
    name: str
    label: str
    placeholder: str
    required: bool = True
    field_type: str = "text"  # text, url, number, select


class FrameworkTemplate(BaseModel):
    """Framework-specific template configuration"""
    framework: str
    display_name: str
    description: str
    logo_url: str
    default_protocol_version: str
    endpoint_pattern: str  # Pattern for generating endpoint URL
    capabilities_template: Dict[str, Any]
    required_fields: List[FormField]


# Framework Templates Registry
FRAMEWORK_TEMPLATES: Dict[str, FrameworkTemplate] = {
    "Agno": FrameworkTemplate(
        framework="Agno",
        display_name="Agno OS",
        description="Agno framework for building agentic applications with advanced tool use",
        logo_url="/assets/frameworks/agno.svg",
        default_protocol_version="1.0",
        endpoint_pattern="{base_url}/agent",
        capabilities_template={
            "streaming": True,
            "tools": True,
            "memory": True,
            "multimodal": False
        },
        required_fields=[
            FormField(
                name="base_url",
                label="Base URL",
                placeholder="http://your-server:8100",
                field_type="url"
            ),
            FormField(
                name="agent_name",
                label="Agent Name",
                placeholder="my_agent"
            )
        ]
    ),
    "ADK": FrameworkTemplate(
        framework="ADK",
        display_name="Google ADK",
        description="Google Agent Development Kit with built-in A2A support",
        logo_url="/assets/frameworks/adk.svg",
        default_protocol_version="1.0",
        endpoint_pattern="{base_url}/a2a/{agent_name}",
        capabilities_template={
            "streaming": True,
            "tools": True,
            "extensions": True,
            "multimodal": True
        },
        required_fields=[
            FormField(
                name="base_url",
                label="Base URL",
                placeholder="http://your-server:8101",
                field_type="url"
            ),
            FormField(
                name="agent_name",
                label="Agent Name",
                placeholder="agent_name"
            )
        ]
    ),
    "Langchain": FrameworkTemplate(
        framework="Langchain",
        display_name="Langchain",
        description="Langchain agent framework for building LLM-powered applications",
        logo_url="/assets/frameworks/langchain.svg",
        default_protocol_version="1.0",
        endpoint_pattern="{base_url}/invoke",
        capabilities_template={
            "streaming": False,
            "tools": True,
            "chains": True,
            "memory": True
        },
        required_fields=[
            FormField(
                name="base_url",
                label="Base URL",
                placeholder="http://your-server:8102",
                field_type="url"
            )
        ]
    ),
    "Custom": FrameworkTemplate(
        framework="Custom",
        display_name="Custom A2A Agent",
        description="Custom A2A-compliant agent with user-defined configuration",
        logo_url="/assets/frameworks/custom.svg",
        default_protocol_version="1.0",
        endpoint_pattern="{base_url}{endpoint_path}",
        capabilities_template={},
        required_fields=[
            FormField(
                name="base_url",
                label="Base URL",
                placeholder="http://your-server:8103",
                field_type="url"
            ),
            FormField(
                name="endpoint_path",
                label="Endpoint Path",
                placeholder="/tasks/send"
            )
        ]
    )
}


def get_framework_template(framework: str) -> Optional[FrameworkTemplate]:
    """
    Get framework template by name

    Args:
        framework: Framework name (Agno, ADK, Langchain, Custom)

    Returns:
        FrameworkTemplate if found, None otherwise
    """
    return FRAMEWORK_TEMPLATES.get(framework)


def list_framework_templates() -> List[FrameworkTemplate]:
    """
    List all available framework templates

    Returns:
        List of all framework templates
    """
    return list(FRAMEWORK_TEMPLATES.values())


def apply_framework_template(
    framework: str,
    agent_card: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Apply framework template to agent card

    This function:
    1. Validates that all required fields are provided in config
    2. Generates the endpoint URL using the template pattern
    3. Merges template capabilities with user-provided capabilities
    4. Sets default protocol version

    Args:
        framework: Framework name
        agent_card: Base agent card data
        config: Framework-specific configuration

    Returns:
        Enhanced agent card with template applied

    Raises:
        ValueError: If framework is unknown or required config is missing
    """
    template = get_framework_template(framework)
    if not template:
        raise ValueError(f"Unknown framework: {framework}")

    # Validate required config
    required_field_names = [field.name for field in template.required_fields]
    missing = [key for key in required_field_names if key not in config]
    if missing:
        raise ValueError(f"Missing required configuration fields: {missing}")

    # Generate endpoint URL
    try:
        endpoint_url = template.endpoint_pattern.format(**config)
    except KeyError as e:
        raise ValueError(f"Invalid configuration: missing placeholder {e}")

    # Merge capabilities (user-provided overrides template)
    user_capabilities = agent_card.get("capabilities", {})
    merged_capabilities = {
        **template.capabilities_template,
        **user_capabilities
    }

    # Update agent card
    enhanced_card = agent_card.copy()
    enhanced_card["url"] = endpoint_url
    enhanced_card["protocol_version"] = template.default_protocol_version
    enhanced_card["capabilities"] = merged_capabilities

    # Add framework metadata
    if "metadata" not in enhanced_card:
        enhanced_card["metadata"] = {}

    enhanced_card["metadata"]["framework"] = framework
    enhanced_card["metadata"]["framework_version"] = config.get("framework_version", "unknown")

    return enhanced_card


def validate_framework_config(framework: str, config: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Validate framework configuration

    Args:
        framework: Framework name
        config: Configuration to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    template = get_framework_template(framework)
    if not template:
        return False, f"Unknown framework: {framework}"

    # Check required fields
    required_field_names = [field.name for field in template.required_fields]
    missing = [key for key in required_field_names if key not in config]

    if missing:
        return False, f"Missing required fields: {', '.join(missing)}"

    # Validate URL fields
    for field in template.required_fields:
        if field.field_type == "url":
            url_value = config.get(field.name, "")
            if not url_value.startswith(("http://", "https://")):
                return False, f"Field '{field.name}' must be a valid URL starting with http:// or https://"

    return True, None
