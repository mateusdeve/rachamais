import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/spacing';

export function ExpenseCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Skeleton width={48} height={48} borderRadius={8} />
        <View style={styles.info}>
          <Skeleton width="75%" height={16} style={styles.descLine} />
          <Skeleton width="55%" height={12} borderRadius={6} />
        </View>
      </View>
      <Skeleton width={64} height={18} borderRadius={6} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  info: { flex: 1 },
  descLine: { marginBottom: 8 },
});
