import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl?: string;
};

export default function HistoryDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    tpoSuitability?: string;
    mood?: string;
    tpo?: string;
    memo?: string;
    clothes?: string;
  }>();

  const clothes: ClothingItem[] = params.clothes
    ? JSON.parse(params.clothes)
    : [];

  clothes.sort((a, b) => {
    const order: Record<string, number> = { '아우터': 1, '상의': 2, '하의': 3, '신발': 4, '악세사리': 5, '기타': 6 };
    return (order[a.category] || 99) - (order[b.category] || 99);
  });
  
  const feedbackTags = [params.tpo, params.tpoSuitability, params.mood].filter(Boolean);

  let displayDate = params.date || '-';
  if (params.date) {
    const dateObj = new Date(params.date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = days[dateObj.getDay()];
    // 하이픈(-)을 마침표(.)로 바꾸고 뒤에 요일 추가
    displayDate = `${params.date.replace(/-/g, '.')} (${dayOfWeek})`; 
  }

  return (
    <>
      <Stack.Screen options={{ title: '착용 기록 상세' }} />

      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerArea}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-clear-outline" size={26} color="#1E293B" />
              <Text style={styles.headerDate}>{displayDate}</Text>
            </View>
            
            <View style={styles.headerTagRow}>
              {feedbackTags.length > 0 ? (
                feedbackTags.map((tag, index) => (
                  <View key={index} style={styles.headerTagChip}>
                    <Text style={styles.headerTagText}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>태그 없음</Text>
              )}
            </View>

            {/* ✨ 메모 영역: 아이콘과 함께 왼쪽 파란 선이 들어간 인용구 박스로 묶어 가독성 극대화 */}
            {params.memo && params.memo.trim() !== '' && (
              <View style={styles.memoContainer}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#3B82F6" />
                <Text style={styles.memoText}>{params.memo}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>착용한 옷</Text>

            {clothes.length > 0 ? (
              clothes.map((cloth) => (
                <View key={cloth.id} style={styles.clothCard}>
                  <Text style={styles.clothName}>{cloth.name}</Text>
                  
                  <View style={styles.tagRow}>
                    <Text style={styles.tagBadge}>{cloth.category}</Text>
                    <Text style={styles.tagBadge}>{cloth.color || '색상 미상'}</Text>
                  </View>
                  
                  {/* ✨ 옷 사진이 시원하게 보이도록 높이를 키움 */}
                  <Image 
                    source={{ uri: cloth.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image' }} 
                    style={styles.clothImage}
                    resizeMode="contain"
                  />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>표시할 옷 정보가 없습니다.</Text>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  
  headerArea: { paddingVertical: 10, marginBottom: 24, paddingHorizontal: 4 },

  dateRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 14 
  },
  
  
  headerDate: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#1E293B' 
  },

  headerTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  headerTagChip: { 
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 20 
  },

  headerTagText: { 
    fontSize: 13, 
    fontWeight: '700', 
    color: '#4F46E5'
  },
  
  // ✨ 메모 컨테이너 (인용구 스타일 박스)
  memoContainer: { 
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC', 
    padding: 16, 
    borderRadius: 12, 
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6', 
  },
  memoText: { fontSize: 15, color: '#334155', lineHeight: 24, flex: 1, fontWeight: '500' },

  emptyText: { fontSize: 14, color: '#94A3B8' },

  // ✨ 옷 섹션의 불필요한 회색 배경 제거하여 개방감 부여
  section: { marginBottom: 12 }, 
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16, paddingHorizontal: 4 },
  
  // ✨ 카드 스타일 고급화 (연한 테두리와 미세한 그림자)
  clothCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2
  },
  clothName: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  tagRow: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tagBadge: { backgroundColor: '#F1F5F9', color: '#475569', fontSize: 12, fontWeight: '700', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  
  // ✨ 이미지 높이 대폭 확장
  clothImage: {
    width: '100%',
    height: 280, 
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
});