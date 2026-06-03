import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import api from '../_api';

export default function DashboardScreen() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [overloadData, setOverloadData] = useState<any>(null);
  const [disposalData, setDisposalData] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);

  // 추가: 현재 월(Month)을 기준으로 계절을 동적으로 계산하는 함수
  function getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
  }

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchDashboardStats = async () => {
        setLoading(true);
        try {
          const [overloadRes, disposalRes, reportRes] = await Promise.all([
            api.get('/stats/overload').catch(() => ({ data: null })),
            // 수정: current_season 파라미터를 동적으로 추가하여 422 에러 해결
            api.get('/stats/dispose', { params: { current_season: getCurrentSeason() } }).catch(() => ({ data: null })),
            api.get('/stats/monthly-report').catch(() => ({ data: null }))
          ]);

          if (isMounted) {
            setOverloadData(overloadRes.data);
            setDisposalData(disposalRes.data);
            setReportData(reportRes.data);
          }
        } catch (error) {
          console.error('대시보드 통계 로드 실패:', error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchDashboardStats();
      return () => { isMounted = false; };
    }, [])
  );

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('userToken');
            router.replace('/login');
          } catch (error) {
            console.error('로그아웃 에러:', error);
            Alert.alert('오류', '로그아웃 처리 중 문제가 발생했습니다.');
          }
        },
      },
    ]);
  };

  const hasWarnings = (overloadData?.total_warnings > 0) || (disposalData?.items && disposalData.items.length > 0);
  const activityRate = reportData?.ecosystem?.activity_rate ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.systemText}>SMART CLOSET MANAGEMENT</Text>
          <Text style={styles.title}>
            Re<Text style={styles.accentColor}>:</Text>fit
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} hitSlop={10}>
          <Ionicons name="log-out-outline" size={24} color="#64748B" />
        </TouchableOpacity>
      </View>

      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Ionicons name="sparkles" size={18} color="#2563EB" />
          <Text style={styles.aiTitle}>오늘의 AI 추천 코디</Text>
        </View>
        <Text style={styles.aiDesc}>
          오늘 날씨와 TPO에 딱 맞는 맞춤형 스타일링을 준비했어요.{'\n'}옷장 속 아이템들의 새로운 조합을 지금 확인해 보세요!
        </Text>
        <TouchableOpacity style={styles.aiBtn} onPress={() => router.push('/(tabs)/recommend')} activeOpacity={0.8}>
          <Text style={styles.aiBtnText}>오늘의 추천 코디 확인하기</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#F0F9FF', borderColor: '#E0F2FE' }]} onPress={() => router.push('/(tabs)/register')} activeOpacity={0.8}>
          <View style={[styles.iconBox, { backgroundColor: '#FFFFFF' }]}>
            <Ionicons name="add" size={24} color="#0284C7" />
          </View>
          <Text style={[styles.actionLabel, { color: '#0284C7' }]}>새 옷 등록</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/closet')} activeOpacity={0.8}>
          <View style={styles.iconBox}><Ionicons name="shirt" size={24} color="#334155" /></View>
          <Text style={styles.actionLabel}>내 옷장</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.8}>
          <View style={styles.iconBox}><Ionicons name="time" size={24} color="#334155" /></View>
          <Text style={styles.actionLabel}>착용 기록</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/analysis')} activeOpacity={0.8}>
          <View style={styles.iconBox}><Ionicons name="analytics" size={24} color="#334155" /></View>
          <Text style={styles.actionLabel}>옷장 진단</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.insightHeader}>
          <Text style={styles.sectionTitle}>나의 옷장 리포트</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/analysis')} hitSlop={10}>
            <Text style={styles.moreLink}>자세히 보기</Text>
          </TouchableOpacity>
        </View>
         
        {loading ? (
          <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 20 }} />
        ) : (
          <>
            {reportData && reportData.ecosystem && (
              <View style={styles.ecosystemCard}>
                <View style={styles.ecoHeaderRow}>
                  <Text style={styles.ecoTitle}>이달의 옷장 활용률</Text>
                  <Text style={styles.ecoRateText}>{reportData.ecosystem.activity_rate}%</Text>
                </View>
                
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(Math.max(reportData.ecosystem.activity_rate, 0), 100)}%` }]} />
                </View>
                
                <View style={styles.ecoLegendRow}>
                  <Text style={styles.ecoLegendText}>🔥 활성 <Text style={styles.ecoBoldText}>{reportData.ecosystem.active_clothes}</Text>벌</Text>
                  <Text style={styles.ecoLegendText}>💤 방치 <Text style={styles.ecoBoldText}>{reportData.ecosystem.inactive_clothes}</Text>벌</Text>
                </View>
              </View>
            )}

            {overloadData?.total_warnings > 0 && (
              <View style={styles.alertBoxOverload}>
                <View style={styles.alertHeader}>
                  <Ionicons name="warning" size={20} color="#DC2626" />
                  <Text style={styles.alertTitleOverload}>충동 소비 주의보</Text>
                </View>
                <Text style={styles.alertDesc}>비슷한 색상과 디자인의 옷이 많아요. 새로운 구매 전 옷장을 먼저 확인해 보세요!</Text>
              </View>
            )}

            {disposalData?.items?.length > 0 && (
              <View style={styles.alertBoxDispose}>
                <View style={styles.alertHeader}>
                  <Ionicons name="cube-outline" size={20} color="#D97706" />
                  <Text style={styles.alertTitleDispose}>정리가 필요한 옷 발견</Text>
                </View>
                <Text style={styles.alertDesc}>90일 이상 한 번도 입지 않은 옷이 {disposalData.items.length}벌 있습니다. 나눔이나 처분을 고민해 볼까요?</Text>
              </View>
            )}

            {!hasWarnings && (
              activityRate >= 60 ? (
                <View style={[styles.statBox, styles.statBoxSuccess]}>
                  <Ionicons name="checkmark-circle" size={20} color="#059669" />
                  <Text style={[styles.statText, { color: '#065F46' }]}>현재 옷장이 낭비 없이 아주 효율적으로 관리되고 있습니다!</Text>
                </View>
              ) : (
                <View style={[styles.statBox, styles.statBoxEncourage]}>
                  <Ionicons name="information-circle" size={20} color="#2563EB" />
                  <Text style={[styles.statText, { color: '#1E40AF' }]}>아직 입지 않은 옷이 많아요. 오늘의 코디 추천을 받아볼까요?</Text>
                </View>
              )
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { padding: 20, paddingBottom: 100, paddingTop: 60 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30 },
  systemText: { fontSize: 11, color: '#2563EB', fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  title: { fontSize: 32, fontWeight: '900', color: '#111827', letterSpacing: -0.5 },
  accentColor: { color: '#2563EB' },
  logoutBtn: { padding: 8, backgroundColor: '#F1F5F9', borderRadius: 12 },
  
  aiCard: { backgroundColor: '#EEF2FF', borderRadius: 20, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#E0E7FF' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiTitle: { fontSize: 16, fontWeight: '800', color: '#1E3A8A' },
  aiDesc: { fontSize: 14, color: '#475569', lineHeight: 24, marginBottom: 18, letterSpacing: -0.2 },
  aiBtn: { backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  aiBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, 
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 32 },
  actionCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 48, height: 48, backgroundColor: '#FFFFFF', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  
  statsContainer: { marginBottom: 20 },
  insightHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moreLink: { fontSize: 13, color: '#2563EB', fontWeight: '600', marginBottom: 16 },

  ecosystemCard: { backgroundColor: '#F8FAFC', padding: 20, borderRadius: 16, marginBottom: 8, borderWidth: 1, borderColor: '#F1F5F9' },
  ecoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 },
  ecoTitle: { fontSize: 15, fontWeight: '700', color: '#334155' },
  ecoRateText: { fontSize: 26, fontWeight: '800', color: '#111827' },
  progressBarBg: { height: 10, backgroundColor: '#E2E8F0', borderRadius: 5, overflow: 'hidden', marginBottom: 16 },
  progressBarFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 5 },
  ecoLegendRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  ecoLegendText: { fontSize: 13, color: '#64748B' },
  ecoBoldText: { fontWeight: '700', color: '#334155' },
  
  statBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, gap: 10, borderWidth: 1, marginTop: 8 },
  statBoxSuccess: { backgroundColor: '#F0FDF4', borderColor: '#DCFCE7' },
  statBoxEncourage: { backgroundColor: '#EFF6FF', borderColor: '#DBEAFE' },
  statText: { fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 20 },

  alertBoxOverload: { backgroundColor: '#FEF2F2', padding: 16, borderRadius: 16, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: '#FEE2E2' },
  alertTitleOverload: { fontSize: 15, fontWeight: '800', color: '#DC2626' },
  
  alertBoxDispose: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: '#FEF3C7' },
  alertTitleDispose: { fontSize: 15, fontWeight: '800', color: '#D97706' },

  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  alertDesc: { fontSize: 13, color: '#4B5563', lineHeight: 20, fontWeight: '500' }
});