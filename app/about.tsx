import { View, Text, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const PRIVACY_URL = 'https://rachamais-production.up.railway.app/privacy';

export default function AboutScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sobre o app</Text>
        <View style={styles.headerButton} />
      </View>
      <View style={styles.content}>
        <Text style={styles.appName}>RachaMais</Text>
        <Text style={styles.tagline}>Divida contas sem complicação</Text>
        <Text style={styles.version}>Versão {APP_VERSION}</Text>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL)}
          style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
        >
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <Text style={styles.linkText}>Política de privacidade</Text>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f6' },
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
  headerTitle: { ...typography.styles.h2, color: colors.text, flex: 1, textAlign: 'center' as const },
  headerButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  buttonPressed: { opacity: 0.7 },
  content: { flex: 1, padding: spacing.lg, alignItems: 'center' },
  appName: { ...typography.styles.h1, color: colors.text, marginBottom: spacing.xs },
  tagline: { ...typography.styles.body, color: colors.textMuted, marginBottom: spacing.lg },
  version: { ...typography.styles.caption, color: colors.textSecondary, marginBottom: spacing.xl },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  linkText: { ...typography.styles.body, color: colors.primary, fontWeight: '600' as const },
  linkPressed: { opacity: 0.7 },
});
