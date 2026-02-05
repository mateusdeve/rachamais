import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/spacing';

export function GroupCardSkeleton() {
  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <Skeleton width={56} height={56} borderRadius={8} />
        <View style={styles.info}>
          <Skeleton width="70%" height={16} style={styles.nameLine} />
          <Skeleton width="45%" height={14} borderRadius={6} />
        </View>
      </View>
      <View style={styles.balance}>
        <Skeleton width={64} height={14} borderRadius={6} style={styles.balanceLine} />
        <Skeleton width={56} height={16} borderRadius={6} />
      </View>
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
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  nameLine: {
    marginBottom: 8,
  },
  balance: {
    alignItems: 'flex-end',
    gap: 6,
  },
  balanceLine: {},
});
