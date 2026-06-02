import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      
      {/* 1. 상단 환영 헤더 */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요! ☀️</Text>
        <Text style={styles.title}>오늘의 옷장 브리핑</Text>
      </View>

      {/* 2. AI 코디 추천 요약 카드 */}
      <View style={styles.aiCard}>
        <View style={styles.aiHeader}>
          <Ionicons name="sparkles" size={18} color="#4F46E5" />
          <Text style={styles.aiTitle}>오늘의 AI 추천 코디</Text>
        </View>
        <Text style={styles.aiDesc}>
          오늘은 일교차가 큽니다. 가벼운 아우터와 셔츠 조합으로 쾌적한 하루를 보내보세요!
        </Text>
        <TouchableOpacity style={styles.aiBtn} onPress={() => router.push('/(tabs)/recommend')} activeOpacity={0.8}>
          <Text style={styles.aiBtnText}>추천 코디 자세히 보기</Text>
        </TouchableOpacity>
      </View>

      {/* 3. 빠른 액션 (대시보드 메뉴) */}
      <Text style={styles.sectionTitle}>빠른 이동</Text>
      <View style={styles.actionGrid}>
        
        {/* 새 옷 등록 (기존 탭에서 빠진 기능을 강조 버튼으로 배치) */}
        <TouchableOpacity style={[styles.actionCard, { backgroundColor: '#EEF2FF' }]} onPress={() => router.push('/(tabs)/register')} activeOpacity={0.8}>
          <View style={[styles.iconBox, { backgroundColor: '#fff' }]}>
            <Ionicons name="add" size={24} color="#4F46E5" />
          </View>
          <Text style={[styles.actionLabel, { color: '#4F46E5' }]}>새 옷 등록</Text>
        </TouchableOpacity>

        {/* 내 옷장 */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/closet')} activeOpacity={0.8}>
          <View style={styles.iconBox}>
            <Ionicons name="shirt" size={24} color="#334155" />
          </View>
          <Text style={styles.actionLabel}>내 옷장</Text>
        </TouchableOpacity>

        {/* 착용 기록 */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/history')} activeOpacity={0.8}>
          <View style={styles.iconBox}>
            <Ionicons name="time" size={24} color="#334155" />
          </View>
          <Text style={styles.actionLabel}>착용 기록</Text>
        </TouchableOpacity>

        {/* 옷장 진단 */}
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(tabs)/analysis')} activeOpacity={0.8}>
          <View style={styles.iconBox}>
            <Ionicons name="analytics" size={24} color="#334155" />
          </View>
          <Text style={styles.actionLabel}>옷장 진단</Text>
        </TouchableOpacity>

      </View>

      {/* 4. 옷장 인사이트 (차후 API 연동 필요) */}
      <View style={styles.statsContainer}>
         <Text style={styles.sectionTitle}>내 옷장 요약</Text>
         <View style={styles.statBox}>
            <Ionicons name="information-circle" size={20} color="#64748B" />
            <Text style={styles.statText}>등록된 옷을 분석하여 맞춤 통계를 준비 중입니다.</Text>
         </View>
      </View>
      
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 40, paddingTop: 60 },
  
  header: { marginBottom: 24 },
  greeting: { fontSize: 16, color: '#64748B', fontWeight: '600', marginBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' },
  
  aiCard: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, marginBottom: 32, borderWidth: 1, borderColor: '#E2E8F0' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  aiTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  aiDesc: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 16 },
  aiBtn: { backgroundColor: '#4F46E5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  aiBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16 },
  
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, marginBottom: 32 },
  actionCard: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
  iconBox: { width: 48, height: 48, backgroundColor: '#fff', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#334155' },
  
  statsContainer: { marginBottom: 20 },
  statBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, gap: 10 },
  statText: { fontSize: 13, color: '#475569', fontWeight: '500', flex: 1, lineHeight: 20 },
});