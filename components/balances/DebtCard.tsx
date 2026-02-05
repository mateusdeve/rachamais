import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SimplifiedDebt } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface DebtCardProps {
  debt: SimplifiedDebt & { isUserOwed?: boolean; isUserOwes?: boolean };
  isUserOwed?: boolean;
  isUserOwes?: boolean;
  onPay?: (debt: SimplifiedDebt) => void;
  loading?: boolean;
}

export function DebtCard({ debt, isUserOwed, isUserOwes, onPay, loading }: DebtCardProps) {
  const isThirdParty = !isUserOwed && !isUserOwes;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {isThirdParty ? (
            <View style={styles.avatars}>
              <View style={styles.avatarWrapper}>
                <Avatar src={debt.from.avatarUrl || undefined} name={debt.from.name} size={40} />
              </View>
              <View style={[styles.avatarWrapper, styles.avatarOverlap]}>
                <Avatar src={debt.to.avatarUrl || undefined} name={debt.to.name} size={40} />
              </View>
            </View>
          ) : (
              <Avatar
              src={(isUserOwed ? debt.from : debt.to).avatarUrl || undefined}
              name={(isUserOwed ? debt.from : debt.to).name}
              size={48}
            />
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {isThirdParty
                ? `${debt.from.name} deve para ${debt.to.name}`
                : isUserOwed
                ? `${debt.from.name}`
                : debt.to.name}
            </Text>
            <Text style={styles.userRelation}>
              {isUserOwed
                ? 'deve para você'
                : isUserOwes
                ? 'você deve para ele'
                : ''}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amount,
              isUserOwed && styles.amountPositive,
              isUserOwes && styles.amountNegative,
            ]}
          >
            R$ {debt.amount.toFixed(2).replace('.', ',')}
          </Text>
        </View>
      </View>
      {!isThirdParty && (
        <View style={styles.actions}>
          {isUserOwed ? (
            <>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonPrimary,
                  styles.buttonFull,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.buttonText}>Confirmar Recebimento</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.buttonIcon,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="send" size={18} color="#6b7280" />
              </Pressable>
            </>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.buttonPrimary,
                styles.buttonFull,
                pressed && styles.buttonPressed,
                loading && styles.buttonDisabled,
              ]}
              onPress={() => onPay?.(debt)}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'Processando...' : 'Pagar Agora'}</Text>
            </Pressable>
          )}
        </View>
      )}
      {isThirdParty && (
        <Pressable
          style={({ pressed }) => [
            styles.buttonSecondary,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonSecondaryText}>Lembrar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatarWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarOverlap: {
    marginLeft: -12,
  },
  userDetails: {
    flex: 1,
    flexDirection: 'column',
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRelation: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  amountPositive: {
    color: colors.primary,
  },
  amountNegative: {
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
  },
  buttonFull: {
    flex: 1,
  },
  buttonIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
