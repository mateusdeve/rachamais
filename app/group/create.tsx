import AsyncStorage from '@react-native-async-storage/async-storage';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useToast } from '@/contexts/ToastContext';
import { groups, User, users } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const RECENT_MEMBERS_KEY = '@rachamais/recentGroupMembers';
const MAX_RECENT_MEMBERS = 3;

const emojis = ['🏖️', '🍖', '✈️', '⚽', '🔑', '🎁', '🏠', '🍕', '🎉', '🎮', '🎬', '🏋️'];

export default function CreateGroupScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏖️');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [recentMembers, setRecentMembers] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(RECENT_MEMBERS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as User[];
          setRecentMembers(Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT_MEMBERS) : []);
        }
      } catch {
        setRecentMembers([]);
      }
    })();
  }, []);

  // Debounce para busca de usuários
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchUsers();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await users.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao buscar usuários';
      showError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const saveRecentMembers = (added: User[]) => {
    const merged = [
      ...added,
      ...recentMembers.filter((u) => !added.some((a) => a.id === u.id)),
    ].slice(0, MAX_RECENT_MEMBERS);
    setRecentMembers(merged);
    AsyncStorage.setItem(RECENT_MEMBERS_KEY, JSON.stringify(merged));
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showError('Nome do grupo é obrigatório');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsCreating(true);
    try {
      const newGroup = await groups.create({
        name: groupName.trim(),
        emoji: selectedEmoji,
        memberIds: selectedMembers.length > 0 ? selectedMembers : undefined,
      });

      if (selectedMembers.length > 0) {
        const added = selectedMembers
          .map(
            (id) =>
              searchResults.find((u) => u.id === id) || recentMembers.find((u) => u.id === id)
          )
          .filter((u): u is User => Boolean(u));
        if (added.length > 0) saveRecentMembers(added);
      }

      showSuccess('Grupo criado com sucesso!');
      router.replace(`/group/${newGroup.id}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar grupo';
      showError(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

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
        <Text style={styles.headerTitle}>Novo Grupo</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Nome do grupo</Text>
          <View style={styles.nameInputContainer}>
            <TextInput
              style={styles.nameInput}
              placeholder="Ex: Viagem de Férias, Churrasco..."
              placeholderTextColor={colors.textMuted}
              value={groupName}
              onChangeText={setGroupName}
            />
            <View style={styles.emojiDisplay}>
              <Text style={styles.emojiText}>{selectedEmoji}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Escolha um emoji</Text>
          <View style={styles.emojisContainer}>
            {emojis.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => setSelectedEmoji(emoji)}
                style={({ pressed }) => [
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.emojiButtonText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.label}>Adicionar membros</Text>
            <Text style={styles.membersCount}>
              {selectedMembers.length} selecionados
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchIconContainer}>
              <Ionicons name="search" size={20} color={colors.primary} />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar amigos pelo nome..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {recentMembers.length > 0 && searchQuery.trim().length < 2 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentLabel}>Últimos amigos adicionados</Text>
              <View style={styles.recentList}>
                {recentMembers.map((member) => {
                  const isSelected = selectedMembers.includes(member.id);
                  return (
                    <Pressable
                      key={member.id}
                      onPress={() => toggleMember(member.id)}
                      style={({ pressed }) => [
                        styles.recentCard,
                        isSelected && styles.recentCardSelected,
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Avatar src={member.avatarUrl || undefined} name={member.name} size={40} />
                      <Text style={styles.recentName} numberOfLines={1}>
                        {member.name}
                      </Text>
                      <View
                        style={[
                          styles.recentBadge,
                          isSelected ? styles.recentBadgeSelected : undefined,
                        ]}
                      >
                        <Text
                          style={[
                            styles.recentBadgeText,
                            isSelected ? styles.recentBadgeTextSelected : undefined,
                          ]}
                        >
                          {isSelected ? '✓' : '+'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <View style={styles.membersList}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Buscando usuários...</Text>
            </View>
          ) : searchResults.length === 0 && searchQuery.trim().length >= 2 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhum usuário encontrado</Text>
            </View>
          ) : searchQuery.trim().length < 2 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Digite pelo menos 2 caracteres para buscar</Text>
            </View>
          ) : (
            searchResults.map((member) => {
              const isSelected = selectedMembers.includes(member.id);
              return (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberInfo}>
                    <Avatar src={member.avatarUrl || undefined} name={member.name} size={48} />
                    <View style={styles.memberDetails}>
                      <Text style={styles.memberName}>{member.name}</Text>
                      <Text style={styles.memberUsername}>{member.email}</Text>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => toggleMember(member.id)}
                    style={({ pressed }) => [
                      styles.memberButton,
                      isSelected && styles.memberButtonSelected,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.memberButtonText,
                        isSelected && styles.memberButtonTextSelected,
                      ]}
                    >
                      {isSelected ? 'Remover' : 'Adicionar'}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          onPress={handleCreate}
          disabled={!groupName.trim() || isCreating}
          loading={isCreating}
        >
          Criar Grupo
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
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
  },
  section: {
    paddingVertical: spacing.md,
  },
  label: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  nameInputContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.background,
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
  nameInput: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 56,
  },
  emojiDisplay: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.surface,
  },
  emojiText: {
    fontSize: 24,
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
    backgroundColor: 'rgba(16, 183, 72, 0.2)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  emojiButtonText: {
    fontSize: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  membersCount: {
    ...typography.styles.captionBold,
    color: colors.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 48,
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
  searchIconContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    paddingRight: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  recentSection: {
    marginTop: spacing.md,
  },
  recentLabel: {
    ...typography.styles.captionBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  recentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    maxWidth: '100%',
  },
  recentCardSelected: {
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    borderColor: colors.primary,
  },
  recentName: {
    ...typography.styles.captionBold,
    color: colors.text,
    maxWidth: 100,
  },
  recentBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentBadgeSelected: {
    backgroundColor: colors.primary,
  },
  recentBadgeText: {
    ...typography.styles.captionBold,
    color: colors.text,
  },
  recentBadgeTextSelected: {
    color: colors.background,
  },
  membersList: {
    gap: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    padding: spacing.lg,
    borderRadius: 16,
    marginBottom: spacing.sm,
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
  memberUsername: {
    ...typography.styles.caption,
    color: colors.textSecondary,
  },
  memberButton: {
    minWidth: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberButtonSelected: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  memberButtonText: {
    ...typography.styles.captionBold,
    color: colors.text,
  },
  memberButtonTextSelected: {
    color: colors.error,
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
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
