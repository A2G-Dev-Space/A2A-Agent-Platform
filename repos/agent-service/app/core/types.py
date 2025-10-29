"""
A2A Registry Type Definitions
Based on A2A Protocol specification
"""
from typing import TypedDict, Optional, Any, List


class AgentCard(TypedDict, total=False):
    """
    AgentCard following A2A specification with Access Control extensions
    """
    # Required fields (A2A spec)
    name: str  # Unique agent identifier
    description: str
    url: str  # Agent endpoint URL
    version: str
    protocol_version: str  # A2A protocol version

    # Optional fields (A2A spec)
    provider: Optional[dict[str, str]]  # {url, organization}
    documentation_url: Optional[str]
    capabilities: Optional[dict[str, Any]]
    skills: Optional[List[dict[str, Any]]]
    preferred_transport: Optional[str]  # Default: "JSONRPC"

    # Access Control extensions (custom)
    owner_id: Optional[str]  # Username of owner
    department: Optional[str]  # Department for team visibility
    visibility: Optional[str]  # public, private, team
    allowed_users: Optional[List[str]]  # Specific users with access
    is_public: Optional[bool]  # Legacy public flag


class ExtensionInfo(TypedDict):
    """Extension information with provenance"""
    uri: str
    description: str
    required: bool
    params: dict[str, Any]
    declaring_agents: List[str]
    trust_level: str  # verified, community, experimental
