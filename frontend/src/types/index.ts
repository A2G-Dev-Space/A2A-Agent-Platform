// User types
export enum UserRole {
  NEW = 'NEW',
  PENDING = 'PENDING',
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: number
  username: string
  username_kr: string
  username_en: string
  email: string
  role: UserRole
  department: string  // Language-neutral department code
  department_kr: string
  department_en: string
  created_at: string
  updated_at: string
  last_login?: string
}

// Agent types
export enum AgentFramework {
  AGNO = 'Agno',
  ADK = 'ADK',
  LANGCHAIN = 'Langchain(custom)',
}

export enum AgentStatus {
  DEVELOPMENT = 'DEVELOPMENT',
  STAGING = 'STAGING',
  PRODUCTION = 'PRODUCTION',
  DEPLOYED_TEAM = 'DEPLOYED_TEAM',
  DEPLOYED_ALL = 'DEPLOYED_ALL',
  ARCHIVED = 'ARCHIVED',
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export interface Agent {
  id: number
  name: string
  title?: string
  description: string
  framework: AgentFramework
  status: AgentStatus
  a2a_endpoint: string  // For ADK framework
  agno_os_endpoint?: string  // For Agno framework
  langchain_config?: {
    endpoint?: string
    request_schema?: string
    response_format?: string
  }  // For Langchain framework
  trace_id?: string  // Unique trace ID for LLM tracking
  capabilities: {
    skills?: string[]
    description?: string
    version?: string
    languages?: string[]
  }
  embedding_vector?: number[]
  owner_id: string
  owner_username?: string
  owner_deptname_kr?: string
  department: string
  is_public: boolean
  visibility: string  // 'public', 'private', 'team'
  allowed_users?: string[]  // List of usernames with access
  health_status: HealthStatus
  logo_url?: string
  card_color?: string
  created_at: string
  updated_at: string
}

// Chat and Session types
export interface ChatSession {
  id: string
  trace_id: string
  user_id: string
  agent_id: number
  title: string
  message_count?: number
  created_at: string
  updated_at: string
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface ChatMessage {
  id: string
  session_id: string
  role: MessageRole
  content: string
  attachments?: Attachment[]
  metadata?: Record<string, any>
  created_at: string
}

export interface Attachment {
  filename: string
  size: number
  url: string
  type: string
}

// Trace and Log types
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export enum LogType {
  LLM = 'LLM',
  TOOL = 'TOOL',
  AGENT_TRANSFER = 'AGENT_TRANSFER',
  SYSTEM = 'SYSTEM',
}

export interface LogEntry {
  id: number
  trace_id: string
  service_name: string
  agent_id?: number
  level: LogLevel
  log_type?: LogType
  message: string
  metadata?: {
    model?: string
    latency_ms?: number
    prompt?: string
    completion?: string
    tool_name?: string
    tool_input?: any
    tool_output?: string
    from_agent_id?: string
    to_agent_id?: string
    transfer_reason?: string
  }
  created_at: string
  timestamp?: string
}

// API Key types
export interface APIKey {
  id: number
  name: string
  key: string
  created_at: string
  last_used?: string
}

// LLM Model types
export interface LLMModel {
  id: number
  name: string
  provider: string
  endpoint: string
  health_status: HealthStatus
  last_health_check?: string
}

// Statistics types
export interface Statistics {
  period: string
  statistics: {
    total_users: number
    active_users: number
    total_agents: number
    production_agents: number
    total_sessions: number
    total_api_calls: number
    llm_usage: Record<string, number>
  }
  daily_breakdown?: Array<{
    date: string
    sessions: number
    api_calls: number
  }>
}

// App State types
export enum AppMode {
  WORKBENCH = 'workbench',
  HUB = 'hub',
  FLOW = 'flow',
}


// WebSocket types
export interface WebSocketMessage {
  type: 'stream_start' | 'token' | 'stream_end' | 'agent_transfer' | 'error'
  content?: string
  index?: number
  session_id?: string
  agent_id?: number
  from_agent?: number
  to_agent?: number
  reason?: string
  total_tokens?: number
  execution_time?: number
  error?: {
    code: string
    message: string
    reconnect?: boolean
    retry_after?: number
  }
}

// Form types
export interface AgentFormData {
  title: string
  description: string
  framework: AgentFramework
  skill_kr?: string
  skill_en?: string
  logo_url?: string
  card_color?: string
  visibility: 'ALL' | 'TEAM' | 'PRIVATE'
}

// Auth types
export interface AuthTokens {
  access_token: string
  token_type: string
  expires_in: number
}

export interface LoginResponse extends AuthTokens {
  user: User
}

// API Response types
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: any
    timestamp?: string
    trace_id?: string
  }
}

// Top-K Recommendation types
export interface AgentRecommendation {
  agent_id: number
  name: string
  similarity_score: number
  match_reason: string
}

export interface RecommendationRequest {
  query: string
  k?: number
  filters?: {
    status?: AgentStatus
    department?: string
    framework?: AgentFramework
  }
}