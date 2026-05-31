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
  wear_count?: number; // ✅ 가성비 계산을 위한 착용 횟수 필드 추가
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
  material?: string; 
};

function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('file://')) {
    return image;
  }
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

// 뱃지 하이라이트 스타일을 위한 타입 정의
type HighlightType = 'none' | 'good' | 'normal_cost' | 'warning';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<DetailApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
  }, [item?.id, item?.clothes_id]);

  const visibleTags = useMemo(() => {
    if (!item) return [];

    const s = item.tags || {};
    const fitValue = s.top_fit ?? s.topFit ?? s.bottom_fit ?? s.bottomFit ?? '';
    const tpoValue = s.situation ?? s.tpo ?? item.situation ?? item.tpo ?? '';
    
    // 구매가 및 누적 착용 횟수 세팅
    const rawPrice = item.price ?? item.purchase_price;
    const wearCount = item.wear_count ?? 0;
    
    const priceValue = (rawPrice !== null && rawPrice !== undefined)
      ? `${Number(rawPrice).toLocaleString()}원` 
      : '';

    // ✅ 가성비(Cost per wear) 산출 로직 및 ZeroDivision 방어
    let costPerWearStr = '';
    let costHighlight: HighlightType = 'none';
    let showCost = false;

    if (rawPrice !== null && rawPrice !== undefined && Number(rawPrice) > 0) {
      showCost = true;
      if (wearCount === 0) {
        // 착용 횟수가 0일 경우 (에러 방어)
        costPerWearStr = '미착용 (계산 불가)';
        costHighlight = 'warning';
      } else {
        // 정상 나눗셈 계산
        const costValue = Math.floor(Number(rawPrice) / wearCount);
        costPerWearStr = `₩${costValue.toLocaleString()} / 회`;
        
        // 1회당 비용이 10,000원 이하이면 초록색 뱃지로 '가성비 좋음' 강조
        if (costValue <= 10000) {
          costHighlight = 'good';
        } else {
          costHighlight = 'normal_cost';
        }
      }
    }

    const tagsArray: Array<{ label: string; value: string | null | undefined; highlight?: HighlightType }> = [
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
      { label: '누적 착용', value: `${wearCount}회` }, // 누적 착용 횟수 표기
      { label: '구매가', value: priceValue },
      // 조건부 가성비 항목 추가
      ...(showCost ? [{ label: '가성비', value: costPerWearStr, highlight: costHighlight }] : []),
      { label: '마지막 착용일', value: item.last_worn_date },
    ];

    return tagsArray.filter(
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
          {visibleTags.map((tag) => {
            // ✅ 가성비 뱃지 스타일 분기 처리
            let pillStyle: any[] = [styles.tagPill];
            let textStyle: any[] = [styles.tagText];

            if (tag.highlight === 'good') {
              pillStyle.push(styles.goodCostPill);
              textStyle.push(styles.goodCostText);
            } else if (tag.highlight === 'normal_cost') {
              pillStyle.push(styles.normalCostPill);
              textStyle.push(styles.normalCostText);
            } else if (tag.highlight === 'warning') {
              pillStyle.push(styles.warningCostPill);
              textStyle.push(styles.warningCostText);
            }

            return (
              <View key={`${tag.label}-${tag.value}`} style={styles.tagRow}>
                <Text style={styles.tagLabel}>{tag.label}</Text>
                <View style={pillStyle}>
                  <Text style={textStyle}>{String(tag.value)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

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
  tagList: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  tagRow: { 
    minWidth: '48%', // 화면의 절반씩 차지하게 설정 (2열 배치)
    flexDirection: 'column', // 가로 폭이 좁아지므로 라벨은 위, 뱃지는 아래로 쌓이게 배치
    alignItems: 'flex-start', 
    marginBottom: 18, // 여백 살짝 조정
    paddingRight: 8,
  },

  tagLabel: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginBottom: 6 
  },
  
  // 기본 태그 스타일
  tagPill: { 
    backgroundColor: '#f3f4f6', 
    borderRadius: 999, 
    paddingVertical: 8,
    paddingHorizontal: 14 
  },

  tagText: { 
    color: '#374151', 
    fontSize: 15, 
    fontWeight: '600' 
  },

  // ✅ 가성비 뱃지 추가 스타일
  goodCostPill: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0' },
  goodCostText: { color: '#166534', fontWeight: '800' }, // 뽕 뽑은 가성비 좋은 옷 (초록)
  
  normalCostPill: { backgroundColor: '#e0e7ff', borderWidth: 1, borderColor: '#c7d2fe' },
  normalCostText: { color: '#3730a3', fontWeight: '700' }, // 일반 가성비 (파랑)
  
  warningCostPill: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb' },
  warningCostText: { color: '#6b7280', fontStyle: 'italic' }, // 미착용 상태 (회색)

  tipContainer: { backgroundColor: '#f9fafb', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#e5e7eb' },
  tipTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111827' },
  tipBox: { marginBottom: 12 },
  tipLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4 },
  tipValueText: { fontSize: 14, color: '#4b5563', lineHeight: 20 },
  errorTipText: { fontSize: 14, color: '#6b7280', fontStyle: 'italic', lineHeight: 20 },

  button: { marginTop: 8, backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});