import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import { Alert } from 'react-native';

// 백엔드 API 기본 주소 (기존과 동일)
const API_BASE_URL = 'http://192.168.0.25:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 1. 요청(Request) 인터셉터: 프론트엔드가 백엔드로 요청을 "보내기 직전"에 가로채서 실행됨
api.interceptors.request.use(
  async (config) => {
    // 기기(금고)에 저장된 로그인 토큰을 꺼내옴
    const token = await AsyncStorage.getItem('userToken');
    
    // 토큰이 존재하면 헤더에 'Bearer {토큰}' 형태로 달아줌
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 2. 응답(Response) 인터셉터: 백엔드에서 응답이 "도착한 직후"에 가로채서 실행됨
api.interceptors.response.use(
  (response) => {
    // 정상 응답이면 그대로 통과
    return response;
  },
  async (error) => {
    // 에러가 났고, 그 에러가 401(권한 없음/토큰 만료)이라면?
    if (error.response && error.response.status === 401) {
      
      // 쓸모없어진(만료된) 토큰을 기기에서 삭제
      await AsyncStorage.removeItem('userToken');
      
      // 사용자에게 알림을 띄우고 로그인 화면으로 강제 추방시킴
      Alert.alert('세션 만료', '로그인이 필요하거나 만료되었습니다. 다시 로그인해주세요.', [
        {
          text: '확인',
          onPress: () => {
            router.replace('/login'); // 로그인 화면으로 이동
          },
        },
      ]);
    }
    return Promise.reject(error);
  }
);

export default api;