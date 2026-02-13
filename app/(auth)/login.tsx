import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';
import { AppleLoginButton } from '@/components/AppleLoginButton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle, loginWithApple } = useAuth();
  const { showError, showSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const hasGoogleConfig =
    !!process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID &&
    !!process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID;

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await login(email, password);
      showSuccess('Login realizado com sucesso!');
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      showError(errorMessage);
      
      // Definir erros específicos se possível
      if (errorMessage.includes('Email') || errorMessage.includes('senha')) {
        setErrors({ email: 'Email ou senha inválidos', password: 'Email ou senha inválidos' });
      }
    }
  };

  const handleGoogleSuccess = async (idToken: string) => {
    setIsLoading(true);
    try {
      await loginWithGoogle(idToken);
      showSuccess('Login com Google realizado com sucesso!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSuccess = async (
    identityToken: string,
    fullName?: string | null,
  ) => {
    setIsLoading(true);
    try {
      await loginWithApple(identityToken, fullName);
      showSuccess('Login com Apple realizado com sucesso!');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>RachaMais</Text>
          <Text style={styles.subtitle}>Divida contas sem complicação</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="E-mail"
            placeholder="Seu e-mail"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (errors.email) {
                setErrors({ ...errors, email: undefined });
              }
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
          />

          <Input
            label="Senha"
            placeholder="Sua senha"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (errors.password) {
                setErrors({ ...errors, password: undefined });
              }
            }}
            secureTextEntry={!showPassword}
            autoComplete="password"
            error={errors.password}
            rightIcon={
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={colors.primary}
                />
              </Pressable>
            }
          />

          <Pressable
            onPress={() => router.push('/(auth)/forgot-password')}
            style={({ pressed }) => [
              styles.forgotPassword,
              pressed && styles.forgotPasswordPressed,
            ]}
          >
            <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
          </Pressable>

          <View style={styles.buttonContainer}>
            <Button onPress={handleLogin} loading={isLoading} disabled={isLoading}>
              Entrar
            </Button>
          </View>

          {hasGoogleConfig && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                onError={showError}
                disabled={isLoading}
              />

              <AppleLoginButton
                onSuccess={handleAppleSuccess}
                onError={showError}
                disabled={isLoading}
              />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Ainda não tem conta?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.push('/(auth)/register')}
            >
              Criar conta
            </Text>
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  formContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingTop: spacing.xxl,
  },
  logoContainer: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    ...typography.styles.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  iconButton: {
    padding: spacing.xs,
  },
  iconButtonPressed: {
    opacity: 0.7,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
    paddingLeft: 4,
  },
  forgotPasswordPressed: {
    opacity: 0.7,
  },
  forgotPasswordText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  buttonContainer: {
    marginTop: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingBottom: spacing.xxl,
  },
  footerText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
