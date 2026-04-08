import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

interface User {
  id: string;
  role: 'PROVIDER' | 'ADMIN';
  email: string;
  mustChangePassword?: boolean;
  condominioId?: string | null;
}

interface AuthContextData {
  token: string | null;
  user: User | null;
  login: (token: string, role: string, mustChangePassword?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('@EasyBox:token'));
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (token) {
      try {
        const decoded = jwtDecode<User>(token);
        setUser(decoded);
      } catch {
        logout();
      }
    }
  }, [token]);

  const login = (newToken: string, role: string, mustChangePassword?: boolean) => {
    localStorage.setItem('@EasyBox:token', newToken);
    localStorage.setItem('@EasyBox:role', role);
    if (mustChangePassword !== undefined) {
      localStorage.setItem('@EasyBox:mustChangePassword', String(mustChangePassword));
    }
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('@EasyBox:token');
    localStorage.removeItem('@EasyBox:role');
    localStorage.removeItem('@EasyBox:mustChangePassword');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
