import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';

type WearHistoryItem = {
  id: string;
  date: string;
  style?: string;
  mood?: string;
  tpo?: string;
  memo?: string;
};

const historyData: WearHistoryItem[] = [
  {
    id: '1',
    date: '2026-04-13',
    style: '미니멀',
    mood: '차분한',
    tpo: '데일리',
    memo: '발표 있어서 단정하게 입음',
  },
  {
    id: '2',
    date: '2026-04-12',
    style: '캐주얼',
    mood: '활동적인',
    tpo: '여행',
    memo: '가볍게 외출',
  },
];

export default function HistoryScreen() {
  const renderItem = ({ item }: { item: WearHistoryItem }) => (
    <View style={styles.card}>
      <Text style={styles.date}>{item.date}</Text>
      <Text style={styles.tags}>
        {item.style} · {item.mood} · {item.tpo}
      </Text>
      <Text style={styles.memo}>{item.memo}</Text>
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
        contentContainerStyle={styles.listContent}
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
    marginBottom: 8,
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
});