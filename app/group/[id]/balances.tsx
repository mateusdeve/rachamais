import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DebtCard } from '@/components/balances/DebtCard';
import { BalancesSkeleton } from '@/components/balances/BalancesSkeleton';
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
    setLoading(true);
    try {
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
    
    const debtKey = `${debt.from.id}-${debt.to.id}`;
    if (payingDebt === debtKey) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setPayingDebt(debtKey);
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
      showError(errorMessage);
    } finally {
      setPayingDebt(null);
    }
  };

  const handleConfirmReceipt = async (debt: SimplifiedDebt) => {
    if (!id || !user) return;
    
    const debtKey = `${debt.from.id}-${debt.to.id}`;
    if (confirmingReceipt === debtKey) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setConfirmingReceipt(debtKey);
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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    return <BalancesSkeleton />;
  }

  if (error || !balancesData) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIconWrap}>
          <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
        </View>
        <Text style={styles.errorTitle}>Erro ao carregar saldos</Text>
        <Text style={styles.errorSubtitle}>{error || 'Tente novamente mais tarde.'}</Text>
        <Button variant="outline" onPress={() => router.back()}>
          Voltar
        </Button>
      </View>
    );
  }

  // Encontrar saldo do usuário logado
  const rawUserBalance = balancesData.balances.find(b => b.userId === user?.id)?.amount || 0;
  
  // Considerar valores muito próximos de zero (menos de 1 centavo) como zero
  // Isso evita problemas de arredondamento de ponto flutuante
  const isBalanceZero = Math.abs(rawUserBalance) < 0.01;
  const userBalance = isBalanceZero ? 0 : rawUserBalance;

  // Mapear dívidas simplificadas
  const userDebts = balancesData.debts.map((debt) => {
    const isUserOwed = debt.to.id === user?.id;
    const isUserOwes = debt.from.id === user?.id;
    return { ...debt, isUserOwed, isUserOwes };
  });
  
  // Verificar se há dívidas reais (com valor >= 0.01) que o usuário deve pagar
  const hasRealDebtsToPay = userDebts.some(d => d.isUserOwes && d.amount >= 0.01);

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
        <Text style={styles.headerTitle}>Quem deve o quê</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {user && !user.pixKey?.trim() && (
          <Pressable
            style={({ pressed }) => [
              styles.pixKeyWarningBanner,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Ionicons name="alert-circle" size={22} color="#B45309" />
            <View style={styles.pixKeyWarningBannerContent}>
              <Text style={styles.pixKeyWarningBannerText}>
                Cadastre sua chave PIX no perfil para receber pagamentos.
              </Text>
              <Text style={styles.pixKeyWarningBannerLink}>Cadastrar chave PIX</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#B45309" />
          </Pressable>
        )}

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Seu saldo total no grupo</Text>
          <View style={styles.balanceRow}>
            <Text
              style={[
                styles.balanceAmount,
                userBalance > 0 ? styles.balancePositive : userBalance < 0 ? styles.balanceNegative : styles.balanceSettled,
              ]}
            >
              {userBalance > 0 ? '+' : ''}R$ {Math.abs(userBalance).toFixed(2).replace('.', ',')}
            </Text>
            {userBalance === 0 ? (
              <Badge variant="primary">
                Tudo quitado
              </Badge>
            ) : (
              <Badge variant={userBalance > 0 ? 'primary' : 'error'}>
                {userBalance > 0 ? 'A receber' : 'A pagar'}
              </Badge>
            )}
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

      {hasRealDebtsToPay && (
        <View style={styles.footer}>
          <Button
            onPress={handleLiquidateAll}
            disabled={liquidating || !hasRealDebtsToPay}
            loading={liquidating}
          >
            {liquidating ? 'Liquidando...' : 'Liquidar Tudo'}
          </Button>
        </View>
      )}
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
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  pixKeyWarningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#FED7AA',
    gap: spacing.sm,
  },
  pixKeyWarningBannerContent: {
    flex: 1,
  },
  pixKeyWarningBannerText: {
    ...typography.styles.body,
    color: '#9A3412',
    marginBottom: spacing.xs,
  },
  pixKeyWarningBannerLink: {
    ...typography.styles.bodyBold,
    color: '#B45309',
  },
  balanceCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
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
  balanceLabel: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  balanceAmount: {
    ...typography.styles.h1,
    lineHeight: 40,
  },
  balancePositive: {
    color: colors.primary,
  },
  balanceNegative: {
    color: colors.error,
  },
  balanceSettled: {
    color: colors.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  sectionTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.styles.small,
    color: colors.textMuted,
  },
  debtsList: {
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
    backgroundColor: colors.border,
  },
  infoCenter: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  infoText: {
    ...typography.styles.small,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
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
