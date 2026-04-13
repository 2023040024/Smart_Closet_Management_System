import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

const initialHistoryData: WearHistoryItem[] = [
  {
    id: '1',
    date: '2026-04-13',
    clothesIds: ['c1', 'c2', 'c3'],
    style: '미니멀',
    mood: '차분한',
    tpo: '데일리',
    memo: '발표 있어서 단정하게 입음',
  },
  {
    id: '2',
    date: '2026-04-12',
    clothesIds: ['c4', 'c1', 'c2'],
    style: '세미캐주얼',
    mood: '세련된',
    tpo: '모임',
    memo: '저녁 약속',
  },
  {
    id: '3',
    date: '2026-04-10',
    clothesIds: ['c1', 'c3'],
    style: '캐주얼',
    mood: '활동적인',
    tpo: '여행',
    memo: '가볍게 외출',
  },
  {
    id: '4',
    date: '2026-04-08',
    clothesIds: ['c2', 'c3'],
    style: '스포티',
    mood: '활동적인',
    tpo: '운동',
    memo: '편하게 입음',
  },
];

const filterOptions = ['전체', '데일리', '비즈니스', '데이트', '여행', '운동', '모임'];

export default function HistoryScreen() {
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [historyList, setHistoryList] = useState<WearHistoryItem[]>(initialHistoryData);

  const getClothesByIds = (ids: string[]) => {
    return ids
      .map((id) => clothesData.find((cloth) => cloth.id === id))
      .filter(Boolean) as ClothingItem[];
  };

  const filteredHistoryData = useMemo(() => {
    if (selectedFilter === '전체') {
      return historyList;
    }

    return historyList.filter((item) => item.tpo === selectedFilter);
  }, [historyList, selectedFilter]);

  const handleDelete = (id: string) => {
    Alert.alert('기록 삭제', '이 착용 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          setHistoryList((prev) => prev.filter((item) => item.id !== id));
        },
      },
    ]);
  };

  const handleDetailPress = (item: WearHistoryItem) => {
    const clothes = getClothesByIds(item.clothesIds);

    router.push({
      pathname: '/history-detail',
      params: {
        id: item.id,
        date: item.date,
        style: item.style ?? '',
        mood: item.mood ?? '',
        tpo: item.tpo ?? '',
        memo: item.memo ?? '',
        clothes: JSON.stringify(clothes),
      },
    });
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

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDetailPress(item)}
          >
            <Text style={styles.actionButtonText}>상세보기</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              삭제
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>해당 조건의 착용 기록이 없습니다</Text>
      <Text style={styles.emptyDescription}>
        다른 필터를 선택하거나 새 기록을 추가해보세요.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>착용 기록</Text>
      </View>

      <View style={styles.filterRow}>
        {filterOptions.map((filter) => {
          const isSelected = selectedFilter === filter;

          return (
            <Pressable
              key={filter}
              style={[
                styles.filterChip,
                isSelected && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isSelected && styles.filterChipTextSelected,
                ]}
              >
                {filter}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filteredHistoryData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          filteredHistoryData.length === 0 && styles.emptyListContent,
        ]}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: '#f1f1f1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: '#111',
  },
  filterChipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  filterChipTextSelected: {
    color: '#fff',
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    borderColor: '#f0caca',
  },
  deleteButtonText: {
    color: '#c0392b',
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
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
  },
});