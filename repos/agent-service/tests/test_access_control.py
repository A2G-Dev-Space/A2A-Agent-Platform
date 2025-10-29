"""
Unit tests for Access Control functionality
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Agent, AgentFramework, AgentStatus


@pytest.mark.asyncio
class TestAccessControl:
    """Test Access Control filtering and permissions"""

    async def test_create_agent_with_visibility_public(
        self, client: AsyncClient, auth_headers: dict, mock_user: dict
    ):
        """Test creating an agent with public visibility"""
        agent_data = {
            "name": "Public Agent",
            "description": "A public agent for everyone",
            "framework": "LANGCHAIN",
            "a2a_endpoint": "http://localhost:8080/agent",
            "capabilities": {"skills": ["chat", "search"]},
            "visibility": "public",
            "status": "DEVELOPMENT"
        }

        response = await client.post(
            "/api/agents/",
            json=agent_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Public Agent"
        assert data["visibility"] == "public"
        assert data["owner_id"] == mock_user["username"]


    async def test_create_agent_with_visibility_private(
        self, client: AsyncClient, auth_headers: dict, mock_user: dict
    ):
        """Test creating an agent with private visibility"""
        agent_data = {
            "name": "Private Agent",
            "description": "A private agent",
            "framework": "AGNO",
            "a2a_endpoint": "http://localhost:8080/agent",
            "capabilities": {"skills": ["data-analysis"]},
            "visibility": "private",
            "status": "DEVELOPMENT"
        }

        response = await client.post(
            "/api/agents/",
            json=agent_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "private"
        assert data["owner_id"] == mock_user["username"]


    async def test_create_agent_with_visibility_team(
        self, client: AsyncClient, auth_headers: dict, mock_user: dict
    ):
        """Test creating an agent with team visibility"""
        agent_data = {
            "name": "Team Agent",
            "description": "A team agent",
            "framework": "ADK",
            "a2a_endpoint": "http://localhost:8080/agent",
            "capabilities": {"skills": ["collaboration"]},
            "visibility": "team",
            "status": "DEVELOPMENT"
        }

        response = await client.post(
            "/api/agents/",
            json=agent_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["visibility"] == "team"
        assert data["department"] == mock_user["department"]


    async def test_filter_agents_by_visibility_public(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test filtering agents by public visibility"""
        # Create test agents
        agents = [
            Agent(
                name=f"Public Agent {i}",
                description="Public agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            )
            for i in range(3)
        ]

        # Add one private agent
        agents.append(Agent(
            name="Private Agent",
            description="Private agent",
            framework=AgentFramework.LANGCHAIN,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8080/agent",
            capabilities={"skills": ["chat"]},
            visibility="private",
            owner_id="testuser",
            health_status="healthy"
        ))

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # Query public agents
        response = await client.get(
            "/api/agents/?visibility=public",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        for agent in data["agents"]:
            assert agent["visibility"] == "public"


    async def test_filter_agents_only_mine(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession, mock_user: dict
    ):
        """Test filtering only user's own agents"""
        # Create agents for testuser
        my_agents = [
            Agent(
                name=f"My Agent {i}",
                description="My agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id=mock_user["username"],
                health_status="healthy"
            )
            for i in range(2)
        ]

        # Create agents for other users
        other_agents = [
            Agent(
                name=f"Other Agent {i}",
                description="Other agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id="otheruser",
                health_status="healthy"
            )
            for i in range(3)
        ]

        for agent in my_agents + other_agents:
            test_db.add(agent)
        await test_db.commit()

        # Query only my agents
        response = await client.get(
            "/api/agents/?only_mine=true",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        for agent in data["agents"]:
            assert agent["owner_id"] == mock_user["username"]


    async def test_filter_agents_by_team_visibility(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession, mock_user: dict
    ):
        """Test filtering agents by team visibility"""
        # Create team agents
        team_agents = [
            Agent(
                name=f"Team Agent {i}",
                description="Team agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="team",
                department=mock_user["department"],
                owner_id="teamlead",
                health_status="healthy"
            )
            for i in range(2)
        ]

        # Create team agents from other department
        other_team_agents = [
            Agent(
                name=f"Other Team Agent {i}",
                description="Other team agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="team",
                department="Marketing",
                owner_id="marketing_user",
                health_status="healthy"
            )
            for i in range(3)
        ]

        for agent in team_agents + other_team_agents:
            test_db.add(agent)
        await test_db.commit()

        # Query team agents
        response = await client.get(
            "/api/agents/?visibility=team",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # Should only see agents from my department
        assert data["total"] == 2
        for agent in data["agents"]:
            assert agent["department"] == mock_user["department"]


    async def test_filter_agents_by_department(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test filtering agents by department"""
        # Create agents from different departments
        departments = ["Engineering", "Product", "Marketing"]

        for dept in departments:
            for i in range(2):
                agent = Agent(
                    name=f"{dept} Agent {i}",
                    description=f"{dept} agent",
                    framework=AgentFramework.LANGCHAIN,
                    status=AgentStatus.PRODUCTION,
                    a2a_endpoint="http://localhost:8080/agent",
                    capabilities={"skills": ["chat"]},
                    visibility="public",
                    department=dept,
                    owner_id=f"{dept.lower()}_user",
                    health_status="healthy"
                )
                test_db.add(agent)

        await test_db.commit()

        # Query Engineering agents
        response = await client.get(
            "/api/agents/?department=Engineering",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 2
        for agent in data["agents"]:
            assert agent["department"] == "Engineering"


    async def test_private_agent_access_denied_for_non_owner(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test that private agents are not visible to non-owners"""
        # Create a private agent owned by someone else
        agent = Agent(
            name="Someone's Private Agent",
            description="Private agent",
            framework=AgentFramework.LANGCHAIN,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8080/agent",
            capabilities={"skills": ["chat"]},
            visibility="private",
            owner_id="otheruserr",
            health_status="healthy"
        )
        test_db.add(agent)
        await test_db.commit()
        await test_db.refresh(agent)

        # Try to access the private agent
        response = await client.get(
            f"/api/agents/{agent.id}/",
            headers=auth_headers
        )

        # Should be denied or not found (403 or 404)
        assert response.status_code in [403, 404]


    async def test_combined_filters(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession, mock_user: dict
    ):
        """Test combining multiple filters"""
        # Create various agents
        agents = [
            Agent(
                name="My Public Langchain",
                description="Agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id=mock_user["username"],
                health_status="healthy"
            ),
            Agent(
                name="My Public Agno",
                description="Agent",
                framework=AgentFramework.AGNO,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id=mock_user["username"],
                health_status="healthy"
            ),
            Agent(
                name="Other Public Langchain",
                description="Agent",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8080/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id="otheruser",
                health_status="healthy"
            ),
        ]

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # Query: only mine + framework=LANGCHAIN
        response = await client.get(
            "/api/agents/?only_mine=true&framework=LANGCHAIN",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["agents"][0]["name"] == "My Public Langchain"
