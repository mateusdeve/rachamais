import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, StyleSheet, Platform, Alert, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { showSuccess, showError } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleEditName = () => {
    setEditedName(user?.name || '');
    setIsEditingName(true);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName(user?.name || '');
  };

  const handleSaveName = async () => {
    if (!editedName.trim() || editedName.trim().length < 2) {
      showError('Nome deve ter pelo menos 2 caracteres');
      return;
    }

    if (editedName.trim() === user?.name) {
      setIsEditingName(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(editedName.trim());
      showSuccess('Nome atualizado com sucesso!');
      setIsEditingName(false);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Erro ao atualizar nome');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Avatar src={user?.avatarUrl || undefined} name={user?.name || 'Usuário'} size={128} />
            <Pressable
              style={({ pressed }) => [
                styles.avatarEditButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.avatarEditIcon}>📷</Text>
            </Pressable>
          </View>
          <View style={styles.nameContainer}>
            {isEditingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Seu nome"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                  maxLength={100}
                />
                <Pressable
                  onPress={handleSaveName}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.nameEditButton,
                    pressed && styles.buttonPressed,
                    isSaving && styles.nameEditButtonDisabled,
                  ]}
                >
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                  style={({ pressed }) => [
                    styles.nameEditButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.nameDisplayContainer}>
                <Text style={styles.userName}>{user?.name || 'Usuário'}</Text>
                <Pressable
                  onPress={handleEditName}
                  style={({ pressed }) => [
                    styles.editNameButton,
                    pressed && styles.buttonPressed,
                  ]}
                >
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                </Pressable>
              </View>
            )}
          </View>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>
          
          <View style={styles.settingsCard}>
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="notifications" size={20} color={colors.text} />
                </View>
                <Text style={styles.settingsItemText}>Notificações</Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.settingsCard,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="cash" size={20} color={colors.text} />
                </View>
                <Text style={styles.settingsItemText}>Moeda padrão</Text>
              </View>
              <View style={styles.settingsItemRight}>
                <Text style={styles.settingsItemValue}>Real - BRL</Text>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </View>
          </Pressable>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suporte</Text>
          <Pressable
            onPress={() => router.push('/about')}
            style={({ pressed }) => [styles.settingsCard, pressed && styles.cardPressed]}
          >
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.text} />
                </View>
                <Text style={styles.settingsItemText}>Sobre o app</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => router.push('/privacy')}
            style={({ pressed }) => [styles.settingsCard, pressed && styles.cardPressed]}
          >
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="document-text-outline" size={20} color={colors.text} />
                </View>
                <Text style={styles.settingsItemText}>Privacidade</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutButton,
            pressed && styles.logoutButtonPressed,
          ]}
        >
          <View style={styles.logoutIconContainer}>
            <Ionicons name="log-out" size={20} color={colors.error} />
          </View>
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>

        <Text style={styles.footerVersion}>RachaMais v{APP_VERSION}</Text>
      </ScrollView>
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
    paddingBottom: spacing.xxl,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.background,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarEditIcon: {
    fontSize: 16,
    color: '#fff',
  },
  nameContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  userName: {
    ...typography.styles.h3,
    color: colors.text,
  },
  editNameButton: {
    padding: spacing.xs,
    borderRadius: 8,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    width: '100%',
    maxWidth: 300,
  },
  nameInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  nameEditButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  nameEditButtonDisabled: {
    opacity: 0.5,
  },
  userEmail: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.styles.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  settingsCard: {
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: spacing.sm,
    padding: spacing.lg,
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
  cardPressed: {
    opacity: 0.95,
    backgroundColor: colors.surface,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  settingsItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemText: {
    ...typography.styles.body,
    color: colors.text,
  },
  settingsItemValue: {
    ...typography.styles.body,
    color: colors.textSecondary,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 16,
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
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
  logoutButtonPressed: {
    opacity: 0.95,
    backgroundColor: colors.surface,
  },
  logoutIconContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 22,
  },
  logoutText: {
    ...typography.styles.bodyBold,
    color: colors.error,
    flex: 1,
  },
  footerVersion: {
    ...typography.styles.small,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
});
