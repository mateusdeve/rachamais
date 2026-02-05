import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useToast } from '@/contexts/ToastContext';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { showInfo } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    if (!email.trim()) {
      showInfo('Digite seu e-mail');
      return;
    }
    setSent(true);
    showInfo(
      'Em breve você poderá redefinir a senha por e-mail. Entre em contato com o suporte se precisar de ajuda.'
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Esqueci a senha</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="key-outline" size={40} color={colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Recuperar senha</Text>
          <Text style={styles.heroSubtitle}>
            Digite o e-mail da sua conta. Em breve enviaremos um link para
            redefinir a senha.
          </Text>
        </View>

        <View style={styles.card}>
          <Input
            label="E-mail"
            placeholder="Seu e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!sent}
          />
          <View style={styles.buttonWrap}>
            <Button onPress={handleSubmit} disabled={sent}>
              {sent ? 'Enviado' : 'Enviar link'}
            </Button>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Lembrou a senha?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.back()}
            >
              Voltar ao login
            </Text>
          </Text>
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
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 56 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  pressed: { opacity: 0.7 },
  headerTitle: {
    ...typography.styles.h3,
    color: colors.text,
  },
  headerSpacer: { width: 40 },
  scroll: { flex: 1 },
  content: {
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
  heroTitle: {
    ...typography.styles.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    ...cardShadow,
  },
  buttonWrap: { marginTop: spacing.sm },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '600',
  },
});
