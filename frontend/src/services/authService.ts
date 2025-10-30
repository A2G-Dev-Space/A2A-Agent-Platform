import api from './api';
// Import official types from the central types file
import type { LoginResponse } from '@/types';

/**
 * Service for handling authentication flows (SSO Login, Callback, Logout).
 */
export const authService = {
  /**
   * Initiates the SSO login process by getting the SSO login URL from the backend.
   * Corresponds to: POST /api/auth/login
   * @param {string} redirectUri - The URI to redirect to after successful SSO login.
   * @returns {Promise<{ sso_login_url: string; session_id: string }>} The URL for the SSO provider.
   */
  initiateLogin: (redirectUri: string) => {
    return api.post<{ sso_login_url: string; session_id: string }>('/auth/login', {
      redirect_uri: redirectUri,
    });
  },

  /**
   * Handles the callback from the SSO provider.
   * Sends the ID token to the backend to get a JWT access token.
   * Corresponds to: POST /api/auth/callback
   * @param {string} idToken - The ID token provided by the SSO callback.
   * @returns {Promise<LoginResponse>} The access token and user info.
   */
  handleCallback: (idToken: string) => {
    return api.post<LoginResponse>('/auth/callback', { id_token: idToken });
  },

  /**
   * Logs the user out by invalidating the session/token on the backend.
   * Corresponds to: POST /api/auth/logout
   * @returns {Promise<{ message: string }>} A success message.
   */
  logout: () => {
    return api.post<{ message: string }>('/auth/logout');
  },
};