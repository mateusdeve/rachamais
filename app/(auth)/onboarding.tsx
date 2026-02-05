import { useState, useRef } from 'react';
import { View, Text, FlatList, Pressable, Dimensions, Image, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button } from '@/components/ui/Button';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/spacing';
import { typography } from '@/constants/typography';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: 'Divida sem stress',
    description: 'Divida contas de bares, restaurantes e viagens com seus amigos de forma rápida e justa.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmH2qI31GEkq3VXMPgJ44FDrO_xBYymNltAx8y-qRO8YBzs-xg3n4vPA8EQxOcyQ3mU8fEhAe10r-gsGx2Z2xhD9EMNES0DRm-OjzOF812XtZ0F4DZbZNYr6w5rVE_I1az7lGIkKZRNz6rjAftQdlBrd2W3zMMeXqsbBvqHcDKEfNRIBqBoftWlD12epDaaMt_fS7uWF0aAh1j06lBr54vFSwPiGnyAWCcEnvRdIBr-zgoznk5eOAKRwhpZukreW5-hTEQ522-u-AD',
  },
  {
    id: '2',
    title: 'Cálculo automático',
    description: 'Deixe a matemática com a gente. Dividimos contas, gorjetas e taxas de forma rápida e justa para você aproveitar o momento.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBbKsszXbpeQTi1oCP7XO3pD8VdNTNQoSFBHfW_lCRpgZiLFV_qbs6KAn60CWA_07ee5hw69EKNX2IvUbf7K5HkdX5stHj6yhcGXvGW4IPy6g1lS93YQCbMNqDFS6W9Mkj_k8RDgtRfLU04w4nhflBxyy5nb15t_ff_-NLMGUp13RoKHcmL4D-XJsM1mwSMV8AsKzXlLgR_b1SshoOX_15_SlL04N2PIalQCkmdBXi4ZqKYl65m61omb9sdPfvoJJymyPQI970JFbEW',
  },
  {
    id: '3',
    title: 'Acerte as contas fácil',
    description: 'Simplifique o acerto de contas com seus amigos e garanta que ninguém fique no prejuízo. Rápido, justo e direto.',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9G66hAh9LmMmRAnUJCk9est7JRlpNOkx1k2Iedq1mlQf5AO071LwQLlV34S2zt_xkvcwbHAgvaXMnsX-qvniYVxaJBo6nyJvAWp8Q1E242iCBX9Ugbs7-7W-wxImmUhzd3dN9uzEANTiuRQLinnim8ZGsrYbFMONoSi_aKC90CFAZhKvgKFr93V6bS5HGftmR-MtGf7IoKaFp08x3AXw-XS7x4gVsDA8_TUItdHTlNQZepH3UEoebEPEn73DbgLY4Mlv5J_wV11JQ',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
    router.replace('/(auth)/login');
  };

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      router.replace('/(auth)/login');
    }
  };

  const renderSlide = ({ item }: { item: typeof slides[0] }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <View style={styles.imageWrapper}>
          <Image
            source={{ uri: item.image }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleSkip} style={({ pressed }) => [
          styles.skipButton,
          pressed && styles.skipButtonPressed,
        ]}>
          <Text style={styles.skipText}>Pular</Text>
        </Pressable>
      </View>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button onPress={handleNext}>
            {currentIndex === slides.length - 1 ? 'Começar' : 'Próximo'}
          </Button>
        </View>
      </View>
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
    justifyContent: 'flex-end',
    padding: spacing.lg,
    paddingTop: spacing.xl,
  },
  skipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  skipButtonPressed: {
    opacity: 0.7,
  },
  skipText: {
    ...typography.styles.bodyBold,
    color: colors.primary,
  },
  slide: {
    flex: 1,
    width,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(16, 183, 72, 0.12)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  title: {
    ...typography.styles.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.styles.body,
    fontSize: 18,
    lineHeight: 28,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  footer: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  dots: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  buttonContainer: {
    width: '100%',
  },
});
