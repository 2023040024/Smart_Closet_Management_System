import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { OutfitItemCard } from '../../components/recommend/OutfitItemCard';
import { RecommendFilter } from '../../components/recommend/RecommendFilter';
import api from '../_api';
import { ClothesItem, useCloset } from '../_closetStore';

type OutfitSet = {
  top?: ClothesItem;
  bottom?: ClothesItem;
  outer?: ClothesItem;
  shoes?: ClothesItem;
  reason?: string;
};

// 기기 화면 너비를 가져와서 카드 크기를 비율로 설정합니다.
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.75; 

function SkeletonLoader() {
  return (
    <View style={{ marginTop: 24 }}>
      <View style={[styles.skeletonBase, { width: 150, height: 28, marginBottom: 15 }]} />
      <View style={styles.aiMessageBoxSkeleton}>
        <View style={[styles.skeletonBase, { width: '100%', height: 16, marginBottom: 8 }]} />
        <View style={[styles.skeletonBase, { width: '90%', height: 16, marginBottom: 8 }]} />
        <View style={[styles.skeletonBase, { width: '60%', height: 16 }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.outfitCardSkeleton, { width: CARD_WIDTH, marginRight: 16 }]}>
            <View style={[styles.skeletonBase, { width: 120, height: 24, marginBottom: 15 }]} />
            <View style={[styles.skeletonBase, { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 }]} />
            <View style={[styles.skeletonBase, { width: '100%', height: 180, borderRadius: 12 }]} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export default function RecommendScreen() {
  const { clothes, fetchClothes } = useCloset();
  const [situation, setSituation] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiRecommendations, setApiRecommendations] = useState<OutfitSet[] | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [displayFilter, setDisplayFilter] = useState('전체');
  
  const [recommendContext, setRecommendContext] = useState({ situation: '', address: '' });

  useEffect(() => {
    if (clothes.length === 0 && fetchClothes) {
      fetchClothes();
    }
  }, [clothes.length]);

  const fetchTodayRecommendation = async () => {
    if (clothes.length === 0) return Alert.alert('알림', '옷장 데이터를 먼저 불러와주세요.');
    if (!situation.trim()) return Alert.alert('입력 필요', '상황을 입력해주세요.');

    try {
      setApiLoading(true);
      
      // 1. 위치 정보는 정상적으로 가져옴 (테스트 환경에서도 중요)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('권한 필요', '위치 권한이 필요합니다.');

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync(location.coords);
      const address = `${geocode[0]?.region || ''} ${geocode[0]?.city || ''}`;

      const response = await api.get('/recommend/today', { params: { situation, address } });

      setRecommendContext({ situation, address });
      setAiMessage(response.data.ai_message || '');
      
      // 3. 옷 매칭 로직 (기존과 동일)
      const matched = response.data.outfits.map((outfit: any) => {
        const set: OutfitSet = { reason: outfit.reason };
        outfit.items.forEach((item: any) => {
          const myCloth = clothes.find(c => Number(c.id) === Number(item.clothes_id));
          if (myCloth) {
            const cat = (myCloth as any).category || myCloth.tags?.category || (item as any).category;
            if (cat === '상의') set.top = myCloth;
            else if (cat === '하의') set.bottom = myCloth;
            else if (cat === '아우터') set.outer = myCloth;
            else if (cat === '신발') set.shoes = myCloth;
          }
        });
        return set;
      });

      setApiRecommendations(matched);
      
    } catch (error) {
      console.error(error);
      Alert.alert('오류', '추천을 불러오지 못했습니다.');
    } finally {
      setApiLoading(false);
    }
  };

const handleWearOutfit = async (outfit: OutfitSet) => {
  try {
    // 🎯 오늘 날짜를 백엔드 포맷(YYYY-MM-DD)에 맞게 생성
    const todayStr = new Date().toISOString().slice(0, 10);

    // 선택된 코디에서 존재하는 옷들만 필터링하고 worn_date 필드 필수 추가!
    const payload = [outfit.top, outfit.bottom, outfit.outer, outfit.shoes]
      .filter(Boolean)
      .map(cloth => ({
        clothes_id: Number(cloth!.id),
        worn_date: todayStr // 👈 이 필드가 누락되어 422 에러가 났던 것입니다.
      }));

    if (payload.length === 0) {
      return Alert.alert('알림', '착용할 옷 정보가 없습니다.');
    }

    console.log('🚀 백엔드로 보낼 데이터 구조:', payload);

    await api.post('/history', payload);
    Alert.alert('성공', '오늘의 착용 기록에 저장되었습니다!');
  } catch (error: any) {
    console.error(error);
    const errorMsg = error.response?.status === 422 
      ? '데이터 포맷이 잘못되었습니다. (422)' 
      : '착용 기록 저장에 실패했습니다.';
    Alert.alert('오류', errorMsg);
  }
};

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.headerTitleRow}>
        <Text style={styles.title}>코디 추천</Text>
        <Ionicons name="shirt" size={28} color="#111827" />
      </View>
      <Text style={styles.headerSubtitle}>오늘의 날씨와 외출 목적에 맞는 스타일링</Text>

      <View style={styles.section}>
        
        {/* 2. 변경된 섹션 타이틀 영역 */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="partly-sunny" size={22} color="#2563EB" />
          <Text style={styles.sectionTitle}>오늘의 날씨 기반 추천</Text>
        </View>
        
        <View style={styles.inputBox}>
          <TextInput style={styles.textInput} value={situation} onChangeText={setSituation} placeholder="예: 데이트, 출근, 미팅" placeholderTextColor="#9CA3AF" />
        </View>

        <View style={styles.quickKeywordRow}>
          {['데이트', '출근', '결혼식', '운동', '카페'].map(keyword => (
            <TouchableOpacity 
              key={keyword} 
              style={styles.quickKeywordChip} 
              onPress={() => setSituation(keyword)}
            >
              <Text style={styles.quickKeywordText}>{keyword}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={fetchTodayRecommendation} disabled={apiLoading}>
          <Text style={styles.actionButtonText}>{apiLoading ? '불러오는 중...' : '코디 추천받기'}</Text>
        </TouchableOpacity>

        {apiLoading && <SkeletonLoader />}

        {!apiLoading && !apiRecommendations && (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="sparkles" size={48} color="#D1D5DB" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyStateTitle}>AI 코디네이터 대기 중</Text>
            <Text style={styles.emptyStateDesc}>
              오늘의 외출 목적을 입력하시면,{'\n'}날씨와 옷장 데이터를 분석해 딱 맞는 코디를 제안해 드립니다.
            </Text>
          </View>
        )}

        {!apiLoading && apiRecommendations && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>✨ AI 추천 결과</Text>
            
            <View style={styles.contextGroup}>
              <Text style={styles.contextGroupText}>
                📍 {recommendContext.address || '위치 알 수 없음'} · 🎯 {recommendContext.situation}
              </Text>
            </View>

            <RecommendFilter activeFilter={displayFilter} onFilterChange={setDisplayFilter} />
            {aiMessage && (
              <View style={styles.aiMessageBox}>
                <View style={styles.aiMessageHeader}>
                  <Ionicons name="sparkles" size={16} color="#4F46E5" />
                  <Text style={styles.aiMessageTitle}>AI 스타일링 포인트</Text>
                </View>
                <Text style={styles.aiMessageText}>{aiMessage}</Text>
              </View>
            )}

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + 16}
              decelerationRate="fast"
              contentContainerStyle={{ paddingRight: 16, paddingBottom: 10 }}
            >
              {apiRecommendations.map((outfit, index) => (
                <View key={index} style={[styles.outfitCard, { width: CARD_WIDTH }]}>
                  <View style={styles.outfitCardHeader}>
                    <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />
                    <Text style={styles.outfitCardTitle}>추천 코디 {index + 1}</Text>
                  </View>

                  {outfit.reason && (
                    <View style={styles.outfitReasonBox}>
                      <Text style={styles.outfitDescription}>{outfit.reason}</Text>
                    </View>
                  )}
                  
                  {/* 카드가 너무 길어지지 않게 ScrollView 안에 옷 목록 배치 */}
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ flexGrow: 1, marginBottom: 16 }}>
                    {(displayFilter === '전체' || displayFilter === '상의') && outfit.top && <OutfitItemCard label="상의" item={outfit.top} />}
                    {(displayFilter === '전체' || displayFilter === '하의') && outfit.bottom && <OutfitItemCard label="하의" item={outfit.bottom} />}
                    {(displayFilter === '전체' || displayFilter === '아우터') && outfit.outer && <OutfitItemCard label="아우터" item={outfit.outer} />}
                    {(displayFilter === '전체' || displayFilter === '신발') && outfit.shoes && <OutfitItemCard label="신발" item={outfit.shoes} />}
                  </ScrollView>

                  {/* ✨ 추가된 기능: 추천 코디 착용하기 버튼 */}
                  <TouchableOpacity 
                    style={styles.wearButton} 
                    onPress={() => handleWearOutfit(outfit)}
                  >
                    <Text style={styles.wearButtonText}>이 코디 착용하기</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 4 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: '#64748B', marginBottom: 20 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 0 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  inputBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  textInput: { fontSize: 16, color: '#111827', fontWeight: '600' },
  quickKeywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  quickKeywordChip: { backgroundColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  quickKeywordText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  actionButton: { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#64748B', marginBottom: 8 },
  emptyStateDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center', lineHeight: 22 },
  
  contextGroup: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  contextGroupText: { fontSize: 14, fontWeight: '700', color: '#475569' },

  aiMessageBox: { 
    backgroundColor: '#F5F8FF', 
    padding: 20, 
    borderRadius: 16, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  aiMessageHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    marginBottom: 8 
  },
  aiMessageTitle: { 
    fontSize: 14, 
    fontWeight: '800', 
    color: '#4338CA' 
  },
  aiMessageText: { 
    fontSize: 15, 
    color: '#1F2937', 
    lineHeight: 26, 
    fontWeight: '500' // 👈 600에서 400으로 빼서 눈의 피로도를 낮춤
  },
  
  outfitCard: { marginRight: 16, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', maxHeight: 600, justifyContent: 'space-between' }, 
  outfitCardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, // 아이콘과 텍스트 사이 간격
    marginBottom: 12 
  },

  outfitCardTitle: { 
    fontSize: 18, // 폰트 크기 살짝 조정
    fontWeight: '800', 
    color: '#111827' 
  },

  outfitReasonBox: {
    backgroundColor: '#F1F5F9', // 아주 연한 회색으로 옷 카드와 구분
    borderLeftWidth: 3,         // 왼쪽에만 선을 그어 답답함 해소
    borderLeftColor: '#94A3B8', // 차분한 슬레이트 그레이 컬러
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopRightRadius: 8,    // 오른쪽만 살짝 둥글게
    borderBottomRightRadius: 8,
    marginBottom: 16
  },

  outfitDescription: { 
    fontSize: 14, 
    color: '#334155',
    lineHeight: 22,
    fontWeight: '500'
  },
  
  // ✨ 착용하기 버튼 스타일 추가
  wearButton: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 'auto' },
  wearButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  skeletonBase: { backgroundColor: '#E5E7EB', borderRadius: 8 },
  aiMessageBoxSkeleton: { backgroundColor: '#F3F4F6', padding: 20, borderRadius: 16, marginBottom: 20 },
  outfitCardSkeleton: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
});