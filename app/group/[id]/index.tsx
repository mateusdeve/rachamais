import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Image, StyleSheet, Platform, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ExpenseCard } from '@/components/expenses/ExpenseCard';
import { FAB } from '@/components/ui/FAB';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { groups, expenses, Group, Expense } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function GroupDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showError } = useToast();
  const [activeTab, setActiveTab] = useState<'expenses' | 'balances'>('expenses');
  const [group, setGroup] = useState<Group | null>(null);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!id) return;

    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      setError(null);

      const [groupData, expensesData] = await Promise.all([
        groups.get(id),
        expenses.list(id),
      ]);

      setGroup(groupData);
      setExpensesList(expensesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar dados';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadData();
      }
    }, [id, loadData])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando grupo...</Text>
      </View>
    );
  }

  if (error || !group) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Grupo não encontrado'}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.errorButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.errorButtonText}>Voltar</Text>
        </Pressable>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryImageContainer}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOKLcohtd6mg2dM4QrJyJvJQqDbh3V2ZQaTcGTUvdgRCA8Wgtsnhr6hZ_EIOK1cwcqc4xB61rDjK_nYveKfPa5xn8uioXz_SpZRWge3yGmiBYBTwTMm1mU4oXuVbHB7-4xA9Jsy8y3emjD0w2bPjl_gdxeBeBQ1JIeiIK6VY3oMlvbksnNJwEjTsrIF0-KslHXmuLEOqZmUu2Cc0qoIpYr7MiIe8eKqJ_JL_AqhuhNR7SfppCvl_8BR2mbptUgLCh06G5c7EnGs6nV',
              }}
              style={styles.summaryImage}
              resizeMode="cover"
            />
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
    backgroundColor: '#f6f8f6',
  },
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
    paddingBottom: 96,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: spacing.md,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  summaryImageContainer: {
    width: '100%',
    aspectRatio: 21 / 9,
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
  },
  summaryImage: {
    width: '100%',
    height: '100%',
  },
  summaryContent: {
    padding: spacing.md,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#61896f',
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    ...typography.styles.h2,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  summaryInfo: {
    fontSize: 14,
    color: '#61896f',
  },
  tabsContainer: {
    backgroundColor: '#f6f8f6',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe6df',
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
    fontSize: 14,
    fontWeight: '700',
    color: '#61896f',
    letterSpacing: 0.015,
  },
  tabTextActive: {
    color: colors.primary,
  },
  expensesContainer: {
    paddingHorizontal: spacing.md,
  },
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
  },
  errorText: {
    ...typography.styles.h3,
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f8f6',
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
