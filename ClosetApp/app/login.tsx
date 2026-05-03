import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. 입력값 확인 (아무거나 쳐도 통과되지만 비어있으면 막음)
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '테스트를 위해 아무 글자나 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // --- [임시 가짜 로그인 로직 시작] ---
      // 실제 API 호출하는 척 0.5초 정도 로딩 딜레이 주기
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 서버에서 진짜로 준 것처럼 가짜 토큰 생성
      const fakeToken = 'test_mock_token_12345';

      // 4. 기기(AsyncStorage)에 가짜 토큰을 저장
      await AsyncStorage.setItem('userToken', fakeToken);
      
      Alert.alert('테스트 성공', '가짜 로그인으로 통과했습니다!', [
        {
          text: '확인',
          onPress: () => {
            // 5. 메인 홈 화면('/')으로 이동
            router.replace('/'); 
          }
        }
      ]);
      // --- [임시 가짜 로그인 로직 끝] ---

    } catch (error: any) {
      console.error('로그인 에러:', error);
      Alert.alert('오류', '로그인 처리 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>로그인 (테스트 모드)</Text>
        <Text style={styles.subtitle}>아무 글자나 입력하면 통과됩니다 🛠️</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          style={styles.input}
          placeholder="test@test.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          placeholder="1234"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.loginButtonText}>가짜로 로그인하기</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 24, justifyContent: 'center' },
  header: { marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#E11D48', fontWeight: 'bold' }, // 테스트 모드 강조를 위해 빨간색 변경
  form: { gap: 16 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: -8 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 16, color: '#111827' },
  loginButton: { backgroundColor: '#111827', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  loginButtonDisabled: { backgroundColor: '#9CA3AF' },
  loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});