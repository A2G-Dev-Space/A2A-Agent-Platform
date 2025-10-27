// User Types
export type UserRole = 'PENDING' | 'USER' | 'ADMIN';

export interface User {
  id: number;
  username: string;
  email: string;
  username_kr: string;
  username_en: string;
  deptname_kr: string;
  deptname_en: string;
  role: UserRole;
  theme_preference: 'light' | 'dark';
  language_preference: 'ko' | 'en';
}

// Agent Types
export type AgentFramework = 'Agno' | 'ADK' | 'Langchain' | 'Custom';
export type AgentStatus = 'DEVELOPMENT' | 'PRODUCTION' | 'DISABLED';
export type AgentVisibility = 'PRIVATE' | 'TEAM' | 'ALL';
export type AgentHealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface Agent {
  id: number;
  name: string;
  description: string;
  framework: AgentFramework;
  status: AgentStatus;
  visibility: AgentVisibility;

  // Framework-specific connection info
  agno_base_url?: string;
  agno_agent_id?: string;
  a2a_endpoint?: string;
  custom_endpoint?: string;

  // Metadata
  capabilities: string[];
  skill_kr?: string;
  skill_en?: string;
  logo_url?: string;
  card_color?: string;

  // Owner info
  owner_id: number;
  owner_username: string;
  owner_username_kr: string;
  owner_deptname_kr: string;

  // Status
  health_status: AgentHealthStatus;
  created_at: string;
  updated_at: string;
}

// Chat Types
export type ChatMode = 'DEVELOPMENT' | 'PRODUCTION' | 'UNIFIED';
export type MessageRole = 'user' | 'assistant';
export type ContentType = 'text' | 'markdown' | 'code' | 'image' | 'file';

export interface ChatSession {
  id: number;
  agent_id: number;
  user_id: number;
  trace_id: string;
  title: string;
  mode: ChatMode;
  created_at: string;
}

export interface ChatMessage {
  id: number;
  session_id: number;
  role: MessageRole;
  content: string;
  content_type: ContentType;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
  created_at: string;
}

// Trace Types
export type LogType = 'LLM' | 'TOOL' | 'AGENT_TRANSFER';

export interface LogEntry {
  id: number;
  trace_id: string;
  log_type: LogType;
  agent_id?: string;

  // LLM call info
  model?: string;
  prompt?: string;
  completion?: string;
  latency_ms?: number;
  tokens_used?: number;

  // Tool call info
  tool_name?: string;
  tool_input?: any;
  tool_output?: string;

  // Agent transfer info
  from_agent_id?: string;
  to_agent_id?: string;
  transfer_reason?: string;

  timestamp: string;
}

// API Key Types
export interface APIKey {
  id: number;
  key: string;
  name: string;
  is_active: boolean;
  created_at: string;
  last_used_at?: string;
}

// LLM Model Types
export interface LLMModel {
  id: number;
  name: string;
  endpoint: string;
  api_key: string;
  is_active: boolean;
  health_status: AgentHealthStatus;
  last_health_check?: string;
  created_at: string;
  updated_at: string;
}

// Usage Stats Types
export interface LLMUsageStats {
  user_id?: number;
  user_username?: string;
  dept_name?: string;
  agent_id?: number;
  agent_name?: string;
  model: string;
  tokens_used: number;
  estimated_cost: number;
  request_count: number;
}

export interface AgentUsageStats {
  agent_id: number;
  agent_name: string;
  status: AgentStatus;
  input_count: number;
  avg_response_time: number;
}

// Mode Type
export type Mode = 'workbench' | 'hub' | 'flow';

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
