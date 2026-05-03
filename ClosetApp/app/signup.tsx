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

import api from './_api';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    // 유효성 검사
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '모든 정보를 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('오류', '비밀번호가 일치하지 않습니다.');
      return;
    }

    try {
      setLoading(true);

      // 백엔드 회원가입 API 호출 (Swagger에서 확인한 경로)
      const response = await api.post('/auth/signup', {
        email,
        password,
      });

      // 스크린샷 응답 예시를 보면 가입 성공 시 바로 access_token을 줌
      const token = response.data.access_token;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        Alert.alert('성공', '회원가입 및 로그인이 완료되었습니다!', [
          { text: '확인', onPress: () => router.replace('/') }
        ]);
      }
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      Alert.alert('실패', '회원가입 중 오류가 발생했습니다. 이미 존재하는 계정일 수 있습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>회원가입</Text>
      <Text style={styles.subtitle}>새로운 계정을 만들어보세요 📝</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="이메일 주소"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>가입하기</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: '#6B7280' }}>이미 계정이 있으신가요? 로그인으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', marginBottom: 40 },
  form: { gap: 16 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 16, fontSize: 16 },
  button: { backgroundColor: '#111827', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});