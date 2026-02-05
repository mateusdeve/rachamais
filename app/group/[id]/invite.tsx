import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useToast } from '@/contexts/ToastContext';
import { invite } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

export default function InviteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showError, showSuccess } = useToast();
  const [groupCode, setGroupCode] = useState<string>('');
  const [inviteLink, setInviteLink] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadInviteCode();
    }
  }, [id]);

  const loadInviteCode = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await invite.get(id);
      setGroupCode(data.inviteCode);
      // Garantir link e nome mesmo se a API retornar só inviteCode (ex.: backend antigo)
      const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'app.rachamais.com.br';
      const link = data.inviteLink ?? (data.inviteCode ? `${baseUrl}/invite/${data.inviteCode}` : '');
      const name = data.groupName ?? 'o grupo';
      setInviteLink(link);
      setGroupName(name);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar código de convite';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;

    try {
      // Tenta usar expo-clipboard se disponível
      const Clipboard = await import('expo-clipboard').catch(() => null);
      if (Clipboard) {
        await Clipboard.setStringAsync(inviteLink);
        showSuccess('Link copiado para a área de transferência!');
      } else {
        // Fallback: mostra o link em um alerta para copiar manualmente
        Alert.alert(
          'Link de Convite',
          `Link: ${inviteLink}\n\nCopie o link acima.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      // Fallback em caso de erro
      Alert.alert(
        'Link de Convite',
        `Link: ${inviteLink}\n\nCopie o link acima.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleShare = async () => {
    if (!inviteLink || !groupName) return;

    try {
      const result = await Share.share({
        message: `Você foi convidado para o grupo "${groupName}" no RachaMais!\n\nClique no link para entrar: ${inviteLink}`,
        title: `Convite para ${groupName}`,
        url: inviteLink, // iOS pode usar isso
      });

      if (result.action === Share.sharedAction) {
        showSuccess('Convite compartilhado com sucesso!');
      }
    } catch (error: any) {
      showError(error.message || 'Erro ao compartilhar convite');
    }
  };

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
        <Text style={styles.headerTitle}>Convidar</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando código...</Text>
          </View>
        ) : (
          <>
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>{groupName}</Text>
              <Text style={styles.groupSubtitle}>Compartilhe o link abaixo para convidar pessoas</Text>
            </View>

            <View style={styles.linkContainer}>
              <Text style={styles.linkLabel}>Link de Convite</Text>
              <View style={styles.linkBox}>
                <Text style={styles.linkText} numberOfLines={2}>
                  {inviteLink}
                </Text>
              </View>
            </View>

            <View style={styles.actions}>
              <Button onPress={handleShare} style={styles.button} disabled={!inviteLink}>
                <View style={styles.shareButtonContent}>
                  <Ionicons name="share" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>Compartilhar Link</Text>
                </View>
              </Button>

              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [
                  styles.copyButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="copy" size={20} color={colors.primary} />
                <Text style={styles.copyButtonText}>Copiar Link</Text>
              </Pressable>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    ...typography.styles.h3,
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
    paddingHorizontal: spacing.lg,
  },
  groupInfo: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  groupName: {
    ...typography.styles.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  groupSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  linkContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  linkLabel: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  linkBox: {
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 183, 72, 0.2)',
  },
  linkText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
  button: {
    width: '100%',
  },
  shareButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  copyButton: {
    width: '100%',
    height: 56,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  copyButtonText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
});
