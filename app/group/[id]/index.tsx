import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { GroupDetailSkeleton } from '@/components/group/GroupDetailSkeleton';
import { FAB } from '@/components/ui/FAB';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { groups, expenses, Group, Expense } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

const groupDetailCache: Record<string, { group: Group; expensesList: Expense[] }> = {};

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [group, setGroup] = useState<Group | null>(null);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!id) return;

    try {
      if (!isRefresh) setLoading(true);
      setError(null);

      const [groupData, expensesData] = await Promise.all([
        groups.get(id),
        expenses.list(id),
      ]);

      setGroup(groupData);
      setExpensesList(expensesData);
      groupDetailCache[id] = { group: groupData, expensesList: expensesData };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id, showError]);

  useEffect(() => {
    if (!id) return;
    const cached = groupDetailCache[id];
    if (cached) {
      setGroup(cached.group);
      setExpensesList(cached.expensesList);
      setLoading(false);
      loadData(true);
      return;
    }
    setLoading(true);
    loadData();
  }, [id, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      if (group?.id === id) {
        loadData(true);
      }
    }, [id, group?.id, loadData])
  );

  if (loading) {
    return <GroupDetailSkeleton />;
  }

  if (error || !group) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>Grupo não encontrado</Text>
        <Text style={styles.errorSubtitle}>{error || 'Verifique o link e tente novamente.'}</Text>
        <Button variant="outline" onPress={() => router.back()}>
          Voltar
        </Button>
      </View>
    );
  }

  const totalAmount = expensesList.reduce((sum, exp) => {
    const amount = typeof exp.amount === 'number' ? exp.amount : Number(exp.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  const todayExpenses = expensesList.filter((exp) => {
    const expDate = new Date(exp.date);
    const today = new Date();
    return expDate.toDateString() === today.toDateString();
  });

  const yesterdayExpenses = expensesList.filter((exp) => {
    const expDate = new Date(exp.date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return expDate.toDateString() === yesterday.toDateString();
  });

  const olderExpenses = expensesList.filter((exp) => {
    const expDate = new Date(exp.date);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return expDate.toDateString() !== new Date().toDateString() &&
           expDate.toDateString() !== yesterday.toDateString();
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <Pressable
          onPress={() => router.push(`/group/${id}/settings`)}
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="settings" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryImageContainer}>
            <View style={styles.summaryBlurBackdrop} />
            {Platform.OS === 'ios' && (
              <BlurView intensity={60} tint="light" style={StyleSheet.absoluteFill} />
            )}
            <View style={styles.summaryEmojiWrap}>
              <Text style={styles.summaryEmoji}>{group.emoji || '👥'}</Text>
            </View>
          </View>
          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>Total do Grupo</Text>
            <Text style={styles.summaryAmount}>
              R$ {(totalAmount || 0).toFixed(2).replace('.', ',')}
            </Text>
            <Text style={styles.summaryInfo}>
              Dividido entre {group.membersCount || group.members?.length || 0} pessoas
            </Text>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <Pressable
              onPress={() => setActiveTab('expenses')}
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'expenses' && styles.tabActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'expenses' && styles.tabTextActive,
                ]}
              >
                Despesas
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push(`/group/${id}/balances`)}
              style={({ pressed }) => [
                styles.tab,
                activeTab === 'balances' && styles.tabActive,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'balances' && styles.tabTextActive,
                ]}
              >
                Saldos
              </Text>
            </Pressable>
          </View>
        </View>

        {activeTab === 'expenses' && (
          <View style={styles.expensesContainer}>
            {expensesList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhuma despesa ainda</Text>
                <Text style={styles.emptyText}>
                  Adicione a primeira despesa do grupo
                </Text>
              </View>
            ) : (
              <>
                {todayExpenses.length > 0 && (
                  <View style={styles.expensesSection}>
                    <Text style={styles.sectionTitle}>Hoje</Text>
                    {todayExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} />
                    ))}
                  </View>
                )}
                {yesterdayExpenses.length > 0 && (
                  <View style={styles.expensesSection}>
                    <Text style={styles.sectionTitle}>Ontem</Text>
                    {yesterdayExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} />
                    ))}
                  </View>
                )}
                {olderExpenses.length > 0 && (
                  <View style={styles.expensesSection}>
                    <Text style={styles.sectionTitle}>Anteriores</Text>
                    {olderExpenses.map((expense) => (
                      <ExpenseCard key={expense.id} expense={expense} />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <FAB onPress={() => router.push(`/group/${id}/add-expense`)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.styles.h2,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 96,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  summaryImageContainer: {
    width: '100%',
    aspectRatio: 21 / 9,
    overflow: 'hidden',
    position: 'relative',
  },
  summaryBlurBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16, 183, 72, 0.25)',
  },
  summaryEmojiWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryEmoji: {
    fontSize: 56,
  },
  summaryContent: {
    padding: spacing.lg,
  },
  summaryLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    ...typography.styles.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryInfo: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  tabsContainer: {
    paddingBottom: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.styles.captionBold,
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.primary,
  },
  expensesContainer: {},
  expensesSection: {
    marginTop: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.styles.h3,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  errorIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.styles.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  errorSubtitle: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});
