import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Baloo2_700Bold:      require('../assets/fonts/Baloo2_700Bold.ttf'),
    Baloo2_800ExtraBold: require('../assets/fonts/Baloo2_800ExtraBold.ttf'),
    Fredoka_600SemiBold: require('../assets/fonts/Fredoka_600SemiBold.ttf'),
    Fredoka_700Bold:     require('../assets/fonts/Fredoka_700Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="child/welcome" />
      <Stack.Screen name="child/join-group" />
      <Stack.Screen name="child/level-select" />
      <Stack.Screen name="child/puzzle-list" />
      <Stack.Screen name="child/puzzle-gallery" />
      <Stack.Screen name="child/difficulty-select" />
      <Stack.Screen name="child/puzzle-game" />
      <Stack.Screen name="child/learn" />
      <Stack.Screen name="child/leaderboard" />
      <Stack.Screen name="parent/dashboard" />
    </Stack>
  );
}
