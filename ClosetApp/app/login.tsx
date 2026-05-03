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

// ✨ 우리가 만든 전역 API 모듈 불러오기
import api from './_api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. 입력값 유효성 확인
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // 2. 실제 백엔드 로그인 API 호출
      // Swagger에서 확인한 POST /auth/login 경로를 사용합니다.
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      // 3. 응답에서 진짜 access_token 추출
      const token = response.data.access_token;

      if (token) {
        // 4. 기기 금고(AsyncStorage)에 진짜 토큰 저장
        await AsyncStorage.setItem('userToken', token);
        
        // 5. 로그인 성공 알림 후 홈으로 이동
        Alert.alert('로그인 성공', '반갑습니다!', [
          { text: '확인', onPress: () => router.replace('/') }
        ]);
      }
    } catch (error: any) {
      console.error('로그인 에러:', error);
      
      // 에러 메시지 처리
      const errorMessage = error.response?.status === 401 
        ? '이메일 또는 비밀번호가 틀렸습니다.' 
        : '서버와 연결할 수 없습니다. 백엔드 상태를 확인해주세요.';
        
      Alert.alert('로그인 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>스마트 옷장 서비스를 이용해 보세요 👗</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>이메일</Text>
        <TextInput
          style={styles.input}
          placeholder="example@email.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>비밀번호</Text>
        <TextInput
          style={styles.input}
          placeholder="비밀번호를 입력해주세요"
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
            <Text style={styles.loginButtonText}>로그인하기</Text>
          )}
        </TouchableOpacity>

        {/* ✨ 회원가입 화면으로 이동하는 버튼 */}
        <TouchableOpacity 
          style={styles.signupWrap} 
          onPress={() => router.push('/signup')}
        >
          <Text style={styles.signupText}>
            계정이 없으신가요? <Text style={styles.signupTextBold}>회원가입</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    justifyContent: 'center' 
  },
  header: { 
    marginBottom: 40 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#111827', 
    marginBottom: 8 
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6B7280' 
  },
  form: { 
    gap: 16 
  },
  label: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#374151', 
    marginBottom: -8 
  },
  input: { 
    backgroundColor: '#F9FAFB', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 12, 
    padding: 16, 
    fontSize: 16, 
    color: '#111827' 
  },
  loginButton: { 
    backgroundColor: '#111827', 
    borderRadius: 12, 
    padding: 16, 
    alignItems: 'center', 
    marginTop: 16 
  },
  loginButtonDisabled: { 
    backgroundColor: '#9CA3AF' 
  },
  loginButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  signupWrap: {
    alignItems: 'center',
    marginTop: 16,
  },
  signupText: {
    fontSize: 14,
    color: '#6B7280',
  },
  signupTextBold: {
    fontWeight: '700',
    color: '#111827',
  },
});