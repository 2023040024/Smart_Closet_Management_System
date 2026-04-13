import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color: string;
};

type WearHistoryItem = {
  id: string;
  date: string;
  clothesIds: string[];
  style?: string;
  mood?: string;
  tpo?: string;
  memo?: string;
};

const clothesData: ClothingItem[] = [
  { id: 'c1', name: '블랙 셔츠', category: '상의', color: '블랙' },
  { id: 'c2', name: '베이지 슬랙스', category: '하의', color: '베이지' },
  { id: 'c3', name: '화이트 스니커즈', category: '신발', color: '화이트' },
  { id: 'c4', name: '네이비 자켓', category: '아우터', color: '네이비' },
];

const historyData: WearHistoryItem[] = [
  
];

export default function HistoryScreen() {
  const getClothesByIds = (ids: string[]) => {
    return ids
      .map((id) => clothesData.find((cloth) => cloth.id === id))
      .filter(Boolean) as ClothingItem[];
  };

  const renderItem = ({ item }: { item: WearHistoryItem }) => {
    const clothes = getClothesByIds(item.clothesIds);

    return (
      <View style={styles.card}>
        <Text style={styles.date}>{item.date}</Text>

        <View style={styles.clothesRow}>
          {clothes.map((cloth) => (
            <View key={cloth.id} style={styles.clothBox}>
              <Text style={styles.clothCategory}>{cloth.category}</Text>
              <Text style={styles.clothName} numberOfLines={1}>
                {cloth.name}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.tags}>
          {item.style} · {item.mood} · {item.tpo}
        </Text>
        <Text style={styles.memo}>{item.memo}</Text>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>아직 착용 기록이 없습니다</Text>
      <Text style={styles.emptyDescription}>오늘 입은 옷을 기록해보세요.</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>착용 기록</Text>
      </View>

      <FlatList
        data={historyData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          historyData.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={<EmptyState />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#f7f7f7',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  date: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 10,
  },
  clothesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  clothBox: {
    flex: 1,
    minHeight: 72,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  clothCategory: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  clothName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#222',
  },
  tags: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
  },
  memo: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#777',
  },
});