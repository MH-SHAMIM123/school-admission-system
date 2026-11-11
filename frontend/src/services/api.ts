import axios, { AxiosError } from 'axios';
import type {
  SchoolClass,
  CreateClassRequest,
  HoldResponse,
  HoldStatusResponse,
  ConfirmHoldResponse,
  StudentHoldSummary,
  ApiError
} from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Auto-attach X-Student-Id from localStorage
apiClient.interceptors.request.use((config) => {
  const studentId = localStorage.getItem('studentId');
  if (studentId && studentId.trim().length === 17) {
    config.headers['X-Student-Id'] = studentId.trim();
  }
  return config;
});

export const api = {
  // Classes
  async getClasses(): Promise<SchoolClass[]> {
    const res = await apiClient.get<SchoolClass[]>('/classes');
    return res.data;
  },

  async getClassById(classId: string): Promise<SchoolClass> {
    const res = await apiClient.get<SchoolClass>(`/classes/${classId}`);
    return res.data;
  },

  async createClass(payload: CreateClassRequest): Promise<SchoolClass> {
    const res = await apiClient.post<SchoolClass>('/classes', payload);
    return res.data;
  },

  // Holds
  async createHold(classId: string): Promise<HoldResponse> {
    const res = await apiClient.post<HoldResponse>(`/classes/${classId}/holds`);
    return res.data;
  },

  async getHoldById(holdId: string): Promise<HoldStatusResponse> {
    const res = await apiClient.get<HoldStatusResponse>(`/holds/${holdId}`);
    return res.data;
  },

  async confirmHold(holdId: string): Promise<ConfirmHoldResponse> {
    const res = await apiClient.post<ConfirmHoldResponse>(`/holds/${holdId}/confirm`);
    return res.data;
  },

  async cancelHold(holdId: string): Promise<void> {
    await apiClient.delete(`/holds/${holdId}`);
  },

  // Student specific
  async getMyHolds(): Promise<StudentHoldSummary[]> {
    const res = await apiClient.get<StudentHoldSummary[]>('/me/holds');
    return res.data;
  }
};

export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const axiosError = err as AxiosError<ApiError>;
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.response?.status === 409) {
      return 'সিট শেষ হয়ে গেছে অথবা আপনি ইতিমধ্যে এই ক্লাসে আবেদন করেছেন (409 Conflict)।';
    }
    if (axiosError.response?.status === 400) {
      return 'অনুরোধটি সঠিক নয়। অনুগ্রহ করে তথ্য পরীক্ষা করুন (400 Bad Request)।';
    }
    if (axiosError.response?.status === 403) {
      return 'আপনি এই আবেদনটি পরিচালনা করতে অনুমোদিত নন (403 Forbidden)।';
    }
    if (axiosError.response?.status === 404) {
      return 'অনুরোধকৃত ক্লাস বা আবেদন খুঁজে পাওয়া যায়নি (404 Not Found)।';
    }
    if (axiosError.code === 'ERR_NETWORK') {
      return 'সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। ব্যাকএন্ড চালু আছে কিনা যাচাই করুন।';
    }
  }
  return err instanceof Error ? err.message : 'একটি অপ্রত্যাশিত সমস্যা দেখা দিয়েছে।';
}
