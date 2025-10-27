// Mode Colors
export const MODE_COLORS = {
  workbench: {
    bg: 'bg-purple-100 dark:bg-purple-800',
    text: 'text-purple-700 dark:text-purple-200',
    border: 'border-purple-300 dark:border-purple-600',
    hover: 'hover:bg-purple-200 dark:hover:bg-purple-700',
  },
  hub: {
    bg: 'bg-sky-100 dark:bg-sky-800',
    text: 'text-sky-700 dark:text-sky-200',
    border: 'border-sky-300 dark:border-sky-600',
    hover: 'hover:bg-sky-200 dark:hover:bg-sky-700',
  },
  flow: {
    bg: 'bg-teal-100 dark:bg-teal-800',
    text: 'text-teal-700 dark:text-teal-200',
    border: 'border-teal-300 dark:border-teal-600',
    hover: 'hover:bg-teal-200 dark:hover:bg-teal-700',
  },
} as const;

// Log Type Colors
export const LOG_TYPE_COLORS = {
  LLM: {
    bg: 'bg-blue-50 dark:bg-blue-900',
    border: 'border-l-4 border-blue-300 dark:border-blue-600',
    icon: '🟦',
  },
  TOOL: {
    bg: 'bg-green-50 dark:bg-green-900',
    border: 'border-l-4 border-green-300 dark:border-green-600',
    icon: '🟩',
  },
  AGENT_TRANSFER: {
    bg: 'bg-orange-50 dark:bg-orange-900',
    border: 'border-l-4 border-orange-300 dark:border-orange-600',
    icon: '⚡',
  },
} as const;

// Health Status
export const HEALTH_STATUS = {
  healthy: { icon: '🟢', text: 'Healthy', color: 'text-green-600' },
  unhealthy: { icon: '🔴', text: 'Unhealthy', color: 'text-red-600' },
  unknown: { icon: '⚪️', text: 'Unknown', color: 'text-gray-600' },
} as const;

// Framework Display Names
export const FRAMEWORK_NAMES = {
  Agno: 'Agno',
  ADK: 'ADK (Agent Development Kit)',
  Langchain: 'Langchain',
  Custom: 'Custom',
} as const;
