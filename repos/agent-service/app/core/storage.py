"""
A2A Registry Storage Interface
Converts between AgentCard (A2A spec) and internal Agent model
"""
from typing import List, Optional, Tuple
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.types import AgentCard, ExtensionInfo
from app.core.database import Agent, AgentFramework, AgentStatus


class RegistryStorage:
    """Storage interface for A2A Registry with Access Control"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def register_agent(self, agent_card: AgentCard, current_user: dict) -> bool:
        """
        Register an agent from AgentCard

        Args:
            agent_card: A2A AgentCard specification
            current_user: Current authenticated user

        Returns:
            True if successful
        """
        # Convert AgentCard to internal Agent model
        agent = Agent(
            name=agent_card["name"],
            description=agent_card.get("description", ""),
            framework=self._extract_framework(agent_card),
            a2a_endpoint=agent_card.get("url", ""),
            capabilities=agent_card.get("capabilities", {}),
            status=AgentStatus.DEVELOPMENT,

            # Access Control fields
            owner_id=current_user.get("username"),
            department=current_user.get("department"),
            visibility=agent_card.get("visibility", "public"),
            is_public=agent_card.get("is_public", True),
            allowed_users=agent_card.get("allowed_users"),
        )

        self.db.add(agent)
        await self.db.commit()
        await self.db.refresh(agent)
        return True

    async def get_agent(self, agent_id: str, current_user: dict) -> Optional[AgentCard]:
        """
        Get agent by ID with Access Control check

        Args:
            agent_id: Agent name (unique identifier)
            current_user: Current authenticated user

        Returns:
            AgentCard if found and accessible, None otherwise
        """
        result = await self.db.execute(
            select(Agent).where(Agent.name == agent_id)
        )
        agent = result.scalar_one_or_none()

        if not agent:
            return None

        # Access Control check
        if not self._check_access(agent, current_user):
            return None

        return self._agent_to_card(agent)

    async def list_agents(
        self,
        current_user: dict,
        visibility: Optional[str] = None,
        department: Optional[str] = None,
        only_mine: bool = False
    ) -> List[AgentCard]:
        """
        List all accessible agents

        Args:
            current_user: Current authenticated user
            visibility: Filter by visibility (public, private, team)
            department: Filter by department
            only_mine: Show only user's agents

        Returns:
            List of accessible AgentCards
        """
        query = select(Agent)
        filters = []

        # Access Control filtering
        username = current_user.get("username")
        user_dept = current_user.get("department")

        if only_mine:
            filters.append(Agent.owner_id == username)
        elif visibility == "private":
            filters.append(Agent.owner_id == username)
            filters.append(Agent.visibility == "private")
        elif visibility == "team":
            filters.append(Agent.visibility == "team")
            if user_dept:
                filters.append(Agent.department == user_dept)
        elif visibility == "public":
            filters.append(Agent.visibility == "public")
        else:
            # Default: public + mine + team
            access_filters = [
                Agent.visibility == "public",
                Agent.owner_id == username,
            ]
            if user_dept:
                access_filters.append(
                    and_(
                        Agent.visibility == "team",
                        Agent.department == user_dept
                    )
                )
            filters.append(or_(*access_filters))

        # Additional filters
        if department:
            filters.append(Agent.department == department)

        if filters:
            query = query.where(and_(*filters))

        result = await self.db.execute(query)
        agents = result.scalars().all()

        return [self._agent_to_card(agent) for agent in agents]

    async def unregister_agent(self, agent_id: str, current_user: dict) -> bool:
        """
        Unregister (delete) an agent

        Args:
            agent_id: Agent name
            current_user: Current authenticated user

        Returns:
            True if successful, False if not found or unauthorized
        """
        result = await self.db.execute(
            select(Agent).where(Agent.name == agent_id)
        )
        agent = result.scalar_one_or_none()

        if not agent:
            return False

        # Only owner can delete
        if agent.owner_id != current_user.get("username"):
            return False

        await self.db.delete(agent)
        await self.db.commit()
        return True

    async def search_agents(
        self,
        query: str,
        current_user: dict
    ) -> List[AgentCard]:
        """
        Search agents by query string

        Args:
            query: Search query
            current_user: Current authenticated user

        Returns:
            List of matching AgentCards
        """
        # Simple search implementation
        # In production, this would use full-text search or vector similarity

        stmt = select(Agent).where(
            or_(
                Agent.name.ilike(f"%{query}%"),
                Agent.description.ilike(f"%{query}%")
            )
        )

        result = await self.db.execute(stmt)
        agents = result.scalars().all()

        # Filter by access control
        accessible_agents = [
            agent for agent in agents
            if self._check_access(agent, current_user)
        ]

        return [self._agent_to_card(agent) for agent in accessible_agents]

    async def update_agent_extensions(
        self,
        agent_id: str,
        extensions: List[dict]
    ) -> int:
        """
        Update agent extensions

        Args:
            agent_id: Agent name
            extensions: List of extension definitions

        Returns:
            Number of extensions processed
        """
        # Store extensions in capabilities.extensions
        result = await self.db.execute(
            select(Agent).where(Agent.name == agent_id)
        )
        agent = result.scalar_one_or_none()

        if agent:
            capabilities = agent.capabilities or {}
            capabilities["extensions"] = extensions
            agent.capabilities = capabilities
            await self.db.commit()
            return len(extensions)

        return 0

    async def get_agent_extensions(self, agent_id: str) -> List[ExtensionInfo]:
        """Get extensions used by an agent"""
        result = await self.db.execute(
            select(Agent).where(Agent.name == agent_id)
        )
        agent = result.scalar_one_or_none()

        if not agent or not agent.capabilities:
            return []

        extensions = agent.capabilities.get("extensions", [])
        return [
            ExtensionInfo(
                uri=ext.get("uri", ""),
                description=ext.get("description", ""),
                required=ext.get("required", False),
                params=ext.get("params", {}),
                declaring_agents=[agent_id],
                trust_level="community"
            )
            for ext in extensions
        ]

    async def list_extensions(
        self,
        uri_pattern: Optional[str] = None,
        declaring_agents: Optional[List[str]] = None,
        trust_levels: Optional[List[str]] = None,
        page_size: int = 100,
        page_token: Optional[str] = None
    ) -> Tuple[List[ExtensionInfo], Optional[str], int]:
        """
        List all extensions with filtering

        Returns:
            (extensions, next_page_token, total_count)
        """
        # Simple implementation - in production would need proper pagination
        result = await self.db.execute(select(Agent))
        agents = result.scalars().all()

        all_extensions = []
        for agent in agents:
            if agent.capabilities and "extensions" in agent.capabilities:
                for ext in agent.capabilities["extensions"]:
                    all_extensions.append(
                        ExtensionInfo(
                            uri=ext.get("uri", ""),
                            description=ext.get("description", ""),
                            required=ext.get("required", False),
                            params=ext.get("params", {}),
                            declaring_agents=[agent.name],
                            trust_level="community"
                        )
                    )

        # Apply filters
        if uri_pattern:
            all_extensions = [
                ext for ext in all_extensions
                if uri_pattern in ext["uri"]
            ]

        if declaring_agents:
            all_extensions = [
                ext for ext in all_extensions
                if any(agent in ext["declaring_agents"] for agent in declaring_agents)
            ]

        return all_extensions[:page_size], None, len(all_extensions)

    async def get_extension(self, uri: str) -> Optional[ExtensionInfo]:
        """Get specific extension by URI"""
        extensions, _, _ = await self.list_extensions(uri_pattern=uri)
        for ext in extensions:
            if ext["uri"] == uri:
                return ext
        return None

    async def remove_agent_from_extensions(self, agent_id: str) -> int:
        """Remove agent from all extension declarations"""
        # No-op in this implementation since extensions are stored per-agent
        return 0

    def _agent_to_card(self, agent: Agent) -> AgentCard:
        """Convert internal Agent model to AgentCard"""
        return AgentCard(
            name=agent.name,
            description=agent.description or "",
            url=agent.a2a_endpoint or "",
            version="1.0.0",  # Could be stored in capabilities
            protocol_version="0.3.0",
            capabilities=agent.capabilities,
            preferred_transport="JSONRPC",

            # Access Control fields
            owner_id=agent.owner_id,
            department=agent.department,
            visibility=agent.visibility,
            is_public=agent.is_public,
            allowed_users=agent.allowed_users,
        )

    def _extract_framework(self, agent_card: AgentCard) -> AgentFramework:
        """Extract framework from AgentCard capabilities"""
        capabilities = agent_card.get("capabilities", {})
        framework_str = capabilities.get("framework", "Custom")

        try:
            return AgentFramework[framework_str.upper()]
        except KeyError:
            return AgentFramework.CUSTOM

    def _check_access(self, agent: Agent, current_user: dict) -> bool:
        """Check if current user has access to agent"""
        username = current_user.get("username")
        user_dept = current_user.get("department")

        # Owner always has access
        if agent.owner_id == username:
            return True

        # Public agents are accessible to all
        if agent.visibility == "public":
            return True

        # Team agents are accessible to same department
        if agent.visibility == "team" and agent.department == user_dept:
            return True

        # Check allowed_users list
        if agent.allowed_users and username in agent.allowed_users:
            return True

        # Private agents only accessible to owner
        return False
