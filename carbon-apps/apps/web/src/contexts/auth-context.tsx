import React, { createContext, useContext, useState, useEffect } from 'react';
import type { TokenPayload, UserDto } from '@enterprise/shared-types';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: UserDto | null;
  payload: TokenPayload | null;
  isAuthenticated: boolean;
  login: (accessToken: string, refreshToken: string, user: UserDto) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserDto | null>(null);
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const login = (accessToken: string, refreshToken: string, userData: UserDto) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));

    const decoded = jwtDecode<TokenPayload>(accessToken);
    setPayload(decoded);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setPayload(null);
    setUser(null);
  };

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const token = localStorage.getItem('accessToken');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          const decoded = jwtDecode<TokenPayload>(token);
          // Standard expiration check
          const isExpired = (decoded as any).exp ? (decoded as any).exp * 1000 < Date.now() : false;
          if (!isExpired) {
            setPayload(decoded);
            setUser(JSON.parse(storedUser));
          } else {
            logout();
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        payload,
        isAuthenticated: !!user,
        login,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
