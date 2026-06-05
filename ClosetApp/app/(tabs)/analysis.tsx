import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Image,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
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
  image_url?: string;
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
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [overloadData, setOverloadData] = useState<{ total_warnings: number; ai_advice: string; items: OverloadGroup[]; } | null>(null);
  const [disposalData, setDisposalData] = useState<{ items: BackendClothesItem[]; ai_advice: string; } | null>(null);
  const [reportData, setReportData] = useState<any>(null);

  const getCurrentSeason = (): string => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
  }

  const loadAnalysisData = async () => {
    setLoading(true);
    try {
      setError(null);
      const [overloadRes, disposalRes, reportRes] = await Promise.all([
        api.get('/stats/overload'),
        api.get('/stats/dispose', { params: { current_season: getCurrentSeason() } }),
        api.get('/stats/monthly-report')
      ]);

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      setOverloadData(overloadRes.data);
      setDisposalData({
        items: disposalRes.data.items || [],
        ai_advice: disposalRes.data.ai_advice || '최근 90일 이상 입지 않은 옷들입니다. 처분이나 나눔을 고민해 보세요!',
      });
      setReportData(reportRes.data);
    } catch (error) {
      console.error('분석 데이터 로드 실패:', error);
      setError('데이터를 불러오는 중 문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const run = async () => {
        if (!isMounted) return;
        await loadAnalysisData();
      };
      run();
      return () => { isMounted = false; };
    }, [])
  );

  const handleQuickDispose = async (clothesId: number) => {
  // 이미 삭제 중인 아이템이면 함수 종료 (중복 클릭 방지)
  if (deletingId === clothesId) return;

  setDeletingId(clothesId);
  try {
    await api.delete(`/clothes/${clothesId}`);
    await loadAnalysisData(); // 삭제 후 데이터 갱신
  } catch (error) {
    console.error('삭제 실패:', error);
  } finally {
    setDeletingId(null); // 삭제 완료 또는 실패 시 상태 초기화
  }
};

  const getBadgeStyles = (colorStr: string) => {
    switch(colorStr) {
      case 'green': return { bg: '#F0FDF4', text: '#166534', border: '#DCFCE7' }; 
      case 'yellow': return { bg: '#FEF9C3', text: '#854D0E', border: '#FEF08A' }; 
      case 'red': return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' }; 
      default: return { bg: '#F3F4F6', text: '#374151', border: '#E5E7EB' };
    }
  };

  const renderOverloadGroup = (group: OverloadGroup, index: number) => {
    return (
      <View key={`overload-${index}`} style={styles.groupCard}>
        <View style={styles.groupHeader}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.groupTitle}>{group.color} {group.category}</Text>
              <View style={styles.redBadge}><Text style={styles.redBadgeText}>중복 주의</Text></View>
            </View>
            <Text style={styles.groupSubtitle}>비슷한 디자인의 아이템이 {group.count}벌이나 모여있어요.</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnailScroll}>
          {group.items?.map((item) => {
            const imageUri = resolveImageUri(item.image ?? item.image_url) || 'https://via.placeholder.com/150';
            return (
              <TouchableOpacity
                key={item.clothes_id}
                style={styles.thumbnailWrap}
                activeOpacity={0.8}
                onPress={() => router.push({ pathname: '/detail', params: { id: item.clothes_id.toString() } })}
              >
                <Image source={{ uri: imageUri }} style={styles.thumbnailImage} resizeMode="contain" />
                <View style={styles.thumbnailOverlay}>
                  <Text style={styles.thumbnailWearText}>{item.wear_count}회 착용</Text>
                </View>
                <TouchableOpacity 
                  style={styles.quickDeleteBtn} 
                  onPress={() => handleQuickDispose(item.clothes_id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  disabled={deletingId === item.clothes_id}
                >
                  <Ionicons name="trash" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  const renderDisposeCard = (item: BackendClothesItem) => {
    const imageUri = resolveImageUri(item.image ?? item.image_url) || Image.resolveAssetSource(require('../../assets/images/no-image.png')).uri
    return (
      <View key={item.clothes_id} style={styles.disposeCardContainer}>
        <TouchableOpacity
          style={styles.disposeCard}
          activeOpacity={0.9}
          onPress={() => router.push({ pathname: '/detail', params: { id: item.clothes_id.toString() } })}
        >
          <Image source={{ uri: imageUri }} style={styles.disposeImage} resizeMode="contain" />
          <View style={styles.disposeBadge}><Text style={styles.disposeBadgeText}>장기 방치</Text></View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.disposeActionBtn} 
          onPress={() => handleQuickDispose(item.clothes_id)}
          activeOpacity={0.7}
          disabled={deletingId === item.clothes_id}
        >
          <Ionicons name="cube-outline" size={14} color="#DC2626" />
          <Text style={styles.disposeActionText}>
            {deletingId === item.clothes_id ? '처분 중...' : '처분하기'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && !overloadData && !reportData) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ width: 140, height: 32, backgroundColor: '#F1F5F9', borderRadius: 8, marginBottom: 8 }} />
          <View style={{ width: 250, height: 16, backgroundColor: '#F1F5F9', borderRadius: 8 }} />
        </View>
        <View style={[styles.dashboardCard, { height: 230, backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }]} />
        <View style={{ width: 120, height: 24, backgroundColor: '#F1F5F9', borderRadius: 8, marginVertical: 16 }} />
        <View style={[styles.groupCard, { height: 180, backgroundColor: '#F8FAFC', borderColor: '#F1F5F9', marginBottom: 16 }]} />
        <View style={[styles.groupCard, { height: 180, backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' }]} />
      </View>
    );
  }

  if (error) return <View style={styles.loadingContainer}><Text style={{ color: '#DC2626', fontWeight: 'bold' }}>⚠️ {error}</Text></View>;

  const totalOverloadCount = overloadData?.items?.reduce((acc, cur) => acc + (cur.items?.length || 0), 0) || 0;
  const totalDisposeCount = disposalData?.items?.length || 0;
  const hasAnyItems = totalOverloadCount > 0 || totalDisposeCount > 0;
  const badgeStyle = reportData ? getBadgeStyles(reportData.overload.status_color) : getBadgeStyles('green');

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="arrow-back" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={[styles.title, { marginBottom: 0 }]}>옷장 진단</Text>
          </View>
          <Text style={styles.subtitle}>AI가 내 옷장을 분석하여 스마트한 다이어트를 도와줍니다.</Text>
        </View>

        {reportData && (
          <View style={styles.dashboardCard}>
            <View style={styles.dashboardHeader}>
              <Ionicons name="analytics" size={20} color="#2563EB" />
              <Text style={styles.dashboardTitle}>이달의 옷장 다이어트 리포트</Text>
            </View>
            
            <View style={styles.progressTextRow}>
              <Text style={styles.centerRateText}>{reportData.ecosystem.activity_rate}<Text style={styles.percentText}>%</Text></Text>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(Math.max(reportData.ecosystem.activity_rate, 0), 100)}%` }]} />
            </View>

            <View style={styles.legendRow}>
              <Text style={styles.legendText}>🔥 활성 의류: <Text style={styles.boldText}>{reportData.ecosystem.active_clothes}</Text>벌</Text>
              <Text style={styles.legendText}>💤 방치 의류: <Text style={styles.boldText}>{reportData.ecosystem.inactive_clothes}</Text>벌</Text>
            </View>

            <View style={styles.cardDivider} />

            <View style={[styles.statusBadge, { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border }]}>
              <Text style={[styles.badgeText, { color: badgeStyle.text }]}>💡 {reportData.overload.status_message}</Text>
            </View>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>진단 상세 내역</Text>
          <Text style={styles.resultCount}>총 {totalOverloadCount + totalDisposeCount}건 발견</Text>
        </View>

        {!hasAnyItems ? (
          <View style={styles.emptyGridPlaceholder}>
            <Ionicons name="sparkles" size={40} color="#059669" />
            <Text style={styles.placeholderText}>유사한 아이템이나 방치된 옷이 없습니다.{"\n"}아주 완벽하게 관리되고 있네요!</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {overloadData?.items?.map((group, index) => renderOverloadGroup(group, index))}

            {totalDisposeCount > 0 && (
              <View style={styles.disposeSection}>
                 <View style={styles.disposeHeader}>
                    <Text style={styles.disposeTitle}>장기 방치 의류</Text>
                    <Text style={styles.disposeSub}>90일 이상 한 번도 입지 않았어요.</Text>
                 </View>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.disposeScroll}>
                   {disposalData?.items?.map((item) => renderDisposeCard(item))}
                 </ScrollView>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16, backgroundColor: '#FFFFFF' },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  headerRow: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', marginBottom: 6, color: '#111827', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748B', lineHeight: 22, fontWeight: '500' },
  
  dashboardCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  dashboardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  dashboardTitle: { fontSize: 16, fontWeight: '800', color: '#1E3A8A' },
  progressTextRow: { alignItems: 'center', marginBottom: 12 },
  centerRateText: { fontSize: 42, fontWeight: '900', color: '#111827', letterSpacing: -1 },
  percentText: { fontSize: 24, fontWeight: '700', color: '#64748B' },
  progressBarBg: { height: 12, backgroundColor: '#F1F5F9', borderRadius: 999, overflow: 'hidden', marginBottom: 20 },
  progressBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 999 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F8FAFC', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  legendText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  boldText: { fontWeight: '800', color: '#111827', fontSize: 15 },
  cardDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 20 },
  statusBadge: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  badgeText: { fontSize: 14, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  resultHeader: { marginTop: 10, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  resultCount: { fontSize: 14, color: '#2563EB', fontWeight: '800' },

  listContainer: { gap: 16 },

  groupCard: { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 },
  groupHeader: { padding: 18, paddingBottom: 12, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  groupTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  groupSubtitle: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
  redBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  redBadgeText: { color: '#DC2626', fontSize: 11, fontWeight: '800' },
  thumbnailScroll: { padding: 16, gap: 12 },
  thumbnailWrap: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F1F5F9', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  thumbnailImage: { width: '100%', height: '100%' },
  thumbnailOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255, 255, 255, 0.85)', paddingVertical: 4, alignItems: 'center' },
  thumbnailWearText: { fontSize: 11, fontWeight: '800', color: '#111827' },
  quickDeleteBtn: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },

  disposeSection: { marginTop: 10, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', paddingVertical: 18, overflow: 'hidden' },
  disposeHeader: { paddingHorizontal: 18, marginBottom: 12 },
  disposeTitle: { fontSize: 16, fontWeight: '800', color: '#111827' },
  disposeSub: { fontSize: 13, color: '#64748B', marginTop: 4, fontWeight: '500' },
  disposeScroll: { paddingHorizontal: 18, gap: 12 },
  
  disposeCardContainer: { width: 120, gap: 8 },
  disposeCard: { width: 120, height: 120, borderRadius: 12, backgroundColor: '#F8FAFC', overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  disposeImage: { width: '100%', height: '100%' },
  disposeBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#FDE68A' },
  disposeBadgeText: { fontSize: 10, fontWeight: '800', color: '#D97706' },
  disposeActionBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#FEE2E2' },
  disposeActionText: { fontSize: 13, fontWeight: '800', color: '#DC2626' },

  emptyGridPlaceholder: { height: 180, backgroundColor: '#F8FAFC', borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', gap: 12, paddingHorizontal: 30 },
  placeholderText: { fontSize: 14, color: '#475569', fontWeight: '600', textAlign: 'center', lineHeight: 22 },
});