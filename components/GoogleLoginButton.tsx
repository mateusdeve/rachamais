import { useEffect } from 'react';
import { Pressable, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';

WebBrowser.maybeCompleteAuthSession();

interface GoogleLoginButtonProps {
  onSuccess: (idToken: string) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function GoogleLoginButton({
  onSuccess,
  onError,
  disabled = false,
}: GoogleLoginButtonProps) {
  const redirectUri =
    Platform.OS === 'ios'
      ? 'com.rachamais.app:/oauthredirect'
      : AuthSession.makeRedirectUri();

  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID ?? '';

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: iosClientId || undefined,
    clientId: clientId || undefined,
    redirectUri,
  });

  useEffect(() => {
    if (!response) return;

    if (response.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (!idToken) {
        onError('Não foi possível obter o token do Google.');
        return;
      }
      onSuccess(idToken).catch((err) => {
        onError(err instanceof Error ? err.message : 'Erro ao fazer login com Google');
      });
    } else if (response.type === 'error') {
      onError('Erro ao autenticar com Google.');
    }
  }, [response, onSuccess, onError]);

  const handlePress = () => {
    if (!request) {
      onError('Serviço de login com Google não está pronto. Tente novamente.');
      return;
    }
    promptAsync().catch((err) => {
      console.error('Erro ao iniciar login com Google:', err);
      onError('Não foi possível iniciar o login com Google.');
    });
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.googleButton,
        pressed && styles.googleButtonPressed,
        disabled && styles.googleButtonDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Ionicons name="logo-google" size={20} color="#4285F4" />
      <Text style={styles.googleButtonText}>Entrar com Google</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  googleButtonPressed: {
    opacity: 0.9,
    backgroundColor: colors.surface,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleButtonText: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
});
