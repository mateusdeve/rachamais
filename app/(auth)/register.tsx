import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { showError, showSuccess } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleRegister = async () => {
    const newErrors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Senhas não coincidem';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      await register(name.trim(), email.trim(), password);
      showSuccess('Conta criada com sucesso!');
    } catch (error) {
      setIsLoading(false);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      showError(errorMessage);
      
      // Definir erros específicos se possível
      if (errorMessage.includes('Email') || errorMessage.includes('email')) {
        setErrors({ email: 'Este email já está cadastrado' });
      } else if (errorMessage.includes('Nome')) {
        setErrors({ name: errorMessage });
      } else if (errorMessage.includes('Senha')) {
        setErrors({ password: errorMessage });
      }
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.formContainer}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Junte-se ao RachaMais</Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Nome"
            placeholder="Seu nome completo"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) {
                setErrors({ ...errors, name: undefined });
              }
            }}
            autoCapitalize="words"
            error={errors.name}
          />

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
              if (errors.confirmPassword && confirmPassword && text !== confirmPassword) {
                setErrors({ ...errors, confirmPassword: 'Senhas não coincidem' });
              } else if (errors.confirmPassword && confirmPassword && text === confirmPassword) {
                setErrors({ ...errors, confirmPassword: undefined });
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
                  color="#61896f"
                />
              </Pressable>
            }
          />

          <Input
            label="Confirmar Senha"
            placeholder="Confirme sua senha"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              if (errors.confirmPassword) {
                if (text === password) {
                  setErrors({ ...errors, confirmPassword: undefined });
                } else {
                  setErrors({ ...errors, confirmPassword: 'Senhas não coincidem' });
                }
              }
            }}
            secureTextEntry={!showConfirmPassword}
            autoComplete="password"
            error={errors.confirmPassword}
            rightIcon={
              <Pressable
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.iconButtonPressed,
                ]}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color="#61896f"
                />
              </Pressable>
            }
          />

          <View style={styles.buttonContainer}>
            <Button onPress={handleRegister} loading={isLoading} disabled={isLoading}>
              Criar conta
            </Button>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Já tem conta?{' '}
            <Text
              style={styles.footerLink}
              onPress={() => router.back()}
            >
              Entrar
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
    backgroundColor: '#f6f8f6',
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: spacing.xl,
  },
  formContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
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
    fontSize: 16,
    fontWeight: '500',
    color: '#61896f',
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
  buttonContainer: {
    marginTop: spacing.sm,
  },
  footer: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  footerText: {
    color: '#61896f',
    fontSize: 14,
    textAlign: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: '700',
  },
});
