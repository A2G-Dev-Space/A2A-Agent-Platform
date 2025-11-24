/**
 * Trace utilities for Workbench
 */

/**
 * Generate Platform LLM Proxy endpoint URL with trace_id
 *
 * @param traceId - The trace_id to include in the URL
 * @returns Full Platform LLM Proxy endpoint URL
 */
export function getPlatformLlmEndpointUrl(traceId: string): string {
  // Use environment variable or default to localhost
  const gatewayHost = import.meta.env.VITE_HOST_IP || 'localhost';
  const gatewayPort = import.meta.env.VITE_GATEWAY_PORT || '9050';
  return `http://${gatewayHost}:${gatewayPort}/api/llm/trace/${traceId}/v1`;
}
