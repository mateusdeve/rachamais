import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Handler para deep links
    const handleDeepLink = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);
      const path = parsed.path || '';
      const queryParams = parsed.queryParams || {};

      // Verificar se é um link de convite: rachamais://invite/CODE ou https://.../invite/CODE
      let inviteCode: string | null = null;

      if (path.includes('invite')) {
        const pathParts = path.split('/').filter(Boolean);
        const codeIndex = pathParts.indexOf('invite');
        if (codeIndex >= 0 && pathParts[codeIndex + 1]) {
          inviteCode = pathParts[codeIndex + 1];
        }
      } else if (queryParams.code) {
        // Extrair código dos query params
        inviteCode = Array.isArray(queryParams.code)
          ? queryParams.code[0]
          : String(queryParams.code);
      }

      if (inviteCode) {
        // Sempre salvar o código de convite para não perder em cold start (auth ainda carregando)
        AsyncStorage.setItem('pendingInviteCode', inviteCode);
        if (!isAuthenticated && !authLoading) {
          router.replace('/(auth)/login');
        } else if (isAuthenticated) {
          router.replace(`/invite/${inviteCode}` as any);
        }
        return;
      }
    };

    // Verificar se o app foi aberto por um deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
        return;
      }
    });

    // Listener para deep links quando o app já está aberto
    const subscription = Linking.addEventListener('url', handleDeepLink);

    if (!authLoading) {
      // Verificar se há um convite pendente após login
      AsyncStorage.getItem('pendingInviteCode').then((pendingCode) => {
        if (pendingCode && isAuthenticated) {
          AsyncStorage.removeItem('pendingInviteCode');
          router.replace(`/invite/${pendingCode}`);
          return;
        }

        // Se não houver deep link, fazer o fluxo normal
        const isInviteRoute = segments.some(seg => seg === 'invite');
        if (!isInviteRoute) {
          checkOnboarding();
        }
      });
    }

    return () => {
      subscription.remove();
    };
  }, [authLoading, isAuthenticated, segments]);

  const checkOnboarding = async () => {
    try {
      const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenOnboarding');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (isAuthenticated) {
        // Usuário autenticado, ir para tabs
        router.replace('/(tabs)');
      } else if (hasSeenOnboarding === 'true') {
        // Já viu onboarding mas não está autenticado, ir para login
        router.replace('/(auth)/login');
      } else {
        // Primeira vez, mostrar onboarding
        router.replace('/(auth)/onboarding');
      }
    } catch (error) {
      console.error('Error checking onboarding:', error);
      setTimeout(() => {
        router.replace('/(auth)/onboarding');
      }, 500);
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Carregando...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  text: {
    marginTop: spacing.md,
    ...typography.styles.body,
    color: colors.textSecondary,
  },
});
