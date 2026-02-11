import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const { showError, showSuccess } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Para iOS, usar bundle identifier diretamente como redirect URI
  // Formato: com.bundleidentifier:/oauthredirect
  const redirectUri = Platform.OS === 'ios' 
    ? 'com.rachamais.app:/oauthredirect'
    : AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    // Android ainda não configurado - remover quando configurar
    // androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    redirectUri,
  });

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

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (!response) return;

      if (response.type === 'success') {
        const idToken = response.authentication?.idToken;

        if (!idToken) {
          showError('Não foi possível obter o token do Google.');
          return;
        }

        setIsLoading(true);
        try {
          await loginWithGoogle(idToken);
          showSuccess('Login com Google realizado com sucesso!');
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erro ao fazer login com Google';
          showError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      } else if (response.type === 'error') {
        showError('Erro ao autenticar com Google.');
      }
    };

    handleGoogleResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

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

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ou</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              pressed && styles.googleButtonPressed,
            ]}
            onPress={() => {
              if (!request) {
                showError('Serviço de login com Google não está pronto. Tente novamente.');
                return;
              }
              promptAsync().catch((err) => {
                console.error('Erro ao iniciar login com Google:', err);
                showError('Não foi possível iniciar o login com Google.');
              });
            }}
          >
            <Ionicons name="logo-google" size={20} color="#4285F4" />
            <Text style={styles.googleButtonText}>Entrar com Google</Text>
          </Pressable>
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
  googleButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  googleButtonPressed: {
    opacity: 0.9,
    backgroundColor: colors.surface,
  },
  googleButtonText: {
    ...typography.styles.bodyBold,
    color: colors.text,
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
