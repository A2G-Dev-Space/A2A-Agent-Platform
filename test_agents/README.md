# Test Agents for A2A Platform Verification

This directory contains test agents for verifying the A2A Agent Platform functionality.

## Agents

### 1. Math Agent (Port 8011)
- **Description**: Performs mathematical calculations
- **Capabilities**: add, subtract, multiply, divide, power
- **Framework**: Google ADK
- **Endpoint**: http://localhost:8011

### 2. Text Agent (Port 8012)
- **Description**: Performs text processing operations
- **Capabilities**: uppercase, lowercase, reverse, word count, character count, replace
- **Framework**: Google ADK
- **Endpoint**: http://localhost:8012

## Setup

```bash
# Install dependencies
pip install -r requirements.txt
```

## Running

Terminal 1 - Math Agent:
```bash
cd test_agents/math_agent
python agent.py
```

Terminal 2 - Text Agent:
```bash
cd test_agents/text_agent
python agent.py
```

## Testing

### Check Agent Card
```bash
curl http://localhost:8011/.well-known/agent.json
curl http://localhost:8012/.well-known/agent.json
```

### Register in Platform
1. Navigate to Workbench mode in frontend
2. Click "New Agent"
3. Fill in agent details:
   - Name: Math Agent
   - URL: http://localhost:8011
   - Framework: ADK
   - Visibility: DEVELOPMENT

4. Repeat for Text Agent with port 8012

## Verification Scenarios

1. **Agent Creation**: Register both agents via Workbench UI
2. **Agent Discovery**: View agents in Hub mode
3. **Chat Testing**: Test agents via Flow mode chat interface
4. **Tracing**: Verify trace logs appear in real-time
5. **Streaming**: Test streaming responses
6. **Visibility Change**: DEVELOPMENT → STAGING → PRODUCTION
