/**
 * Trace utilities for Workbench
 * Generates fixed trace_id based on username and agent_id
 */

/**
 * Simple hash function to create deterministic hash from string
 * Not cryptographically secure, but sufficient for trace_id generation
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Convert to hex and pad with zeros
  const hex = Math.abs(hash).toString(16).padStart(8, '0');

  // Create a longer hash by combining multiple transformations
  const hash2 = ((hash * 31) ^ (hash >> 16)) & 0xFFFFFFFF;
  const hex2 = Math.abs(hash2).toString(16).padStart(8, '0');

  const hash3 = ((hash2 * 37) ^ (hash2 >> 8)) & 0xFFFFFFFF;
  const hex3 = Math.abs(hash3).toString(16).padStart(8, '0');

  const hash4 = ((hash3 * 41) ^ (hash3 >> 12)) & 0xFFFFFFFF;
  const hex4 = Math.abs(hash4).toString(16).padStart(8, '0');

  return (hex + hex2 + hex3 + hex4).slice(0, 32);
}

/**
 * Generate a fixed trace_id from username and agent_id
 * This creates a deterministic UUID-like trace_id that's always the same
 * for a given user+agent combination
 *
 * Format: Hash(username_agentId) formatted as UUID
 * Example: "e94557b7-2e50-a79b-0168-9cf31360acfa"
 *
 * @param username - The username (e.g., "syngha.han")
 * @param agentId - The agent ID number
 * @returns UUID-formatted trace_id
 */
export function generateFixedTraceId(username: string, agentId: number): string {
  // Combine username and agent_id
  const combined = `${username}_${agentId}`;

  // Generate hash
  const hash = simpleHash(combined);

  // Format as UUID-like string
  const traceId = `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;

  return traceId;
}

/**
 * Generate Platform LLM Proxy endpoint URL with trace_id
 *
 * @param traceId - The trace_id to include in the URL
 * @returns Full Platform LLM Proxy endpoint URL
 */
export function getPlatformLlmEndpointUrl(traceId: string): string {
  return `http://localhost:9050/api/llm/trace/${traceId}/v1`;
}
