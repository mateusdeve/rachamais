import { Pressable, Text, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
}

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const getButtonStyle = () => {
    const base = [styles.button, styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`]];
    
    if (variant === 'primary') {
      base.push(styles.buttonPrimary);
    } else if (variant === 'secondary') {
      base.push(styles.buttonSecondary);
    } else if (variant === 'outline') {
      base.push(styles.buttonOutline);
    } else {
      base.push(styles.buttonGhost);
    }
    
    if (isDisabled) {
      base.push(styles.buttonDisabled);
    }
    
    return base;
  };

  const getTextStyle = () => {
    const base = [styles.text, styles[`text${size.charAt(0).toUpperCase() + size.slice(1)}`]];
    
    if (variant === 'primary' || variant === 'secondary') {
      base.push(styles.textWhite);
    } else if (variant === 'outline') {
      base.push(styles.textPrimary);
    } else {
      base.push(styles.textPrimary);
    }
    
    return base;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        ...getButtonStyle(),
        pressed && !isDisabled && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'primary' || variant === 'secondary' ? '#fff' : colors.primary} 
          size="small"
        />
      ) : typeof children === 'string' ? (
        <Text style={getTextStyle()}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  buttonSm: {
    height: 40,
    paddingHorizontal: spacing.md,
  },
  buttonMd: {
    height: 56,
    paddingHorizontal: spacing.lg,
  },
  buttonLg: {
    height: 64,
    paddingHorizontal: spacing.xl,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: colors.secondary,
  },
  buttonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontWeight: '700',
  },
  textSm: {
    fontSize: 14,
  },
  textMd: {
    fontSize: 16,
  },
  textLg: {
    fontSize: 18,
  },
  textWhite: {
    color: '#fff',
  },
  textPrimary: {
    color: colors.primary,
  },
});
