import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    View
} from 'react-native';
import api from '../_api';

export default function AnalysisScreen() {
  const [loading, setLoading] = useState(false);

  // 🚨 옷장 분석용 상태 관리 변수들 (과부하 배너 및 처분 제안 스토어)
  const [overloadData, setOverloadData] = useState<{
    total_warnings: number;
    ai_advice: string;
    items: any[];
  } | null>(null);

  const [disposalData, setDisposalData] = useState<{
    items: any[];
    ai_advice: string;
  } | null>(null);

  // ✅ 화면이 열리거나 탭이 포커스될 때마다 실시간으로 백엔드 통계 데이터 갱신
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const loadAnalysisData = async () => {
        if (!isMounted) return;
        setLoading(true);
        try {
          // 1. 과부하 및 2. 처분 추천 API 동시 병렬 요청
          const [overloadRes, disposalRes] = await Promise.all([
            api.get('/stats/overload'),
            api.get('/stats/dispose', { params: { current_season: '여름' } }),
          ]);

          if (isMounted) {
            setOverloadData(overloadRes.data);
            setDisposalData(disposalRes.data);
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

  if (loading && !overloadData && !disposalData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* 상단 텍스트 영역 */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>옷장 진단</Text>
          <Text style={styles.subtitle}>AI가 내 옷장을 분석하여 스마트한 다이어트를 도와줍니다.</Text>
        </View>

        {/* 1. 과부하 분석 배너 영역 (Red Theme) */}
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

        {/* 2. 장기 미착용 의류 처분 제안 배너 영역 (Amber Theme) */}
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

        {/* 향후 Step 3에서 채워넣을 데이터 그리드 영역 미리 확보 */}
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>주의 필요한 아이템 상세 내역</Text>
        </View>
        <View style={styles.emptyGridPlaceholder}>
          <Ionicons name="layers-outline" size={40} color="#9ca3af" />
          <Text style={styles.placeholderText}>다음 단계에서 개별 의류 리스트 카드가 이곳에 정렬됩니다.</Text>
        </View>
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
  
  // 안전 및 정보 알림 서브 스타일
  safeBannerBox: { backgroundColor: '#f9fafb', borderColor: '#f3f4f6' },
  safeBannerTitle: { color: '#16a34a' },
  infoBannerTitle: { color: '#2563eb' },

  resultHeader: { marginTop: 10, marginBottom: 12, paddingHorizontal: 2 },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  emptyGridPlaceholder: {
    height: 140,
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
  },
  placeholderText: { fontSize: 12, color: '#9ca3af', fontWeight: '500', textAlign: 'center', lineHeight: 18 },
});