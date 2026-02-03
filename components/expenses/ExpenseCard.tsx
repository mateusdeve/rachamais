import { View, Text, StyleSheet } from 'react-native';
import { Expense } from '@/lib/api';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface ExpenseCardProps {
  expense: Expense;
}

export function ExpenseCard({ expense }: ExpenseCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoje • ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem • ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>💰</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.description}>{expense.description}</Text>
          <Text style={styles.meta}>
            Pago por {expense.paidBy.name} • {formatDate(expense.date)}
          </Text>
        </View>
      </View>
      <View style={styles.amount}>
        <Text style={styles.amountText}>
          R$ {(typeof expense.amount === 'number' ? expense.amount : Number(expense.amount) || 0).toFixed(2).replace('.', ',')}
        </Text>
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
  iconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
    borderRadius: 24,
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  description: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  meta: {
    color: '#61896f',
    fontSize: 14,
  },
  amount: {
    alignItems: 'flex-end',
  },
  amountText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
