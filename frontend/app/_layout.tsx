import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="admin/manage" />
      <Stack.Screen name="child/puzzle-gallery" />
      <Stack.Screen name="child/difficulty-select" />
      <Stack.Screen name="child/puzzle-game" />
    </Stack>
  );
}
