# A2G Agent Platform: TODO & Implementation Roadmap (TODO_ALL.md)

**Version**: 2.1
**Last Updated**: 2025-11-06

---

## 0. CRITICAL PRIORITY - User Verification Requirements (NEW)

### 0.1. Frontend UI/UX Fixes
**Priority**: 🔴 CRITICAL | **Effort**: 3 days | **Status**: ✅ COMPLETED (2025-11-06)

#### 0.1.1. Remove Settings from Sidebar
**Issue**: Settings currently appears in sidebar navigation, but design specs show it should only be accessible from user dropdown in header.
**Status**: ✅ COMPLETED

**Required Changes**:
- Remove "Settings" link from `frontend/src/components/layout/Sidebar.tsx`
- Add Settings option to user dropdown menu in header (with gear icon)
- Ensure settings modal/page opens when clicked from user dropdown
- Update navigation state management to reflect this change

**Files to Modify**:
- `frontend/src/components/layout/Sidebar.tsx` - Remove settings link
- `frontend/src/components/layout/Header.tsx` - Add user dropdown with settings option
- `frontend/src/components/settings/SettingsModal.tsx` - Ensure opens from header

#### 0.1.2. Move User Info to Header
**Issue**: User info (avatar, name) currently displayed in sidebar bottom. Design specs show it should be in header top-right.
**Status**: ✅ COMPLETED

**Required Changes**:
- Remove user section from sidebar bottom
- Add user avatar + name to header top-right
- Implement dropdown menu on click with options: Profile, Settings, Logout
- Add online status indicator (green dot)

**Files to Modify**:
- `frontend/src/components/layout/Sidebar.tsx` - Remove user section
- `frontend/src/components/layout/Header.tsx` - Add user avatar with dropdown
- `frontend/src/components/layout/UserDropdown.tsx` - Create new component

### 0.2. Agent Integration & Workbench
**Priority**: 🔴 CRITICAL | **Effort**: 1 week | **Status**: ❌ Not Started

#### 0.2.1. Add ADK/Agno Agents to Workbench
**Requirements**:
- Complete agent registration API integration
- Fetch deployed test agents (Math Agent on port 8011, Text Agent on port 8012)
- Display agents in Workbench agent list with proper framework badges
- Show agent status (online/offline) with health check
- Enable agent selection for testing

**Implementation Steps**:
1. Fix authentication for agent registration API calls
2. Implement agent discovery from agent-service
3. Display agent cards with framework, capabilities, status
4. Add "Test Agent" button that opens chat interface
5. Store selected agent in workbench state

**Files to Create/Modify**:
- `frontend/src/pages/Workbench.tsx` - Agent list display
- `frontend/src/api/agents.ts` - API calls for agent listing
- `frontend/src/components/workbench/AgentCard.tsx` - Agent display component
- `frontend/src/stores/workbenchStore.ts` - Agent selection state

#### 0.2.2. Implement Streaming Chat with Tracing
**Requirements**:
- WebSocket connection to chat-service for streaming responses
- Display chat messages in real-time with token-by-token streaming
- Real-time trace log display showing:
  - Request/response payloads
  - Tool calls and parameters
  - Agent transfers (if multi-agent)
  - Execution timeline
  - Error messages
- Split-pane layout: Chat on left, Trace logs on right

**Implementation Steps**:
1. Connect to chat WebSocket endpoint
2. Send messages to selected agent via A2A proxy
3. Receive and display streaming tokens
4. Connect to tracing WebSocket for log streaming
5. Display logs in collapsible tree format with JSON viewer
6. Highlight agent transfers and tool calls

**Files to Create/Modify**:
- `frontend/src/hooks/useChat.ts` - Chat WebSocket logic
- `frontend/src/hooks/useTrace.ts` - Trace WebSocket logic
- `frontend/src/components/workbench/ChatPanel.tsx` - Chat interface
- `frontend/src/components/workbench/TracePanel.tsx` - Trace display
- `frontend/src/components/workbench/TestInterface.tsx` - Split layout

### 0.3. Agent Publishing & Hub Integration
**Priority**: 🔴 CRITICAL | **Effort**: 1 week | **Status**: ❌ Not Started

#### 0.3.1. Agent Publishing Workflow
**Requirements**:
- Implement visibility state transitions: DEVELOPMENT → STAGING → PRODUCTION
- Add "Publish" button to agent detail page in Workbench
- Show confirmation modal with deployment target selection
- Update agent visibility via API call
- Display current visibility status with badge

**Implementation Steps**:
1. Add visibility field to agent display
2. Implement "Publish to Staging" button (DEVELOPMENT → STAGING)
3. Implement "Publish to Production" button (STAGING → PRODUCTION)
4. Add confirmation modal with deployment checklist
5. Update agent list to filter by visibility

**Files to Create/Modify**:
- `frontend/src/components/workbench/AgentActions.tsx` - Publish button
- `frontend/src/components/workbench/PublishModal.tsx` - Confirmation dialog
- `frontend/src/api/agents.ts` - Update visibility API call

#### 0.3.2. Hub Agent Display
**Requirements**:
- Only show PRODUCTION visibility agents in Hub
- Display agent marketplace with cards showing:
  - Agent name, logo, description
  - Framework badge (ADK, Agno, Langchain, Custom)
  - Capabilities badges
  - Usage statistics (if available)
  - "Try Agent" button
- Category filters and search functionality

**Implementation Steps**:
1. Fetch agents with visibility=PRODUCTION from API
2. Display agent cards in grid layout
3. Add category filter dropdown
4. Add search bar with debounced filtering
5. Implement "Try Agent" button that opens chat

**Files to Create/Modify**:
- `frontend/src/pages/Hub.tsx` - Marketplace layout
- `frontend/src/components/hub/AgentCard.tsx` - Public agent card
- `frontend/src/components/hub/AgentFilters.tsx` - Search and filters

#### 0.3.3. Hub Streaming Chat
**Requirements**:
- Same streaming chat functionality as Workbench
- Session management (create, list, resume sessions)
- Session sidebar showing chat history
- Agent info panel showing capabilities and documentation
- No trace logs (this is production usage, not debugging)

**Implementation Steps**:
1. Reuse chat WebSocket logic from Workbench
2. Create session sidebar component
3. Implement session creation and retrieval
4. Display chat messages with streaming
5. Add agent info panel with collapsible details

**Files to Create/Modify**:
- `frontend/src/pages/HubChat.tsx` - Hub chat page
- `frontend/src/components/hub/SessionSidebar.tsx` - Chat history
- `frontend/src/components/hub/ChatInterface.tsx` - Chat area
- `frontend/src/components/hub/AgentInfoPanel.tsx` - Agent details

### 0.4. Settings & LLM Management
**Priority**: 🔴 CRITICAL | **Effort**: 1 week | **Status**: ❌ Not Started

#### 0.4.1. Verify Settings Actions (No Direct Key Usage)
**Requirements**:
- Review all settings pages to ensure Gemini API key is NOT used directly in agents
- LLM models should be registered in Admin service
- Agents should reference LLM model IDs, not API keys
- Personal keys should be encrypted and managed securely

**Verification Steps**:
1. Check agent creation form - ensure no API key field
2. Verify agents use LLM model references (model_id)
3. Check admin service for proper LLM model management
4. Ensure API keys are encrypted in database
5. Test agent execution uses proxy endpoint with registered LLMs

**Files to Review**:
- `frontend/src/components/workbench/AddAgentModal.tsx`
- `repos/agent-service/app/models/agent.py`
- `repos/admin-service/app/models/llm_model.py`

#### 0.4.2. LLM Management Implementation
**Requirements**:
- Admin UI to add/edit/delete LLM models
- Fields: Provider (OpenAI, Anthropic, Google, etc.), Model name, API key, API endpoint
- Test connection button to verify API key works
- Display registered LLMs in settings page
- Workbench shows proxy endpoint for each LLM

**Implementation Steps**:
1. Create LLM management page in admin settings
2. Implement add LLM modal with form validation
3. Add API endpoint testing functionality
4. Display LLM list with status indicators
5. Show proxy endpoint URLs in Workbench for registered LLMs

**Files to Create/Modify**:
- `frontend/src/pages/settings/LLMManagement.tsx` - LLM admin page
- `frontend/src/components/settings/AddLLMModal.tsx` - Add LLM form
- `repos/admin-service/app/routers/llm_models.py` - LLM CRUD endpoints
- `repos/agent-service/app/proxy/llm_proxy.py` - Proxy endpoint logic

#### 0.4.3. Personal Key Validation
**Requirements**:
- Users can add personal API keys for LLM providers
- Key validation on save (test API call)
- If key is invalid, show error and prevent save
- Display key status (valid/invalid) with last tested timestamp
- Keys are encrypted at rest in database

**Implementation Steps**:
1. Create personal key management UI in user settings
2. Add key validation endpoint that tests API call
3. Encrypt keys before storing in database
4. Display key status with indicators
5. Show error messages for invalid keys

**Files to Create/Modify**:
- `frontend/src/pages/settings/PersonalKeys.tsx` - Key management UI
- `repos/user-service/app/routers/user_keys.py` - Key CRUD endpoints
- `repos/user-service/app/core/encryption.py` - Key encryption logic

### 0.5. User Management & Admin Features
**Priority**: 🔴 CRITICAL | **Effort**: 1 week | **Status**: ❌ Not Started

#### 0.5.1. User Approval/Rejection Workflow
**Requirements**:
- New users start with PENDING status
- Admin sees list of pending users with Approve/Reject buttons
- Approval changes status to USER (active)
- Rejection deletes user or changes status to REJECTED
- Email notification on approval/rejection (optional)

**Implementation Steps**:
1. Modify user registration to set status=PENDING
2. Create admin user management page
3. Add approve/reject buttons with confirmation
4. Implement status update API calls
5. Add filters to view users by status (PENDING, USER, REJECTED)

**Files to Create/Modify**:
- `frontend/src/pages/admin/UserManagement.tsx` - User admin page
- `repos/user-service/app/models/user.py` - Add PENDING status
- `repos/user-service/app/routers/admin.py` - Approve/reject endpoints

#### 0.5.2. Role Management
**Requirements**:
- Admin can change user roles: USER, TEAM_LEAD, ADMIN
- Role dropdown in user management table
- Confirmation modal for role changes
- Role changes take effect immediately (token refresh may be needed)
- Audit log for role changes

**Implementation Steps**:
1. Add role dropdown to user management table
2. Implement role update API endpoint
3. Add confirmation modal for role changes
4. Create audit log entry for role changes
5. Update user token claims if needed

**Files to Create/Modify**:
- `frontend/src/components/admin/UserRoleDropdown.tsx` - Role selector
- `repos/user-service/app/routers/admin.py` - Role update endpoint
- `repos/user-service/app/models/audit_log.py` - Audit logging

### 0.6. Usage Statistics & Monitoring
**Priority**: 🔴 CRITICAL | **Effort**: 1 week | **Status**: ❌ Not Started

#### 0.6.1. Agent Usage Statistics
**Requirements**:
- Track agent call counts per user
- Track agent execution time and success/failure rates
- Display statistics in admin dashboard:
  - Total calls per agent
  - Average response time
  - Success rate
  - Top users of each agent
- Filter by date range

**Implementation Steps**:
1. Implement usage tracking in chat service (log each agent call)
2. Create statistics aggregation worker task (hourly/daily)
3. Store aggregated stats in database
4. Create statistics API endpoints
5. Build statistics dashboard UI with charts

**Files to Create/Modify**:
- `repos/chat-service/app/services/usage_tracker.py` - Usage logging
- `repos/worker-service/app/tasks.py` - Statistics aggregation task
- `repos/admin-service/app/routers/statistics.py` - Stats API
- `frontend/src/pages/admin/Statistics.tsx` - Stats dashboard

#### 0.6.2. LLM Token Usage Statistics
**Requirements**:
- Track token usage per LLM model
- Track cost per user (if pricing data available)
- Display statistics:
  - Total tokens used per model
  - Token usage by user
  - Estimated costs
  - Usage trends over time
- Export statistics to CSV

**Implementation Steps**:
1. Log token counts in chat service on each LLM call
2. Store token usage in statistics database
3. Calculate costs based on model pricing
4. Create token statistics API endpoints
5. Build token usage dashboard with charts and export

**Files to Create/Modify**:
- `repos/chat-service/app/services/token_tracker.py` - Token counting
- `repos/admin-service/app/models/token_usage.py` - Token usage model
- `repos/admin-service/app/routers/statistics.py` - Token stats API
- `frontend/src/pages/admin/TokenStatistics.tsx` - Token dashboard

### 0.7. Verification Requirements
**Priority**: 🔴 CRITICAL | **Effort**: Ongoing | **Status**: ❌ Not Started

#### 0.7.1. Playwright E2E Verification
**Requirements**: After implementing each feature above, verify with Playwright MCP tool

**Test Scenarios**:
1. **UI/UX Tests**:
   - Settings accessible only from user dropdown in header
   - User info displayed in header, not sidebar

2. **Agent Integration Tests**:
   - ADK agents visible in Workbench
   - Can select agent and open chat
   - Streaming chat works with token-by-token display
   - Trace logs appear in real-time

3. **Publishing Tests**:
   - Can publish agent from DEVELOPMENT to STAGING
   - Can publish agent from STAGING to PRODUCTION
   - Published agents appear in Hub
   - Hub chat works with streaming

4. **Settings Tests**:
   - Can add LLM model
   - LLM proxy endpoint accessible
   - Personal key validation works
   - Invalid keys show error

5. **Admin Tests**:
   - Can approve/reject pending users
   - Can change user roles
   - Statistics display correctly
   - Usage data tracked accurately

**Implementation**:
- Create Playwright test suite for each scenario
- Run tests after each implementation
- Update verification report with test results
- Fix any issues found during testing

**Files to Create**:
- `e2e/tests/0.1-ui-fixes.spec.ts` - UI/UX tests
- `e2e/tests/0.2-agent-integration.spec.ts` - Agent tests
- `e2e/tests/0.3-publishing.spec.ts` - Publishing tests
- `e2e/tests/0.4-settings.spec.ts` - Settings tests
- `e2e/tests/0.5-admin.spec.ts` - Admin tests
- `e2e/tests/0.6-statistics.spec.ts` - Statistics tests

---

## 1. Critical UI/UX Improvements (Based on frontend/designs)

### 1.1. Professional Enterprise UI Overhaul

#### 1.1.1. Design System Implementation
**Priority**: CRITICAL | **Effort**: 2 weeks | **Status**: ❌ Not Started

The current frontend looks like a college project. We need to implement the professional design system shown in `frontend/designs/`:

**Typography System**:
- **Primary Font**: Manrope (400, 500, 700, 800 weights)
- **Fallback**: 'Noto Sans', system fonts
- **Font Sizes**:
  - Headings: text-4xl (Dashboard), text-xl (Modal titles), text-lg (Section headers)
  - Body: text-base (Content), text-sm (Labels), text-xs (Meta info)
- **Text Colors**:
  - Primary: text-slate-800 dark:text-white
  - Secondary: text-slate-600 dark:text-slate-400
  - Muted: text-slate-500 dark:text-slate-500
  - Accent: Mode-specific colors

**Color Palette Per Mode**:
- **Workbench Mode** (#EA2831 - Red):
  - Primary: #EA2831
  - Background: #f8f6f6 (light), #211111 (dark)
  - Surface: #1f1c26 (dark modal)
  - Border: #433c53 (dark borders)

- **Hub Mode** (#359EFF - Blue):
  - Primary: #359EFF
  - Accent: #0284c7
  - Background: #f5f7f8 (light), #0f1923 (dark)
  - Surface: #110d1a (dark sidebar)

- **Flow Mode** (#FAC638 - Yellow):
  - Primary: #FAC638
  - Background: #f8f8f5 (light), #231e0f (dark)
  - Surface: Similar dark tones

**Component Styling**:
- **Buttons**: Multiple variants as seen in designs
  - Primary: bg-primary with hover states
  - Secondary: Border variants with hover:bg-slate-100
  - Icon buttons: Rounded with consistent padding
- **Inputs**: Consistent form-input class with focus:ring-2 focus:ring-primary/50
- **Cards**: Rounded-xl with proper shadows and borders
- **Modals**: backdrop-blur-sm with professional animations

**Implementation Files to Update**:
- `frontend/tailwind.config.js`: Add complete theme configuration
- `frontend/src/styles/global.css`: Add utility classes
- `frontend/src/components/ui/`: Create reusable UI components library

#### 1.1.2. Material Icons Integration
**Priority**: HIGH | **Effort**: 3 days | **Status**: ❌ Not Started

Replace Lucide icons with Material Symbols Outlined as per designs:
```css
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

**Icons to Replace**:
- Navigation: code_blocks, widgets, account_tree, hub
- Actions: add, close, expand_more, upload_file
- Status: check_circle, error, warning, info
- Features: smart_toy (AI), psychology (agents)

### 1.2. Layout & Navigation Improvements

#### 1.2.1. Sidebar Navigation Redesign
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Current sidebar is basic. Implement the design from `hub_chat.html`:

**Structure**:
```
- Logo & Platform Name (sticky header)
- Main Navigation (3 modes with active states)
- User Section (bottom)
- Logout button
```

**Features**:
- Active mode highlighting with mode-specific colors
- Icon + Text layout with consistent spacing
- Hover states: hover:bg-slate-100 dark:hover:bg-slate-800
- User avatar with dropdown menu

**Files to Modify**:
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Header.tsx`

#### 1.2.2. Header Bar Enhancement
**Priority**: MEDIUM | **Effort**: 3 days | **Status**: ❌ Not Started

Implement sticky header with backdrop blur:
- Position: sticky top-0 z-10
- Background: bg-white/90 dark:bg-[#110d1a]/50 backdrop-blur-sm
- User avatar with status indicator
- Notification bell with badge
- Quick actions dropdown

### 1.3. Page-Specific UI Implementations

#### 1.3.1. Workbench Mode Complete Redesign
**Priority**: CRITICAL | **Effort**: 2 weeks | **Status**: ❌ Not Started

Based on `workbench_create_edit_agent.html`, `workbench_chat_and_debug.html`:

**Agent Creation Modal**:
- **Logo Upload**: Drag & drop with preview
- **Color Picker**: 8 predefined color swatches with ring selection
- **Form Layout**: Grid system (md:grid-cols-2)
- **Provider Section**: Collapsible panel with provider-specific fields
- **Capabilities**: Multi-select checkboxes in grid
- **Documentation**: Rich text editor for README
- **Validation**: Real-time field validation with error states

**Chat & Debug Interface**:
- **Three-Panel Layout**:
  - Left: Agent list with search/filter
  - Center: Chat playground with streaming
  - Right: Trace/Debug panel
- **Chat Features**:
  - Message bubbles with timestamps
  - Code highlighting with syntax support
  - File attachments with preview
  - Typing indicators
  - Message actions (copy, edit, regenerate)
- **Debug Panel**:
  - Real-time log streaming
  - Log level filtering (DEBUG, INFO, WARNING, ERROR)
  - JSON tree viewer for payloads
  - Performance metrics display

**Deploy Agent Modal** (`workbench_choose_deploy.html`):
- Environment selection (Dev/Staging/Prod)
- Configuration review panel
- Deployment checklist
- Progress indicator with steps

#### 1.3.2. Hub Mode Professional Interface
**Priority**: HIGH | **Effort**: 2 weeks | **Status**: ❌ Not Started

Based on `hub_default.html`, `hub_chat.html`:

**Agent Discovery Page**:
- **Hero Section**: Featured agents carousel
- **Category Filters**: Pills with counts
- **Agent Cards**:
  - Logo/Avatar display
  - Title, description (truncated)
  - Stats (users, rating, usage)
  - Department/Team badges
  - Quick actions (Try, Details, Share)
- **Search**: Advanced search with filters panel
- **Sorting**: Dropdown (Popular, Recent, A-Z, Rating)

**Hub Chat Interface**:
- **Session Sidebar**:
  - New Chat button
  - Session grouping (Today, Yesterday, Previous 7 days)
  - Session preview with last message
  - Search sessions
- **Main Chat Area**:
  - Agent header with info/settings
  - Message thread with agent switching indicators
  - Multi-modal support (text, code, images, charts)
  - Export conversation options
- **Agent Info Panel**:
  - Capabilities list
  - Usage instructions
  - API documentation link
  - Rate limiting info

#### 1.3.3. Settings Pages Professional UI
**Priority**: MEDIUM | **Effort**: 1.5 weeks | **Status**: ❌ Not Started

Based on design files in `settings_*.html`:

**User Management** (`settings_user_management.html`):
- **User Table**:
  - Avatar, Name, Email, Department, Role, Status
  - Inline actions (Edit, Approve/Reject, Delete)
  - Bulk actions toolbar
  - Pagination with per-page selector
- **Filters**: Role, Department, Status, Date joined
- **User Details Modal**: Full profile with activity history

**LLM Model Management** (`settings_llm_model_management.html`):
- **Model Cards**: Grid layout with:
  - Provider logo
  - Model name & version
  - Capabilities badges
  - Usage stats
  - Cost per token
  - Status indicator (Active/Inactive)
- **Add Model Modal** (`settings_add_new_llm_model_popup.html`):
  - Provider selection with logos
  - API configuration fields
  - Test connection button
  - Rate limit settings
  - Cost configuration

**Statistics Dashboard** (`settings_statistics.html`):
- **KPI Cards**:
  - Animated number counters
  - Trend indicators (+/-%)
  - Sparkline mini-charts
- **Charts Section**:
  - Top Token Consumers (bar chart)
  - Usage Over Time (line chart)
  - Agent Performance (scatter plot)
  - Department Usage (pie chart)
- **Filters**: Date range, Agent, Department, LLM Model
- **Export**: CSV, PDF reports

**API Key Management** (`settings_api_key_management.html`):
- **Key List**: Table with name, partial key, created date, last used
- **Generate Key Modal**: Name, permissions, expiry
- **Key Display**: Copy button, QR code generation

---

## 2. Frontend Functionality Completion

### 2.1. WebSocket & Real-time Features

#### 2.1.1. Complete Chat Service Integration
**Priority**: CRITICAL | **Effort**: 1 week | **Status**: 🚧 Partially Implemented

Current WebSocket is configured but not fully integrated:

**Message Streaming**:
```typescript
// frontend/src/hooks/useChat.ts (NEW)
interface StreamingMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming: boolean;
  tokens: string[];
  metadata: {
    model?: string;
    latency?: number;
    tokenCount?: number;
  };
}

const useChat = (sessionId: string) => {
  // Implement streaming logic
  // Handle token-by-token updates
  // Manage message state
  // Handle errors and reconnection
}
```

**Implementation Tasks**:
- Connect WebSocket events to UI components
- Implement message queueing
- Add retry logic with exponential backoff
- Handle connection state UI (connecting, connected, error)
- Implement presence indicators

**Files to Create/Modify**:
- `frontend/src/hooks/useChat.ts`
- `frontend/src/hooks/useWebSocket.ts`
- `frontend/src/components/chat/ChatMessage.tsx`
- `frontend/src/components/chat/ChatInput.tsx`
- `frontend/src/components/chat/TypingIndicator.tsx`

#### 2.1.2. Real-time Trace Visualization
**Priority**: HIGH | **Effort**: 1 week | **Status**: 🚧 Partially Implemented

**Features**:
- Live log streaming with WebSocket
- Log level filtering and search
- Collapsible log entries with JSON viewer
- Performance metrics (latency, token usage)
- Agent transfer visualization
- Export logs functionality

**Components to Create**:
- `frontend/src/components/trace/TraceViewer.tsx`
- `frontend/src/components/trace/LogEntry.tsx`
- `frontend/src/components/trace/MetricsPanel.tsx`
- `frontend/src/hooks/useTrace.ts`

### 2.2. State Management Improvements

#### 2.2.1. Zustand Store Enhancements
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Current stores are basic. Add:

**chatStore.ts**:
```typescript
interface ChatStore {
  sessions: Map<string, ChatSession>;
  activeSessionId: string | null;
  messages: Map<string, Message[]>;
  streamingMessages: Map<string, StreamingMessage>;

  // Actions
  createSession: (agentId: number) => Promise<void>;
  sendMessage: (content: string) => void;
  receiveToken: (sessionId: string, token: string) => void;
  setActiveSession: (sessionId: string) => void;
  clearSession: (sessionId: string) => void;
  exportSession: (sessionId: string, format: 'json' | 'pdf') => void;
}
```

**workbenchStore.ts**:
```typescript
interface WorkbenchStore {
  developmentAgents: Agent[];
  selectedAgent: Agent | null;
  isTestMode: boolean;
  deploymentTarget: 'dev' | 'staging' | 'prod';
  validationErrors: ValidationError[];

  // Actions
  testAgent: (config: TestConfig) => Promise<TestResult>;
  deployAgent: (target: string) => Promise<void>;
  validateAgent: () => ValidationError[];
}
```

### 2.3. Component Library Development

#### 2.3.1. Reusable UI Components
**Priority**: HIGH | **Effort**: 2 weeks | **Status**: ❌ Not Started

Create a professional component library in `frontend/src/components/ui/`:

**Base Components**:
- `Button.tsx`: Primary, Secondary, Ghost, Danger variants
- `Input.tsx`: Text, Number, Password, with validation states
- `Select.tsx`: Single, Multi-select with search
- `Modal.tsx`: Sizes (sm, md, lg, xl), animations
- `Card.tsx`: With header, body, footer slots
- `Table.tsx`: Sortable, filterable, paginated
- `Tabs.tsx`: Horizontal, vertical, with icons
- `Badge.tsx`: Status, count, removable
- `Avatar.tsx`: With status indicator, fallback
- `Tooltip.tsx`: Positions, delays, triggers
- `Toast.tsx`: Success, error, warning, info
- `Skeleton.tsx`: Loading states for all components
- `EmptyState.tsx`: With illustration, message, action

**Advanced Components**:
- `DataTable.tsx`: Virtual scrolling, column resizing
- `DatePicker.tsx`: Range selection, presets
- `FileUpload.tsx`: Drag & drop, preview, progress
- `CodeEditor.tsx`: Syntax highlighting, themes
- `JsonViewer.tsx`: Collapsible, searchable
- `Chart.tsx`: Wrapper for Recharts with themes

### 2.4. Form Handling & Validation

#### 2.4.1. React Hook Form Integration
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Replace basic form handling with react-hook-form:

```typescript
// frontend/src/hooks/useAgentForm.ts
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const agentSchema = z.object({
  name: z.string().min(3).max(50),
  description: z.string().min(10).max(500),
  framework: z.enum(['Agno', 'ADK', 'Langchain', 'Custom']),
  url: z.string().url(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  capabilities: z.array(z.string()).min(1),
  logo: z.instanceof(File).optional(),
});
```

**Forms to Upgrade**:
- Agent creation/edit form
- User profile form
- LLM model configuration
- Settings forms

---

## 3. Backend Service Completion

### 3.1. Flow Mode Implementation

#### 3.1.1. Workflow Engine
**Priority**: HIGH | **Effort**: 3 weeks | **Status**: ❌ Not Started

Design and implement multi-agent orchestration:

**Database Schema** (`repos/flow-service/`):
```sql
-- workflows table
CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  description TEXT,
  definition JSONB, -- DAG definition
  version INTEGER,
  status VARCHAR(50),
  created_by INTEGER,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- workflow_executions table
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY,
  workflow_id UUID REFERENCES workflows(id),
  status VARCHAR(50), -- pending, running, completed, failed
  context JSONB, -- execution context/variables
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT
);

-- workflow_steps table
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY,
  execution_id UUID REFERENCES workflow_executions(id),
  step_name VARCHAR(255),
  agent_id INTEGER,
  input JSONB,
  output JSONB,
  status VARCHAR(50),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error TEXT
);
```

**Core Components**:
- **DAG Parser**: Parse workflow definitions
- **Execution Engine**: Step-by-step execution with parallelism
- **Context Manager**: Share data between steps
- **Error Handler**: Retry logic, fallbacks
- **Event Emitter**: Real-time status updates

**API Endpoints**:
- `POST /api/workflows/` - Create workflow
- `GET /api/workflows/{id}/` - Get workflow
- `POST /api/workflows/{id}/execute` - Start execution
- `GET /api/executions/{id}/` - Get execution status
- `GET /api/executions/{id}/logs` - Stream execution logs
- `POST /api/workflows/{id}/validate` - Validate workflow

#### 3.1.2. Visual Workflow Builder Backend
**Priority**: MEDIUM | **Effort**: 2 weeks | **Status**: ❌ Not Started

Support for the visual builder UI:

**Features**:
- Node types (Agent, Condition, Loop, Parallel)
- Edge validation (type checking)
- Workflow templates
- Version control
- Export/Import (JSON, YAML)

### 3.2. Chat Service Enhancements

#### 3.2.1. Message Streaming Implementation
**Priority**: CRITICAL | **Effort**: 1 week | **Status**: 🚧 Partially Implemented

Complete the streaming functionality:

```python
# repos/chat-service/app/websocket/handlers.py
class StreamingHandler:
    async def handle_stream_start(self, session_id: str):
        # Initialize streaming session
        pass

    async def handle_token(self, session_id: str, token: str):
        # Broadcast token to subscribers
        await self.broadcast(f"session:{session_id}", {
            "type": "token",
            "data": {"token": token}
        })

    async def handle_stream_end(self, session_id: str, metadata: dict):
        # Finalize message, save to DB
        pass
```

#### 3.2.2. File Attachment Support
**Priority**: MEDIUM | **Effort**: 1 week | **Status**: ❌ Not Started

**Features**:
- File upload to S3/MinIO
- Image preview generation
- Document parsing (PDF, DOCX)
- Size/type validation
- Virus scanning integration

**Database Changes**:
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY,
  message_id UUID REFERENCES messages(id),
  filename VARCHAR(255),
  content_type VARCHAR(100),
  size_bytes BIGINT,
  storage_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB,
  created_at TIMESTAMP
);
```

### 3.3. Tracing Service Enhancements

#### 3.3.1. Advanced Log Analysis
**Priority**: MEDIUM | **Effort**: 2 weeks | **Status**: ❌ Not Started

**Features**:
- Pattern detection for common errors
- Performance bottleneck identification
- Automatic alert generation
- Log aggregation by trace_id
- Custom query language for log search

**New Endpoints**:
- `POST /api/tracing/analyze` - Analyze logs for patterns
- `GET /api/tracing/alerts` - Get generated alerts
- `POST /api/tracing/query` - Custom log queries

### 3.4. Worker Service Tasks

#### 3.4.1. Scheduled Tasks Implementation
**Priority**: HIGH | **Effort**: 1 week | **Status**: 🚧 Partially Implemented

Complete the Celery task implementations:

```python
# repos/worker-service/app/tasks.py

@celery.task
def health_check_agents():
    """Check health of all active agents"""
    agents = get_active_agents()
    for agent in agents:
        try:
            response = requests.get(f"{agent.url}/health", timeout=5)
            update_agent_health(agent.id, response.status_code == 200)
        except Exception as e:
            update_agent_health(agent.id, False, str(e))

@celery.task
def aggregate_statistics():
    """Hourly statistics aggregation"""
    # Token usage by user
    # Agent usage frequency
    # Error rates
    # Performance metrics
    pass

@celery.task
def cleanup_old_data():
    """Daily cleanup of old sessions and logs"""
    # Archive sessions older than 30 days
    # Delete logs older than 90 days
    # Compress large attachments
    pass

@celery.task
def generate_reports():
    """Weekly/Monthly reports"""
    # Usage reports per department
    # Cost analysis
    # Performance trends
    pass
```

**Schedule Configuration**:
```python
# repos/worker-service/app/celeryconfig.py
from celery.schedules import crontab

beat_schedule = {
    'health-check': {
        'task': 'tasks.health_check_agents',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
    'aggregate-stats': {
        'task': 'tasks.aggregate_statistics',
        'schedule': crontab(minute=0),  # Every hour
    },
    'cleanup': {
        'task': 'tasks.cleanup_old_data',
        'schedule': crontab(hour=3, minute=0),  # Daily at 3 AM
    },
    'reports': {
        'task': 'tasks.generate_reports',
        'schedule': crontab(day_of_week=1, hour=9),  # Monday 9 AM
    },
}
```

### 3.5. Authentication & Security

#### 3.5.1. Token Refresh Mechanism
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Implement JWT refresh tokens:

```python
# repos/user-service/app/core/security.py
def create_tokens(user: User) -> dict:
    access_token = create_jwt(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=30)
    )
    refresh_token = create_jwt(
        data={"sub": user.username, "type": "refresh"},
        expires_delta=timedelta(days=7)
    )
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

# New endpoint
@router.post("/api/auth/refresh")
async def refresh_token(refresh_token: str):
    # Validate refresh token
    # Issue new access token
    pass
```

#### 3.5.2. Rate Limiting Implementation
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Add rate limiting to all services:

```python
# repos/api-gateway/middleware/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per hour", "50 per minute"]
)

# Per-endpoint limits
@limiter.limit("5 per minute")
async def create_agent():
    pass

@limiter.limit("100 per minute")
async def list_agents():
    pass
```

#### 3.5.3. Advanced RBAC
**Priority**: MEDIUM | **Effort**: 2 weeks | **Status**: ❌ Not Started

Implement fine-grained permissions:

```python
# Permission model
class Permission(BaseModel):
    resource: str  # 'agent', 'user', 'llm_model'
    action: str    # 'create', 'read', 'update', 'delete'
    scope: str     # 'own', 'department', 'all'

# Role permissions mapping
ROLE_PERMISSIONS = {
    'USER': [
        Permission('agent', 'create', 'own'),
        Permission('agent', 'read', 'all'),
        Permission('agent', 'update', 'own'),
        Permission('agent', 'delete', 'own'),
    ],
    'TEAM_LEAD': [
        Permission('agent', 'create', 'department'),
        Permission('agent', 'read', 'all'),
        Permission('agent', 'update', 'department'),
        Permission('agent', 'delete', 'department'),
        Permission('user', 'read', 'department'),
    ],
    'ADMIN': [
        Permission('*', '*', 'all'),
    ]
}
```

---

## 4. Infrastructure & DevOps

### 4.1. Production Deployment

#### 4.1.1. Kubernetes Manifests
**Priority**: HIGH | **Effort**: 2 weeks | **Status**: ❌ Not Started

Create production-ready K8s configs:

```yaml
# k8s/namespaces/a2g-platform.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: a2g-platform

# k8s/deployments/agent-service.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agent-service
  namespace: a2g-platform
spec:
  replicas: 3
  selector:
    matchLabels:
      app: agent-service
  template:
    metadata:
      labels:
        app: agent-service
    spec:
      containers:
      - name: agent-service
        image: a2g/agent-service:latest
        ports:
        - containerPort: 8002
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: agent-service-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8002
          initialDelaySeconds: 5
          periodSeconds: 5

# k8s/services/, k8s/ingress/, k8s/configmaps/, k8s/secrets/
```

#### 4.1.2. Helm Charts
**Priority**: MEDIUM | **Effort**: 1 week | **Status**: ❌ Not Started

Create Helm chart for easier deployment:

```yaml
# helm/a2g-platform/values.yaml
global:
  environment: production
  domain: a2g-platform.company.com

services:
  userService:
    replicas: 2
    image:
      repository: a2g/user-service
      tag: latest
    resources:
      requests:
        memory: 256Mi
        cpu: 250m

  agentService:
    replicas: 3
    # ...

postgresql:
  enabled: true
  auth:
    postgresPassword: "change-me"

redis:
  enabled: true
  auth:
    enabled: true
    password: "change-me"
```

### 4.2. CI/CD Pipeline

#### 4.2.1. GitHub Actions Workflows
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm run test
      - run: cd frontend && npm run build

  backend-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [user-service, agent-service, chat-service]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - run: pip install uv
      - run: cd repos/${{ matrix.service }} && uv sync
      - run: cd repos/${{ matrix.service }} && uv run pytest
      - run: cd repos/${{ matrix.service }} && uv run black --check .
      - run: cd repos/${{ matrix.service }} && uv run mypy .

  docker-build:
    needs: [frontend-tests, backend-tests]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - run: docker compose -f docker-compose.prod.yml build
      - run: docker compose -f docker-compose.prod.yml push
```

### 4.3. Monitoring & Observability

#### 4.3.1. Prometheus & Grafana Setup
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

**Metrics Collection**:
```python
# repos/shared/monitoring.py
from prometheus_client import Counter, Histogram, Gauge

# Metrics
request_count = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
request_duration = Histogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'endpoint'])
active_sessions = Gauge('websocket_active_sessions', 'Active WebSocket sessions')
token_usage = Counter('llm_tokens_total', 'Total LLM tokens used', ['model', 'user'])

# Middleware
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code
    ).inc()

    request_duration.labels(
        method=request.method,
        endpoint=request.url.path
    ).observe(duration)

    return response
```

**Grafana Dashboards**:
- System Overview (CPU, Memory, Disk)
- API Performance (RPS, Latency, Errors)
- Agent Health (Status, Response Time)
- User Activity (Active Users, Sessions)
- Token Usage (By Model, By User)
- WebSocket Connections

#### 4.3.2. OpenTelemetry Integration
**Priority**: MEDIUM | **Effort**: 1 week | **Status**: ❌ Not Started

Add distributed tracing:

```python
# repos/shared/telemetry.py
from opentelemetry import trace
from opentelemetry.exporter.jaeger import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

def setup_telemetry(service_name: str):
    trace.set_tracer_provider(TracerProvider())
    tracer = trace.get_tracer(service_name)

    jaeger_exporter = JaegerExporter(
        agent_host_name="jaeger",
        agent_port=6831,
    )

    span_processor = BatchSpanProcessor(jaeger_exporter)
    trace.get_tracer_provider().add_span_processor(span_processor)

    return tracer
```

### 4.4. Testing Infrastructure

#### 4.4.1. E2E Testing with Playwright
**Priority**: HIGH | **Effort**: 2 weeks | **Status**: ❌ Not Started

```typescript
// e2e/tests/agent-workflow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Agent Creation Workflow', () => {
  test('should create and test a new agent', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.click('text=Login with SSO');

    // Navigate to Workbench
    await page.click('text=Workbench');

    // Create Agent
    await page.click('text=New Agent');
    await page.fill('[name=name]', 'Test Agent');
    await page.fill('[name=description]', 'Test Description');
    await page.selectOption('[name=framework]', 'Agno');
    await page.fill('[name=url]', 'http://localhost:8080');

    // Upload logo
    await page.setInputFiles('[type=file]', 'test-logo.png');

    // Select capabilities
    await page.check('text=Text Generation');
    await page.check('text=Code Generation');

    // Save
    await page.click('text=Create Agent');

    // Verify
    await expect(page).toHaveText('Agent created successfully');
  });
});
```

#### 4.4.2. Load Testing with K6
**Priority**: MEDIUM | **Effort**: 1 week | **Status**: ❌ Not Started

```javascript
// k6/scenarios/agent-load.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 200 },  // Spike to 200
    { duration: '5m', target: 200 },  // Stay at 200
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
  },
};

export default function () {
  // Test agent listing
  let response = http.get('http://localhost:9050/api/agents/');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  // Test agent creation
  let payload = JSON.stringify({
    name: `Agent-${Date.now()}`,
    description: 'Load test agent',
    framework: 'Custom',
    url: 'http://example.com',
  });

  response = http.post('http://localhost:9050/api/agents/', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(response, {
    'agent created': (r) => r.status === 201,
  });
}
```

---

## 5. Documentation & API

### 5.1. API Documentation

#### 5.1.1. OpenAPI/Swagger Integration
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Add comprehensive API documentation:

```python
# repos/*/app/main.py
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="A2G Agent Service",
    description="Agent management and A2A proxy service",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="A2G Agent Service API",
        version="2.0.0",
        description="""
        ## Overview
        The Agent Service manages agent registration, discovery, and A2A protocol proxy.

        ## Authentication
        All endpoints require JWT bearer token authentication.

        ## Rate Limiting
        - Standard endpoints: 100 requests/minute
        - Create/Update operations: 10 requests/minute
        """,
        routes=app.routes,
    )

    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

#### 5.1.2. API Client SDKs
**Priority**: MEDIUM | **Effort**: 2 weeks | **Status**: ❌ Not Started

Generate client libraries:

```bash
# Generate TypeScript SDK
openapi-generator generate \
  -i http://localhost:9050/api/openapi.json \
  -g typescript-axios \
  -o sdk/typescript/

# Generate Python SDK
openapi-generator generate \
  -i http://localhost:9050/api/openapi.json \
  -g python \
  -o sdk/python/
```

### 5.2. Developer Documentation

#### 5.2.1. Agent Development Guide
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

Create comprehensive guide:
- Getting Started
- A2A Protocol Specification
- Framework Adapters Guide
- Testing Your Agent
- Deployment Best Practices
- Troubleshooting

#### 5.2.2. Platform Architecture Documentation
**Priority**: MEDIUM | **Effort**: 1 week | **Status**: ❌ Not Started

Technical documentation:
- System Architecture
- Database Schema
- API Reference
- WebSocket Events
- Security Model
- Performance Tuning

---

## 6. Performance Optimizations

### 6.1. Frontend Optimizations

#### 6.1.1. Bundle Size Reduction
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

- Code splitting by route
- Dynamic imports for heavy components
- Tree shaking optimization
- Image optimization (WebP, lazy loading)
- Font subsetting

#### 6.1.2. React Performance
**Priority**: MEDIUM | **Effort**: 1 week | **Status**: ❌ Not Started

- Implement React.memo for expensive components
- Use useMemo and useCallback appropriately
- Virtual scrolling for long lists
- Debounce search inputs
- Optimize re-renders with React DevTools

### 6.2. Backend Optimizations

#### 6.2.1. Database Optimization
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

```sql
-- Add indexes
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_owner ON agents(owner_id);
CREATE INDEX idx_messages_session ON messages(session_id);
CREATE INDEX idx_logs_trace ON logs(trace_id);

-- Add composite indexes
CREATE INDEX idx_agents_status_visibility ON agents(status, visibility);

-- Optimize queries with EXPLAIN ANALYZE
EXPLAIN ANALYZE SELECT * FROM agents WHERE status = 'PRODUCTION' AND visibility = 'public';
```

#### 6.2.2. Caching Layer
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

```python
# Redis caching
from functools import wraps
import pickle

def cache(expiration=3600):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_key = f"{func.__name__}:{str(args)}:{str(kwargs)}"

            # Try to get from cache
            cached = await redis.get(cache_key)
            if cached:
                return pickle.loads(cached)

            # Execute and cache
            result = await func(*args, **kwargs)
            await redis.setex(
                cache_key,
                expiration,
                pickle.dumps(result)
            )
            return result
        return wrapper
    return decorator

# Usage
@cache(expiration=300)  # 5 minutes
async def get_agent_recommendations(user_id: int):
    # Expensive operation
    pass
```

---

## 7. Security Enhancements

### 7.1. Security Hardening

#### 7.1.1. Input Validation & Sanitization
**Priority**: CRITICAL | **Effort**: 1 week | **Status**: ❌ Not Started

- XSS prevention (DOMPurify)
- SQL injection prevention (parameterized queries)
- Command injection prevention
- Path traversal prevention
- Request size limits

#### 7.1.2. Secrets Management
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

- Integrate with HashiCorp Vault
- Rotate secrets regularly
- Encrypt sensitive data at rest
- Use environment-specific secrets

### 7.2. Audit & Compliance

#### 7.2.1. Audit Logging
**Priority**: HIGH | **Effort**: 1 week | **Status**: ❌ Not Started

```python
# Audit log model
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID, primary_key=True)
    user_id = Column(Integer)
    action = Column(String)  # CREATE, READ, UPDATE, DELETE
    resource_type = Column(String)  # agent, user, llm_model
    resource_id = Column(String)
    changes = Column(JSONB)  # before/after values
    ip_address = Column(String)
    user_agent = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
```

#### 7.2.2. GDPR Compliance
**Priority**: MEDIUM | **Effort**: 2 weeks | **Status**: ❌ Not Started

- User data export functionality
- Right to be forgotten (data deletion)
- Consent management
- Data retention policies

---

## 8. Service-Specific Implementation Issues

### 8.1. User Service Issues

#### Authentication Problems
- **JWT Signature Verification Disabled**: Currently set to `verify_signature: False` in dev
- **No Refresh Token Implementation**: Access tokens expire without refresh mechanism
- **Hardcoded Secret Key**: JWT_SECRET_KEY is not rotated
- **Missing Session Invalidation**: No logout blacklist for JWTs

#### Database Issues
- **No Connection Pooling**: Using basic async_session_maker without pool config
- **Missing Indexes**: username and email fields need indexes for performance
- **No Soft Delete**: Hard deletion of users loses audit trail

#### API Issues
- **V1 API Duplication**: Two versions of user endpoints causing confusion
- **No Input Validation**: Missing Pydantic validators for email, username format
- **Missing Rate Limiting**: Authentication endpoints vulnerable to brute force

### 8.2. Agent Service Issues

#### A2A Proxy Problems
- **Incomplete Adapter Error Handling**: Adapters don't handle timeout/network errors
- **No Retry Logic**: Failed proxy calls aren't retried
- **Missing Circuit Breaker**: No protection against cascading failures
- **Streaming Not Fully Implemented**: SSE streaming is partial

#### Agent Registry Issues
- **No Versioning**: Agents don't have version tracking
- **Missing Health Checks**: No automatic agent health monitoring
- **Embedding Generation Failures**: OpenAI API errors not handled gracefully
- **No Agent Deduplication**: Can register same agent multiple times

#### Security Issues
- **API Keys in Plain Text**: Agent API keys stored unencrypted
- **No Request Signing**: A2A proxy doesn't verify request authenticity
- **Missing Access Control Validation**: Team visibility not properly enforced

### 8.3. Chat Service Issues

#### WebSocket Problems
- **Memory Leak**: Disconnected sessions not cleaned up
- **No Reconnection Logic**: Client disconnects lose session state
- **Missing Heartbeat**: No ping/pong to detect stale connections
- **Buffer Overflow**: No limit on message queue size

#### Session Management
- **No Session Expiry**: Old sessions accumulate indefinitely
- **Missing Pagination**: Message history loads all messages
- **No Compression**: Large messages not compressed
- **File Attachments Not Implemented**: Database schema exists but no upload logic

### 8.4. Tracing Service Issues

#### Log Collection Problems
- **No Log Rotation**: Logs grow unbounded
- **Missing Indexing**: trace_id not indexed for queries
- **No Sampling**: All logs collected causing performance impact
- **Buffer Overflow**: High log volume causes memory issues

#### Real-time Streaming
- **WebSocket Not Implemented**: Endpoint exists but doesn't stream
- **No Backpressure**: Can't handle slow consumers
- **Missing Filtering**: Can't filter logs by service or level efficiently

### 8.5. Admin Service Issues

#### LLM Model Management
- **API Keys Unencrypted**: Stored in plain text in JSONB
- **No Connection Testing**: Can't verify model API keys work
- **Missing Cost Tracking**: Token costs not actually tracked
- **No Quota Enforcement**: Rate limits defined but not enforced

#### Statistics Issues
- **Aggregation Not Implemented**: Stats are placeholders
- **No Data Retention Policy**: Stats accumulate forever
- **Missing Real-time Updates**: Stats only updated on request
- **No Export Functionality**: Can't export stats to CSV/Excel

### 8.6. Worker Service Issues

#### Celery Configuration
- **Tasks Not Implemented**: All tasks are empty placeholders
- **Beat Schedule Not Active**: Periodic tasks not running
- **No Error Handling**: Failed tasks not retried
- **Missing Monitoring**: No alerts for failed tasks

#### Specific Tasks
- **health_check_agents**: Empty implementation
- **aggregate_statistics**: No aggregation logic
- **cleanup_old_data**: Doesn't actually delete anything
- **generate_reports**: No report generation

### 8.7. API Gateway Issues

#### FastAPI Configuration
- **No Rate Limiting**: Missing rate limit middleware
- **No Caching**: Response caching not implemented
- **Missing Request ID**: Can't trace requests across services
- **No Request/Response Logging**: Traffic not logged for debugging

#### Proxy Configuration
- **Basic Routing Only**: No intelligent routing based on load
- **No Circuit Breaker**: Failed services cause cascading failures
- **Missing Retry Logic**: Failed proxied requests not retried
- **No Timeout Configuration**: Long-running requests can hang

### 8.8. Mock SSO Issues

#### Development Limitations
- **Hardcoded Secret**: JWT secret is static and shared
- **No Token Revocation**: Can't invalidate issued tokens
- **No Session Tracking**: Users can have unlimited simultaneous sessions
- **Plain HTTP Only**: No HTTPS support even in dev

#### Production Readiness
- **Not Production Ready**: Must be replaced with real SSO
- **No Audit Logging**: User logins not tracked
- **Missing Custom Claims**: Can't add department-specific claims
- **No MFA Support**: Multi-factor authentication not available

### 8.9. Infrastructure Issues

#### Docker Compose
- **No Resource Limits**: Containers can consume unlimited memory/CPU
- **Missing Health Checks**: Some services don't have health check commands
- **No Log Aggregation**: Each service logs separately
- **Volumes Not Optimized**: Database data not on separate volumes

#### Database Issues
- **No Backup Strategy**: No automated backups configured
- **Missing Connection Pooling**: PgBouncer not configured
- **No Query Monitoring**: Slow queries not tracked
- **Replication Not Setup**: No read replicas for scaling

---

## 9. Bug Fixes & Issues

### 9.1. Critical Bugs

1. **WebSocket Reconnection**: Socket.IO not reconnecting after network interruption
2. **Token Expiry**: No automatic logout when JWT expires
3. **Form Validation**: Agent creation allows empty required fields
4. **Dark Mode**: Some components don't respect theme (modals, tooltips)
5. **Pagination**: Agent list loads all items instead of paginating

### 9.2. UI/UX Issues

1. **Loading States**: No skeletons, just blank screens
2. **Error Messages**: Generic "Something went wrong" instead of helpful messages
3. **Responsive Design**: Tables break on smaller screens
4. **Accessibility**: Missing ARIA labels, keyboard navigation broken
5. **Animations**: Jarring transitions, no smooth animations

### 9.3. Backend Issues

1. **N+1 Queries**: Agent list endpoint makes separate query per agent
2. **Connection Pooling**: Database connections not properly pooled
3. **Memory Leaks**: WebSocket connections not cleaned up
4. **Race Conditions**: Concurrent updates to same agent cause conflicts
5. **Error Handling**: Unhandled exceptions crash services

---

## 10. Implementation Timeline

### Phase 1: Critical Fixes (Weeks 1-2)
- WebSocket integration completion
- Critical bug fixes
- Basic UI/UX improvements
- Token refresh mechanism

### Phase 2: UI/UX Overhaul (Weeks 3-6)
- Design system implementation
- Component library development
- Professional UI for all pages
- Dark mode fixes

### Phase 3: Backend Completion (Weeks 7-10)
- Flow mode implementation
- Worker service tasks
- Performance optimizations
- Security enhancements

### Phase 4: Production Ready (Weeks 11-14)
- Kubernetes deployment
- CI/CD pipeline
- Monitoring setup
- Documentation

### Phase 5: Advanced Features (Weeks 15-18)
- Advanced RBAC
- Audit logging
- API SDKs
- E2E testing

---

## 11. Resource Requirements

### Development Team
- **Frontend Developers**: 2 senior, 1 junior
- **Backend Developers**: 3 senior, 2 junior
- **DevOps Engineer**: 1 senior
- **UI/UX Designer**: 1 senior
- **QA Engineers**: 2 (1 manual, 1 automation)
- **Technical Writer**: 1

### Infrastructure
- **Development**: Current Docker setup
- **Staging**: Kubernetes cluster (3 nodes)
- **Production**: Kubernetes cluster (5+ nodes)
- **Monitoring**: Prometheus, Grafana, Jaeger
- **CI/CD**: GitHub Actions, ArgoCD

### Third-party Services
- **AWS/GCP/Azure**: Cloud infrastructure
- **Cloudflare**: CDN and DDoS protection
- **DataDog/NewRelic**: APM (optional)
- **Sentry**: Error tracking
- **MinIO/S3**: Object storage

---

## 12. Definition of Done

### Feature Complete
- [ ] All UI matches design mockups
- [ ] All API endpoints documented
- [ ] Unit test coverage > 80%
- [ ] E2E tests for critical paths
- [ ] Performance benchmarks met
- [ ] Security scan passed
- [ ] Code review approved
- [ ] Documentation updated

### Production Ready
- [ ] Zero critical bugs
- [ ] Load testing passed
- [ ] Monitoring dashboards ready
- [ ] Runbooks documented
- [ ] Disaster recovery tested
- [ ] GDPR compliance verified
- [ ] Accessibility audit passed
- [ ] Performance audit passed