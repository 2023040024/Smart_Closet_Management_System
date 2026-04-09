import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCloset } from './_closetStore';

export default function DetailScreen() {
  const { id } = useLocalSearchParams();
  const { clothes } = useCloset();

  const item = clothes.find((c: any) => c.id === id);

  if (!item) return <Text>데이터 없음</Text>;

  const renderTag = (label: string, value: string) => {
    if (!value) return null;

    return (
      <View style={styles.tagRow}>
        <Text style={styles.tagLabel}>{label}</Text>
        <View style={styles.tagPill}>
          <Text style={styles.tagText}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* 이미지 */}
      <Image source={{ uri: item.image }} style={styles.image} />

      {/* 태그 */}
      <Text style={styles.sectionTitle}>선택된 태그</Text>

      <View style={styles.tagsContainer}>
        {renderTag('스타일', item.tags.style)}
        {renderTag('분위기', item.tags.mood)}
        {renderTag('핏', item.tags.fit)}
        {renderTag('소재', item.tags.material)}
        {renderTag('두께', item.tags.thickness)}
        {renderTag('포인트', item.tags.point)}
      </View>

      {/* 수정 버튼 */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push(`/edit?id=${item.id}`)}
      >
        <Text style={styles.buttonText}>수정하기</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },

  image: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },

  tagsContainer: {
    marginBottom: 20,
  },

  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  tagLabel: {
    width: 60,
    fontSize: 13,
    color: '#666',
  },

  tagPill: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  tagText: {
    color: '#fff',
    fontSize: 14,
  },

  button: {
    marginTop: 20,
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});