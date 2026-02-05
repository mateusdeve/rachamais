import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroIconWrap}>
          <Ionicons name="information-circle-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Modal</Text>
        <Text style={styles.subtitle}>Conteúdo em tela modal.</Text>
      </View>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Fechar</Text>
      </Pressable>
      <Link href="/" style={styles.link} dismissTo>
        <Text style={styles.linkText}>Ir para início</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.primary} />
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : spacing.xl,
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
  title: {
    ...typography.styles.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buttonPressed: { opacity: 0.9 },
  buttonText: {
    ...typography.styles.bodyBold,
    color: colors.background,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    alignSelf: 'center',
  },
  linkText: {
    ...typography.styles.bodyBold,
    color: colors.primary,
  },
});
