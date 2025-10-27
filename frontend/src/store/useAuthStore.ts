import { create } from 'zustand';
import { User, UserRole } from '@/types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  role: UserRole | null;

  // Actions
  setUser: (user: User) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
  checkAuthAndLogin: (token: string | null) => void;
}

// JWT 디코딩 헬퍼 함수
const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  role: null,

  setUser: (user) =>
    set({
      user,
      isAuthenticated: true,
      role: user.role,
    }),

  setAccessToken: (token) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      role: null,
    });
  },

  checkAuthAndLogin: (token: string | null) => {
    const storedToken = token || localStorage.getItem('accessToken');

    if (!storedToken) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        role: null,
      });
      return;
    }

    // JWT 디코딩하여 사용자 정보 추출
    const decoded = decodeJWT(storedToken);

    if (!decoded) {
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        role: null,
      });
      return;
    }

    // 토큰 만료 체크
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem('accessToken');
      set({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        role: null,
      });
      return;
    }

    // 사용자 정보 구성
    const user: User = {
      id: decoded.user_id || '',
      username: decoded.user_id || '',
      email: decoded.email || '',
      username_kr: decoded.username_kr || '',
      username_en: decoded.username_en || '',
      deptname_kr: decoded.deptname_kr || '',
      deptname_en: decoded.deptname_en || '',
      role: decoded.role || 'PENDING',
      theme_preference: 'light',
      language_preference: 'ko',
    };

    set({
      user,
      accessToken: storedToken,
      isAuthenticated: true,
      role: user.role,
    });
  },
}));
