import { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
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
    // Backend de recuperação ainda não implementado
    setSent(true);
    showInfo('Em breve você poderá redefinir a senha por e-mail. Entre em contato com o suporte se precisar de ajuda.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Esqueci a senha</Text>
        <Text style={styles.subtitle}>
          Digite o e-mail da sua conta. Em breve enviaremos um link para redefinir a senha.
        </Text>
      </View>
      <View style={styles.form}>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f6' },
  content: { padding: spacing.lg, paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg },
  header: { marginBottom: spacing.xl },
  backButton: { alignSelf: 'flex-start', padding: spacing.xs, marginBottom: spacing.lg },
  pressed: { opacity: 0.7 },
  title: { ...typography.styles.h2, color: colors.text, marginBottom: spacing.sm },
  subtitle: { ...typography.styles.body, color: colors.textMuted, lineHeight: 22 },
  form: { gap: spacing.md },
  buttonWrap: { marginTop: spacing.sm },
});
