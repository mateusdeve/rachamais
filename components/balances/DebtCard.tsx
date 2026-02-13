import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SimplifiedDebt } from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

interface DebtCardProps {
  debt: SimplifiedDebt & { isUserOwed?: boolean; isUserOwes?: boolean };
  isUserOwed?: boolean;
  isUserOwes?: boolean;
  onPay?: (debt: SimplifiedDebt) => void;
  onConfirmReceipt?: (debt: SimplifiedDebt) => void;
  loading?: boolean;
  confirmingReceipt?: boolean;
}

export function DebtCard({ debt, isUserOwed, isUserOwes, onPay, onConfirmReceipt, loading, confirmingReceipt }: DebtCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess } = useToast();
  const [showPixKey, setShowPixKey] = useState(false);
  const [pixKeyCopied, setPixKeyCopied] = useState(false);
  const isThirdParty = !isUserOwed && !isUserOwes;
  
  // Quando alguém deve para o usuário (isUserOwed), mostrar chave PIX do usuário
  // Quando usuário deve para alguém (isUserOwes), mostrar chave PIX do credor (debt.to)
  // Para isUserOwed, precisamos da chave PIX do usuário logado, não de debt.to
  const relevantPixKey = isUserOwed 
    ? (user?.pixKey || null)  // Quando alguém deve para o usuário, mostrar chave PIX do usuário logado
    : isUserOwes 
    ? (debt.to.pixKey || null)  // Quando usuário deve, mostrar chave PIX do credor
    : null;

  const handleCopyPixKey = async (pixKey: string) => {
    await Clipboard.setStringAsync(pixKey);
    setPixKeyCopied(true);
    showSuccess('Chave PIX copiada!');
    setTimeout(() => setPixKeyCopied(false), 2000);
  };

  const handleGoToProfile = () => {
    router.push('/(tabs)/profile');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {isThirdParty ? (
            <View style={styles.avatars}>
              <View style={styles.avatarWrapper}>
                <Avatar src={debt.from.avatarUrl || undefined} name={debt.from.name} size={40} />
              </View>
              <View style={[styles.avatarWrapper, styles.avatarOverlap]}>
                <Avatar src={debt.to.avatarUrl || undefined} name={debt.to.name} size={40} />
              </View>
            </View>
          ) : (
              <Avatar
              src={(isUserOwed ? debt.from : debt.to).avatarUrl || undefined}
              name={(isUserOwed ? debt.from : debt.to).name}
              size={48}
            />
          )}
          <View style={styles.userDetails}>
            <Text style={styles.userName}>
              {isThirdParty
                ? `${debt.from.name} deve para ${debt.to.name}`
                : isUserOwed
                ? `${debt.from.name}`
                : debt.to.name}
            </Text>
            <Text style={styles.userRelation}>
              {isUserOwed
                ? 'deve para você'
                : isUserOwes
                ? 'você deve para ele'
                : ''}
            </Text>
          </View>
        </View>
        <View style={styles.amountContainer}>
          <Text
            style={[
              styles.amount,
              isUserOwed && styles.amountPositive,
              isUserOwes && styles.amountNegative,
            ]}
          >
            R$ {debt.amount.toFixed(2).replace('.', ',')}
          </Text>
        </View>
      </View>
      {!isThirdParty && (
        <>
          {/* Mostrar chave PIX quando alguém deve para o usuário */}
          {isUserOwed && (
            <>
              {relevantPixKey ? (
                <View style={styles.pixKeySection}>
                  {showPixKey ? (
                    <View style={styles.pixKeyDisplay}>
                      <View style={styles.pixKeyContent}>
                        <Text style={styles.pixKeyLabel}>Sua Chave PIX:</Text>
                        <Text style={styles.pixKeyValue} selectable>{relevantPixKey}</Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.copyButton,
                          pressed && styles.buttonPressed,
                          pixKeyCopied && styles.copyButtonCopied,
                        ]}
                        onPress={() => handleCopyPixKey(relevantPixKey)}
                      >
                        <Ionicons 
                          name={pixKeyCopied ? "checkmark" : "copy-outline"} 
                          size={18} 
                          color={pixKeyCopied ? colors.primary : colors.text} 
                        />
                        <Text style={[styles.copyButtonText, pixKeyCopied && styles.copyButtonTextCopied]}>
                          {pixKeyCopied ? 'Copiado!' : 'Copiar'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [
                        styles.showPixKeyButton,
                        pressed && styles.buttonPressed,
                      ]}
                      onPress={() => setShowPixKey(true)}
                    >
                      <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                      <Text style={styles.showPixKeyText}>Ver Chave PIX</Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <View style={styles.pixKeyWarning}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.pixKeyWarningText}>
                    Cadastre sua chave PIX no perfil para receber pagamentos
                  </Text>
                  <Pressable onPress={handleGoToProfile} style={styles.pixKeyWarningLink}>
                    <Text style={styles.pixKeyWarningLinkText}>Ir para Perfil</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {/* Mostrar chave PIX do credor quando usuário deve */}
          {isUserOwes && relevantPixKey && (
            <View style={styles.pixKeySection}>
              {showPixKey ? (
                <View style={styles.pixKeyDisplay}>
                  <View style={styles.pixKeyContent}>
                    <Text style={styles.pixKeyLabel}>Chave PIX de {debt.to.name}:</Text>
                    <Text style={styles.pixKeyValue} selectable>{relevantPixKey}</Text>
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.copyButton,
                      pressed && styles.buttonPressed,
                      pixKeyCopied && styles.copyButtonCopied,
                    ]}
                    onPress={() => handleCopyPixKey(relevantPixKey)}
                  >
                    <Ionicons 
                      name={pixKeyCopied ? "checkmark" : "copy-outline"} 
                      size={18} 
                      color={pixKeyCopied ? colors.primary : colors.text} 
                    />
                    <Text style={[styles.copyButtonText, pixKeyCopied && styles.copyButtonTextCopied]}>
                      {pixKeyCopied ? 'Copiado!' : 'Copiar'}
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  style={({ pressed }) => [
                    styles.showPixKeyButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={() => setShowPixKey(true)}
                >
                  <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
                  <Text style={styles.showPixKeyText}>Ver Chave PIX</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.actions}>
            {isUserOwed ? (
              <>
                <Pressable
                  style={({ pressed }) => [
                    styles.buttonPrimary,
                    styles.buttonFull,
                    pressed && styles.buttonPressed,
                    confirmingReceipt && styles.buttonDisabled,
                  ]}
                  onPress={() => onConfirmReceipt?.(debt)}
                  disabled={confirmingReceipt}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.buttonText}>
                    {confirmingReceipt ? 'Confirmando...' : 'Confirmar Recebimento'}
                  </Text>
                </Pressable>
              </>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.buttonPrimary,
                  styles.buttonFull,
                  pressed && styles.buttonPressed,
                  loading && styles.buttonDisabled,
                ]}
                onPress={() => onPay?.(debt)}
                disabled={loading}
              >
                <Text style={styles.buttonText}>{loading ? 'Processando...' : 'Pagar Agora'}</Text>
              </Pressable>
            )}
          </View>
        </>
      )}
      {isThirdParty && (
        <Pressable
          style={({ pressed }) => [
            styles.buttonSecondary,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonSecondaryText}>Lembrar</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  avatars: {
    flexDirection: 'row',
  },
  avatarWrapper: {
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarOverlap: {
    marginLeft: -12,
  },
  userDetails: {
    flex: 1,
    flexDirection: 'column',
  },
  userName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  userRelation: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  amountPositive: {
    color: colors.primary,
  },
  amountNegative: {
    color: colors.error,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
  },
  buttonFull: {
    flex: 1,
  },
  buttonIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonSecondaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pixKeySection: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pixKeyDisplay: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  pixKeyContent: {
    marginBottom: spacing.sm,
  },
  pixKeyLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  pixKeyValue: {
    fontSize: 14,
    color: colors.text,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyButtonCopied: {
    borderColor: colors.primary,
    backgroundColor: '#F0F9FF',
  },
  copyButtonText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },
  copyButtonTextCopied: {
    color: colors.primary,
  },
  showPixKeyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#F0F9FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  showPixKeyText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  pixKeyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: '#FFF7ED',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  pixKeyWarningText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
  },
  pixKeyWarningLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pixKeyWarningLinkText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
});
