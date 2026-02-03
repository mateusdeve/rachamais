import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function GroupLayout() {
  return (
    <ProtectedRoute>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="create" />
        <Stack.Screen name="[id]" />
      </Stack>
    </ProtectedRoute>
  );
}
