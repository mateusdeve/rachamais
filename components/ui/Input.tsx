import { useState } from 'react';
import { TextInput, TextInputProps, View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <View style={styles.inputContainer}>
        {leftIcon && (
          <View style={styles.leftIcon}>
            {leftIcon}
          </View>
        )}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeftIcon,
            rightIcon && styles.inputWithRightIcon,
            isFocused && styles.inputFocused,
            error && styles.inputError,
          ]}
          placeholderTextColor="#61896f"
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />
        {rightIcon && (
          <View style={styles.rightIcon}>
            {rightIcon}
          </View>
        )}
      </View>
      {error && (
        <Text style={styles.errorText}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    paddingLeft: 4,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe6df',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 56,
    ...Platform.select({
      ios: {
        paddingVertical: 15,
      },
    }),
  },
  inputWithLeftIcon: {
    paddingLeft: 48,
  },
  inputWithRightIcon: {
    paddingRight: 48,
  },
  inputFocused: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  inputError: {
    borderColor: colors.error,
  },
  leftIcon: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  rightIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    zIndex: 10,
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    marginTop: spacing.xs,
    paddingLeft: 4,
  },
});
