import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import api from './_api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

// ✅ 1. 관리 팁 데이터를 위한 타입 정의 추가
interface CareTip {
  "세탁 및 관리": string;
  "보관 방법": string;
}

interface TipResponse {
  clothes_name: string;
  material: string;
  tip: CareTip | string;
}

type DetailApiItem = {
  id?: number;
  clothes_id?: number;
  name?: string;
  image?: string | null;
  image_url?: string | null;
  purchase_price?: number | null;
  price?: number | null;
  last_worn_date?: string | null;
  situation?: string | null; 
  tpo?: string | null;
  tags?: {
    category?: string;
    color?: string;
    season?: string;
    tone?: string | null;
    style?: string;
    mood?: string | null;
    material?: string | null;
    thickness?: string | null;
    point?: string | null;
    situation?: string | null;
    tpo?: string | null;
    top_fit?: string | null;
    bottom_fit?: string | null;
    topFit?: string | null;
    bottomFit?: string | null;
  };
  category?: string;
  color?: string;
  season?: string;
  style?: string;
  material?: string; // 소재 정보 추가 매핑용
};

function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('file://')) {
    return image;
  }
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<DetailApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // ✅ 2. 관리 팁 상태 변수 추가
  const [tipData, setTipData] = useState<TipResponse | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setErrorMessage('옷 ID가 없습니다.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const response = await api.get(`/clothes?t=${new Date().getTime()}`);
      const data: DetailApiItem[] = response.data;

      const foundItem =
        data.find((clothesItem) => String(clothesItem.id) === String(id)) ??
        data.find((clothesItem) => String(clothesItem.clothes_id) === String(id)) ??
        null;

      if (!foundItem) {
        setErrorMessage('데이터가 없습니다.');
        setItem(null);
        return;
      }

      setItem(foundItem);
    } catch (error: any) {
      console.error('옷 상세 불러오기 실패:', error);
      if (error.response?.status === 401) {
        setErrorMessage('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
      } else {
        setErrorMessage(error.response?.data?.detail || '상세 정보를 불러오지 못했습니다.');
      }
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  // ✅ 3. 옷 상세 정보(item)를 성공적으로 가져오면 관리 팁 API 호출
  useEffect(() => {
    const fetchCareTips = async () => {
      const actualId = item?.id ?? item?.clothes_id;
      if (!actualId) return;

      try {
        setTipLoading(true);
        const response = await api.get<TipResponse>(`/clothes/${actualId}/tips`);
        setTipData(response.data);
      } catch (error) {
        console.error("소재별 관리 팁 로드 실패:", error);
        setTipData(null);
      } finally {
        setTipLoading(false);
      }
    };

    fetchCareTips();
  }, [item?.id, item?.clothes_id]); // ID가 확보될 때만 실행

  const visibleTags = useMemo(() => {
    if (!item) return [];

    const s = item.tags || {};
    const fitValue = s.top_fit ?? s.topFit ?? s.bottom_fit ?? s.bottomFit ?? '';
    
    const tpoValue = s.situation ?? s.tpo ?? item.situation ?? item.tpo ?? '';
    
    const rawPrice = item.price ?? item.purchase_price;
    const priceValue = (rawPrice !== null && rawPrice !== undefined)
      ? `${Number(rawPrice).toLocaleString()}원` 
      : '';

    return [
      { label: '이름', value: item.name },
      { label: '카테고리', value: s.category ?? item.category },
      { label: '색상', value: s.color ?? item.color },
      { label: '계절', value: s.season ?? item.season },
      { label: '톤', value: s.tone },
      { label: '스타일', value: s.style ?? item.style },
      { label: '분위기', value: s.mood },
      { label: '핏', value: fitValue },
      { label: '소재', value: s.material ?? item.material },
      { label: '두께', value: s.thickness },
      { label: '포인트', value: s.point },
      { label: 'TPO', value: tpoValue },
      { label: '구매가', value: priceValue },
      { label: '마지막 착용일', value: item.last_worn_date },
    ].filter(
      (tag) =>
        tag.value !== undefined &&
        tag.value !== null &&
        String(tag.value).trim() !== ''
    );
  }, [item]);

  if (loading && !item) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.emptyText}>상세 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{errorMessage || '데이터가 없습니다.'}</Text>
      </View>
    );
  }

  const imageUri = resolveImageUri(item.image ?? item.image_url);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.imageFallbackText}>이미지가 없습니다.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>선택된 태그</Text>

      {visibleTags.length === 0 ? (
        <Text style={styles.emptyTagText}>표시할 태그가 없습니다.</Text>
      ) : (
        <View style={styles.tagList}>
          {visibleTags.map((tag) => (
            <View key={`${tag.label}-${tag.value}`} style={styles.tagRow}>
              <Text style={styles.tagLabel}>{tag.label}</Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{String(tag.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ✅ 4. 관리 팁 UI 섹션 추가 (태그 리스트와 수정 버튼 사이) */}
      {tipLoading ? (
        <ActivityIndicator size="small" color="#111827" style={{ marginBottom: 20 }} />
      ) : tipData ? (
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>💡 {tipData.material} 소재 관리 팁</Text>
          
          {typeof tipData.tip === 'object' ? (
            <>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>🧼 세탁 및 관리</Text>
                <Text style={styles.tipValueText}>{tipData.tip["세탁 및 관리"]}</Text>
              </View>
              <View style={styles.tipBox}>
                <Text style={styles.tipLabel}>📦 보관 방법</Text>
                <Text style={styles.tipValueText}>{tipData.tip["보관 방법"]}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.errorTipText}>{tipData.tip}</Text>
          )}
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push({ 
          pathname: '/edit', 
          params: { id: String(item?.id ?? item?.clothes_id) } 
        })}
      >
        <Text style={styles.buttonText}>수정하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 24 },
  emptyText: { color: '#6b7280', fontSize: 15, marginTop: 12, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  image: { width: '100%', height: 280, borderRadius: 16, marginBottom: 20, backgroundColor: '#f3f4f6' },
  imageFallback: { width: '100%', height: 280, borderRadius: 16, marginBottom: 20, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  imageFallbackText: { color: '#6b7280', fontSize: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  emptyTagText: { color: '#6b7280', marginBottom: 20 },
  tagList: { marginBottom: 20 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  tagLabel: { width: 88, fontSize: 14, color: '#6b7280' },
  tagPill: { flexShrink: 1, backgroundColor: '#111827', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  tagText: { color: '#fff', fontSize: 14 },
  
  // ✅ 5. 관리 팁 관련 스타일
  tipContainer: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  tipTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111827' },
  tipBox: { marginBottom: 12 },
  tipLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  tipValueText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  errorTipText: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', lineHeight: 20 },

  button: { marginTop: 8, backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});