import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { groups, members, Group, GroupMember } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const emojis = ['🏖️', '🍖', '✈️', '⚽', '🔑', '🎁', '🏠', '🍕', '🎉', '🎮', '🎬', '🏋️'];

export default function GroupSettingsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>Grupo não encontrado</Text>
        <Button onPress={() => router.back()}>Voltar</Button>
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
        <Text style={styles.headerTitle}>Configurações</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Informações do Grupo */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Informações do Grupo</Text>
            {isAdmin && !isEditing && (
              <Pressable
                onPress={() => setIsEditing(true)}
                style={({ pressed }) => [
                  styles.editButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons name="create" size={18} color={colors.primary} />
                <Text style={styles.editButtonText}>Editar</Text>
              </Pressable>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nome do grupo</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nome do grupo"
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
                  placeholder="Descrição do grupo"
                  value={groupDescription}
                  onChangeText={setGroupDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.editActions}>
                <Button
                  onPress={() => {
                    setIsEditing(false);
                    setGroupName(group.name);
                    setGroupEmoji(group.emoji || '👥');
                    setGroupDescription(group.description || '');
                  }}
                  style={[styles.actionButton, styles.cancelButton]}
                >
                  Cancelar
                </Button>
                <Button
                  onPress={handleSave}
                  loading={isSaving}
                  disabled={isSaving || !groupName.trim()}
                  style={styles.actionButton}
                >
                  Salvar
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.infoCard}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupEmoji}>{group.emoji || '👥'}</Text>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  {group.description && (
                    <Text style={styles.groupDescription}>{group.description}</Text>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Membros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Membros ({groupMembers.length})</Text>
            <Pressable
              onPress={() => router.push(`/group/${id}/invite`)}
              style={({ pressed }) => [
                styles.inviteButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="person-add" size={18} color={colors.primary} />
              <Text style={styles.inviteButtonText}>Convidar</Text>
            </Pressable>
          </View>

          <View style={styles.membersList}>
            {groupMembers.map((member) => {
              const isCurrentUser = member.userId === user?.id;
              const canRemove = isAdmin && !isCurrentUser && member.userId !== group.createdById;
              
              return (
                <View key={member.userId} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Avatar
                      src={member.user.avatarUrl || undefined}
                      name={member.user.name}
                      size={48}
                    />
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={styles.memberName}>{member.user.name}</Text>
                        {member.userId === group.createdById && (
                          <View style={styles.badge}>
                            <Text style={styles.badgeText}>Criador</Text>
                          </View>
                        )}
                        {member.role === 'ADMIN' && member.userId !== group.createdById && (
                          <View style={[styles.badge, styles.adminBadge]}>
                            <Text style={styles.badgeText}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.memberEmail}>{member.user.email}</Text>
                    </View>
                  </View>
                  {canRemove && (
                    <Pressable
                      onPress={() => handleDeleteMember(member.userId, member.user.name)}
                      style={({ pressed }) => [
                        styles.removeButton,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons name="close-circle" size={24} color={colors.error} />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Ações */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações</Text>
          
          <Pressable
            onPress={handleLeaveGroup}
            style={({ pressed }) => [
              styles.actionCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.actionContent}>
              <View style={[styles.actionIcon, styles.leaveIcon]}>
                <Ionicons name="log-out" size={20} color={colors.error} />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={styles.actionTitle}>Sair do grupo</Text>
                <Text style={styles.actionDescription}>
                  Você será removido do grupo e perderá acesso a todas as informações
                </Text>
              </View>
            </View>
          </Pressable>

          {isCreator && (
            <Pressable
              onPress={handleDeleteGroup}
              style={({ pressed }) => [
                styles.actionCard,
                styles.deleteCard,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.actionContent}>
                <View style={[styles.actionIcon, styles.deleteIcon]}>
                  <Ionicons name="trash" size={20} color={colors.error} />
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, styles.deleteTitle]}>Excluir grupo</Text>
                  <Text style={styles.actionDescription}>
                    Esta ação não pode ser desfeita. Todos os dados do grupo serão perdidos.
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
        </View>
      </ScrollView>
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
    paddingBottom: spacing.xl,
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: '#f6f8f6',
  },
  errorText: {
    ...typography.styles.h3,
    color: colors.error,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.styles.h3,
    color: colors.text,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  editButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  inviteButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  groupEmoji: {
    fontSize: 48,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    ...typography.styles.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  groupDescription: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
  editForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputGroup: {
    gap: spacing.sm,
  },
  label: {
    ...typography.styles.bodyBold,
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbe6df',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
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
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    backgroundColor: 'rgba(16, 183, 72, 0.2)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiButtonText: {
    fontSize: 24,
  },
  editActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  membersList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: 2,
  },
  memberName: {
    ...typography.styles.body,
    color: colors.text,
    fontWeight: '600',
  },
  memberEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  badge: {
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  badgeText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  removeButton: {
    padding: spacing.xs,
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  deleteCard: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cardPressed: {
    opacity: 0.9,
    backgroundColor: '#F9FAFB',
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaveIcon: {
    backgroundColor: '#FEE2E2',
  },
  deleteIcon: {
    backgroundColor: '#FEE2E2',
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  deleteTitle: {
    color: colors.error,
  },
  actionDescription: {
    ...typography.styles.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
});
