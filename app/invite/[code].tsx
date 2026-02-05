import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { groups } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

function normalizeCode(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export default function AcceptInviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const code = normalizeCode(params.code);
  const { user, isAuthenticated } = useAuth();
  const { showError, showSuccess } = useToast();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirecionar para login se não estiver autenticado
      router.replace('/(auth)/login');
      return;
    }

    if (code) {
      loadGroupInfo();
    }
  }, [code, isAuthenticated]);

  const loadGroupInfo = async () => {
    if (!code) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await groups.join(code);
      // Se chegou aqui, conseguiu entrar
      showSuccess('Você entrou no grupo com sucesso!');
      router.replace(`/group/${response.groupId}`);
    } catch (error: any) {
      // Se o erro for "já é membro", buscar o grupo
      if (error.message?.includes('já é membro')) {
        // Tentar buscar o grupo de outra forma
        // Por enquanto, vamos mostrar erro genérico
        showError('Você já é membro deste grupo');
        router.back();
      } else if (error.message?.includes('inválido') || error.message?.includes('não encontrado')) {
        showError('Link de convite inválido ou expirado');
        router.back();
      } else {
        // Tentar buscar informações do grupo antes de entrar
        // Como não temos API para buscar por inviteCode, vamos tentar entrar mesmo
        showError(error.message || 'Erro ao processar convite');
        router.back();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!code) return;

    setJoining(true);
    try {
      const response = await groups.join(code);
      showSuccess('Você entrou no grupo com sucesso!');
      router.replace(`/group/${response.groupId}`);
    } catch (error: any) {
      if (error.message?.includes('já é membro')) {
        showError('Você já é membro deste grupo');
        router.back();
      } else {
        showError(error.message || 'Erro ao entrar no grupo');
      }
    } finally {
      setJoining(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Será redirecionado
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Processando convite...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Aceitar Convite</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail" size={64} color={colors.primary} />
        </View>

        <Text style={styles.title}>Você foi convidado!</Text>
        <Text style={styles.subtitle}>
          Clique no botão abaixo para entrar no grupo
        </Text>

        <View style={styles.buttonContainer}>
          <Button
            onPress={handleJoin}
            loading={joining}
            disabled={joining}
          >
            Entrar no Grupo
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.styles.h2,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.styles.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 400,
  },
});
