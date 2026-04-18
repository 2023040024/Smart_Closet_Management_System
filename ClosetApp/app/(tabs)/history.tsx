import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
  color?: string;
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

type HistoryApiItem = {
  history_id: number;
  clothes_id?: number;
  worn_date?: string;
  style?: string;
  mood?: string;
  tpo?: string;
  memo?: string;
  clothes?: {
    clothes_id?: number;
    name?: string;
    category?: string;
    color?: string;
  };
};

const filterOptions = ['전체', '데일리', '비즈니스', '데이트', '여행', '운동', '모임'];

/**
 * 실제 폰(Expo Go) 테스트 시 PC IPv4 주소로 수정
 */
const API_BASE_URL = 'http://192.168.1.122:8000';

function formatDate(dateString?: string) {
  if (!dateString) return '날짜 없음';
  return dateString.slice(0, 10);
}

function mapApiHistoryToUi(item: HistoryApiItem): WearHistoryItem {
  const clothesId =
    item.clothes?.clothes_id?.toString() ??
    item.clothes_id?.toString() ??
    '';

  return {
    id: item.history_id.toString(),
    date: formatDate(item.worn_date),
    clothesIds: clothesId ? [clothesId] : [],
    style: item.style ?? '',
    mood: item.mood ?? '',
    tpo: item.tpo ?? '',
    memo: item.memo ?? '',
  };
}

export default function HistoryScreen() {
  const [selectedFilter, setSelectedFilter] = useState('전체');
  const [historyList, setHistoryList] = useState<WearHistoryItem[]>([]);
  const [clothesMap, setClothesMap] = useState<Record<string, ClothingItem>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const getClothesByIds = (ids: string[]) => {
    return ids
      .map((id) => clothesMap[id])
      .filter(Boolean) as ClothingItem[];
  };

  const fetchHistoryList = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      const response = await fetch(`${API_BASE_URL}/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data: HistoryApiItem[] = [];

      try {
        data = await response.json();
      } catch {
        data = [];
      }

      if (!response.ok) {
        throw new Error(`기록 조회 실패 (${response.status})`);
      }

      const mappedHistoryList = data.map(mapApiHistoryToUi);

      const nextClothesMap: Record<string, ClothingItem> = {};
      data.forEach((item) => {
        const clothesId =
          item.clothes?.clothes_id?.toString() ??
          item.clothes_id?.toString() ??
          '';

        if (!clothesId) return;

        nextClothesMap[clothesId] = {
          id: clothesId,
          name: item.clothes?.name ?? `옷 ${clothesId}`,
          category: item.clothes?.category ?? '미분류',
          color: item.clothes?.color ?? '',
        };
      });

      setHistoryList(mappedHistoryList);
      setClothesMap(nextClothesMap);
    } catch (error) {
      console.error('기록 불러오기 실패:', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '기록을 불러오지 못했습니다.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistoryList();
    }, [fetchHistoryList])
  );

  const filteredHistoryData = useMemo(() => {
    if (selectedFilter === '전체') {
      return historyList;
    }

    return historyList.filter((item) => item.tpo === selectedFilter);
  }, [historyList, selectedFilter]);

  const deleteHistoryByApi = async (id: string) => {
    const numericId = Number(id);

    if (Number.isNaN(numericId)) {
      throw new Error('유효하지 않은 기록 ID입니다.');
    }

    const response = await fetch(`${API_BASE_URL}/history/${numericId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let responseData: any = null;

    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    if (!response.ok) {
      const message =
        responseData?.detail ||
        responseData?.message ||
        `삭제 실패 (${response.status})`;
      throw new Error(message);
    }

    return responseData;
  };

  const handleDelete = (id: string) => {
    if (deletingId) return;

    Alert.alert('기록 삭제', '이 착용 기록을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(id);
            await deleteHistoryByApi(id);
            setHistoryList((prev) => prev.filter((item) => item.id !== id));
          } catch (error) {
            console.error('삭제 실패:', error);
            Alert.alert(
              '삭제 실패',
              error instanceof Error
                ? error.message
                : '서버에서 기록을 삭제하지 못했습니다.'
            );
          } finally {
            setDeletingId(null);
          }
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

  const handleCreatePress = () => {
    router.push('/history-create');
  };

  const renderItem = ({ item }: { item: WearHistoryItem }) => {
    const clothes = getClothesByIds(item.clothesIds);

    return (
      <View style={styles.card}>
        <Text style={styles.date}>{item.date}</Text>

        <View style={styles.clothesRow}>
          {clothes.length > 0 ? (
            clothes.map((cloth) => (
              <View key={cloth.id} style={styles.clothBox}>
                <Text style={styles.clothCategory}>{cloth.category}</Text>
                <Text style={styles.clothName} numberOfLines={1}>
                  {cloth.name}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.clothBox}>
              <Text style={styles.clothCategory}>옷 정보</Text>
              <Text style={styles.clothName}>표시할 옷 정보 없음</Text>
            </View>
          )}
        </View>

        <Text style={styles.tags}>
          {item.style || '-'} · {item.mood || '-'} · {item.tpo || '-'}
        </Text>
        <Text style={styles.memo}>{item.memo || '메모 없음'}</Text>

        <View style={styles.actionRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => handleDetailPress(item)}
            disabled={deletingId === item.id}
          >
            <Text style={styles.actionButtonText}>상세보기</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDelete(item.id)}
            disabled={deletingId === item.id}
          >
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
              {deletingId === item.id ? '삭제 중...' : '삭제'}
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

      <Pressable style={styles.emptyAddButton} onPress={handleCreatePress}>
        <Text style={styles.emptyAddButtonText}>기록 추가</Text>
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.emptyDescription}>착용 기록 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (errorMessage && historyList.length === 0) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>기록을 불러오지 못했습니다</Text>
        <Text style={styles.emptyDescription}>{errorMessage}</Text>

        <View style={styles.errorButtonRow}>
          <Pressable
            style={styles.actionButton}
            onPress={() => fetchHistoryList()}
          >
            <Text style={styles.actionButtonText}>다시 시도</Text>
          </Pressable>

          <Pressable
            style={[styles.actionButton, styles.headerAddButton]}
            onPress={handleCreatePress}
          >
            <Text style={[styles.actionButtonText, styles.headerAddButtonText]}>
              기록 추가
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>착용 기록</Text>

        <Pressable style={styles.headerAddButton} onPress={handleCreatePress}>
          <Text style={styles.headerAddButtonText}>기록 추가</Text>
        </Pressable>
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
        onRefresh={() => fetchHistoryList(true)}
        refreshing={refreshing}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  headerAddButton: {
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  headerAddButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
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
  emptyAddButton: {
    marginTop: 16,
    backgroundColor: '#111',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyAddButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
});