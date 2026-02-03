import { View, Image, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
}

export function Avatar({ src, name, size = 40 }: AvatarProps) {
  const initials = name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {src ? (
        <Image
          source={{ uri: src }}
          style={[
            styles.image,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <Text
          style={[
            styles.initials,
            {
              fontSize: size * 0.4,
            },
          ]}
        >
          {initials || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(16, 183, 72, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  initials: {
    color: colors.primary,
    fontWeight: '700',
  },
});
