"""
Integration tests for A2A Registry endpoints
"""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import Agent, AgentFramework, AgentStatus


@pytest.mark.asyncio
class TestA2ARegistry:
    """Test A2A Registry compliant endpoints"""

    async def test_register_agent_with_agent_card(
        self, client: AsyncClient, auth_headers: dict, mock_user: dict
    ):
        """Test registering agent using AgentCard format"""
        agent_card = {
            "name": "Customer Support Bot",
            "description": "AI agent for customer support",
            "url": "http://localhost:8100/agent",
            "version": "1.0.0",
            "protocol_version": "1.0",
            "capabilities": {
                "skills": ["customer-support", "chat", "ticket-handling"]
            },
            "preferred_transport": "JSONRPC",
            "visibility": "public"
        }

        response = await client.post(
            "/api/agents",
            json={"agent_card": agent_card},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "agent_id" in data
        assert data["message"] == "Agent registered successfully"


    async def test_register_agent_missing_required_fields(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test agent registration fails with missing required fields"""
        incomplete_agent_card = {
            "name": "Incomplete Agent",
            "description": "Missing required fields"
            # Missing: url, version, protocol_version
        }

        response = await client.post(
            "/api/agents",
            json={"agent_card": incomplete_agent_card},
            headers=auth_headers
        )

        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert "missing" in data["error"].lower()


    async def test_list_agents_from_registry(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test listing agents from registry"""
        # Create test agents
        agents = [
            Agent(
                name=f"Registry Agent {i}",
                description=f"Agent {i}",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            )
            for i in range(5)
        ]

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # List agents
        response = await client.get(
            "/api/agents",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        assert len(data["agents"]) == 5

        # Verify AgentCard format
        for agent_card in data["agents"]:
            assert "name" in agent_card
            assert "description" in agent_card
            assert "url" in agent_card
            assert "version" in agent_card
            assert "protocol_version" in agent_card


    async def test_list_agents_with_visibility_filter(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test listing agents with visibility filter"""
        # Create agents with different visibility
        agents = [
            Agent(
                name="Public Agent",
                description="Public",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            ),
            Agent(
                name="Private Agent",
                description="Private",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["chat"]},
                visibility="private",
                owner_id="testuser",
                health_status="healthy"
            ),
        ]

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # Query public agents only
        response = await client.get(
            "/api/agents?visibility=public",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["agents"]) == 1
        assert data["agents"][0]["name"] == "Public Agent"


    async def test_get_agent_by_id(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test getting a specific agent by ID"""
        # Create test agent
        agent = Agent(
            name="Specific Agent",
            description="Test agent",
            framework=AgentFramework.AGNO,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8100/agent",
            capabilities={"skills": ["analysis"]},
            visibility="public",
            owner_id="testuser",
            health_status="healthy"
        )
        test_db.add(agent)
        await test_db.commit()
        await test_db.refresh(agent)

        # Get agent by ID
        response = await client.get(
            f"/api/agents/{agent.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "agent_card" in data
        agent_card = data["agent_card"]
        assert agent_card["name"] == "Specific Agent"
        assert agent_card["description"] == "Test agent"


    async def test_get_nonexistent_agent(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test getting a non-existent agent returns 404"""
        response = await client.get(
            "/api/agents/99999",
            headers=auth_headers
        )

        assert response.status_code == 404
        data = response.json()
        assert "error" in data


    async def test_unregister_agent(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession, mock_user: dict
    ):
        """Test unregistering (deleting) an agent"""
        # Create agent owned by current user
        agent = Agent(
            name="Agent to Delete",
            description="Will be deleted",
            framework=AgentFramework.LANGCHAIN,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8100/agent",
            capabilities={"skills": ["chat"]},
            visibility="public",
            owner_id=mock_user["username"],
            health_status="healthy"
        )
        test_db.add(agent)
        await test_db.commit()
        await test_db.refresh(agent)

        # Delete the agent
        response = await client.delete(
            f"/api/agents/{agent.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "unregistered" in data["message"].lower()


    async def test_unregister_agent_not_owner(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test that non-owner cannot unregister an agent"""
        # Create agent owned by someone else
        agent = Agent(
            name="Other's Agent",
            description="Owned by other user",
            framework=AgentFramework.LANGCHAIN,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8100/agent",
            capabilities={"skills": ["chat"]},
            visibility="public",
            owner_id="otheruser",
            health_status="healthy"
        )
        test_db.add(agent)
        await test_db.commit()
        await test_db.refresh(agent)

        # Try to delete
        response = await client.delete(
            f"/api/agents/{agent.id}",
            headers=auth_headers
        )

        assert response.status_code == 403
        data = response.json()
        assert "permission" in data["error"].lower() or "not allowed" in data["error"].lower()


    async def test_search_agents(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test searching agents"""
        # Create test agents
        agents = [
            Agent(
                name="Python Coding Agent",
                description="Helps with Python programming",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["python", "coding", "debugging"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            ),
            Agent(
                name="Data Analysis Agent",
                description="Analyzes data and creates visualizations",
                framework=AgentFramework.AGNO,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["data-analysis", "visualization", "python"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            ),
            Agent(
                name="Customer Support Agent",
                description="Handles customer inquiries",
                framework=AgentFramework.ADK,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["customer-service", "chat"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            ),
        ]

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # Search for "python"
        response = await client.post(
            "/api/agents/search",
            json={"query": "python"},
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "agents" in data
        # Should find 2 agents with python in skills or description
        assert len(data["agents"]) >= 2


    async def test_search_agents_with_filters(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test searching agents with additional filters"""
        # Create test agents
        agents = [
            Agent(
                name="Langchain Python Agent",
                description="Python agent using Langchain",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["python", "langchain"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            ),
            Agent(
                name="Agno Python Agent",
                description="Python agent using Agno",
                framework=AgentFramework.AGNO,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["python", "agno"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            ),
        ]

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # Search for python with framework filter
        response = await client.post(
            "/api/agents/search",
            json={
                "query": "python",
                "filters": {
                    "framework": "LANGCHAIN"
                }
            },
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["agents"]) == 1
        assert data["agents"][0]["name"] == "Langchain Python Agent"


    async def test_list_extensions(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test listing available extensions"""
        response = await client.get(
            "/api/extensions",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "extensions" in data
        # Should at least have access-control extension
        assert len(data["extensions"]) > 0


    async def test_get_extension_info(
        self, client: AsyncClient, auth_headers: dict
    ):
        """Test getting extension information"""
        response = await client.get(
            "/api/extensions/access-control",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "extension" in data
        extension = data["extension"]
        assert extension["uri"] == "access-control"
        assert "description" in extension


    async def test_get_agent_extensions(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test getting extensions for a specific agent"""
        # Create agent with access control
        agent = Agent(
            name="Protected Agent",
            description="Agent with access control",
            framework=AgentFramework.LANGCHAIN,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8100/agent",
            capabilities={"skills": ["chat"]},
            visibility="team",
            department="Engineering",
            owner_id="testuser",
            health_status="healthy"
        )
        test_db.add(agent)
        await test_db.commit()
        await test_db.refresh(agent)

        # Get agent extensions
        response = await client.get(
            f"/api/agents/{agent.id}/extensions",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "extensions" in data
        # Should include access-control extension
        extension_uris = [ext["uri"] for ext in data["extensions"]]
        assert "access-control" in extension_uris


    async def test_agent_card_format_compliance(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test that returned AgentCard format complies with A2A spec"""
        # Create agent
        agent = Agent(
            name="Compliant Agent",
            description="Tests AgentCard compliance",
            framework=AgentFramework.LANGCHAIN,
            status=AgentStatus.PRODUCTION,
            a2a_endpoint="http://localhost:8100/agent",
            capabilities={"skills": ["testing"]},
            visibility="public",
            owner_id="testuser",
            health_status="healthy"
        )
        test_db.add(agent)
        await test_db.commit()
        await test_db.refresh(agent)

        # Get agent
        response = await client.get(
            f"/api/agents/{agent.id}",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        agent_card = data["agent_card"]

        # Verify required A2A fields
        required_fields = ["name", "description", "url", "version", "protocol_version"]
        for field in required_fields:
            assert field in agent_card, f"Missing required field: {field}"

        # Verify optional fields
        assert "capabilities" in agent_card
        assert "preferred_transport" in agent_card

        # Verify Access Control extension fields
        assert "visibility" in agent_card
        assert "owner_id" in agent_card


    async def test_pagination_on_list_agents(
        self, client: AsyncClient, auth_headers: dict, test_db: AsyncSession
    ):
        """Test pagination when listing agents"""
        # Create 25 test agents
        agents = [
            Agent(
                name=f"Agent {i}",
                description=f"Agent number {i}",
                framework=AgentFramework.LANGCHAIN,
                status=AgentStatus.PRODUCTION,
                a2a_endpoint="http://localhost:8100/agent",
                capabilities={"skills": ["chat"]},
                visibility="public",
                owner_id="testuser",
                health_status="healthy"
            )
            for i in range(25)
        ]

        for agent in agents:
            test_db.add(agent)
        await test_db.commit()

        # Get first page
        response = await client.get(
            "/api/agents?page=1&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["agents"]) == 10
        assert data["total"] == 25

        # Get second page
        response = await client.get(
            "/api/agents?page=2&limit=10",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["agents"]) == 10
