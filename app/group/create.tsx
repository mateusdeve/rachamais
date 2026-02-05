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

const emojis = ['🏖️', '🍖', '✈️', '⚽', '🔑', '🎁', '🏠', '🍕', '🎉', '🎮', '🎬', '🏋️'];

export default function CreateGroupScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const [groupName, setGroupName] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🏖️');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.label}>Nome do grupo</Text>
          <View style={styles.nameInputContainer}>
            <TextInput
              style={styles.nameInput}
              placeholder="Ex: Viagem de Férias, Churrasco..."
              placeholderTextColor="#61896f"
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
              <Ionicons name="search" size={20} color="#61896f" />
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar amigos pelo nome..."
              placeholderTextColor="#61896f"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
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
    backgroundColor: '#fff',
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
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: spacing.md,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe6df',
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
  nameInput: {
    flex: 1,
    paddingHorizontal: spacing.md,
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
    borderLeftColor: '#dbe6df',
    backgroundColor: '#f0f4f2',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  membersCount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#61896f',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#f0f4f2',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 48,
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
  membersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 12,
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
  memberName: {
    ...typography.styles.body,
    color: colors.text,
    marginBottom: 2,
  },
  memberUsername: {
    fontSize: 14,
    color: '#61896f',
  },
  memberButton: {
    minWidth: 84,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: '#f0f4f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberButtonSelected: {
    backgroundColor: '#FEE2E2',
  },
  memberButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
    padding: spacing.md,
    backgroundColor: '#fff',
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
});
