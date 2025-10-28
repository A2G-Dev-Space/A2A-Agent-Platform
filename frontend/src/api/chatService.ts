import axiosInstance from './axios';
import { ChatSession, ChatMessage } from '@/types';

export const chatService = {
  // Create session
  async createSession(data: { agent_id: number; mode: string }): Promise<ChatSession> {
    const response = await axiosInstance.post('/api/chat/sessions/', data);
    return response.data;
  },

  // Get sessions
  async getSessions(agentId?: number): Promise<ChatSession[]> {
    const response = await axiosInstance.get('/api/chat/sessions/', {
      params: agentId ? { agent_id: agentId } : undefined,
    });
    return response.data;
  },

  // Get session with messages
  async getSession(id: number): Promise<ChatSession & { messages: ChatMessage[] }> {
    const response = await axiosInstance.get(`/api/chat/sessions/${id}/`);
    return response.data;
  },

  // Send message
  async sendMessage(data: {
    session_id: number;
    content: string;
    content_type?: string;
  }): Promise<ChatMessage> {
    const response = await axiosInstance.post('/api/chat/messages/', data);
    return response.data;
  },

  // Upload file
  async uploadFile(file: File): Promise<{ filename: string; url: string; size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axiosInstance.post('/api/chat/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Delete session
  async deleteSession(id: number): Promise<void> {
    await axiosInstance.delete(`/api/chat/sessions/${id}/`);
  },
};
