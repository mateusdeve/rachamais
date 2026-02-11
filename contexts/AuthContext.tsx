import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { auth, User } from '@/lib/api';
import { registerForPushNotifications, unregisterPushNotifications } from '@/lib/notifications';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Carregar token e usuário do AsyncStorage na inicialização
  useEffect(() => {
    loadAuthData();
  }, []);

  // Verificar periodicamente se o token ainda está válido
  useEffect(() => {
    const isAuthenticated = !!token && !!user;
    if (!isAuthenticated || isLoading) return;

    const checkAuth = async () => {
      try {
        await auth.me();
      } catch (error) {
        // Token inválido, fazer logout
        await clearAuthData();
        router.replace('/(auth)/login');
      }
    };

    // Verificar a cada 5 minutos
    const interval = setInterval(checkAuth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [token, user, isLoading, router]);

  const loadAuthData = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
      const storedUser = await AsyncStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        let parsedUser: User;
        try {
          parsedUser = JSON.parse(storedUser);
        } catch (parseError) {
          console.error('Error parsing stored user:', parseError);
          await clearAuthData();
          setIsLoading(false);
          return;
        }

        setToken(storedToken);
        setUser(parsedUser);

        // Verificar se o token ainda é válido
        try {
          const currentUser = await auth.me();
          setUser(currentUser);
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
        } catch (error) {
          // Token inválido ou sem rede, limpar dados
          await clearAuthData();
        }
      }
    } catch (error) {
      console.error('Error loading auth data:', error);
      await clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const clearAuthData = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await auth.login({ email, password });
      
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
      
      // Registrar notificações push
      registerForPushNotifications().catch((err) => {
        console.error('Erro ao registrar notificações:', err);
      });
      
      router.replace('/(tabs)');
    } catch (error) {
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await auth.register({ name, email, password });
      
      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
      
      setToken(response.token);
      setUser(response.user);
      
      // Registrar notificações push
      registerForPushNotifications().catch((err) => {
        console.error('Erro ao registrar notificações:', err);
      });
      
      router.replace('/(tabs)');
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async (idToken: string) => {
    try {
      const response = await auth.googleLogin({ idToken });

      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));

      setToken(response.token);
      setUser(response.user);

      // Registrar notificações push
      registerForPushNotifications().catch((err) => {
        console.error('Erro ao registrar notificações:', err);
      });

      router.replace('/(tabs)');
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    // Remover token de notificações
    await unregisterPushNotifications().catch((err) => {
      console.error('Erro ao remover token de notificações:', err);
    });
    
    await clearAuthData();
    router.replace('/(auth)/login');
  };

  const refreshUser = async () => {
    try {
      const currentUser = await auth.me();
      setUser(currentUser);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(currentUser));
    } catch (error) {
      // Se falhar, fazer logout
      await logout();
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    register,
     loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
