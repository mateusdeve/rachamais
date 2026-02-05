import { View, StyleSheet, Platform } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/spacing';

function DebtCardSkeleton() {
  return (
    <View style={styles.debtCard}>
      <View style={styles.debtHeader}>
        <View style={styles.userInfo}>
          <Skeleton width={48} height={48} borderRadius={24} />
          <View style={styles.userDetails}>
            <Skeleton width={120} height={16} borderRadius={6} style={styles.userNameLine} />
            <Skeleton width={80} height={14} borderRadius={6} />
          </View>
        </View>
        <Skeleton width={72} height={18} borderRadius={6} />
      </View>
    </View>
  );
}

export function BalancesSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <Skeleton width={140} height={24} borderRadius={8} style={styles.headerTitle} />
        <View style={styles.headerButton} />
      </View>
      <View style={styles.scrollContent}>
        <View style={styles.balanceCard}>
          <Skeleton width={180} height={14} borderRadius={6} style={styles.balanceLabel} />
          <View style={styles.balanceRow}>
            <Skeleton width={100} height={28} borderRadius={8} />
            <Skeleton width={88} height={24} borderRadius={8} />
          </View>
        </View>
        <View style={styles.sectionHeader}>
          <Skeleton width={140} height={18} borderRadius={6} />
          <Skeleton width={90} height={12} borderRadius={6} />
        </View>
        <View style={styles.debtsList}>
          <DebtCardSkeleton />
          <DebtCardSkeleton />
          <DebtCardSkeleton />
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
  headerTitle: { flex: 1, marginHorizontal: spacing.sm },
  headerButton: { width: 40, height: 40 },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  balanceLabel: { marginBottom: 8 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  debtsList: { gap: spacing.sm },
  debtCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  debtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  userDetails: { flex: 1 },
  userNameLine: { marginBottom: 6 },
});
