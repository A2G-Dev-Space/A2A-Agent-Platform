/**
 * API Configuration Utilities
 * Handles dynamic protocol selection based on SSL configuration
 */

/**
 * Get the protocol (http or https) based on SSL configuration
 */
export function getProtocol(): 'http' | 'https' {
  const sslEnabled = import.meta.env.VITE_SSL_ENABLED === 'true'
  return sslEnabled ? 'https' : 'http'
}

/**
 * Get the WebSocket protocol (ws or wss) based on SSL configuration
 */
export function getWsProtocol(): 'ws' | 'wss' {
  const sslEnabled = import.meta.env.VITE_SSL_ENABLED === 'true'
  return sslEnabled ? 'wss' : 'ws'
}

/**
 * Get the API Gateway base URL with correct protocol
 * Use this for absolute URLs (e.g., SSE connections, EventSource)
 *
 * For regular API calls, prefer using relative paths through the Vite proxy
 */
export function getGatewayBaseUrl(): string {
  const protocol = getProtocol()
  const host = import.meta.env.VITE_HOST_IP || 'localhost'
  const port = import.meta.env.VITE_GATEWAY_PORT || '9050'
  return `${protocol}://${host}:${port}`
}

/**
 * Get the Admin API base URL
 * For use with adminAPI axios instance
 */
export function getAdminApiBaseUrl(): string {
  return `${getGatewayBaseUrl()}/api/admin`
}

/**
 * Get the LLM Proxy endpoint URL with trace_id
 * Used by Workbench for tracing
 */
export function getPlatformLlmEndpointUrl(traceId: string): string {
  return `${getGatewayBaseUrl()}/api/llm/trace/${traceId}/v1`
}

/**
 * Build URL with correct protocol for a specific service
 * Use this for direct service calls (should be refactored to go through gateway)
 *
 * @param host - Host IP or domain
 * @param port - Service port
 * @param path - API path
 */
export function buildServiceUrl(host: string, port: string | number, path: string): string {
  const protocol = getProtocol()
  return `${protocol}://${host}:${port}${path}`
}

/**
 * Build WebSocket URL with correct protocol for a specific service
 *
 * @param host - Host IP or domain
 * @param port - Service port
 * @param path - WebSocket path
 */
export function buildWebSocketUrl(host: string, port: string | number, path: string): string {
  const protocol = getWsProtocol()
  return `${protocol}://${host}:${port}${path}`
}

/**
 * Join URL segments safely by removing redundant slashes
 * Prevents double slashes when concatenating URLs
 *
 * @param baseUrl - Base URL (may have trailing slash)
 * @param path - Path to append (may have leading slash)
 * @returns Properly joined URL without double slashes
 *
 * @example
 * joinUrl('http://localhost:8000/', '/teams') => 'http://localhost:8000/teams'
 * joinUrl('http://localhost:8000', 'teams') => 'http://localhost:8000/teams'
 * joinUrl('http://localhost:8000/', 'teams') => 'http://localhost:8000/teams'
 */
export function joinUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return path
  if (!path) return baseUrl

  const base = baseUrl.replace(/\/+$/, '')  // Remove trailing slashes
  const segment = path.replace(/^\/+/, '')  // Remove leading slashes
  return `${base}/${segment}`
}
