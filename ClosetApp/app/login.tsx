import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from './_api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    Keyboard.dismiss();
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/login', { email, password });
      const token = response.data.access_token;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        router.replace('/');
      }
    } catch (error: any) {
      console.error('로그인 에러:', error);
      const errorMessage = error.response?.status === 401 
        ? '정보가 일치하지 않습니다.' 
        : '서버 연결에 실패했습니다.';
      Alert.alert('로그인 실패', errorMessage);
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
            
            {/* ✨ 브랜드 히어로 섹션 (PPT 느낌) */}
            <View style={styles.heroSection}>
              <Text style={styles.projectType}>Smart Closet Management System</Text>
              <View style={styles.brandRow}>
                <Text style={styles.brandName}>Re</Text>
                <Text style={styles.brandColon}>:</Text>
                <Text style={styles.brandAccent}>fit</Text>
              </View>
              <View style={styles.decoLine} />
              <Text style={styles.heroSubtitle}>최적의 옷장 활용을 위한 AI 개인화 솔루션</Text>
            </View>

            {/* 폼 섹션 */}
            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#94a3b8"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.loginButtonText}>START SYSTEM</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.signupButton} 
                onPress={() => router.push('/signup')}
                activeOpacity={0.6}
              >
                <Text style={styles.signupText}>
                  계정이 없으신가요? <Text style={styles.signupTextBold}>회원가입</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* 하단 푸터 느낌의 텍스트 */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Powered by Gemini AI & FastAPI</Text>
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
    backgroundColor: '#0f172a', // PPT 배경과 같은 딥 네이비
  },
  container: { 
    flex: 1, 
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  heroSection: {
    marginBottom: 60,
  },
  projectType: {
    fontSize: 14,
    color: '#38bdf8', // 사이언 블루 포인트
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandName: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandColon: {
    fontSize: 64,
    fontWeight: '800',
    color: '#38bdf8',
  },
  brandAccent: {
    fontSize: 64,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  decoLine: {
    width: 60,
    height: 4,
    backgroundColor: '#38bdf8',
    marginTop: 12,
    borderRadius: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 20,
    fontWeight: '500',
    lineHeight: 24,
  },
  formCard: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#FFFFFF',
  },
  loginButton: {
    backgroundColor: '#38bdf8',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    backgroundColor: '#1e293b',
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  signupButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  signupText: {
    fontSize: 14,
    color: '#64748b',
  },
  signupTextBold: {
    color: '#38bdf8',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
    letterSpacing: 1,
  }
});