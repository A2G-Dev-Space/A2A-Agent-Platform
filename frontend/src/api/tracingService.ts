import axiosInstance from './axios';
import { LogEntry } from '@/types';

export const tracingService = {
  // Get trace logs
  async getTraceLogs(traceId: string): Promise<LogEntry[]> {
    const response = await axiosInstance.get(`/api/tracing/logs`, {
      params: { trace_id: traceId },
    });
    return response.data;
  },
};
