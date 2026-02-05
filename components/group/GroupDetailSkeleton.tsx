import { View, StyleSheet, Platform } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { ExpenseCardSkeleton } from '@/components/expenses/ExpenseCardSkeleton';
import { spacing } from '@/constants/spacing';

export function GroupDetailSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <Skeleton width={120} height={24} borderRadius={8} style={styles.titleSkeleton} />
        <Skeleton width={40} height={40} borderRadius={8} />
      </View>
      <View style={styles.scrollContent}>
        <View style={styles.summaryCard}>
          <Skeleton width="100%" height={80} borderRadius={0} style={styles.summaryImage} />
          <View style={styles.summaryContent}>
            <Skeleton width={80} height={14} borderRadius={6} style={styles.summaryLabel} />
            <Skeleton width={100} height={24} borderRadius={8} style={styles.summaryAmount} />
            <Skeleton width={140} height={14} borderRadius={6} />
          </View>
        </View>
        <View style={styles.tabs}>
          <Skeleton width="50%" height={44} borderRadius={0} />
          <Skeleton width="50%" height={44} borderRadius={0} />
        </View>
        <View style={styles.section}>
          <Skeleton width={60} height={16} borderRadius={6} style={styles.sectionTitle} />
          <ExpenseCardSkeleton />
          <ExpenseCardSkeleton />
          <ExpenseCardSkeleton />
          <ExpenseCardSkeleton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f8f6' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleSkeleton: { flex: 1, marginHorizontal: spacing.sm },
  scrollContent: { paddingBottom: 96 },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: spacing.md,
    overflow: 'hidden',
  },
  summaryImage: { borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  summaryContent: { padding: spacing.md },
  summaryLabel: { marginBottom: 8 },
  summaryAmount: { marginBottom: 8 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  section: { paddingHorizontal: spacing.md },
  sectionTitle: { marginBottom: spacing.sm, marginLeft: spacing.sm },
});
