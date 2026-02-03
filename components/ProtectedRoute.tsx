import { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors } from '@/constants/colors';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShouldRedirect(false);
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      // Redirecionar para login se não estiver autenticado
      setShouldRedirect(true);
      router.replace('/(auth)/login');
    } else {
      setShouldRedirect(false);
    }
  }, [isAuthenticated, isLoading, segments, router]);

  if (isLoading || shouldRedirect) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f6f8f6',
  },
});
