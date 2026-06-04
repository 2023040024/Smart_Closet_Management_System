import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router'; // ✨ Stack 추가
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import api from './_api';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // ✨ 키보드 활성화 상태 감지 로직
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

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
    <>
      {/* ✨ 상단 'signup' 기본 헤더 바 숨김 처리 */}
      <Stack.Screen options={{ headerShown: false }} />
      
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView 
          style={styles.container} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ✨ 스크롤 뷰를 적용하여 키보드가 올라와도 아래로 스크롤 가능하게 처리 */}
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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

            <View style={styles.formCard}>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94A3B8"
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
                  <ActivityIndicator color="#FFFFFF" />
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
          </ScrollView>

          {/* ✨ 키보드가 활성화되었을 때는 푸터 숨김 */}
          {!isKeyboardVisible && (
            <View style={styles.footer}>
                <Text style={styles.footerText}>Secure System Registration</Text>
            </View>
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 100, // ✨ 여유 공간을 주어 스크롤 시 버튼이 넉넉하게 보이도록 함
  },
  heroSection: {
    marginBottom: 48, 
  },
  projectType: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  brandName: {
    fontSize: 56, 
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },
  brandColon: {
    fontSize: 56,
    fontWeight: '900',
    color: '#2563EB',
  },
  brandAccent: {
    fontSize: 56,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -1,
  },
  decoLine: {
    width: 60,
    height: 4,
    backgroundColor: '#2563EB',
    marginTop: 12,
    borderRadius: 2,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '600',
  },
  formCard: {
    gap: 14,
  },
  inputContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  input: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#111827',
  },
  signupButton: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  signupButtonDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  signupButtonText: {
    color: '#FFFFFF',
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
    color: '#64748B',
    fontWeight: '500',
  },
  loginLinkTextBold: {
    color: '#2563EB',
    fontWeight: '800',
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
    color: '#94A3B8',
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  }
});