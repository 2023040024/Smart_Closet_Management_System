import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import api from '../_api';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color?: string;
  imageUrl?: string;
};

type WearHistoryItem = {
  id: string;
  date: string;
  clothesIds: string[];
  tpoSuitability?: string; 
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
  feedback_fit?: string;
  feedback_temperature?: string;
  feedback_tpo?: string;
  clothes?: {
    clothes_id?: number;
    name?: string;
    category?: string;
    color?: string;
    image_url?: string;
    tags?: {
      category?: string;
      color?: string;
      [key: string]: any;
    };
  };
};

type GroupedWearHistoryItem = {
  id: string;
  date: string;
  clothesIds: string[];
  historyIds: string[];
  tpoSuitability?: string; 
  mood?: string;
  tpo?: string;
  memo?: string;
};

const filterOptions = ['전체', '데일리', '비즈니스', '면접', '결혼식', '장례식', '운동', '데이트', '모임', '여행'];

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
    tpoSuitability: item.feedback_tpo ?? item.style ?? '', 
    mood: item.feedback_temperature ?? item.mood ?? '',
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
    const uniqueIds = Array.from(new Set(ids));
    return uniqueIds
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

      const response = await api.get('/history');
      const data: HistoryApiItem[] = Array.isArray(response.data) ? response.data : [];

      const mappedHistoryList = data.map(mapApiHistoryToUi);

      const nextClothesMap: Record<string, ClothingItem> = {};
      data.forEach((item) => {
        const clothesId =
          item.clothes?.clothes_id?.toString() ??
          item.clothes_id?.toString() ??
          '';

        if (!clothesId) return;

        const category = item.clothes?.category ?? item.clothes?.tags?.category ?? '미분류';
        const color = item.clothes?.color ?? item.clothes?.tags?.color ?? '색상 정보 없음';

        const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
        
        const rawImageUrl = item.clothes?.image_url;
        const fullImageUrl = rawImageUrl 
          ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${API_BASE_URL}${rawImageUrl}`)
          : undefined;

        nextClothesMap[clothesId] = {
          id: clothesId,
          name: item.clothes?.name ?? `옷 ${clothesId}`,
          category: category,
          color: color,
          imageUrl: fullImageUrl,
        };
      });

      setHistoryList(mappedHistoryList);
      setClothesMap(nextClothesMap);
    } catch (error: any) {
      console.error('기록 불러오기 실패:', error);
      if (error.response?.status === 401) {
        setErrorMessage('로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
      } else {
        setErrorMessage(
          error.response?.data?.detail || error.message || '기록을 불러오지 못했습니다.'
        );
      }
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

  const groupedHistoryData = useMemo(() => {
    const filtered =
      selectedFilter === '전체'
        ? historyList
        : historyList.filter((item) => item.tpo === selectedFilter);

    const groupedMap: Record<string, GroupedWearHistoryItem> = {};

    filtered.forEach((item) => {
      const key = item.date;

      if (!groupedMap[key]) {
        groupedMap[key] = {
          id: key,
          date: item.date,
          clothesIds: [...item.clothesIds],
          historyIds: [item.id],
          tpoSuitability: item.tpoSuitability || '', 
          mood: item.mood || '',
          tpo: item.tpo || '',
          memo: item.memo || '',
        };
        return;
      }

      groupedMap[key].clothesIds.push(...item.clothesIds);
      groupedMap[key].historyIds.push(item.id);

      if (!groupedMap[key].tpoSuitability && item.tpoSuitability) {
        groupedMap[key].tpoSuitability = item.tpoSuitability;
      }
      if (!groupedMap[key].mood && item.mood) {
        groupedMap[key].mood = item.mood;
      }
      if (!groupedMap[key].tpo && item.tpo) {
        groupedMap[key].tpo = item.tpo;
      }
      if (!groupedMap[key].memo && item.memo) {
        groupedMap[key].memo = item.memo;
      }
    });

    return Object.values(groupedMap).sort((a, b) => b.date.localeCompare(a.date));
  }, [historyList, selectedFilter]);

  const deleteHistoryByApi = async (id: string) => {
    const numericId = Number(id);
    if (Number.isNaN(numericId)) throw new Error('유효하지 않은 기록 ID입니다.');
    try {
      const response = await api.delete(`/history/${numericId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || error.message || '삭제 실패');
    }
  };

  const handleDelete = (group: GroupedWearHistoryItem) => {
    if (deletingId) return;
    Alert.alert('기록 삭제', '이 날짜의 착용 기록을 모두 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(group.id);
            for (const historyId of group.historyIds) {
              await deleteHistoryByApi(historyId);
            }
            setHistoryList((prev) => prev.filter((item) => !group.historyIds.includes(item.id)));
          } catch (error) {
            Alert.alert('삭제 실패', error instanceof Error ? error.message : '서버에서 기록을 삭제하지 못했습니다.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const handleDetailPress = (group: GroupedWearHistoryItem) => {
    const clothes = getClothesByIds(group.clothesIds);
    router.push({
      pathname: '/history-detail',
      params: {
        id: group.id,
        date: group.date,
        tpoSuitability: group.tpoSuitability ?? '', 
        mood: group.mood ?? '',
        tpo: group.tpo ?? '',
        memo: group.memo ?? '',
        clothes: JSON.stringify(clothes),
      },
    });
  };

  const handleEditPress = (group: GroupedWearHistoryItem) => {
    const clothes = getClothesByIds(group.clothesIds);
    router.push({
      pathname: '/history-create',
      params: {
        editMode: 'true',
        editId: group.id,
        editDate: group.date,
        editMemo: group.memo ?? '',
        editTpo: group.tpo ?? '',
        editTpoSuitability: group.tpoSuitability ?? '', 
        editTemperature: group.mood ?? '',
        editClothes: JSON.stringify(clothes),
      },
    });
  };

  const handleCreatePress = () => {
    router.push('/history-create');
  };

  const EmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>해당 조건의 착용 기록이 없습니다</Text>
      <Text style={styles.emptyDescription}>다른 필터를 선택하거나 새 기록을 추가해보세요.</Text>
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
          <Pressable style={styles.actionButton} onPress={() => fetchHistoryList()}>
            <Text style={styles.actionButtonText}>다시 시도</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>착용 기록</Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filterOptions.map((filter) => {
            const isSelected = selectedFilter === filter;
            return (
              <Pressable key={filter} style={[styles.filterChip, isSelected && styles.filterChipSelected]} onPress={() => setSelectedFilter(filter)}>
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextSelected]}>{filter}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={groupedHistoryData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          // ✨ 카테고리 순서(아우터 > 상의 > 하의 > 신발 > 악세사리 > 기타)대로 정렬
          const clothes = getClothesByIds(item.clothesIds).sort((a, b) => {
            const order: Record<string, number> = { '아우터': 1, '상의': 2, '하의': 3, '신발': 4, '악세사리': 5, '기타': 6 };
            return (order[a.category] || 99) - (order[b.category] || 99);
          });
          
          const tagText = [item.tpo, item.tpoSuitability, item.mood].filter((v) => v && v.trim() !== '').join(' · ') || '태그 없음';
          
          let displayDate = item.date;
          if (item.date) {
            const dateObj = new Date(item.date);
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const dayOfWeek = days[dateObj.getDay()];
            displayDate = `${item.date.replace(/-/g, '. ')} (${dayOfWeek})`;
          }

          return (
            <View style={styles.card}>
              <Text style={styles.date}>{displayDate}</Text>

              {/* 1. 카테고리를 위로 올리고, 사진 잘림(Crop) 현상을 해결한 스크롤 영역 */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clothesScroll}>
                {clothes.length > 0 ? (
                  clothes.map((cloth) => (
                    <View key={cloth.id} style={styles.clothThumbnailBox}>
                      {/* 카테고리를 사진 위로 배치 */}
                      <Text style={styles.clothCategory}>{cloth.category}</Text>
                      
                      {/* 사진이 잘리지 않도록 래퍼로 감싸고 resizeMode="contain" 적용 */}
                      <View style={styles.imageWrapper}>
                        <Image 
                          source={{ uri: cloth.imageUrl || 'https://via.placeholder.com/100?text=No+Img' }} 
                          style={styles.clothThumbnailImage} 
                          resizeMode="contain" 
                        />
                      </View>
                      
                      <Text style={styles.clothName} numberOfLines={1}>{cloth.name}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.clothBox}>
                    <Text style={styles.clothName}>옷 정보 없음</Text>
                  </View>
                )}
              </ScrollView>

              {/* 2. 태그와 메모를 은은한 회색 박스로 묶고 아이콘 추가 */}
              <View style={styles.metaContainer}>
                <View style={styles.metaRow}>
                  <Ionicons name="pricetag" size={14} color="#3B82F6" />
                  <Text style={styles.tagsText}>{tagText}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="chatbubble-ellipses" size={14} color="#10B981" />
                  <Text style={styles.memoText}>{item.memo || '메모 없음'}</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={styles.actionButton} onPress={() => handleDetailPress(item)} disabled={deletingId === item.id}>
                  <Text style={styles.actionButtonText}>상세보기</Text>
                </Pressable>
                <Pressable style={styles.actionButton} onPress={() => handleEditPress(item)} disabled={deletingId === item.id}>
                  <Text style={styles.actionButtonText}>수정</Text>
                </Pressable>
                <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item)} disabled={deletingId === item.id}>
                  <Text style={[styles.actionButtonText, styles.deleteButtonText]}>{deletingId === item.id ? '삭제 중...' : '삭제'}</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
        onRefresh={() => fetchHistoryList(true)}
        refreshing={refreshing}
        contentContainerStyle={[styles.listContent, groupedHistoryData.length === 0 && styles.emptyListContent]}
        ListEmptyComponent={<EmptyState />}
        showsVerticalScrollIndicator={false}
      />

      {/* 우측 하단 플로팅 액션 버튼 (FAB) */}
      <Pressable style={styles.fab} onPress={handleCreatePress}>
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16 },
  header: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: '#111' },
  
  filterScroll: { gap: 8, paddingBottom: 16 },
  filterChip: { backgroundColor: '#f1f1f1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  filterChipSelected: { backgroundColor: '#111' },
  filterChipText: { fontSize: 13, color: '#333', fontWeight: '500' },
  filterChipTextSelected: { color: '#fff' },
  
  listContent: { paddingBottom: 24 },
  emptyListContent: { flexGrow: 1 },
  card: { backgroundColor: '#f7f7f7', borderRadius: 14, padding: 16, marginBottom: 12 },
  date: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 10 },
  
  // 옷 이미지 썸네일 관련 스타일 모음
  clothesScroll: { gap: 14, paddingBottom: 12 },
  clothThumbnailBox: { width: 110, alignItems: 'center' },
  clothCategory: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  imageWrapper: { 
    width: 110, 
    height: 110, 
    backgroundColor: '#F1F5F9', 
    borderRadius: 12, 
    marginBottom: 8, 
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center'
  },
  clothThumbnailImage: { width: '90%', height: '90%' }, 
  clothName: { fontSize: 13, fontWeight: '600', color: '#1E293B', textAlign: 'center' },
  clothBox: { minHeight: 72, backgroundColor: '#fff', borderRadius: 10, padding: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#eee' },
  
  // 태그/메모 스타일
  metaContainer: { 
    backgroundColor: '#F8FAFC', 
    padding: 12, 
    borderRadius: 12, 
    gap: 8, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tagsText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  memoText: { fontSize: 13, color: '#475569', lineHeight: 20 },
  
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  actionButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  actionButtonText: { fontSize: 13, fontWeight: '600', color: '#333' },
  deleteButton: { borderColor: '#f0caca' },
  deleteButtonText: { color: '#c0392b' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 8, textAlign: 'center' },
  emptyDescription: { fontSize: 14, color: '#777', textAlign: 'center' },
  
  loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  errorButtonRow: { flexDirection: 'row', gap: 8, marginTop: 16 },

  fab: { 
    position: 'absolute', 
    bottom: 24, 
    right: 24, 
    width: 56, 
    height: 56, 
    backgroundColor: '#111', 
    borderRadius: 28, 
    justifyContent: 'center', 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 4, 
    elevation: 5 
  },
});