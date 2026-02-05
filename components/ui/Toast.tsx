import { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  visible: boolean;
  onHide: () => void;
  duration?: number;
}

const TOAST_ACCENT = {
  success: colors.success,
  error: colors.error,
  info: colors.primary,
} as const;

const TOAST_ICON = {
  success: 'checkmark' as const,
  error: 'close' as const,
  info: 'information-circle-outline' as const,
};

export function Toast({ message, type, visible, onHide, duration = 3000 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 180,
          friction: 14,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      scale.setValue(0.92);
      onHide();
    });
  };

  if (!visible) return null;

  const accent = TOAST_ACCENT[type];
  const iconName = TOAST_ICON[type];

  return (
    <Animated.View
      style={[
        styles.wrapper,
        {
          opacity,
          transform: [{ scale }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.toast}>
        <View style={[styles.accent, { backgroundColor: accent }]} />
        <View style={styles.iconWrap}>
          <Ionicons name={iconName} size={18} color={accent} />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 88,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    paddingHorizontal: spacing.lg,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingLeft: 6,
    paddingRight: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    minWidth: 200,
    maxWidth: '92%',
    gap: spacing.sm,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  message: {
    ...typography.styles.caption,
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
});
