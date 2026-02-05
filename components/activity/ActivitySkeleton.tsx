import { View, StyleSheet, Platform } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/spacing';

function ActivityRowSkeleton() {
  return (
    <View style={styles.activityCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.activityInfo}>
        <View style={styles.activityHeader}>
          <Skeleton width="70%" height={15} borderRadius={6} style={styles.descLine} />
          <Skeleton width={56} height={12} borderRadius={6} />
        </View>
        <Skeleton width="50%" height={13} borderRadius={6} style={styles.groupLine} />
      </View>
      <Skeleton width={40} height={40} borderRadius={20} />
    </View>
  );
}

export function ActivitySkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={140} height={28} borderRadius={8} />
      </View>
      <View style={styles.scrollContent}>
        <View style={styles.dateSection}>
          <Skeleton width={120} height={16} borderRadius={6} style={styles.dateHeader} />
          <ActivityRowSkeleton />
          <ActivityRowSkeleton />
          <ActivityRowSkeleton />
          <ActivityRowSkeleton />
          <ActivityRowSkeleton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f6' },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  dateSection: {},
  dateHeader: { marginBottom: spacing.sm, marginLeft: spacing.xs },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  activityInfo: { flex: 1 },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  descLine: {},
  groupLine: {},
});
