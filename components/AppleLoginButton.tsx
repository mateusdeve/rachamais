import { useEffect, useState } from 'react';
import { Pressable, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors } from '@/constants/colors';
import { typography } from '@/constants/typography';

interface AppleLoginButtonProps {
  onSuccess: (identityToken: string, fullName?: string | null) => Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
}

export function AppleLoginButton({
  onSuccess,
  onError,
  disabled = false,
}: AppleLoginButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    AppleAuthentication.isAvailableAsync()
      .then(setIsAvailable)
      .catch(() => setIsAvailable(false));
  }, []);

  const handlePress = async () => {
    if (Platform.OS !== 'ios' || !isAvailable) {
      onError('Login com Apple não está disponível neste dispositivo.');
      return;
    }

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken, fullName } = credential;

      if (!identityToken) {
        onError('Não foi possível obter o token da Apple.');
        return;
      }

      const name = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ') || undefined
        : undefined;

      await onSuccess(identityToken, name || undefined);
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') {
        return; // Usuário cancelou, não mostrar erro
      }
      console.error('Erro ao fazer login com Apple:', err);
      onError(err?.message || 'Não foi possível fazer login com Apple.');
    }
  };

  if (Platform.OS !== 'ios' || !isAvailable) {
    return null;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.appleButton,
        pressed && styles.appleButtonPressed,
        disabled && styles.appleButtonDisabled,
      ]}
      onPress={handlePress}
      disabled={disabled}
    >
      <Ionicons name="logo-apple" size={22} color={colors.text} />
      <Text style={styles.appleButtonText}>Entrar com Apple</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  appleButton: {
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
  appleButtonPressed: {
    opacity: 0.9,
    backgroundColor: colors.surface,
  },
  appleButtonDisabled: {
    opacity: 0.6,
  },
  appleButtonText: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
});
