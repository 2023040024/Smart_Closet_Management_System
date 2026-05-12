import * as Location from 'expo-location';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { OutfitItemCard } from '../../components/recommend/OutfitItemCard'; // 경로 확인 필요
import { RecommendFilter } from '../../components/recommend/RecommendFilter';
import api from '../_api';
import { ClothesItem, useCloset } from '../_closetStore';

type OutfitSet = {
  top?: ClothesItem; bottom?: ClothesItem; outer?: ClothesItem;
  shoes?: ClothesItem; accessory?: ClothesItem; reason?: string; 
};

export default function RecommendScreen() {
  const { clothes } = useCloset();
  const [situation, setSituation] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiRecommendations, setApiRecommendations] = useState<OutfitSet[] | null>(null);
  const [aiMessage, setAiMessage] = useState('');
  const [displayFilter, setDisplayFilter] = useState('전체');

  const fetchTodayRecommendation = async () => {
    if (!situation.trim()) {
      Alert.alert('입력 필요', '상황을 입력해주세요.');
      return;
    }

    try {
      setApiLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('권한 필요', '위치 권한이 필요합니다.');

      const location = await Location.getCurrentPositionAsync({});
      const geocode = await Location.reverseGeocodeAsync(location.coords);
      const address = geocode.length > 0 ? `${geocode[0].region || ''} ${geocode[0].city || ''}` : '알 수 없는 위치';

      const response = await api.get('/recommend/today', { params: { situation, address } });
      
      setAiMessage(response.data.ai_message || '');
      const matched = response.data.outfits.map((outfit: any) => {
        const set: OutfitSet = { reason: outfit.reason };
        outfit.items.forEach((item: any) => {
          const myCloth = clothes.find(c => Number(c.id) === Number(item.clothes_id));
          if (myCloth) {
            if (item.category === '상의') set.top = myCloth;
            else if (item.category === '하의') set.bottom = myCloth;
            else if (item.category === '아우터') set.outer = myCloth;
            else if (item.category === '신발') set.shoes = myCloth;
            else if (item.category === '악세사리') set.accessory = myCloth;
          }
        });
        return set;
      });
      setApiRecommendations(matched);
    } catch (error) {
      Alert.alert('오류', '추천을 불러오지 못했습니다.');
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>
      
      <View style={styles.section}>
        <TextInput style={styles.textInput} value={situation} onChangeText={setSituation} placeholder="어떤 상황인가요?" />
        <TouchableOpacity style={styles.actionButton} onPress={fetchTodayRecommendation} disabled={apiLoading}>
          <Text style={styles.actionButtonText}>{apiLoading ? '로딩 중...' : '추천받기'}</Text>
        </TouchableOpacity>

        {!apiLoading && apiRecommendations && (
          <View style={{ marginTop: 20 }}>
            <RecommendFilter activeFilter={displayFilter} onFilterChange={setDisplayFilter} />
            {aiMessage && <View style={styles.aiBox}><Text>💬 {aiMessage}</Text></View>}
            
            {apiRecommendations.map((outfit, i) => (
              <View key={i} style={styles.card}>
                {(displayFilter === '전체' || displayFilter === '상의') && <OutfitItemCard label="상의" item={outfit.top} />}
                {(displayFilter === '전체' || displayFilter === '하의') && <OutfitItemCard label="하의" item={outfit.bottom} />}
                {/* ... 나머지 아우터, 신발 등 동일하게 추가 ... */}
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
  content: { padding: 16 },
  title: { fontSize: 30, fontWeight: '800', marginBottom: 20 },
  section: { backgroundColor: '#FFF', borderRadius: 20, padding: 16 },
  textInput: { backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginBottom: 10 },
  actionButton: { backgroundColor: '#111827', padding: 16, borderRadius: 12, alignItems: 'center' },
  actionButtonText: { color: '#FFF', fontWeight: '700' },
  aiBox: { backgroundColor: '#EEF2FF', padding: 16, borderRadius: 12, marginBottom: 16 },
  card: { backgroundColor: '#F8FAFC', borderRadius: 18, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
});