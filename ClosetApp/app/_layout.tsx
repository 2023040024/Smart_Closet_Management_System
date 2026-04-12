import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClosetProvider } from './_closetStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ClosetProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="detail" options={{ title: '옷 상세' }} />
          <Stack.Screen name="edit" options={{ title: '옷 수정' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: '안내' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClosetProvider>
  );
}