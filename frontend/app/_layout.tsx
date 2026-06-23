import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="child/welcome" />
      <Stack.Screen name="child/join-group" />
      <Stack.Screen name="child/level-select" />
      <Stack.Screen name="child/puzzle-list" />
      <Stack.Screen name="child/puzzle-gallery" />
      <Stack.Screen name="child/difficulty-select" />
      <Stack.Screen name="child/puzzle-game" />
      <Stack.Screen name="child/leaderboard" />
      <Stack.Screen name="parent/dashboard" />
    </Stack>
  );
}
