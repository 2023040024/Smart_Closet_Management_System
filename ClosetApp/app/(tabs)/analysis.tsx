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
  const [error, setError] = useState<string | null>(null);

  // 기존 상세 데이터 상태
  const [overloadData, setOverloadData] = useState<{ total_warnings: number; ai_advice: string; items: OverloadGroup[]; } | null>(null);
  const [disposalData, setDisposalData] = useState<{ items: BackendClothesItem[]; ai_advice: string; } | null>(null);
  
  // ✨ 새로 추가된 월간 리포트(대시보드) 상태
  const [reportData, setReportData] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadAnalysisData = async () => {
        if (!isMounted) return;
        setLoading(true);
        try {
          setError(null);
          
          // ✨ API 3개를 동시에 호출하여 대시보드 요약과 상세 리스트를 모두 가져옵니다.
          const [overloadRes, disposalRes, reportRes] = await Promise.all([
            api.get('/stats/overload'),
            api.get('/stats/dispose', { params: { current_season: getCurrentSeason() } }),
            api.get('/stats/monthly-report') // 👈 백엔드가 새로 만든 통합 API
          ]);

          if (isMounted) {
            setOverloadData(overloadRes.data);
            setDisposalData({
              items: disposalRes.data.items || [],
              ai_advice: disposalRes.data.ai_advice || '최근 90일 이상 입지 않은 옷들입니다. 처분이나 나눔을 고민해 보세요!',
            });
            setReportData(reportRes.data); // 대시보드 데이터 세팅
          }
        } catch (error) {
          console.error('분석 데이터 로드 실패:', error);
          setError('데이터를 불러오는 중 문제가 발생했습니다.');
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadAnalysisData();
      return () => { isMounted = false; };
    }, [])
  );

  const getCurrentSeason = (): string => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
  }

  // 백엔드 가이드: 상태 색상 매핑 함수
  const getBadgeStyles = (colorStr: string) => {
    switch(colorStr) {
      case 'green': return { bg: '#dcfce7', text: '#166534' }; 
      case 'yellow': return { bg: '#fef08a', text: '#854d0e' }; 
      case 'red': return { bg: '#fee2e2', text: '#991b1b' }; 
      default: return { bg: '#f3f4f6', text: '#374151' };
    }
  };

  const renderClothesCard = (item: any, badgeType?: 'overload' | 'dispose') => {
    const rawImage = item.image ?? item.image_url;
    const imageUri = resolveImageUri(rawImage) || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=300&auto=format&fit=crop';
    
    const displayCategory = item.tags?.category || item.category || '의류';
    const displayMaterial = item.tags?.material || item.material || '기본';
    const displayColor = item.tags?.color || item.color || '';

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
            <Text style={styles.cardTag}>{displayMaterial}</Text>
            <Text style={[styles.cardTag, styles.countTag]}>{item.wear_count}회 착용</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !overloadData && !reportData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={{marginTop: 10, color: '#666'}}>옷장 데이터를 분석하는 중...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: 'bold' }}>⚠️ {error}</Text>
      </View>
    );
  }

  const totalOverloadCount = overloadData?.items?.reduce((acc, cur) => acc + (cur.items?.length || 0), 0) || 0;
  const totalDisposeCount = disposalData?.items?.length || 0;
  const hasAnyItems = totalOverloadCount > 0 || totalDisposeCount > 0;

  // 뱃지 색상 계산
  const badgeStyle = reportData ? getBadgeStyles(reportData.overload.status_color) : getBadgeStyles('green');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* 대제목 헤더 */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>옷장 진단</Text>
          <Text style={styles.subtitle}>AI가 내 옷장을 분석하여 스마트한 다이어트를 도와줍니다.</Text>
        </View>

        {/* ✨ 1. 새로 추가된 월간 리포트 대시보드 영역 */}
        {reportData && (
          <View style={styles.dashboardContainer}>
            <View style={styles.dashboardCard}>
              <Text style={styles.dashboardTitle}>📊 이달의 옷장 다이어트 요약</Text>
              
              {/* ✨ 차트와 범례를 가로로 나란히 배치! */}
              <View style={styles.chartRow}>
                {/* 왼쪽: 크기를 줄인 미니 도넛 차트 */}
                <View style={styles.donutPlaceholder}>
                  <Text style={styles.centerRateText}>{reportData.ecosystem.activity_rate}%</Text>
                </View>

                {/* 오른쪽: 활성/방치 의류 범례 리스트 */}
                <View style={styles.legendColumn}>
                  <View style={styles.legendItem}>
                    <Text style={styles.legendIcon}>🔥</Text>
                    <View>
                      <Text style={styles.legendLabel}>활성 의류</Text>
                      <Text style={styles.legendValue}><Text style={styles.boldText}>{reportData.ecosystem.active_clothes}</Text>벌</Text>
                    </View>
                  </View>
                  <View style={styles.legendItem}>
                    <Text style={styles.legendIcon}>💤</Text>
                    <View>
                      <Text style={styles.legendLabel}>방치 의류</Text>
                      <Text style={styles.legendValue}><Text style={styles.boldText}>{reportData.ecosystem.inactive_clothes}</Text>벌</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View style={styles.cardDivider} />

              {/* 1-2. 과부하 지수 신호등 뱃지 */}
              <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg }]}>
                <Text style={[styles.badgeText, { color: badgeStyle.text }]}>
                  {reportData.overload.status_message}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* 2. 상세 아이템 리스트 실시간 그리드 바인딩 */}
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
            {overloadData?.items?.map((group) => 
              group.items?.map((item) => renderClothesCard(item, 'overload'))
            )}
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
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16, backgroundColor: '#f9fafb' }, // 배경색 파스텔 톤으로 살짝 변경
  scrollContent: { paddingBottom: 28 },
  loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  headerRow: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 6, color: '#111' },
  subtitle: { fontSize: 14, color: '#6b6b6b', lineHeight: 20 },
  
  // ✨ 대시보드 스타일
  dashboardContainer: { marginBottom: 10 },
  dashboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  dashboardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  chartRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 8,
    marginBottom: 4 
  },
  
  // 차트 크기 140 -> 100으로 축소
  donutPlaceholder: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    borderWidth: 10, 
    borderColor: '#e5e7eb',
    borderTopColor: '#111827',
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  centerRateText: { fontSize: 18, fontWeight: '800', color: '#111827' }, // 글씨 크기도 24 -> 18로 축소
  
  // 우측 범례 세로 정렬 스타일
  legendColumn: { 
    flex: 1, 
    marginLeft: 24, 
    justifyContent: 'center', 
    gap: 12 // 범례 사이 간격
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendIcon: { fontSize: 20 },
  legendLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  legendValue: { fontSize: 15, color: '#4b5563' },
  boldText: { fontWeight: '800', color: '#111827' },

  cardDivider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 16 },
  
  statusBadge: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  badgeText: { fontSize: 15, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 10 },

  // 기존 상세 그리드 스타일
  resultHeader: { marginTop: 10, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  resultCount: { fontSize: 14, color: '#6b6b6b', fontWeight: '700' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48.2%', backgroundColor: '#fff', borderRadius: 18, marginBottom: 14, overflow: 'hidden', borderWidth: 1, borderColor: '#ededed' },
  cardImageWrap: { width: '100%', height: 160, backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardBody: { padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6, color: '#111' },
  cardTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  cardTag: { fontSize: 11, color: '#4b5563', backgroundColor: '#f3f4f6', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, fontWeight: '500' },
  countTag: { backgroundColor: '#eff6ff', color: '#1d4ed8' },

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