import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Text style={styles.heroEmoji}>💰</Text>
          </View>
          <Text style={styles.appName}>RachaMais</Text>
          <Text style={styles.tagline}>Divida contas sem complicação</Text>
          <Text style={styles.version}>Versão {APP_VERSION}</Text>
        </View>
        <View style={styles.card}>
          <Pressable
            onPress={() => Linking.openURL(PRIVACY_URL)}
            style={({ pressed }) => [styles.linkRow, pressed && styles.linkPressed]}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            <Text style={styles.linkText}>Política de privacidade</Text>
            <Ionicons name="open-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  android: { elevation: 2 },
});

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
  buttonPressed: { opacity: 0.7 },
  scroll: { flex: 1 },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroEmoji: {
    fontSize: 40,
  },
  appName: {
    ...typography.styles.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  version: {
    ...typography.styles.caption,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    ...cardShadow,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  linkText: {
    ...typography.styles.bodyBold,
    color: colors.primary,
    flex: 1,
  },
  linkPressed: { opacity: 0.9 },
});
