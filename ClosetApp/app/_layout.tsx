import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ClosetProvider } from './_closetStore';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // 토큰 검사가 끝났는지 확인하는 상태
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        
        // 토큰이 없다면 로그인 화면으로 이동
        if (!token) {
          // Expo Router가 완전히 마운트되기 전 라우팅 에러를 방지하기 위해 0.1초 딜레이
          setTimeout(() => {
            router.replace('/login');
          }, 100);
        }
      } catch (error) {
        console.error('인증 확인 오류:', error);
      } finally {
        setIsReady(true);
      }
    };

    checkToken();
  }, []);

  // 토큰 검사 중일 때는 메인 화면 대신 로딩 화면 표시
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#111827" />
      </View>
    );
  }

  return (
    <ClosetProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* 🔐 새로 추가된 로그인 화면 (헤더 숨김) */}
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="detail" options={{ title: '옷 상세' }} />
          <Stack.Screen name="edit" options={{ title: '옷 수정' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: '안내' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </ClosetProvider>
  );
}