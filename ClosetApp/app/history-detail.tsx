import { Stack, useLocalSearchParams } from 'expo-router';
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'; // ✅ Image 컴포넌트 추가

// ✅ 백엔드에서 넘겨받을 이미지 URL 필드(imageUrl)를 타입에 추가
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

  const feedbackTags = [params.tpo, params.tpoSuitability, params.mood].filter(Boolean);

  return (
    <>
      <Stack.Screen options={{ title: '착용 기록 상세' }} />

      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>날짜</Text>
            <Text style={styles.sectionValue}>{params.date || '-'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>피드백 태그</Text>
            <Text style={styles.sectionValue}>
              {feedbackTags.length > 0 ? feedbackTags.join(' · ') : '없음'}
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>메모</Text>
            <Text style={styles.sectionValue}>{params.memo || '메모 없음'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>착용한 옷</Text>

            {clothes.length > 0 ? (
              clothes.map((cloth) => (
                <View key={cloth.id} style={styles.clothCard}>
                  <Text style={styles.clothCategory}>{cloth.category}</Text>
                  <Text style={styles.clothName}>{cloth.name}</Text>
                  
                  {/* ✅ 옷 이름 아래에 이미지 표시 영역 추가 */}
                  <Image 
                    source={{ 
                      uri: cloth.imageUrl || 'https://via.placeholder.com/300x300?text=No+Image' 
                    }} 
                    style={styles.clothImage}
                    resizeMode="contain"
                  />

                  <Text style={styles.clothColor}>색상: {cloth.color || '정보 없음'}</Text>
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
  section: { backgroundColor: '#f7f7f7', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8 },
  sectionValue: { fontSize: 16, color: '#111', lineHeight: 22 },
  clothCard: { 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginTop: 12, 
    borderWidth: 1, 
    borderColor: '#ececec' 
  },
  clothCategory: { fontSize: 12, color: '#888', marginBottom: 4 },
  clothName: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 12 }, // ✅ 이미지와 간격을 위해 여백 추가
  
  /* ✅ 새로 추가된 이미지 스타일 */
  clothImage: {
    width: '100%',
    height: 200, // 이미지가 시원하게 보이도록 높이 설정
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginTop: 8, // 이미지 아래 색상 텍스트와의 간격
  },
  
  clothColor: { fontSize: 13, color: '#666' },
  emptyText: { fontSize: 14, color: '#777' },
});