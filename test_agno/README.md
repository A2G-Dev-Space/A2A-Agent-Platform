# Test Agents for A2A Platform (Agno Framework)

This directory contains test agents for verifying the A2A Agent Platform functionality using the Agno framework.

## Agents

### Math Team (Port 6020)
- **Description**: Multi-agent math calculation platform
- **Framework**: Agno
- **Architecture**:
  - **Math Team**: Master orchestrator that delegates tasks
  - **Basic Calculator**: Handles addition and subtraction
  - **Advanced Calculator**: Handles multiplication, division, power, and square root
- **Endpoint**: http://localhost:6020
- **Agent Card**: http://localhost:6020/.well-known/agent.json

## Setup

```bash
# Navigate to test_agno directory
cd test_agno

# Install dependencies using uv
uv sync
```

## Running

```bash
# Run with uv
uv run python math_agent/agent.py
```

## Testing

### Check Agent Card
```bash
curl http://localhost:6020/.well-known/agent.json
```

### Register in Platform
1. Navigate to Workbench mode in frontend
2. Click "New Agent"
3. Fill in agent details:
   - Name: Math Team (Agno)
   - URL: http://localhost:6020
   - Framework: Agno
   - Visibility: DEVELOPMENT

## Architecture

```
┌─────────────────────────────────────────────────┐
│            Math Team (Orchestrator)             │
│  - Analyzes user requests                       │
│  - Delegates to appropriate agent               │
└───────────────┬─────────────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
┌───────▼────────┐  ┌────▼──────────────┐
│ Basic Calc     │  │ Advanced Calc     │
│ - add()        │  │ - multiply()      │
│ - subtract()   │  │ - divide()        │
│                │  │ - power()         │
│                │  │ - square_root()   │
└────────────────┘  └───────────────────┘
```

## Key Features

1. **Tool-First Design**: All agents must use tools, not direct calculation
2. **Agent Delegation**: Team delegates tasks to specialized agents
3. **A2A Protocol**: Full A2A compatibility for platform integration
4. **Platform LLM Proxy**: Uses centralized LLM endpoint
5. **CORS Support**: Ready for multi-frontend architecture

## Environment Variables

```bash
export PLATFORM_LLM_ENDPOINT="http://localhost:8006/v1"
export PLATFORM_API_KEY="test-user-api-key"
```

## Verification Scenarios

1. **Agent Creation**: Register Math Team via Workbench UI
2. **Agent Discovery**: View agent in Hub mode
3. **Chat Testing**: Test agent via Flow mode chat interface
4. **Tool Usage**: Verify tools are called (check terminal logs)
5. **Agent Delegation**: Verify team delegates to correct agent
6. **Tracing**: Verify trace logs appear in real-time
7. **Streaming**: Test streaming responses

## Example Queries

- "5 더하기 8은 얼마인가요?" → basic_calculator (add tool)
- "10 곱하기 4는 얼마인가요?" → advanced_calculator (multiply tool)
- "25의 제곱근은?" → advanced_calculator (square_root tool)
- "2의 8제곱은?" → advanced_calculator (power tool)
