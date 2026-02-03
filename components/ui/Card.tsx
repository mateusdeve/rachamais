import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { spacing } from '@/constants/spacing';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  elevated?: boolean;
}

export function Card({ children, elevated = false, style, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated && styles.cardElevated,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#dbe6df',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardElevated: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
