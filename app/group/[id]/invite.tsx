import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useToast } from '@/contexts/ToastContext';
import { invite } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function InviteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showError, showSuccess } = useToast();
  const [inviteLink, setInviteLink] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) loadInviteCode();
  }, [id]);

  const loadInviteCode = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await invite.get(id);
      let baseUrl = process.env.EXPO_PUBLIC_API_URL || 'https://rachamais-production.up.railway.app';
      // Garantir que a URL tenha protocolo
      if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
        baseUrl = `https://${baseUrl}`;
      }
      const link =
        data.inviteLink ?? (data.inviteCode ? `${baseUrl}/invite/${data.inviteCode}` : '');
      setInviteLink(link);
      setGroupName(data.groupName ?? 'o grupo');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erro ao carregar código de convite';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      const Clipboard = await import('expo-clipboard').catch(() => null);
      if (Clipboard) {
        await Clipboard.setStringAsync(inviteLink);
        showSuccess('Link copiado!');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        Alert.alert('Link de Convite', `Link: ${inviteLink}\n\nCopie o link acima.`, [
          { text: 'OK' },
        ]);
      }
    } catch {
      Alert.alert('Link de Convite', `Link: ${inviteLink}\n\nCopie o link acima.`, [
        { text: 'OK' },
      ]);
    }
  };

  const handleShare = async () => {
    if (!inviteLink || !groupName) return;
    try {
      const result = await Share.share({
        message: `Você foi convidado para o grupo "${groupName}" no RachaMais!\n\nClique no link para entrar: ${inviteLink}`,
        title: `Convite para ${groupName}`,
        url: inviteLink,
      });
      if (result.action === Share.sharedAction) {
        showSuccess('Convite compartilhado!');
      }
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : 'Erro ao compartilhar');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Convidar</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Preparando link...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Convidar</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="person-add" size={40} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>{groupName}</Text>
          <Text style={styles.heroSubtitle}>
            Convide amigos para entrarem no grupo. Compartilhe o link ou copie e envie por onde
            preferir.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="link" size={20} color={colors.textSecondary} />
            <Text style={styles.cardTitle}>Link de convite</Text>
          </View>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [
              styles.linkRow,
              pressed && styles.linkRowPressed,
            ]}
          >
            <Text style={styles.linkText} numberOfLines={1}>
              {inviteLink}
            </Text>
            <View style={[styles.copyBadge, copied && styles.copyBadgeDone]}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={20}
                color={copied ? '#fff' : colors.primary}
              />
              <Text style={[styles.copyBadgeText, copied && styles.copyBadgeTextDone]}>
                {copied ? 'Copiado' : 'Copiar'}
              </Text>
            </View>
          </Pressable>
        </View>

        <Text style={styles.hint}>Compartilhe por WhatsApp, mensagem ou e-mail</Text>

        <View style={styles.actions}>
          <Button onPress={handleShare} disabled={!inviteLink}>
            <View style={styles.buttonContent}>
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.primaryButtonText}>Compartilhar link</Text>
            </View>
          </Button>
          <Button variant="outline" onPress={handleCopy}>
            <View style={styles.buttonContent}>
              <Ionicons name="copy-outline" size={22} color={colors.primary} />
              <Text style={styles.outlineButtonText}>Copiar link</Text>
            </View>
          </Button>
        </View>
      </ScrollView>
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
    paddingHorizontal: spacing.md,
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
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  heroTitle: {
    ...typography.styles.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  linkRowPressed: {
    opacity: 0.9,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  copyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
  },
  copyBadgeDone: {
    backgroundColor: colors.primary,
  },
  copyBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  copyBadgeTextDone: {
    color: '#fff',
  },
  hint: {
    ...typography.styles.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  actions: {
    gap: spacing.md,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  outlineButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});
