import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCloset } from '../_closetStore';

// 타입
type Clothes = {
  id: string;
  image: string;
  tags: {
    style: string;
    mood: string;
    thickness: string;
    fit: string;
    material: string;
    point: string;
  };
};

export default function RecommendScreen() {
  const { clothes } = useCloset();

  // 🔥 홈에서 받은 값
  const params = useLocalSearchParams();

  const [recommended, setRecommended] = useState<Clothes[]>([]);

  // 🔥 추천 로직 (핵심🔥)
  const recommendClothes = () => {
    const result = (clothes as Clothes[]).filter((item) => {
      return (
        (!params.style || item.tags.style === params.style) &&
        (!params.mood || item.tags.mood === params.mood) &&
        (!params.thickness || item.tags.thickness === params.thickness) &&
        (!params.fit || item.tags.fit === params.fit) &&
        (!params.material || item.tags.material === params.material) &&
        (!params.point || item.tags.point === params.point)
      );
    });

    setRecommended(result);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>코디 추천</Text>

      {/* 🔥 선택된 필터 보여주기 */}
      <View style={{ marginBottom: 10 }}>
        <Text>스타일: {params.style || '전체'}</Text>
        <Text>분위기: {params.mood || '전체'}</Text>
        <Text>두께: {params.thickness || '전체'}</Text>
        <Text>핏: {params.fit || '전체'}</Text>
        <Text>소재: {params.material || '전체'}</Text>
        <Text>포인트: {params.point || '전체'}</Text>
      </View>

      {/* 추천 버튼 */}
      <TouchableOpacity style={styles.button} onPress={recommendClothes}>
        <Text style={styles.buttonText}>추천 받기</Text>
      </TouchableOpacity>

      {/* 추천 결과 */}
      <FlatList
        data={recommended}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.image} />
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>추천 결과가 없습니다.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  button: {
    backgroundColor: 'blue',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
  },

  card: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
  },

  image: {
    width: 100,
    height: 100,
  },

  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
});