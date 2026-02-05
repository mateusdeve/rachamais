import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { members, expenses, GroupMember } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

function normalizeId(param: string | string[] | undefined): string | undefined {
  if (param == null) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = normalizeId(params.id);
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [paidBy, setPaidBy] = useState<string>('');
  const [splitType, setSplitType] = useState<'equal' | 'values' | 'percentage'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadMembers();
    }
  }, [id]);

  useEffect(() => {
    if (user && groupMembers.length > 0 && !paidBy) {
      // Definir usuário logado como padrão
      const currentUserMember = groupMembers.find(m => m.userId === user.id);
      if (currentUserMember) {
        setPaidBy(currentUserMember.userId);
        setSelectedMembers([currentUserMember.userId]);
      } else if (groupMembers.length > 0) {
        setPaidBy(groupMembers[0].userId);
        setSelectedMembers([groupMembers[0].userId]);
      }
    }
  }, [user, groupMembers, paidBy]);

  const loadMembers = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const data = await members.list(id);
      setGroupMembers(data);
      
      // Selecionar todos os membros por padrão
      setSelectedMembers(data.map(m => m.userId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar membros';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        // Não permitir remover todos os membros
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  };

  const handleSave = async () => {
    if (!id || !amount || !description || selectedMembers.length === 0 || !paidBy) {
      showError('Preencha todos os campos obrigatórios');
      return;
    }

    const numericAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showError('Valor inválido');
      return;
    }

    setSaving(true);
    try {
      // Preparar splits baseado no tipo de divisão
      const splits = selectedMembers.map(userId => {
        if (splitType === 'equal') {
          return { userId };
        } else if (splitType === 'values') {
          // Por enquanto, igual (implementar valores customizados depois)
          return { userId, amount: numericAmount / selectedMembers.length };
        } else {
          // Por enquanto, igual (implementar porcentagem depois)
          return { userId, percentage: 100 / selectedMembers.length };
        }
      });

      await expenses.create(id, {
        description: description.trim(),
        amount: numericAmount,
        paidById: paidBy,
        splitType: splitType === 'equal' ? 'EQUAL' : splitType === 'values' ? 'EXACT' : 'PERCENTAGE',
        splits,
      });

      showSuccess('Despesa criada com sucesso!');
      router.back();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar despesa';
      showError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^\d,]/g, '');
    return numericValue;
  };

  const splitTypeLabels = {
    equal: 'Igual',
    values: 'Valores',
    percentage: 'Porcentagem',
  };

  const amountPerPerson = selectedMembers.length > 0 && amount
    ? (parseFloat(amount.replace(',', '.')) / selectedMembers.length).toFixed(2).replace('.', ',')
    : '0,00';

  if (loading && groupMembers.length === 0) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>Nova Despesa</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Valor Total</Text>
          <View style={styles.amountInputContainer}>
            <Text style={styles.currencySymbol}>R$</Text>
            <TextInput
              autoFocus
              style={styles.amountInput}
              placeholder="0,00"
              placeholderTextColor={colors.textMuted}
              value={amount}
              onChangeText={(text) => setAmount(formatAmount(text))}
              keyboardType="numeric"
            />
          </View>
          {amount && selectedMembers.length > 0 && (
            <Text style={styles.amountPerPerson}>
              R$ {amountPerPerson} por pessoa
            </Text>
          )}
        </View>

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.inputIcon}>
                <Ionicons name="bag" size={20} color={colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="O que você comprou?"
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Pago por</Text>
            <View style={styles.inputWithIcon}>
              <View style={styles.inputIcon}>
                <Ionicons name="person" size={20} color={colors.textMuted} />
              </View>
              <View style={styles.paidByInput}>
                <Text style={styles.paidByText}>
                  {groupMembers.find((m) => m.userId === paidBy)?.user.name || 'Selecione'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo de Divisão</Text>
            <View style={styles.splitTypeContainer}>
              {(['equal', 'values', 'percentage'] as const).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setSplitType(type)}
                  style={({ pressed }) => [
                    styles.splitTypeButton,
                    splitType === type && styles.splitTypeButtonActive,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.splitTypeText,
                      splitType === type && styles.splitTypeTextActive,
                    ]}
                  >
                    {splitTypeLabels[type]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Dividir entre</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Carregando membros...</Text>
              </View>
            ) : (
              <View style={styles.membersList}>
                {groupMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.userId);
                  return (
                    <Pressable
                      key={member.userId}
                      onPress={() => toggleMember(member.userId)}
                      style={({ pressed }) => [
                        styles.memberItem,
                        pressed && styles.memberItemPressed,
                      ]}
                    >
                      <View style={styles.memberInfo}>
                        <Avatar
                          src={member.user.avatarUrl || undefined}
                          name={member.user.name}
                          size={40}
                        />
                        <View style={styles.memberDetails}>
                          <Text style={styles.memberName}>{member.user.name}</Text>
                          <Text style={styles.memberAmount}>R$ {amountPerPerson}</Text>
                        </View>
                      </View>
                      <Checkbox
                        checked={isSelected}
                        onPress={() => toggleMember(member.userId)}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={handleSave}
          disabled={!amount || !description || selectedMembers.length === 0 || saving}
          loading={saving}
        >
          Salvar Despesa
        </Button>
      </View>
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
    paddingBottom: 100,
  },
  amountSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  amountLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginRight: spacing.sm,
  },
  amountInput: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    textAlign: 'center',
    fontSize: 48,
    fontWeight: '700',
    color: colors.text,
    minWidth: 200,
  },
  amountPerPerson: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  formSection: {
    gap: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputWithIcon: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
    zIndex: 10,
  },
  input: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingLeft: 48,
    paddingRight: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 56,
  },
  paidByInput: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingLeft: 48,
    paddingRight: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    justifyContent: 'center',
  },
  paidByText: {
    flex: 1,
    ...typography.styles.body,
    color: colors.text,
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  splitTypeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  splitTypeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  splitTypeButtonActive: {
    backgroundColor: colors.primary,
  },
  splitTypeText: {
    ...typography.styles.captionBold,
    color: colors.textSecondary,
  },
  splitTypeTextActive: {
    color: colors.background,
  },
  membersList: {
    backgroundColor: colors.background,
    borderRadius: 16,
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
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  memberItemPressed: {
    backgroundColor: colors.surface,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    ...typography.styles.body,
    color: colors.text,
    marginBottom: 2,
  },
  memberAmount: {
    ...typography.styles.small,
    color: colors.textSecondary,
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
});
