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

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    Keyboard.dismiss();

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
      const response = await api.post('/auth/signup', { email, password });
      const token = response.data.access_token;

      if (token) {
        await AsyncStorage.setItem('userToken', token);
        Alert.alert('환영합니다', '회원가입 및 시스템 등록이 완료되었습니다!', [
          { text: '확인', onPress: () => router.replace('/') }
        ]);
      }
    } catch (error: any) {
      console.error('회원가입 에러:', error);
      Alert.alert('가입 실패', '이미 존재하는 계정이거나 서버 오류입니다.');
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
            
            {/* ✨ 브랜드 히어로 섹션 (Login 화면과 통일) */}
            <View style={styles.heroSection}>
              <Text style={styles.projectType}>Smart Closet Management System</Text>
              <View style={styles.brandRow}>
                <Text style={styles.brandName}>Re</Text>
                <Text style={styles.brandColon}>:</Text>
                <Text style={styles.brandAccent}>fit</Text>
              </View>
              <View style={styles.decoLine} />
              <Text style={styles.heroSubtitle}>새로운 사용자를 위한 시스템 계정 등록</Text>
            </View>

            {/* 회원가입 폼 섹션 */}
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

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.signupButton, loading && styles.signupButtonDisabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.signupButtonText}>계정 생성</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.loginLink} 
                onPress={() => router.back()}
                activeOpacity={0.6}
              >
                <Text style={styles.loginLinkText}>
                  이미 계정이 있으신가요? <Text style={styles.loginLinkTextBold}>로그인으로 돌아가기</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* 푸터 섹션 */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Secure System Registration</Text>
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
    backgroundColor: '#0f172a', // PPT 배경 색상
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
    marginBottom: 48, // 입력창이 3개라 로그인보다는 조금 줄임
  },
  projectType: {
    fontSize: 14,
    color: '#38bdf8',
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
    fontSize: 56, // 입력창 공간 확보를 위해 약간 줄임
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandColon: {
    fontSize: 56,
    fontWeight: '800',
    color: '#38bdf8',
  },
  brandAccent: {
    fontSize: 56,
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
    marginTop: 16,
    fontWeight: '500',
  },
  formCard: {
    gap: 14,
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
  signupButton: {
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
  signupButtonDisabled: {
    backgroundColor: '#1e293b',
    shadowOpacity: 0,
  },
  signupButtonText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  loginLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    fontSize: 14,
    color: '#64748b',
  },
  loginLinkTextBold: {
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
    textTransform: 'uppercase',
  }
});