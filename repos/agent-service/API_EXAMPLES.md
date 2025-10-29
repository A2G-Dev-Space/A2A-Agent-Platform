# Agent Service API Examples

Complete guide with examples for all A2A Registry endpoints with Access Control extensions.

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your_jwt_token>
```

## Base URL

```
http://localhost:8002/api
```

---

## 1. Register Agent

Register a new agent in the registry using AgentCard format.

### Endpoint
```
POST /agents
```

### Request Body

```json
{
  "agent_card": {
    "name": "Customer Support Bot",
    "description": "AI agent for customer support inquiries",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {
      "skills": ["customer-support", "chat", "ticket-handling"],
      "languages": ["en", "ko"]
    },
    "preferred_transport": "JSONRPC",
    "visibility": "public",
    "provider": {
      "name": "Your Company",
      "url": "https://yourcompany.com"
    }
  }
}
```

### Response (200 OK)

```json
{
  "success": true,
  "agent_id": "Customer Support Bot",
  "message": "Agent registered successfully",
  "extensions_processed": 0
}
```

### cURL Example

```bash
curl -X POST "http://localhost:8002/api/agents" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_card": {
      "name": "Customer Support Bot",
      "description": "AI agent for customer support",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {"skills": ["customer-support"]},
      "preferred_transport": "JSONRPC",
      "visibility": "public"
    }
  }'
```

### Python Example

```python
import requests

url = "http://localhost:8002/api/agents"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

agent_card = {
    "name": "Customer Support Bot",
    "description": "AI agent for customer support",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {"skills": ["customer-support", "chat"]},
    "preferred_transport": "JSONRPC",
    "visibility": "public"
}

response = requests.post(url, headers=headers, json={"agent_card": agent_card})
print(response.json())
```

---

## 2. List Agents

List all agents with optional Access Control filtering.

### Endpoint
```
GET /agents
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `visibility` | string | Filter by visibility: public, private, team | `public` |
| `department` | string | Filter by department | `Engineering` |
| `only_mine` | boolean | Show only my agents | `true` |

### Examples

#### List all accessible agents
```bash
GET /api/agents
```

#### List only public agents
```bash
GET /api/agents?visibility=public
```

#### List only my agents
```bash
GET /api/agents?only_mine=true
```

#### List team agents from Engineering
```bash
GET /api/agents?visibility=team&department=Engineering
```

### Response (200 OK)

```json
{
  "agents": [
    {
      "name": "Customer Support Bot",
      "description": "AI agent for customer support",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["customer-support", "chat"]
      },
      "preferred_transport": "JSONRPC",
      "visibility": "public",
      "owner_id": "john.doe",
      "department": "Customer Success"
    },
    {
      "name": "Data Analysis Agent",
      "description": "Analyzes data and creates visualizations",
      "url": "http://localhost:8101/agent",
      "version": "1.2.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["data-analysis", "visualization", "python"]
      },
      "preferred_transport": "JSONRPC",
      "visibility": "team",
      "owner_id": "jane.smith",
      "department": "Engineering"
    }
  ],
  "count": 2
}
```

### cURL Example

```bash
curl -X GET "http://localhost:8002/api/agents?visibility=public" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Python Example

```python
import requests

url = "http://localhost:8002/api/agents"
headers = {"Authorization": f"Bearer {token}"}
params = {"visibility": "public"}

response = requests.get(url, headers=headers, params=params)
agents = response.json()["agents"]

for agent in agents:
    print(f"Agent: {agent['name']}, Visibility: {agent['visibility']}")
```

---

## 3. Get Agent by ID

Get a specific agent's details.

### Endpoint
```
GET /agents/{agent_id}
```

### Response (200 OK)

```json
{
  "agent_card": {
    "name": "Customer Support Bot",
    "description": "AI agent for customer support",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {
      "skills": ["customer-support", "chat"]
    },
    "preferred_transport": "JSONRPC",
    "visibility": "public",
    "owner_id": "john.doe",
    "department": "Customer Success"
  }
}
```

### Response (404 Not Found)

```json
{
  "detail": "Agent not found or access denied"
}
```

### cURL Example

```bash
curl -X GET "http://localhost:8002/api/agents/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. Search Agents

Search for agents by query string.

### Endpoint
```
POST /agents/search
```

### Request Body

```json
{
  "query": "python data analysis"
}
```

### Response (200 OK)

```json
{
  "agents": [
    {
      "name": "Python Coding Agent",
      "description": "Helps with Python programming",
      "url": "http://localhost:8102/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["python", "coding", "debugging"]
      },
      "preferred_transport": "JSONRPC",
      "visibility": "public",
      "owner_id": "dev.team"
    },
    {
      "name": "Data Analysis Agent",
      "description": "Analyzes data and creates visualizations",
      "url": "http://localhost:8101/agent",
      "version": "1.2.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["data-analysis", "visualization", "python"]
      },
      "preferred_transport": "JSONRPC",
      "visibility": "public",
      "owner_id": "jane.smith"
    }
  ],
  "count": 2,
  "query": "python data analysis"
}
```

### cURL Example

```bash
curl -X POST "http://localhost:8002/api/agents/search" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "python data analysis"}'
```

### Python Example

```python
import requests

url = "http://localhost:8002/api/agents/search"
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

response = requests.post(url, headers=headers, json={"query": "python"})
results = response.json()

print(f"Found {results['count']} agents matching 'python'")
for agent in results["agents"]:
    print(f"- {agent['name']}: {agent['description']}")
```

---

## 5. Unregister Agent

Delete an agent from the registry. Only the owner can unregister their agent.

### Endpoint
```
DELETE /agents/{agent_id}
```

### Response (200 OK)

```json
{
  "success": true,
  "message": "Agent unregistered successfully",
  "extensions_cleaned": 2
}
```

### Response (403 Forbidden)

```json
{
  "detail": "Agent not found or access denied"
}
```

### cURL Example

```bash
curl -X DELETE "http://localhost:8002/api/agents/123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. List Extensions

List all available extensions with provenance information.

### Endpoint
```
GET /extensions
```

### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `uri_pattern` | string | Filter by URI pattern | `access-control` |
| `declaring_agents` | string[] | Filter by declaring agents | `["agent1", "agent2"]` |
| `trust_levels` | string[] | Filter by trust levels | `["verified"]` |
| `page_size` | integer | Results per page (1-1000) | `100` |
| `page_token` | string | Pagination token | `next_page_token` |

### Response (200 OK)

```json
{
  "extensions": [
    {
      "uri": "access-control",
      "description": "Access Control extension for agent visibility",
      "declaring_agents": ["agent-service"],
      "trust_level": "verified",
      "params": {
        "visibility": "string",
        "allowed_users": "array"
      }
    }
  ],
  "count": 1,
  "total_count": 1,
  "next_page_token": null
}
```

### cURL Example

```bash
curl -X GET "http://localhost:8002/api/extensions?uri_pattern=access" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 7. Get Extension Info

Get detailed information about a specific extension.

### Endpoint
```
GET /extensions/{uri}
```

### Response (200 OK)

```json
{
  "extension_info": {
    "uri": "access-control",
    "description": "Access Control extension for agent visibility",
    "declaring_agents": ["agent-service"],
    "trust_level": "verified",
    "params": {
      "visibility": {
        "type": "string",
        "enum": ["public", "private", "team"],
        "description": "Agent visibility level"
      },
      "allowed_users": {
        "type": "array",
        "items": "string",
        "description": "List of usernames with explicit access"
      }
    }
  },
  "found": true
}
```

### cURL Example

```bash
curl -X GET "http://localhost:8002/api/extensions/access-control" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Get Agent Extensions

Get all extensions used by a specific agent.

### Endpoint
```
GET /agents/{agent_id}/extensions
```

### Response (200 OK)

```json
{
  "agent_id": "123",
  "extensions": [
    {
      "uri": "access-control",
      "description": "Access Control extension",
      "required": true,
      "params": {
        "visibility": "team",
        "department": "Engineering"
      }
    }
  ],
  "count": 1
}
```

### cURL Example

```bash
curl -X GET "http://localhost:8002/api/agents/123/extensions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Access Control Examples

### Creating Agents with Different Visibility Levels

#### Public Agent (Accessible to Everyone)

```json
{
  "agent_card": {
    "name": "Public Helper",
    "description": "Available to all users",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {"skills": ["general-help"]},
    "visibility": "public"
  }
}
```

#### Private Agent (Only Owner)

```json
{
  "agent_card": {
    "name": "Personal Assistant",
    "description": "My private agent",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {"skills": ["personal-tasks"]},
    "visibility": "private"
  }
}
```

#### Team Agent (Department Members)

```json
{
  "agent_card": {
    "name": "Engineering Bot",
    "description": "For engineering team only",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {"skills": ["code-review", "deployment"]},
    "visibility": "team"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Missing required field: url"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not allowed to access this agent"
}
```

### 404 Not Found
```json
{
  "detail": "Agent not found or access denied"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Integration Example: Complete Workflow

### Step 1: Register an Agent

```python
import requests

base_url = "http://localhost:8002/api"
token = "your_jwt_token"
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# Register agent
agent_card = {
    "name": "Sales Assistant",
    "description": "Helps with sales inquiries",
    "url": "http://localhost:8100/sales-agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {"skills": ["sales", "crm", "lead-qualification"]},
    "visibility": "team"
}

response = requests.post(
    f"{base_url}/agents",
    headers=headers,
    json={"agent_card": agent_card}
)

agent_id = response.json()["agent_id"]
print(f"Registered agent: {agent_id}")
```

### Step 2: List Team Agents

```python
# Get all team agents
response = requests.get(
    f"{base_url}/agents?visibility=team",
    headers=headers
)

team_agents = response.json()["agents"]
print(f"Found {len(team_agents)} team agents")
```

### Step 3: Search for Specific Skills

```python
# Search for sales-related agents
response = requests.post(
    f"{base_url}/agents/search",
    headers=headers,
    json={"query": "sales CRM"}
)

results = response.json()
print(f"Found {results['count']} agents matching the query")
```

### Step 4: Get Agent Details

```python
# Get specific agent
response = requests.get(
    f"{base_url}/agents/{agent_id}",
    headers=headers
)

agent = response.json()["agent_card"]
print(f"Agent: {agent['name']}")
print(f"Visibility: {agent['visibility']}")
print(f"Skills: {agent['capabilities']['skills']}")
```

### Step 5: Clean Up (Unregister)

```python
# Unregister agent
response = requests.delete(
    f"{base_url}/agents/{agent_id}",
    headers=headers
)

print(response.json()["message"])
```

---

## Testing with Frontend

### JavaScript/TypeScript Example

```typescript
const API_BASE = 'http://localhost:8002/api';

class AgentService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  async registerAgent(agentCard: AgentCard) {
    const response = await fetch(`${API_BASE}/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ agent_card: agentCard })
    });

    return await response.json();
  }

  async listAgents(filters?: {
    visibility?: 'public' | 'private' | 'team';
    only_mine?: boolean;
  }) {
    const params = new URLSearchParams();
    if (filters?.visibility) params.append('visibility', filters.visibility);
    if (filters?.only_mine) params.append('only_mine', 'true');

    const response = await fetch(
      `${API_BASE}/agents?${params.toString()}`,
      {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }
    );

    return await response.json();
  }

  async searchAgents(query: string) {
    const response = await fetch(`${API_BASE}/agents/search`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    return await response.json();
  }
}

// Usage
const service = new AgentService(localStorage.getItem('accessToken')!);

// List public agents
const publicAgents = await service.listAgents({ visibility: 'public' });

// Search
const results = await service.searchAgents('python');

// Register
await service.registerAgent({
  name: 'My Agent',
  description: 'Description',
  url: 'http://localhost:8100/agent',
  version: '1.0.0',
  protocol_version: '1.0',
  capabilities: { skills: ['chat'] },
  visibility: 'private'
});
```
