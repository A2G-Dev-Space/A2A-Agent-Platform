import { create } from 'zustand';
import { APIKey } from '@/types';
import axios from 'axios';

interface ApiKeyState {
  apiKeys: APIKey[];
  activeApiKey: APIKey | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchApiKeys: () => Promise<void>;
  fetchActiveApiKey: () => Promise<void>;
  createApiKey: (name: string) => Promise<void>;
  deleteApiKey: (id: number) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:9050';

export const useApiKeyStore = create<ApiKeyState>()((set, get) => ({
  apiKeys: [],
  activeApiKey: null,
  isLoading: false,
  error: null,

  fetchApiKeys: async () => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/auth/api-keys/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ apiKeys: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch API keys',
        isLoading: false,
      });
    }
  },

  fetchActiveApiKey: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE_URL}/api/auth/api-keys/active/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ activeApiKey: response.data });
    } catch (error: any) {
      console.error('Failed to fetch active API key:', error);
    }
  },

  createApiKey: async (name: string) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/api-keys/`,
        { name },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      set((state) => ({
        apiKeys: [...state.apiKeys, response.data],
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to create API key',
        isLoading: false,
      });
    }
  },

  deleteApiKey: async (id: number) => {
    set({ isLoading: true, error: null });
    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE_URL}/api/auth/api-keys/${id}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set((state) => ({
        apiKeys: state.apiKeys.filter((key) => key.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete API key',
        isLoading: false,
      });
    }
  },
}));
