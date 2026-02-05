import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const PRIVACY_URL = 'https://rachamais-production.up.railway.app/privacy';

export default function PrivacyScreen() {
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
        <Text style={styles.headerTitle}>Privacidade</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.paragraph}>
          O RachaMais coleta apenas os dados necessários para o funcionamento do app: e-mail, nome e
          informações dos grupos e despesas que você cria ou participa.
        </Text>
        <Text style={styles.paragraph}>
          Não vendemos seus dados. Eles são usados somente para autenticação, sincronização entre
          dispositivos e notificações sobre atividades nos grupos.
        </Text>
        <Text style={styles.paragraph}>
          Para a política completa, acesse o link abaixo.
        </Text>
        <Pressable
          onPress={() => Linking.openURL(PRIVACY_URL)}
          style={({ pressed }) => [styles.linkButton, pressed && styles.linkPressed]}
        >
          <Ionicons name="open-outline" size={20} color={colors.background} />
          <Text style={styles.linkButtonText}>Abrir política de privacidade</Text>
        </Pressable>
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
  paragraph: {
    ...typography.styles.body,
    color: colors.text,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 16,
    marginTop: spacing.lg,
  },
  linkButtonText: {
    ...typography.styles.bodyBold,
    color: colors.background,
  },
  linkPressed: { opacity: 0.9 },
});
