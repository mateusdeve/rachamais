import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback para desenvolvimento local (porta do servidor backend)
  return 'http://localhost:3001';
};

async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${getBaseURL()}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMessage = (data as { error?: string }).error || 'Erro ao processar requisição';
    throw new Error(errorMessage);
  }

  return data as T;
}

// Configurar comportamento das notificações quando o app está em foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications só funcionam em dispositivos físicos');
    return null;
  }

  try {
    // Solicitar permissão
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('Permissão de notificação negada');
      return null;
    }

    // Obter token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'ef9398d9-6719-489a-854c-405aaa0ab9a4', // Do app.json
    });
    const token = tokenData.data;

    // Enviar para API
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    try {
      await apiClient('/api/notifications/register', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      });
    } catch (error) {
      console.error('Erro ao registrar token na API:', error);
      // Não falhar se a API não estiver disponível
    }

    return token;
  } catch (error) {
    console.error('Erro ao registrar notificações:', error);
    return null;
  }
}

export async function unregisterPushNotifications(token?: string): Promise<void> {
  try {
    await apiClient('/api/notifications/unregister', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.error('Erro ao remover token da API:', error);
  }
}
