import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import api from '../_api';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveImageUri(image?: string | null) {
  if (!image) return null;
  if (image.startsWith('http://') || image.startsWith('https://') || image.startsWith('file://')) {
    return image;
  }
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

// 백엔드 의류 데이터 규격 정의
type BackendClothesItem = {
  clothes_id: number;
  category: string;
  color: string;
  season: string;
  material: string;
  price: number;
  wear_count: number;
  image?: string;
};

type OverloadGroup = {
  category: string;
  color: string;
  count: number;
  warning_message: string;
  items: BackendClothesItem[];
};

export default function AnalysisScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // 🚨 옷장 분석 데이터 저장용 상태 관리 스태이트
  const [overloadData, setOverloadData] = useState<{
    total_warnings: number;
    ai_advice: string;
    items: OverloadGroup[];
  } | null>(null);

  const [disposalData, setDisposalData] = useState<{
    items: BackendClothesItem[];
    ai_advice: string;
  } | null>(null);

  // ✅ 진단 탭을 누를 때마다 백엔드 서버의 통계 데이터를 최신 상태로 원격 동기화
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadAnalysisData = async () => {
        if (!isMounted) return;
        setLoading(true);
        try {
          const [overloadRes, disposalRes] = await Promise.all([
            api.get('/stats/overload'),
            api.get('/stats/unworn', { params: { current_season: '여름' } }),
          ]);

          if (isMounted) {
            setOverloadData(overloadRes.data);

            const disposalArray = disposalRes.data || [];
            setDisposalData({
              items: disposalArray,
              ai_advice: '최근 90일 이상 입지 않은 옷들입니다. 처분이나 나눔을 고민해 보세요!',
            });
          }
        } catch (error) {
          console.error('분석 데이터 로드 실패:', error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadAnalysisData();
      return () => {
        isMounted = false;
      };
    }, [])
  );

  // 공통 의류 카드 컴포넌트 렌더러 (백엔드 플랫 데이터 매핑)
  const renderClothesCard = (item: any, badgeType?: 'overload' | 'dispose') => {
    const rawImage = item.image ?? item.image_url;
    const resolvedUri = resolveImageUri(rawImage);
    const imageUri = resolvedUri || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300&auto=format&fit=crop';
    
  // ✅ 1. 백엔드 계층형 스펙 반영: tags 객체 내부의 category와 material을 안전하게 참조
    const displayCategory = item.tags?.category || item.category || '의류';
    const displayMaterial = item.tags?.material || item.material || '기본';
    const displayColor = item.tags?.color || item.color || '';

    // ✅ 2. 뱃지 텍스트 동적 분기: 0회 착용이면 [미착용], 그 외에는 [방치됨] 처리
    let badgeText = '중복';
    if (badgeType === 'dispose') {
      badgeText = item.wear_count === 0 ? '미착용' : '방치됨';
    }

    return (
      <TouchableOpacity
        key={item.clothes_id}
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => router.push({ pathname: '/detail', params: { id: item.clothes_id.toString() } })}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="contain" />
          {badgeType && (
            <View style={[styles.cardBadge, badgeType === 'overload' ? styles.overloadBadge : styles.disposeBadge]}>
              <Text style={styles.cardBadgeText}>{badgeText}</Text>
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{displayCategory}</Text>
          <View style={styles.cardTagRow}>
            <Text style={styles.cardTag}>{displayColor}</Text>
            <Text style={styles.cardTag}>{displayMaterial || '기본'}</Text>
            <Text style={[styles.cardTag, styles.countTag]}>{item.wear_count}회 착용</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !overloadData && !disposalData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  // 총 몇 개의 주의 아이템 카드가 바인딩되어야 하는지 계산
  const totalOverloadCount = overloadData?.items?.reduce((acc, cur) => acc + (cur.items?.length || 0), 0) || 0;
  const totalDisposeCount = disposalData?.items?.length || 0;
  const hasAnyItems = totalOverloadCount > 0 || totalDisposeCount > 0;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 대제목 헤더 */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>옷장 진단</Text>
          <Text style={styles.subtitle}>AI가 내 옷장을 분석하여 스마트한 다이어트를 도와줍니다.</Text>
        </View>

        {/* 1. 과부하 분석 배너 영역 */}
        {overloadData && overloadData.total_warnings > 0 ? (
          <View style={styles.overloadBannerBox}>
            <View style={styles.overloadBannerHeader}>
              <Ionicons name="warning" size={18} color="#dc2626" />
              <Text style={styles.overloadBannerTitle}>충동 소비 주의보 ({overloadData.total_warnings}건)</Text>
            </View>
            <Text style={styles.overloadBannerText}>{overloadData.ai_advice}</Text>
          </View>
        ) : (
          <View style={[styles.overloadBannerBox, styles.safeBannerBox]}>
            <View style={styles.overloadBannerHeader}>
              <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
              <Text style={[styles.overloadBannerTitle, styles.safeBannerTitle]}>옷장 과부하 안전</Text>
            </View>
            <Text style={styles.overloadBannerText}>중복되거나 과하게 쌓인 카테고리의 아이템이 없습니다.</Text>
          </View>
        )}

        {/* 2. 장기 미착용 의류 처분 제안 배너 영역 */}
        {disposalData && disposalData.items?.length > 0 ? (
          <View style={styles.disposalBannerBox}>
            <View style={styles.disposalBannerHeader}>
              <Ionicons name="trash-outline" size={18} color="#d97706" />
              <Text style={styles.disposalBannerTitle}>정리가 필요한 옷 제안</Text>
            </View>
            <Text style={styles.disposalBannerText}>{disposalData.ai_advice}</Text>
          </View>
        ) : (
          <View style={[styles.disposalBannerBox, styles.safeBannerBox]}>
            <View style={styles.disposalBannerHeader}>
              <Ionicons name="heart-outline" size={18} color="#2563eb" />
              <Text style={[styles.disposalBannerTitle, styles.infoBannerTitle]}>의류 활용도 양호</Text>
            </View>
            <Text style={styles.disposalBannerText}>최근 90일 동안 골고루 잘 입고 계시거나 처분할 옷이 없습니다.</Text>
          </View>
        )}

        {/* 3. 주의 필요한 아이템 리스트 실시간 그리드 바인딩 */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>진단 대상 의류 상세 내역</Text>
          <Text style={styles.resultCount}>총 {totalOverloadCount + totalDisposeCount}개</Text>
        </View>

        {!hasAnyItems ? (
          <View style={styles.emptyGridPlaceholder}>
            <Ionicons name="sparkles-outline" size={40} color="#16a34a" />
            <Text style={styles.placeholderText}>옷장이 아주 깨끗하고 이상적으로 관리되고 있습니다!</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {/* 과부하 중복 옷 무더기들 바인딩 */}
            {overloadData?.items?.map((group) => 
              group.items?.map((item) => renderClothesCard(item, 'overload'))
            )}

            {/* 90일 이상 안 입은 처분 대상 옷들 바인딩 */}
            {disposalData?.items?.map((item) => 
              renderClothesCard(item, 'dispose')
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 28 },
  loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  headerRow: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, color: '#111' },
  subtitle: { fontSize: 14, color: '#6b6b6b', lineHeight: 20 },
  
  // 과부하 경고 스타일 (Red)
  overloadBannerBox: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fee2e2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  overloadBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  overloadBannerTitle: { fontSize: 14, fontWeight: '800', color: '#dc2626' },
  overloadBannerText: { fontSize: 14, color: '#4b5563', lineHeight: 22, fontWeight: '600' },
  
  // 처분 제안 스타일 (Amber)
  disposalBannerBox: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fef3c7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  disposalBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  disposalBannerTitle: { fontSize: 14, fontWeight: '800', color: '#d97706' },
  disposalBannerText: { fontSize: 14, color: '#4b5563', lineHeight: 22, fontWeight: '600' },
  
  // 안전 상태 안내 공통
  safeBannerBox: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  safeBannerTitle: { color: '#16a34a' },
  infoBannerTitle: { color: '#2563eb' },

  resultHeader: { marginTop: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  resultCount: { fontSize: 14, color: '#6b6b6b', fontWeight: '700' },

  // 2열 바둑판 그리드 스타일
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.2%', backgroundColor: '#fff', borderRadius: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ededed' },
  cardImageWrap: { width: '100%', height: 160, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, color: '#111' },
  cardTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cardTag: { fontSize: 11, color: '#4b5563', backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, fontWeight: '500' },
  countTag: { backgroundColor: '#eff6ff', color: '#1d4ed8' },

  // 이미지 좌상단 뱃지 라벨
  cardBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  overloadBadge: { backgroundColor: '#dc2626' },
  disposeBadge: { backgroundColor: '#d97706' },
  cardBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  emptyGridPlaceholder: {
    height: 160,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 30,
  },
  placeholderText: { fontSize: 13, color: '#6b6b6b', fontWeight: '600', textAlign: 'center', lineHeight: 20 },
});