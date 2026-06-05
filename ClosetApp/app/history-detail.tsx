import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string;
  imageUrl?: string;
  style?: string;
  tpo?: string;
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
  if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
    const dateObj = new Date(params.date);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    displayDate = `${params.date.replace(/-/g, '. ')} (${days[dateObj.getDay()]})`;
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          <View style={styles.customHeaderRow}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
              <Ionicons name="arrow-back" size={28} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.customHeaderTitle}>착용 기록 상세</Text>
          </View>

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
                <TouchableOpacity 
                  key={cloth.id} 
                  style={styles.clothCard}
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: '/detail', params: { id: cloth.id } })}
                >
                  <Image 
                    source={{ uri: cloth.imageUrl || 'https://via.placeholder.com/150x150?text=No+Img' }} 
                    style={styles.clothThumbnail}
                    resizeMode="contain"
                  />
                  <View style={styles.clothInfo}>
                    <Text style={styles.clothName} numberOfLines={1}>{cloth.name}</Text>
                    
                    {/* ✨ 카테고리, 색상, 그리고 TPO 태그까지 나란히 렌더링! */}
                    <View style={styles.tagRow}>
                      <Text style={styles.tagBadge}>{cloth.category}</Text>
                      
                      {cloth.color && cloth.color !== '색상 미상' && cloth.color !== '색상 정보 없음' && (
                        <Text style={styles.tagBadge}>{cloth.color}</Text>
                      )}
                      
                      {cloth.tpo ? (
                        <Text style={[styles.tagBadge, styles.tagBadgeTpo]}>{cloth.tpo}</Text>
                      ) : null}
                    </View>

                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>표시할 옷 정보가 없습니다.</Text>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { 
    paddingHorizontal: 12,
    paddingBottom: 40, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16 
  },
  
  customHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  customHeaderTitle: { fontSize: 26, fontWeight: '800', color: '#111827', marginBottom: 0 },

  headerArea: { paddingVertical: 10, marginBottom: 24, paddingHorizontal: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  headerDate: { fontSize: 24, fontWeight: '700', color: '#1E293B' },
  headerTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  headerTagChip: { backgroundColor: '#EEF2FF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  headerTagText: { fontSize: 13, fontWeight: '700', color: '#4F46E5' },
  
  memoContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, gap: 10, borderLeftWidth: 4, borderLeftColor: '#3B82F6' },
  memoText: { fontSize: 15, color: '#334155', lineHeight: 24, flex: 1, fontWeight: '500' },

  emptyText: { fontSize: 14, color: '#94A3B8' },

  section: { marginBottom: 12 }, 
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 16, paddingHorizontal: 4 },

  clothCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    padding: 18, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#E2E8F0',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.03, 
    shadowRadius: 8, 
    elevation: 2 
  },
  clothThumbnail: { 
    width: 96, 
    height: 96, 
    borderRadius: 12, 
    backgroundColor: '#F8FAFC', 
    marginRight: 16 
  },
  clothInfo: { flex: 1, justifyContent: 'center' },
  clothName: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 10 },
  
  tagRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tagBadge: { 
    backgroundColor: '#F1F5F9', 
    color: '#475569', 
    fontSize: 12, 
    fontWeight: '700', 
    paddingVertical: 5, 
    paddingHorizontal: 10, 
    borderRadius: 6,
    overflow: 'hidden'
  },
  tagBadgeTpo: { 
    backgroundColor: '#EEF2FF', 
    color: '#4F46E5' 
  },
});