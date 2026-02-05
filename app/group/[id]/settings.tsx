import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { SettingsSkeleton } from '@/components/group/SettingsSkeleton';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { groups, members, Group, GroupMember } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const emojis = ['🏖️', '🍖', '✈️', '⚽', '🔑', '🎁', '🏠', '🍕', '🎉', '🎮', '🎬', '🏋️'];

export default function GroupSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : params.id?.[0] ?? null;
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();
  const [group, setGroup] = useState<Group | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Estados para edição
  const [groupName, setGroupName] = useState('');
  const [groupEmoji, setGroupEmoji] = useState('👥');
  const [groupDescription, setGroupDescription] = useState('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const [groupData, membersData] = await Promise.all([
        groups.get(id),
        members.list(id),
      ]);
      
      setGroup(groupData);
      setGroupMembers(membersData);
      setGroupName(groupData.name);
      setGroupEmoji(groupData.emoji || '👥');
      setGroupDescription(groupData.description || '');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar dados';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = groupMembers.find(m => m.userId === user?.id)?.role === 'ADMIN';
  const isCreator = group?.createdById === user?.id;

  const handleSave = async () => {
    if (!id || !groupName.trim()) {
      showError('Nome do grupo é obrigatório');
      return;
    }

    setIsSaving(true);
    try {
      const updatedGroup = await groups.update(id, {
        name: groupName.trim(),
        emoji: groupEmoji,
        description: groupDescription.trim() || undefined,
      });
      
      setGroup(updatedGroup);
      setIsEditing(false);
      showSuccess('Grupo atualizado com sucesso!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar grupo';
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!id) return;

    Alert.alert(
      'Remover membro',
      `Tem certeza que deseja remover ${memberName} do grupo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await members.remove(id, memberId);
              showSuccess('Membro removido com sucesso!');
              loadData();
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Erro ao remover membro';
              showError(errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleLeaveGroup = () => {
    if (!id || !user) return;

    Alert.alert(
      'Sair do grupo',
      'Tem certeza que deseja sair deste grupo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await members.remove(id, user.id);
              showSuccess('Você saiu do grupo');
              router.replace('/(tabs)');
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Erro ao sair do grupo';
              showError(errorMessage);
            }
          },
        },
      ]
    );
  };

  const handleDeleteGroup = () => {
    if (!id) return;

    Alert.alert(
      'Excluir grupo',
      'Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await groups.delete(id);
              showSuccess('Grupo excluído com sucesso!');
              router.replace('/(tabs)');
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Erro ao excluir grupo';
              showError(errorMessage);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (!group) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Configurações</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.errorWrap}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Grupo não encontrado</Text>
          <Text style={styles.errorSubtitle}>Volte e tente novamente.</Text>
          <Button onPress={() => router.back()} variant="outline">
            Voltar
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && styles.buttonPressed]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero: Grupo */}
        <View style={styles.hero}>
          <View style={styles.heroEmojiWrap}>
            <Text style={styles.heroEmoji}>{group.emoji || '👥'}</Text>
          </View>
          <Text style={styles.heroName}>{group.name}</Text>
          {group.description ? (
            <Text style={styles.heroDescription}>{group.description}</Text>
          ) : null}
          {isAdmin && !isEditing && (
            <Pressable onPress={() => setIsEditing(true)} style={({ pressed }) => [styles.heroEditBtn, pressed && styles.buttonPressed]}>
              <Ionicons name="pencil" size={18} color={colors.primary} />
              <Text style={styles.heroEditText}>Editar grupo</Text>
            </Pressable>
          )}
        </View>

        {/* Card: Edição ou apenas info */}
        {isEditing ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Editar informações</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nome do grupo</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Churrasco, Viagem..."
                placeholderTextColor={colors.textMuted}
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Emoji</Text>
              <View style={styles.emojisContainer}>
                {emojis.map((emoji) => (
                  <Pressable
                    key={emoji}
                    onPress={() => setGroupEmoji(emoji)}
                    style={({ pressed }) => [
                      styles.emojiButton,
                      groupEmoji === emoji && styles.emojiButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.emojiButtonText}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Ex: Contas da viagem de julho"
                placeholderTextColor={colors.textMuted}
                value={groupDescription}
                onChangeText={setGroupDescription}
                multiline
                numberOfLines={3}
              />
            </View>
            <View style={styles.editActions}>
              <View style={styles.editActionBtn}>
                <Button
                  variant="outline"
                  onPress={() => {
                    setIsEditing(false);
                    setGroupName(group.name);
                    setGroupEmoji(group.emoji || '👥');
                    setGroupDescription(group.description || '');
                  }}
                >
                  Cancelar
                </Button>
              </View>
              <View style={styles.editActionBtn}>
                <Button onPress={handleSave} loading={isSaving} disabled={isSaving || !groupName.trim()}>
                  Salvar
                </Button>
              </View>
            </View>
          </View>
        ) : null}

        {/* Membros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Membros</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{groupMembers.length}</Text>
            </View>
            <Pressable onPress={() => id && router.push(`/group/${id}/invite`)} style={({ pressed }) => [styles.inviteButton, pressed && styles.buttonPressed]}>
              <Ionicons name="person-add-outline" size={20} color={colors.primary} />
              <Text style={styles.inviteButtonText}>Convidar</Text>
            </Pressable>
          </View>
          <View style={styles.membersCard}>
            {groupMembers.map((member, index) => {
              const isCurrentUser = member.userId === user?.id;
              const canRemove = isAdmin && !isCurrentUser && member.userId !== group.createdById;
              const isCreator = member.userId === group.createdById;
              const isAdminRole = member.role === 'ADMIN' && !isCreator;
              return (
                <View key={member.userId} style={[styles.memberRow, index === groupMembers.length - 1 && styles.memberRowLast]}>
                  <Avatar src={member.user.avatarUrl || undefined} name={member.user.name} size={44} />
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={styles.memberName}>{member.user.name}</Text>
                      {isCreator && (
                        <View style={styles.badgeCriador}>
                          <Text style={styles.badgeCriadorText}>Criador</Text>
                        </View>
                      )}
                      {isAdminRole && (
                        <View style={styles.badgeAdmin}>
                          <Text style={styles.badgeAdminText}>Admin</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.memberEmail} numberOfLines={1}>{member.user.email}</Text>
                  </View>
                  {canRemove ? (
                    <Pressable onPress={() => handleDeleteMember(member.userId, member.user.name)} style={({ pressed }) => [styles.removeBtn, pressed && styles.buttonPressed]}>
                      <Ionicons name="close-circle-outline" size={24} color={colors.textMuted} />
                    </Pressable>
                  ) : (
                    <View style={styles.removeBtnPlaceholder} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Ações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações</Text>
          <Pressable onPress={handleLeaveGroup} style={({ pressed }) => [styles.actionCard, pressed && styles.cardPressed]}>
            <View style={styles.actionIconWrap}>
              <Ionicons name="log-out-outline" size={22} color={colors.error} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Sair do grupo</Text>
              <Text style={styles.actionDescription}>Você será removido e perderá acesso às informações do grupo.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>
          {isCreator && (
            <Pressable onPress={handleDeleteGroup} style={({ pressed }) => [styles.actionCard, styles.actionCardDanger, pressed && styles.cardPressed]}>
              <View style={[styles.actionIconWrap, styles.actionIconWrapDanger]}>
                <Ionicons name="trash-outline" size={22} color={colors.error} />
              </View>
              <View style={styles.actionTextWrap}>
                <Text style={[styles.actionTitle, styles.actionTitleDanger]}>Excluir grupo</Text>
                <Text style={styles.actionDescription}>Irreversível. Todos os dados do grupo serão perdidos.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  android: { elevation: 2 },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
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
  scrollView: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  errorWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
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
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  heroEmojiWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  heroEmoji: { fontSize: 40 },
  heroName: {
    ...typography.styles.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  heroDescription: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  heroEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
  },
  heroEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...cardShadow,
  },
  cardTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.styles.h3,
    color: colors.text,
  },
  sectionBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginLeft: 'auto',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  membersCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    overflow: 'hidden',
    ...cardShadow,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  memberRowLast: { borderBottomWidth: 0 },
  memberDetails: { flex: 1, minWidth: 0 },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: 2,
  },
  memberName: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
  memberEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  badgeCriador: {
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCriadorText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  badgeAdmin: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeAdminText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
    textTransform: 'uppercase',
  },
  removeBtn: { padding: spacing.xs },
  removeBtnPlaceholder: { width: 32 },
  inputGroup: { marginBottom: spacing.md },
  label: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  emojisContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  emojiButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: 'rgba(16, 183, 72, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiButtonText: { fontSize: 24 },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  editActionBtn: { flex: 1 },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    ...cardShadow,
  },
  actionCardDanger: {
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  cardPressed: {
    opacity: 0.95,
    backgroundColor: colors.surface,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconWrapDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  actionTextWrap: { flex: 1, minWidth: 0 },
  actionTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: 2,
  },
  actionTitleDanger: { color: colors.error },
  actionDescription: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
});
