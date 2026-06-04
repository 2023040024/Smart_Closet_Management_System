import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import api from './_api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

interface CareTip { "세탁 및 관리": string; "보관 방법": string; }
interface TipResponse { clothes_name: string; material: string; tip: CareTip | string; }

type DetailApiItem = {
  id?: number; clothes_id?: number; name?: string; image?: string | null; image_url?: string | null;
  purchase_price?: number | null; price?: number | null; last_worn_date?: string | null;
  wear_count?: number; situation?: string | null; tpo?: string | null;
  tags?: any; category?: string; color?: string; season?: string; style?: string; material?: string; 
};

function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('file://')) return image;
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

type HighlightType = 'none' | 'normal_cost' | 'warning';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<DetailApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [tipData, setTipData] = useState<TipResponse | null>(null);
  const [tipLoading, setTipLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) { setErrorMessage('옷 ID가 없습니다.'); setLoading(false); return; }
    try {
      setLoading(true); setErrorMessage('');
      const response = await api.get(`/clothes?t=${new Date().getTime()}`);
      const data: DetailApiItem[] = response.data;
      const foundItem = data.find((c) => String(c.id) === String(id)) ?? data.find((c) => String(c.clothes_id) === String(id)) ?? null;
      if (!foundItem) { setErrorMessage('데이터가 없습니다.'); setItem(null); return; }
      setItem(foundItem);
    } catch (error: any) {
      setErrorMessage(error.response?.data?.detail || '상세 정보를 불러오지 못했습니다.');
      setItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { fetchDetail(); }, [fetchDetail]));

  useEffect(() => {
    const fetchCareTips = async () => {
      const actualId = item?.id ?? item?.clothes_id;
      if (!actualId) return;
      try {
        setTipLoading(true);
        const response = await api.get<TipResponse>(`/clothes/${actualId}/tips`);
        setTipData(response.data);
      } catch (error) {
        setTipData(null);
      } finally {
        setTipLoading(false);
      }
    };
    fetchCareTips();
  }, [item?.id, item?.clothes_id]);

  const visibleTags = useMemo(() => {
    if (!item) return [];
    const s = item.tags || {};
    const fitValue = s.top_fit ?? s.topFit ?? s.bottom_fit ?? s.bottomFit ?? '';
    const tpoValue = s.situation ?? s.tpo ?? item.situation ?? item.tpo ?? '';
    const rawPrice = item.price ?? item.purchase_price;
    const wearCount = item.wear_count ?? 0;
    const priceValue = (rawPrice != null) ? `${Number(rawPrice).toLocaleString()}원` : '';
    
    let costPerWearStr = '';
    let costHighlight: HighlightType = 'none';
    let showCost = false;

    if (rawPrice != null && Number(rawPrice) > 0) {
      showCost = true;
      if (wearCount === 0) {
        // 미착용 시 빨간색 경고 표시
        costPerWearStr = '미착용 (계산 불가)';
        costHighlight = 'warning';
      } else {
        // 착용 기록이 있으면 무조건 기존 사진의 연보라색 스타일 적용
        const costValue = Math.floor(Number(rawPrice) / wearCount);
        costPerWearStr = `₩${costValue.toLocaleString()} / 회`;
        costHighlight = 'normal_cost';
      }
    }

    const tagsArray = [
      { label: '이름', value: item.name }, { label: '카테고리', value: s.category ?? item.category },
      { label: '색상', value: s.color ?? item.color }, { label: '계절', value: s.season ?? item.season },
      { label: '톤', value: s.tone }, { label: '스타일', value: s.style ?? item.style },
      { label: '분위기', value: s.mood }, { label: '핏', value: fitValue },
      { label: '소재', value: s.material ?? item.material }, { label: '두께', value: s.thickness },
      { label: '포인트', value: s.point }, { label: 'TPO', value: tpoValue },
      { label: '누적 착용', value: `${wearCount}회` }, { label: '구매가', value: priceValue },
      ...(showCost ? [{ label: '가성비', value: costPerWearStr, highlight: costHighlight }] : []),
      { label: '마지막 착용일', value: item.last_worn_date },
    ];
    return tagsArray.filter((t) => t.value != null && String(t.value).trim() !== '');
  }, [item]);

  if (loading && !item) return <View style={styles.emptyContainer}><ActivityIndicator size="large" color="#2563EB" /></View>;
  if (!item) return <View style={styles.emptyContainer}><Text style={styles.emptyText}>{errorMessage || '데이터가 없습니다.'}</Text></View>;

  const imageUri = resolveImageUri(item.image ?? item.image_url);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <StatusBar barStyle="dark-content" />
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="arrow-back" size={28} color="#111827" />
          </TouchableOpacity>
          <Text style={[styles.title, { marginBottom: 0 }]}>옷 상세</Text>
        </View>

        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imageFallback}><Text style={styles.imageFallbackText}>이미지가 없습니다.</Text></View>
        )}

        <Text style={styles.sectionTitle}>선택된 태그</Text>

        {visibleTags.length === 0 ? (
          <Text style={styles.emptyTagText}>표시할 태그가 없습니다.</Text>
        ) : (
          <View style={styles.tagList}>
            {visibleTags.map((tag) => {
              let pillStyle: any[] = [styles.tagPill];
              let textStyle: any[] = [styles.tagText];

              if (tag.highlight === 'normal_cost') { pillStyle.push(styles.normalCostPill); textStyle.push(styles.normalCostText); }
              else if (tag.highlight === 'warning') { pillStyle.push(styles.warningCostPill); textStyle.push(styles.warningCostText); }

              return (
                <View key={`${tag.label}-${tag.value}`} style={styles.tagRow}>
                  <Text style={styles.tagLabel}>{tag.label}</Text>
                  <View style={pillStyle}><Text style={textStyle}>{String(tag.value)}</Text></View>
                </View>
              );
            })}
          </View>
        )}

        {tipLoading ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginBottom: 20 }} />
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

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={() => router.push({ pathname: '/edit', params: { id: String(item?.id ?? item?.clothes_id) } })}>
          <Text style={styles.buttonText}>옷 정보 수정하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  emptyText: { color: '#64748B', fontSize: 15, marginTop: 12, textAlign: 'center' },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 40, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  
  image: { width: '100%', height: 260, borderRadius: 16, marginBottom: 24, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  imageFallback: { width: '100%', height: 260, borderRadius: 16, marginBottom: 24, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  imageFallbackText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#111827' },
  emptyTagText: { color: '#64748B', marginBottom: 20 },
  
  // ✨ 태그 리스트 디자인 복구 (둥근 알약 형태 및 사이즈 조정)
  tagList: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  tagRow: { minWidth: '48%', flexDirection: 'column', alignItems: 'flex-start', marginBottom: 18, paddingRight: 8 },
  tagLabel: { fontSize: 13, color: '#64748B', marginBottom: 6, fontWeight: '600', marginLeft: 4 },
  
  tagPill: { backgroundColor: '#F3F4F6', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 16 },
  tagText: { color: '#374151', fontSize: 14, fontWeight: '700' },

  // ✨ 가성비 태그 로직 색상 복구
  normalCostPill: { backgroundColor: '#E0E7FF' }, // 기존 사진의 연보라/파랑 배경
  normalCostText: { color: '#3730A3', fontWeight: '800' }, 
  warningCostPill: { backgroundColor: '#FEF2F2' }, // 미착용 시 빨간 경고
  warningCostText: { color: '#DC2626', fontWeight: '800' },

  tipContainer: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  tipTitle: { fontSize: 16, fontWeight: '800', marginBottom: 16, color: '#111827' },
  tipBox: { marginBottom: 14 },
  tipLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 6 },
  tipValueText: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '500' },
  errorTipText: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic', lineHeight: 22 },

  button: { marginTop: 8, backgroundColor: '#2563EB', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});