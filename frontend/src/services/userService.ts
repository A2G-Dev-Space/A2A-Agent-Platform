import api from './api';
// Import official types from the central types file
import type { User, APIKey } from '@/types';

// Request body types can remain local if they are not used elsewhere
export interface UpdateUserData {
  department_kr?: string;
  department_en?: string;
}

export interface CreateApiKeyData {
    name: string;
    expires_in_days?: number;
}

// This response type is specific to the create action and includes the key
export interface NewApiKeyResponse extends APIKey {
  api_key: string;
}

/**
 * Service for user-related API calls that are not strictly for authentication.
 */
export const userService = {
  /**
   * Fetches the current user's profile information.
   * Corresponds to: GET /api/users/me
   */
  getMe: () => api.get<User>('/users/me'),

  /**
   * Updates the current user's profile information.
   * Corresponds to: PUT /api/users/me
   */
  updateMe: (data: UpdateUserData) => api.put<{ message: string; user: User }>('/users/me', data),

  /**
   * Fetches the API keys for the current user.
   * Corresponds to: GET /api/users/me/api-keys
   */
  getApiKeys: () => api.get<{ api_keys: APIKey[] }>('/users/me/api-keys'),

  /**
   * Creates a new API key for the current user.
   * Corresponds to: POST /api/users/me/api-keys
   */
  createApiKey: (data: CreateApiKeyData) => api.post<NewApiKeyResponse>('/users/me/api-keys', data),

  /**
   * Deletes a specific API key.
   * Corresponds to: DELETE /api/users/me/api-keys/{key_id}
   */
  deleteApiKey: (keyId: number) => api.delete<{ message: string }>(`/users/me/api-keys/${keyId}`),
};
