import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { OutfitItemCard } from '../../components/recommend/OutfitItemCard'; // ✨ Commit 1: 외부 컴포넌트 import
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

function SkeletonLoader() {
  return (
    <View style={{ marginTop: 24 }}>
      <View style={[styles.skeletonBase, { width: 150, height: 28, marginBottom: 15 }]} />
      <View style={styles.aiMessageBoxSkeleton}>
        <View style={[styles.skeletonBase, { width: '100%', height: 16, marginBottom: 8 }]} />
        <View style={[styles.skeletonBase, { width: '90%', height: 16, marginBottom: 8 }]} />
        <View style={[styles.skeletonBase, { width: '60%', height: 16 }]} />
      </View>
      {[1, 2].map((i) => (
        <View key={i} style={styles.outfitCardSkeleton}>
          <View style={[styles.skeletonBase, { width: 120, height: 24, marginBottom: 15 }]} />
          <View style={[styles.skeletonBase, { width: '100%', height: 180, borderRadius: 12 }]} />
        </View>
      ))}
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
  
  // ✨ Commit 2: 정보 그룹화를 위한 컨텍스트 상태 추가
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('권한 필요', '위치 권한이 필요합니다.');

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync(location.coords);
      const address = `${geocode[0]?.region || ''} ${geocode[0]?.city || ''}`;

      const response = await api.get('/recommend/today', { params: { situation, address } });

      // ✨ Commit 2: 추천 결과 컨텍스트(맥락) 저장
      setRecommendContext({ situation, address });
      setAiMessage(response.data.ai_message || '');
      
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘의 날씨 기반 추천</Text>
        <View style={styles.inputBox}>
          <TextInput style={styles.textInput} value={situation} onChangeText={setSituation} placeholder="예: 데이트, 출근, 미팅" placeholderTextColor="#9CA3AF" />
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={fetchTodayRecommendation} disabled={apiLoading}>
          <Text style={styles.actionButtonText}>{apiLoading ? '불러오는 중...' : '코디 추천받기'}</Text>
        </TouchableOpacity>

        {apiLoading && <SkeletonLoader />}

        {!apiLoading && apiRecommendations && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>✨ AI 추천 결과</Text>
            
            {/* ✨ Commit 2: 정보 그룹화 UI 추가 (날씨/위치 + TPO 맥락 표시) */}
            <View style={styles.contextGroup}>
              <Text style={styles.contextGroupText}>
                📍 {recommendContext.address || '위치 알 수 없음'} · 🎯 {recommendContext.situation}
              </Text>
            </View>

            <RecommendFilter activeFilter={displayFilter} onFilterChange={setDisplayFilter} />
            {aiMessage && <View style={styles.aiMessageBox}><Text style={styles.aiMessageText}>💬 {aiMessage}</Text></View>}
            
            {apiRecommendations.map((outfit, index) => (
              <View key={index} style={styles.outfitCard}>
                <Text style={styles.outfitCardTitle}>AI 추천 코디 {index + 1}</Text>
                {outfit.reason && <Text style={styles.outfitDescription}>{outfit.reason}</Text>}
                {(displayFilter === '전체' || displayFilter === '상의') && outfit.top && <OutfitItemCard label="상의" item={outfit.top} />}
                {(displayFilter === '전체' || displayFilter === '하의') && outfit.bottom && <OutfitItemCard label="하의" item={outfit.bottom} />}
                {(displayFilter === '전체' || displayFilter === '아우터') && outfit.outer && <OutfitItemCard label="아우터" item={outfit.outer} />}
                {(displayFilter === '전체' || displayFilter === '신발') && outfit.shoes && <OutfitItemCard label="신발" item={outfit.shoes} />}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6F8' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 30, fontWeight: '800', color: '#111827', marginBottom: 20 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  inputBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  textInput: { fontSize: 16, color: '#111827', fontWeight: '600' },
  actionButton: { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  
  // ✨ 정보 그룹화 스타일
  contextGroup: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  contextGroupText: { fontSize: 14, fontWeight: '700', color: '#475569' },

  aiMessageBox: { backgroundColor: '#EEF2FF', padding: 20, borderRadius: 16, marginBottom: 20 },
  aiMessageText: { fontSize: 15, color: '#3730A3', lineHeight: 24, fontWeight: '600' },
  outfitCard: { marginBottom: 24, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  outfitCardTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  outfitDescription: { fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 22 },
  
  skeletonBase: { backgroundColor: '#E5E7EB', borderRadius: 8 },
  aiMessageBoxSkeleton: { backgroundColor: '#F3F4F6', padding: 20, borderRadius: 16, marginBottom: 20 },
  outfitCardSkeleton: { marginBottom: 24, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20 },
});