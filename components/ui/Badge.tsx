import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}

export function Badge({ children, variant = 'primary' }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        variant === 'primary' && styles.badgePrimary,
        variant === 'success' && styles.badgeSuccess,
        variant === 'warning' && styles.badgeWarning,
        variant === 'error' && styles.badgeError,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary' && styles.textPrimary,
          variant === 'success' && styles.textSuccess,
          variant === 'warning' && styles.textWarning,
          variant === 'error' && styles.textError,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  badgePrimary: {
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
  textPrimary: {
    color: colors.primary,
  },
  textSuccess: {
    color: '#059669',
  },
  textWarning: {
    color: '#D97706',
  },
  textError: {
    color: colors.error,
  },
});
