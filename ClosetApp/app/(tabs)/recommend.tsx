import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
  reason?: string; // ✨ 악세사리 필드 삭제
};

export default function RecommendScreen() {
  const { clothes, fetchClothes } = useCloset();

  const [situation, setSituation] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiRecommendations, setApiRecommendations] = useState<OutfitSet[] | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [displayFilter, setDisplayFilter] = useState('전체');

  // ✅ 화면 진입 시 데이터 자동 로딩
  useEffect(() => {
    console.log(`[시스템] 현재 앱에 로드된 옷 개수: ${clothes.length}개`);
    if (clothes.length === 0 && fetchClothes) {
      fetchClothes();
    }
  }, [clothes.length]);

  const fetchTodayRecommendation = async () => {
    if (clothes.length === 0) {
      Alert.alert('데이터 부족', '옷장에 등록된 옷이 없습니다. 먼저 옷을 등록해 주세요.');
      return;
    }

    if (!situation.trim()) {
      Alert.alert('입력 필요', '상황(예: 데이트, 출근)을 입력해주세요.');
      return;
    }

    try {
      setApiLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '날씨 기반 추천을 위해 위치 권한이 필요합니다.');
        setApiLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync(location.coords);
      const address = `${geocode[0]?.region || ''} ${geocode[0]?.city || ''}`;

      const response = await api.get('/recommend/today', {
        params: { situation, address },
      });

      setAiMessage(response.data.ai_message || '');

      const matched = response.data.outfits.map((outfit: any, index: number) => {
        const set: OutfitSet = { reason: outfit.reason };

        console.log(`--- [코디 ${index + 1} 매칭 분석] ---`);

        outfit.items.forEach((item: any) => {
          const targetId = Number(item.clothes_id || item.id);
          const myCloth = clothes.find((c) => {
            const myId = Number(c.id || (c as any).clothes_id);
            return myId === targetId;
          });

          if (myCloth) {
            console.log(`   ✅ 매칭 성공: ID ${targetId} (${myCloth.tags.color} ${myCloth.tags.category})`);
            
            const cat = item.category.toLowerCase();
            if (cat === '상의' || cat === 'top') set.top = myCloth;
            else if (cat === '하의' || cat === 'bottom') set.bottom = myCloth;
            else if (cat === '아우터' || cat === 'outer') set.outer = myCloth;
            else if (cat === '신발' || cat === 'shoes') set.shoes = myCloth;
            // ❌ 악세사리 매칭 로직 삭제
          }
        });
        return set;
      });

      setApiRecommendations(matched);
    } catch (error) {
      console.error('추천 에러:', error);
      Alert.alert('오류', '추천 코디를 불러오지 못했습니다.');
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>오늘의 날씨 기반 추천</Text>
        <Text style={styles.descriptionText}>현재 위치의 날씨와 상황을 고려해 코디를 제안합니다.</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>어떤 상황인가요?</Text>
          <TextInput
            style={styles.textInput}
            value={situation}
            onChangeText={setSituation}
            placeholder="예: 데이트, 출근, 미팅"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <TouchableOpacity 
          style={[styles.actionButton, apiLoading && styles.disabledButton]} 
          onPress={fetchTodayRecommendation} 
          disabled={apiLoading}
        >
          <Text style={styles.actionButtonText}>
            {apiLoading ? '추천 불러오는 중...' : '코디 추천받기'}
          </Text>
        </TouchableOpacity>

        {apiLoading && <ActivityIndicator size="large" color="#111827" style={{ marginTop: 20 }} />}

        {!apiLoading && apiRecommendations && apiRecommendations.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>✨ AI 추천 결과</Text>
            
            <RecommendFilter activeFilter={displayFilter} onFilterChange={setDisplayFilter} />

            {aiMessage && (
              <View style={styles.aiMessageBox}>
                <Text style={styles.aiMessageText}>💬 {aiMessage}</Text>
              </View>
            )}

            {apiRecommendations.map((outfit, index) => (
              <View key={`outfit-${index}`} style={styles.outfitCard}>
                <Text style={styles.outfitCardTitle}>AI 추천 코디 {index + 1}</Text>
                {outfit.reason && <Text style={styles.outfitDescription}>{outfit.reason}</Text>}
                
                {/* ✅ 조건부 렌더링 적용: AI가 추천한 옷(데이터가 있는 옷)만 화면에 출력 */}
                {(displayFilter === '전체' || displayFilter === '상의') && outfit.top && (
                  <OutfitItemCard label="상의" item={outfit.top} />
                )}
                {(displayFilter === '전체' || displayFilter === '하의') && outfit.bottom && (
                  <OutfitItemCard label="하의" item={outfit.bottom} />
                )}
                {(displayFilter === '전체' || displayFilter === '아우터') && outfit.outer && (
                  <OutfitItemCard label="아우터" item={outfit.outer} />
                )}
                {(displayFilter === '전체' || displayFilter === '신발') && outfit.shoes && (
                  <OutfitItemCard label="신발" item={outfit.shoes} />
                )}
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
  section: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  descriptionText: { fontSize: 14, color: '#6B7280', marginBottom: 20 },
  inputBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
  textInput: { fontSize: 16, color: '#111827', fontWeight: '600' },
  actionButton: { backgroundColor: '#111827', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  disabledButton: { opacity: 0.6 },
  actionButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  aiMessageBox: { backgroundColor: '#EEF2FF', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#E0E7FF' },
  aiMessageText: { fontSize: 15, color: '#3730A3', lineHeight: 24, fontWeight: '600' },
  outfitCard: { marginBottom: 24, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
  outfitCardTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  outfitDescription: { fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 22 },
});