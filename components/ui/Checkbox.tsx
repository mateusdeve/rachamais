import { Pressable, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/colors';

interface CheckboxProps {
  checked: boolean;
  onPress: () => void;
}

export function Checkbox({ checked, onPress }: CheckboxProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.checkbox,
        checked && styles.checkboxChecked,
        pressed && styles.checkboxPressed,
      ]}
      activeOpacity={0.7}
    >
      {checked && (
        <Ionicons name="checkmark" size={16} color="#fff" />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
});
