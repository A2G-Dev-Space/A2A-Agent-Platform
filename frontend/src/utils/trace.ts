/**
 * Trace utilities for Workbench
 */
import { getPlatformLlmEndpointUrl as getEndpointUrl } from '@/config/api'

/**
 * Generate Platform LLM Proxy endpoint URL with trace_id
 *
 * @param traceId - The trace_id to include in the URL
 * @returns Full Platform LLM Proxy endpoint URL
 */
export function getPlatformLlmEndpointUrl(traceId: string): string {
  return getEndpointUrl(traceId)
}
