import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#111', headerShown: false }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* ✨ 새로 추가된 옷장 탭 */}
      <Tabs.Screen
        name="closet"
        options={{
          title: '옷장',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="shirt" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="recommend"
        options={{
          title: '추천',
          // 옷장 아이콘과 겹치지 않게 반짝이는 아이콘으로 변경
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: '기록',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="analysis"
        options={{
          title: '진단',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics" size={size} color={color} />
          ),
        }}
      />

      {/* ✨ 등록 화면은 탭 바에서는 숨기고 홈 화면의 버튼으로 접근 */}
      <Tabs.Screen
        name="register"
        options={{
          href: null, 
          title: '등록',
        }}
      />
    </Tabs>
  );
}