import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';
import type { Usuario } from '../types';

const STORAGE_KEY = 'fl_user';

interface AuthState {
  user: Usuario | null;
  loading: boolean;
  login: (codigo: string, clave: string) => Promise<Usuario>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw) as Usuario);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (codigo: string, clave: string) => {
    const u = await api.login(codigo, clave);
    setUser(u);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    return u;
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
