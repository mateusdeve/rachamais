import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DebtCard } from '@/components/balances/DebtCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { balances, BalancesResponse, settlements, SimplifiedDebt } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function BalancesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [balancesData, setBalancesData] = useState<BalancesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingDebt, setPayingDebt] = useState<string | null>(null);
  const [confirmingReceipt, setConfirmingReceipt] = useState<string | null>(null);
  const [liquidating, setLiquidating] = useState(false);

  useEffect(() => {
    if (id) {
      loadBalances();
    }
  }, [id]);

  const loadBalances = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const data = await balances.get(id);
      setBalancesData(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar saldos';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePayDebt = async (debt: SimplifiedDebt) => {
    if (!id || !user) return;
    
    // Evitar múltiplos cliques
    const debtKey = `${debt.from.id}-${debt.to.id}`;
    if (payingDebt === debtKey) return;

    try {
      setPayingDebt(debtKey);
      console.log(`[FRONTEND] Criando settlement: ${debt.from.id} -> ${debt.to.id}, amount: ${debt.amount}`);
      await settlements.create(id, {
        fromUserId: debt.from.id,
        toUserId: debt.to.id,
        amount: debt.amount,
        paymentMethod: 'PIX',
      });
      showSuccess(`Pagamento de R$ ${debt.amount.toFixed(2).replace('.', ',')} registrado!`);
      // Aguardar um pouco para garantir que o backend processou tudo
      await new Promise(resolve => setTimeout(resolve, 1000)); // Aumentado para 1 segundo
      await loadBalances();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar pagamento';
      console.error('[FRONTEND] Erro ao criar settlement:', err);
      showError(errorMessage);
    } finally {
      setPayingDebt(null);
    }
  };

  const handleConfirmReceipt = async (debt: SimplifiedDebt) => {
    if (!id || !user) return;
    
    // Evitar múltiplos cliques
    const debtKey = `${debt.from.id}-${debt.to.id}`;
    if (confirmingReceipt === debtKey) return;

    try {
      setConfirmingReceipt(debtKey);
      console.log(`[FRONTEND] Confirmando recebimento: ${debt.from.id} -> ${debt.to.id}, amount: ${debt.amount}`);
      await settlements.create(id, {
        fromUserId: debt.from.id,
        toUserId: debt.to.id,
        amount: debt.amount,
        paymentMethod: 'PIX',
      });
      showSuccess(`Recebimento de R$ ${debt.amount.toFixed(2).replace('.', ',')} confirmado!`);
      // Aguardar um pouco para garantir que o backend processou tudo
      await new Promise(resolve => setTimeout(resolve, 1000));
      await loadBalances();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao confirmar recebimento';
      console.error('[FRONTEND] Erro ao confirmar recebimento:', err);
      showError(errorMessage);
    } finally {
      setConfirmingReceipt(null);
    }
  };

  const handleLiquidateAll = async () => {
    if (!id || !user || !balancesData) return;

    const userDebtsToPay = balancesData.debts.filter(debt => debt.from.id === user.id);
    
    if (userDebtsToPay.length === 0) {
      showError('Você não tem dívidas para liquidar');
      return;
    }

    const totalAmount = userDebtsToPay.reduce((sum, debt) => sum + debt.amount, 0);

    Alert.alert(
      'Liquidar Tudo',
      `Você está prestes a registrar pagamentos no valor total de R$ ${totalAmount.toFixed(2).replace('.', ',')}. Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'default',
          onPress: async () => {
            try {
              setLiquidating(true);
              await Promise.all(
                userDebtsToPay.map(debt =>
                  settlements.create(id, {
                    fromUserId: debt.from.id,
                    toUserId: debt.to.id,
                    amount: debt.amount,
                    paymentMethod: 'PIX',
                  })
                )
              );
              showSuccess(`Todos os pagamentos foram registrados! Total: R$ ${totalAmount.toFixed(2).replace('.', ',')}`);
              // Aguardar um pouco para garantir que o backend processou tudo
              await new Promise(resolve => setTimeout(resolve, 500));
              await loadBalances();
            } catch (err) {
              const errorMessage = err instanceof Error ? err.message : 'Erro ao liquidar dívidas';
              showError(errorMessage);
            } finally {
              setLiquidating(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando saldos...</Text>
      </View>
    );
  }

  if (error || !balancesData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error || 'Erro ao carregar saldos'}</Text>
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

  // Encontrar saldo do usuário logado
  const userBalance = balancesData.balances.find(b => b.userId === user?.id)?.amount || 0;

  // Mapear dívidas simplificadas
  const userDebts = balancesData.debts.map((debt) => {
    const isUserOwed = debt.to.id === user?.id;
    const isUserOwes = debt.from.id === user?.id;
    return { ...debt, isUserOwed, isUserOwes };
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
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Quem deve o quê</Text>
        <Pressable
          style={({ pressed }) => [
            styles.headerButton,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.editText}>Editar</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Seu saldo total no grupo</Text>
          <View style={styles.balanceRow}>
            <Text
              style={[
                styles.balanceAmount,
                userBalance >= 0 ? styles.balancePositive : styles.balanceNegative,
              ]}
            >
              {userBalance >= 0 ? '+' : ''}R$ {Math.abs(userBalance).toFixed(2).replace('.', ',')}
            </Text>
            <Badge variant={userBalance >= 0 ? 'primary' : 'error'}>
              {userBalance >= 0 ? 'A receber' : 'A pagar'}
            </Badge>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resumo de dívidas</Text>
          <Text style={styles.sectionSubtitle}>{balancesData.debts.length} TRANSAÇÕES</Text>
        </View>

        <View style={styles.debtsList}>
          {userDebts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={64} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>Tudo quitado!</Text>
              <Text style={styles.emptyText}>
                Não há dívidas pendentes neste grupo
              </Text>
            </View>
          ) : (
            userDebts.map((debt, index) => (
              <DebtCard
                key={index}
                debt={debt}
                isUserOwed={debt.isUserOwed}
                isUserOwes={debt.isUserOwes}
                onPay={handlePayDebt}
                onConfirmReceipt={handleConfirmReceipt}
                loading={payingDebt === `${debt.from.id}-${debt.to.id}`}
                confirmingReceipt={confirmingReceipt === `${debt.from.id}-${debt.to.id}`}
              />
            ))
          )}
        </View>

        <View style={styles.infoCard}>
          <View style={styles.infoVisualization}>
            <View style={styles.infoDot} />
            <View style={styles.infoLine} />
            <View style={styles.infoCenter}>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} />
            </View>
            <View style={styles.infoLine} />
            <View style={[styles.infoDot, styles.infoDotSecondary]} />
          </View>
          <Text style={styles.infoText}>
            O RachaMais simplifica as dívidas para reduzir o número de transferências entre vocês.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button onPress={handleLiquidateAll} disabled={liquidating || userDebts.filter(d => d.isUserOwes).length === 0}>
          <View style={styles.liquidateButtonContent}>
            {liquidating ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="card" size={20} color="#fff" />
            )}
            <Text style={styles.liquidateButtonText}>
              {liquidating ? 'Liquidando...' : 'Liquidar Tudo'}
            </Text>
          </View>
        </Button>
      </View>
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
    ...typography.styles.h3,
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
  editText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.lg,
    margin: spacing.md,
    gap: spacing.sm,
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
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  balancePositive: {
    color: colors.primary,
  },
  balanceNegative: {
    color: colors.error,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  debtsList: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
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
  infoCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  infoVisualization: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 4,
    marginBottom: spacing.md,
  },
  infoDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  infoDotSecondary: {
    backgroundColor: 'rgba(16, 183, 72, 0.4)',
  },
  infoLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  infoCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: '#f6f8f6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  liquidateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  liquidateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
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
