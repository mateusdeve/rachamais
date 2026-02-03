import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { activities, Activity } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function ActivityScreen() {
  const router = useRouter();
  const { showError } = useToast();
  const [activitiesList, setActivitiesList] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const data = await activities.list();
      setActivitiesList(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar atividades';
      showError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMs / 3600000);
    const diffInDays = Math.floor(diffInMs / 86400000);

    if (diffInMinutes < 1) {
      return 'Agora';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} min atrás`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h atrás`;
    } else if (diffInDays === 1) {
      return 'Ontem';
    } else if (diffInDays < 7) {
      return `${diffInDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'EXPENSE_ADDED':
        return 'receipt';
      case 'SETTLEMENT_MADE':
        return 'card';
      case 'MEMBER_JOINED':
        return 'person-add';
      case 'MEMBER_LEFT':
        return 'person-remove';
      case 'GROUP_CREATED':
        return 'add-circle';
      default:
        return 'notifications';
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'EXPENSE_ADDED':
        return colors.primary;
      case 'SETTLEMENT_MADE':
        return '#10B981';
      case 'MEMBER_JOINED':
        return '#3B82F6';
      case 'MEMBER_LEFT':
        return colors.error;
      case 'GROUP_CREATED':
        return '#8B5CF6';
      default:
        return colors.textMuted;
    }
  };

  // Agrupar atividades por data
  const groupedActivities = activitiesList.reduce((acc, activity) => {
    const date = new Date(activity.createdAt);
    const dateKey = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(activity);
    return acc;
  }, {} as Record<string, Activity[]>);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando atividades...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Atividades</Text>
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
        {activitiesList.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma atividade ainda</Text>
            <Text style={styles.emptyText}>
              Suas transações e atividades aparecerão aqui
            </Text>
          </View>
        ) : (
          <View style={styles.activitiesList}>
            {Object.entries(groupedActivities).map(([dateKey, dateActivities]) => (
              <View key={dateKey} style={styles.dateSection}>
                <Text style={styles.dateHeader}>{dateKey}</Text>
                {dateActivities.map((activity) => {
                  const iconColor = getActivityColor(activity.type);
                  return (
                    <Pressable
                      key={activity.id}
                      onPress={() => router.push(`/group/${activity.groupId}`)}
                      style={({ pressed }) => [
                        styles.activityCard,
                        pressed && styles.activityCardPressed,
                      ]}
                    >
                      <View style={styles.activityContent}>
                        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                          <Ionicons name={getActivityIcon(activity.type) as any} size={20} color={iconColor} />
                        </View>
                        <View style={styles.activityInfo}>
                          <View style={styles.activityHeader}>
                            <Text style={styles.activityDescription}>{activity.description}</Text>
                            <Text style={styles.activityTime}>{formatDate(activity.createdAt)}</Text>
                          </View>
                          <View style={styles.activityGroup}>
                            <Text style={styles.groupEmoji}>{activity.group.emoji}</Text>
                            <Text style={styles.groupName}>{activity.group.name}</Text>
                          </View>
                        </View>
                        <Avatar
                          src={activity.user.avatarUrl || undefined}
                          name={activity.user.name}
                          size={40}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8f6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f6f8f6',
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    ...typography.styles.body,
  },
  header: {
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
  activitiesList: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  dateSection: {
    marginBottom: spacing.lg,
  },
  dateHeader: {
    ...typography.styles.bodyBold,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
    textTransform: 'capitalize',
  },
  activityCard: {
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
  activityCardPressed: {
    opacity: 0.9,
    backgroundColor: '#F9FAFB',
  },
  activityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activityDescription: {
    ...typography.styles.body,
    color: colors.text,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
  activityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  groupEmoji: {
    fontSize: 16,
  },
  groupName: {
    fontSize: 14,
    color: colors.textSecondary,
  },
});
