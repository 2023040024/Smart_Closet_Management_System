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

// 방금 만든 똑똑한 API 모듈 불러오기
import api from './_api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // 1. 입력값 확인
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      // 2. 백엔드 로그인 API 호출 
      // (백엔드 개발자 스크린샷 기준 /auth/login 경로 사용)
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      // 3. 백엔드 응답에서 토큰(Token) 꺼내기
      const token = response.data.access_token;

      if (token) {
        // 4. 기기(AsyncStorage)에 토큰을 안전하게 저장
        await AsyncStorage.setItem('userToken', token);
        
        // 5. 로그인이 성공했으므로 메인 홈 화면('/')으로 이동
        router.replace('/'); 
      } else {
        throw new Error('토큰이 발급되지 않았습니다.');
      }
    } catch (error: any) {
      console.error('로그인 에러:', error);
      Alert.alert(
        '로그인 실패',
        '이메일 또는 비밀번호를 확인해주세요.\n(서버가 켜져 있는지 확인 필요)'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>로그인</Text>
        <Text style={styles.subtitle}>스마트 옷장에 오신 것을 환영합니다 👗</Text>
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

        {/* 나중을 위한 회원가입 버튼 (임시 처리) */}
        <TouchableOpacity 
          style={styles.signupWrap} 
          onPress={() => Alert.alert('안내', '회원가입 기능은 준비 중입니다.')}
        >
          <Text style={styles.signupText}>계정이 없으신가요? <Text style={styles.signupTextBold}>회원가입</Text></Text>
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
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: -8, 
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  loginButton: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
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