import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    let url = process.env.EXPO_PUBLIC_API_URL;
    // Garantir que a URL tenha protocolo
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    return url;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback para desenvolvimento local (porta do servidor backend)
  return 'http://localhost:3001';
};

async function apiClient<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await AsyncStorage.getItem('auth_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Adicionar headers existentes se houver
  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

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
  handleNotification: async () => {
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    } as Notifications.NotificationBehavior;
  },
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
    console.log('📱 Solicitando token de notificação push...');
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'ef9398d9-6719-489a-854c-405aaa0ab9a4', // Do app.json
    });
    const token = tokenData.data;
    console.log(`✅ Token obtido: ${token.substring(0, 30)}...`);

    // Enviar para API
    const platform = Platform.OS === 'ios' ? 'ios' : 'android';
    console.log(`📤 Enviando token para API (plataforma: ${platform})...`);
    try {
      const response = await apiClient('/api/notifications/register', {
        method: 'POST',
        body: JSON.stringify({ token, platform }),
      });
      console.log('✅ Token registrado na API com sucesso:', response);
    } catch (error) {
      console.error('❌ Erro ao registrar token na API:', error);
      if (error instanceof Error) {
        console.error('❌ Mensagem de erro:', error.message);
        console.error('❌ Stack:', error.stack);
      }
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
