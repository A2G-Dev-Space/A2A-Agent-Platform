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
  return `http://localhost:9050/api/llm/trace/${traceId}/v1`;
}
