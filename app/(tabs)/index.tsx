import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Platform, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GroupCard } from '@/components/groups/GroupCard';
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
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groups.list();
      setAllGroups(data);
      setGroupsList(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar grupos';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await groups.list();
      setAllGroups(data);
      setGroupsList(data);
      // Se estiver buscando, reaplica o filtro
      if (searchQuery.trim()) {
        filterGroups(searchQuery);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar grupos';
      showError(errorMessage);
    } finally {
      setRefreshing(false);
    }
  };

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

  const totalBalance = allGroups.reduce((sum, group) => sum + (group.userBalance || 0), 0);

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
                <Ionicons name="search" size={20} color="#6b7280" />
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
              <Ionicons name="search" size={20} color="#61896f" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar grupo pelo nome..."
                placeholderTextColor="#61896f"
                value={searchQuery}
                onChangeText={handleSearchChange}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => handleSearchChange('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo Geral</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>
              R$ {Math.abs(totalBalance).toFixed(2).replace('.', ',')}
            </Text>
            <View style={styles.balanceBadge}>
              <Text style={styles.balanceBadgeText}>
                {totalBalance >= 0 ? 'a receber' : 'a pagar'}
              </Text>
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Carregando grupos...</Text>
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

      <FAB onPress={() => router.push('/group/create')} />
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
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
    backgroundColor: '#F3F4F6',
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
    backgroundColor: '#f0f4f2',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#dbe6df',
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
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 96,
  },
  balanceCard: {
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
    borderRadius: 12,
    padding: spacing.md,
    margin: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 183, 72, 0.1)',
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  balanceBadge: {
    backgroundColor: 'rgba(16, 183, 72, 0.1)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  balanceBadgeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.styles.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});
