import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Group } from '@/lib/api';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';

interface GroupCardProps {
  group: Group;
  onPress: () => void;
}

export function GroupCard({ group, onPress }: GroupCardProps) {
  const isPositive = group.userBalance > 0;
  const isNegative = group.userBalance < 0;
  const isSettled = group.userBalance === 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{group.emoji}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{group.name}</Text>
          <Text style={styles.members}>{group.membersCount} membros</Text>
        </View>
      </View>
      <View style={styles.balance}>
        {isSettled ? (
          <Text style={styles.settledText}>tudo pago</Text>
        ) : (
          <>
            <Text
              style={[
                styles.balanceLabel,
                isPositive ? styles.balancePositive : styles.balanceNegative,
              ]}
            >
              {isPositive ? 'você recebe' : 'você deve'}
            </Text>
            <Text style={styles.balanceAmount}>
              R$ {Math.abs(group.userBalance).toFixed(2).replace('.', ',')}
            </Text>
          </>
        )}
      </View>
    </Pressable>
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
  cardPressed: {
    backgroundColor: '#F9FAFB',
    opacity: 0.9,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  emojiContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
  },
  info: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  members: {
    color: '#61896f',
    fontSize: 14,
  },
  balance: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  balancePositive: {
    color: colors.primary,
  },
  balanceNegative: {
    color: colors.error,
  },
  balanceAmount: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  settledText: {
    color: colors.textMuted,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
