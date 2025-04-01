import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  // 기본적인 인증 로직
  const login = async (credentials: any) => {
    // 로그인 로직 구현
  };

  const logout = () => {
    // 로그아웃 로직 구현
  };

  // 만약 인증 훅에서 언어 관련 로직이 있다면
  // 서버 측에서 접근하는 localStorage 제거
  const getStoredLanguage = () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('language') || 'en';
    }
    return 'en'; // 서버 측 기본값
  }

  return {
    isAuthenticated,
    user,
    login,
    logout
  };
}; 