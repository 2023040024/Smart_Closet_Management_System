import { Stack } from 'expo-router';

export default function Layout() {
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="closet" />
      <Stack.Screen name="recommend" />
      <Stack.Screen name="history" />
      <Stack.Screen name="analysis" />
      <Stack.Screen name="register" />
    </Stack>
  );
}