"""
Agno Framework Adapter
Handles Agno-specific API structure: /teams, /agents, POST /teams/{id}/runs
"""

import httpx
import logging
from typing import Dict, Any

from app.frameworks.base import BaseFrameworkAdapter

logger = logging.getLogger(__name__)


class AgnoFrameworkAdapter(BaseFrameworkAdapter):
    """
    Adapter for Agno framework.

    Agno API structure:
    - GET /teams - List all teams
    - GET /agents - List all agents (standalone)
    - POST /teams/{team_id}/runs - Execute team run
    - POST /agents/{agent_id}/runs - Execute agent run
    """

    async def validate_endpoint(self, endpoint: str) -> Dict[str, Any]:
        """
        Validate Agno endpoint by checking /teams or /agents endpoints.

        Returns teams/agents list for dropdown population.
        """
        validation_endpoint = self._get_validation_endpoint(endpoint)
        logger.info(f"[Agno] Validating endpoint: {validation_endpoint}")

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                # Try /teams first (most common for Agno)
                try:
                    teams_response = await client.get(f"{validation_endpoint}/teams")
                    if teams_response.status_code == 200:
                        teams_data = teams_response.json()
                        logger.info(f"[Agno] Found {len(teams_data)} teams")
                        return {
                            "status": "ok",
                            "framework": "Agno",
                            "endpoint_type": "teams",
                            "teams": teams_data
                        }
                except Exception as e:
                    logger.warning(f"[Agno] /teams failed: {e}")

                # Try /agents as fallback
                try:
                    agents_response = await client.get(f"{validation_endpoint}/agents")
                    if agents_response.status_code == 200:
                        agents_data = agents_response.json()
                        logger.info(f"[Agno] Found {len(agents_data)} standalone agents")
                        return {
                            "status": "ok",
                            "framework": "Agno",
                            "endpoint_type": "agents",
                            "agents": agents_data
                        }
                except Exception as e:
                    logger.warning(f"[Agno] /agents failed: {e}")

        except Exception as e:
            logger.error(f"[Agno] Validation failed: {e}")

        raise Exception("Agno endpoints (/teams, /agents) not accessible")

    def get_chat_config(self, validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get Agno chat configuration for frontend.

        Returns dropdown options and chat endpoint template.
        """
        endpoint_type = validation_result.get("endpoint_type")

        if endpoint_type == "teams":
            # Extract team info for dropdown
            teams = validation_result.get("teams", [])
            options = []
            for team in teams:
                # Agno teams structure: {"id": "team-id", "name": "Team Name", ...}
                team_id = team.get("id")
                team_name = team.get("name", team_id)
                options.append({
                    "id": team_id,
                    "label": team_name,
                    "type": "team"
                })

            return {
                "type": "dropdown",
                "label": "Select Team",
                "options": options,
                "endpoint_template": "/teams/{id}/runs"
            }

        elif endpoint_type == "agents":
            # Extract agent info for dropdown
            agents = validation_result.get("agents", [])
            options = []
            for agent in agents:
                agent_id = agent.get("id")
                agent_name = agent.get("name", agent_id)
                options.append({
                    "id": agent_id,
                    "label": agent_name,
                    "type": "agent"
                })

            return {
                "type": "dropdown",
                "label": "Select Agent",
                "options": options,
                "endpoint_template": "/agents/{id}/runs"
            }

        return {}

    def build_chat_endpoint(self, base_url: str, selected_resource: str) -> str:
        """
        Build Agno chat endpoint.

        For team: POST {base_url}/teams/{team_id}/runs
        For agent: POST {base_url}/agents/{agent_id}/runs
        """
        # Determine if it's a team or agent based on the format
        # This will be passed from frontend with type info
        # For now, default to teams (most common)
        return f"{base_url}/teams/{selected_resource}/runs"
