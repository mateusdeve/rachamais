import { View, StyleSheet, Platform } from 'react-native';
import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/constants/spacing';

function MemberRowSkeleton() {
  return (
    <View style={styles.memberItem}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <View style={styles.memberDetails}>
        <Skeleton width={120} height={16} borderRadius={6} style={styles.memberNameLine} />
        <Skeleton width={160} height={14} borderRadius={6} />
      </View>
    </View>
  );
}

function ActionCardSkeleton() {
  return (
    <View style={styles.actionCard}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.actionText}>
        <Skeleton width="70%" height={16} borderRadius={6} style={styles.actionTitleLine} />
        <Skeleton width="100%" height={14} borderRadius={6} />
        <Skeleton width="85%" height={14} borderRadius={6} style={styles.actionDescLine} />
      </View>
    </View>
  );
}

export function SettingsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={40} height={40} borderRadius={8} />
        <Skeleton width={160} height={24} borderRadius={8} style={styles.headerTitle} />
        <View style={styles.headerButton} />
      </View>
      <View style={styles.scrollContent}>
        <View style={styles.section}>
          <Skeleton width={180} height={20} borderRadius={6} style={styles.sectionTitle} />
          <View style={styles.infoCard}>
            <View style={styles.groupHeader}>
              <Skeleton width={48} height={48} borderRadius={8} />
              <View style={styles.groupInfo}>
                <Skeleton width={140} height={18} borderRadius={6} style={styles.groupNameLine} />
                <Skeleton width={100} height={14} borderRadius={6} />
              </View>
            </View>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Skeleton width={120} height={20} borderRadius={6} />
            <Skeleton width={80} height={28} borderRadius={8} />
          </View>
          <View style={styles.membersList}>
            <MemberRowSkeleton />
            <MemberRowSkeleton />
            <MemberRowSkeleton />
          </View>
        </View>
        <View style={styles.section}>
          <Skeleton width={60} height={20} borderRadius={6} style={styles.sectionTitle} />
          <ActionCardSkeleton />
          <ActionCardSkeleton />
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
  scrollContent: { paddingBottom: spacing.xl },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionTitle: { marginBottom: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupInfo: { flex: 1 },
  groupNameLine: { marginBottom: 8 },
  membersList: { gap: spacing.sm },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    gap: spacing.md,
  },
  memberDetails: { flex: 1 },
  memberNameLine: { marginBottom: 6 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  actionText: { flex: 1 },
  actionTitleLine: { marginBottom: 6 },
  actionDescLine: { marginTop: 4 },
});
