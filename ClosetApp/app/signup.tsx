import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import api from './_api';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    Keyboard.dismiss(); // 가입 버튼 누르면 키보드 내리기

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

      // 백엔드 회원가입 API 호출
      const response = await api.post('/auth/signup', {
        email,
        password,
      });

      // 가입 성공 시 넘어오는 토큰 저장
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
    <SafeAreaView style={styles.safeArea}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>회원가입</Text>
              <Text style={styles.subtitle}>새로운 계정을 만들어보세요 📝</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>이메일</Text>
                <TextInput
                  style={styles.input}
                  placeholder="example@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 입력해주세요"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>비밀번호 확인</Text>
                <TextInput
                  style={styles.input}
                  placeholder="비밀번호를 다시 한 번 입력해주세요"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity 
                style={[styles.button, loading && styles.buttonDisabled]} 
                onPress={handleSignup} 
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>가입하기</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginWrap}>
                <Text style={styles.loginText}>이미 계정이 있으신가요?</Text>
                <TouchableOpacity onPress={() => router.back()} activeOpacity={0.6}>
                  <Text style={styles.loginTextBold}>로그인하기</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: { 
    flex: 1, 
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  header: { 
    marginBottom: 40,
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#111827', 
    marginBottom: 10,
    letterSpacing: -0.5,
  },
  subtitle: { 
    fontSize: 16, 
    color: '#6B7280',
    fontWeight: '500',
  },
  form: { 
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#374151', 
    marginLeft: 4,
  },
  input: { 
    backgroundColor: '#F9FAFB', 
    borderWidth: 1, 
    borderColor: '#E5E7EB', 
    borderRadius: 14, 
    paddingHorizontal: 16,
    paddingVertical: 18, 
    fontSize: 16, 
    color: '#111827',
  },
  button: { 
    backgroundColor: '#111827', 
    borderRadius: 14, 
    paddingVertical: 18, 
    alignItems: 'center', 
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: { 
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  loginWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 8,
  },
  loginText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loginTextBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    textDecorationLine: 'underline',
  },
});