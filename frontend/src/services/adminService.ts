import { apiClient as api } from './api';
import type { User } from '@/types';

// V1 API returns simplified user info for management
export interface UserManagementInfo {
  id: number;
  name: string;
  email: string;
  department: string;
  role: 'PENDING' | 'USER' | 'ADMIN';
  status: string;
}

export interface UserInvite {
    email: string;
    role: 'USER' | 'ADMIN';
}

/**
 * Service for administrator-only API calls, primarily for user management.
 */
export const adminService = {
  // --- New V1 APIs (Recommended) ---

  /**
   * Fetches a list of all users for management purposes.
   * Corresponds to: GET /api/v1/users/
   */
  getAllUsers: () => api.get<User[]>('/v1/users/'),

  /**
   * Invites a new user to the platform.
   * Corresponds to: POST /api/v1/users/invite/
   */
  inviteUser: (invitation: UserInvite) => api.post<User>('/v1/users/invite/', invitation),

  /**
   * Approves a pending user registration, changing their role from PENDING to USER.
   * Corresponds to: PUT /api/v1/users/{user_id}/approve/
   */
  approveUser: (userId: number) => api.put<{ message: string }>(`/v1/users/${userId}/approve/`),

  /**
   * Rejects a pending user registration.
   * Corresponds to: DELETE /api/v1/users/{user_id}/reject/
   */
  rejectUser: (userId: number) => api.delete<{ message: string }>(`/v1/users/${userId}/reject/`),

  /**
   * Removes/bans a user by deactivating their account.
   * Corresponds to: DELETE /api/v1/users/{user_id}/remove/
   */
  removeUser: (userId: number) => api.delete<{ message: string }>(`/v1/users/${userId}/remove/`),


  // --- Legacy Admin APIs ---

  /**
   * @deprecated Use `getAllUsers()` from the v1 API instead.
   * Fetches all users with pagination and filtering.
   * Corresponds to: GET /api/admin/users
   */
  getPaginatedUsers: (params: { role?: string; department?: string; page?: number; limit?: number }) =>
    api.get('/admin/users', { params }),

  /**
   * @deprecated The v1 APIs (approveUser, rejectUser) provide more specific actions.
   * Updates a user's role directly.
   * Corresponds to: PUT /api/admin/users/{user_id}/role
   */
  updateUserRole: (userId: number, role: 'PENDING' | 'USER' | 'ADMIN') =>
    api.put(`/admin/users/${userId}/role`, { role }),
};
