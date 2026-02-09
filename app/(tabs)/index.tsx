import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupCardSkeleton } from '@/components/groups/GroupCardSkeleton';
import { FAB } from '@/components/ui/FAB';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { groups, Group } from '@/lib/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showError } = useToast();
  const [groupsList, setGroupsList] = useState<Group[]>([]);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isFirstFocus = useRef(true);
  const searchQueryRef = useRef(searchQuery);
  searchQueryRef.current = searchQuery;

  const loadGroups = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await groups.list();
      setAllGroups(data);
      const q = searchQueryRef.current.trim();
      if (q) {
        const filtered = data.filter((group) =>
          group.name.toLowerCase().includes(q.toLowerCase())
        );
        setGroupsList(filtered);
      } else {
        setGroupsList(data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar grupos';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadGroups(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }
      loadGroups(true);
    }, [loadGroups])
  );

  const filterGroups = (query: string) => {
    if (!query.trim()) {
      setGroupsList(allGroups);
      return;
    }

    const filtered = allGroups.filter((group) =>
      group.name.toLowerCase().includes(query.toLowerCase())
    );
    setGroupsList(filtered);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    filterGroups(text);
  };

  const toggleSearch = () => {
    setIsSearching(!isSearching);
    if (isSearching) {
      setSearchQuery('');
      setGroupsList(allGroups);
    }
  };

  const rawTotalBalance = allGroups.reduce((sum, group) => sum + (group.userBalance || 0), 0);
  // Considerar valores muito próximos de zero (menos de 1 centavo) como zero
  // Isso evita problemas de arredondamento de ponto flutuante
  const isTotalBalanceZero = Math.abs(rawTotalBalance) < 0.01;
  const totalBalance = isTotalBalanceZero ? 0 : rawTotalBalance;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!isSearching ? (
          <>
            <Text style={styles.title}>Seus Grupos</Text>
            <View style={styles.headerActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.searchButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={toggleSearch}
              >
                <Ionicons name="search" size={20} color={colors.textSecondary} />
              </Pressable>
              <Pressable
                onPress={() => router.push('/(tabs)/profile')}
                style={({ pressed }) => pressed && styles.buttonPressed}
              >
                <Avatar src={user?.avatarUrl || undefined} name={user?.name || 'Usuário'} size={40} />
              </Pressable>
            </View>
          </>
        ) : (
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={colors.primary} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar grupo pelo nome..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => handleSearchChange('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textMuted} />
                </Pressable>
              )}
            </View>
            <Pressable
              onPress={toggleSearch}
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Geral</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              R$ {Math.abs(totalBalance).toFixed(2).replace('.', ',')}
            </Text>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>
                {totalBalance === 0 ? 'tudo quitado' : totalBalance > 0 ? 'a receber' : 'a pagar'}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.groupsList}>
            {[1, 2, 3, 4, 5].map((i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </View>
        ) : groupsList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons 
              name={searchQuery.trim() ? "search-outline" : "folder-outline"} 
              size={64} 
              color={colors.textMuted} 
            />
            <Text style={styles.emptyTitle}>
              {searchQuery.trim() ? 'Nenhum grupo encontrado' : 'Nenhum grupo ainda'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim() 
                ? 'Tente buscar com outro nome' 
                : 'Crie seu primeiro grupo para começar a dividir contas'}
            </Text>
          </View>
        ) : (
          <View style={styles.groupsList}>
            {groupsList.map((item) => (
              <GroupCard
                key={item.id}
                group={item}
                onPress={() => router.push(`/group/${item.id}`)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <FAB
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/group/create');
        }}
      />
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
  title: {
    ...typography.styles.h2,
    color: colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  cancelButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cancelButtonText: {
    ...typography.styles.bodyBold,
    color: colors.primary,
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
    paddingBottom: 96,
  },
  balanceCard: {
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 183, 72, 0.15)',
  },
  balanceLabel: {
    ...typography.styles.caption,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  balanceAmount: {
    ...typography.styles.h2,
    color: colors.text,
  },
  balanceBadge: {
    backgroundColor: 'rgba(16, 183, 72, 0.15)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  balanceBadgeText: {
    ...typography.styles.captionBold,
    color: colors.primary,
  },
  groupsList: {
    flexDirection: 'column',
  },
  emptyState: {
    flex: 1,
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
});
