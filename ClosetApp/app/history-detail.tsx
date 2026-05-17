import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string;
};

export default function HistoryDetailScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    style?: string;
    mood?: string;
    tpo?: string;
    memo?: string;
    clothes?: string;
  }>();

  const clothes: ClothingItem[] = params.clothes
    ? JSON.parse(params.clothes)
    : [];

  const feedbackTags = [params.style, params.mood, params.tpo].filter(Boolean);

  // ✅ 수정 화면으로 데이터 쥐고 이동하는 핸들러
  const handleEditNavigate = () => {
    router.push({
      pathname: '/history-create',
      params: {
        editMode: 'true',
        editId: params.id,
        editDate: params.date,
        editMemo: params.memo,
        editTpo: params.tpo,
        editClothes: params.clothes,
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: '착용 기록 상세' }} />

      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
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
                  <Text style={styles.clothColor}>색상: {cloth.color || '정보 없음'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>표시할 옷 정보가 없습니다.</Text>
            )}
          </View>

          {/* ✅ 수정하기 버튼 추가 */}
          <Pressable style={styles.editButton} onPress={handleEditNavigate}>
            <Text style={styles.editButtonText}>기록 수정하기</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 }, // 하단 여백 추가
  section: { backgroundColor: '#f7f7f7', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#555', marginBottom: 8 },
  sectionValue: { fontSize: 16, color: '#111', lineHeight: 22 },
  clothCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginTop: 8, borderWidth: 1, borderColor: '#ececec' },
  clothCategory: { fontSize: 12, color: '#888', marginBottom: 4 },
  clothName: { fontSize: 15, fontWeight: '600', color: '#222', marginBottom: 4 },
  clothColor: { fontSize: 13, color: '#666' },
  emptyText: { fontSize: 14, color: '#777' },
  
  // ✅ 버튼 스타일 추가
  editButton: { marginTop: 24, backgroundColor: '#111', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});