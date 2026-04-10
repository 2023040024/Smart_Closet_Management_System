import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCloset } from '../_closetStore';

type FilterType = {
  style: string;
  mood: string;
  thickness: string;
  fit: string;
  material: string;
  point: string;
  color: string;
  season: string;
};

type Clothes = {
  id: string;
  image: string;
  tags: FilterType & { type: string };
};

const FILTER_OPTIONS: Record<keyof FilterType, string[]> = {
  color: ['블랙', '화이트', '그레이', '베이지', '브라운', '블루', '그린', '레드', '기타'],
  season: ['봄', '여름', '가을', '겨울'],
  style: ['캐주얼', '세미캐주얼', '포멀', '미니멀', '스트릿', '댄디', '스포티', '빈티지', '아메카지'],
  mood: ['활동적인', '세련된', '귀여운', '힙한', '차분한', '고급스러운'],
  fit: ['오버핏', '슬림핏', '와이드핏', '크롭', '롱기장'],
  material: ['니트', '데님', '코튼', '패딩'],
  thickness: ['얇음', '보통', '두꺼움'],
  point: ['프린팅', '로고', '레이어드', '컬러포인트', '무지', '패턴', '스트라이프', '체크'],
};

export default function HomeScreen() {
  const { clothes, deleteClothes } = useCloset();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<string>('전체');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Clothes | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [filter, setFilter] = useState<FilterType>({
    style: '',
    mood: '',
    thickness: '',
    fit: '',
    material: '',
    point: '',
    color: '',
    season: '',
  });

  const [expanded, setExpanded] = useState<Record<keyof FilterType, boolean>>({
    style: false,
    mood: false,
    thickness: false,
    fit: false,
    material: false,
    point: false,
    color: false,
    season: false,
  });

  const toggleFilter = (category: keyof FilterType, value: string) => {
    setFilter((prev) => ({
      ...prev,
      [category]: prev[category] === value ? '' : value,
    }));
  };

  const toggleExpand = (category: keyof FilterType) => {
    setExpanded((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const goRecommend = () => {
    router.push({
      pathname: '/(tabs)/recommend',
      params: filter,
    });
  };

  const openMenu = (item: Clothes) => {
    setSelectedItem(item);
    setMenuVisible(true);
  };

  const closeMenu = () => {
    setMenuVisible(false);
    setSelectedItem(null);
  };

  const goDetail = () => {
    if (!selectedItem) return;
    const id = selectedItem.id;
    closeMenu();
    router.push(`/detail?id=${id}`);
  };

  const handleDelete = () => {
    if (!selectedItem) return;

    Alert.alert('삭제 확인', '이 옷을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          deleteClothes(selectedItem.id);
          closeMenu();
        },
      },
    ]);
  };

  const filteredClothes = useMemo(() => {
    return (clothes as Clothes[]).filter((item) => {
      const matchType =
        selectedType === '전체' || item.tags.type === selectedType;

      const matchFilter =
        (!filter.style || item.tags.style === filter.style) &&
        (!filter.mood || item.tags.mood === filter.mood) &&
        (!filter.thickness || item.tags.thickness === filter.thickness) &&
        (!filter.fit || item.tags.fit === filter.fit) &&
        (!filter.material || item.tags.material === filter.material) &&
        (!filter.point || item.tags.point === filter.point) &&
        (!filter.color || item.tags.color === filter.color) &&
        (!filter.season || item.tags.season === filter.season);

      return matchType && matchFilter;
    });
  }, [clothes, selectedType, filter]);

  const renderSection = (
    label: string,
    key: keyof FilterType,
    options: string[]
  ) => (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity onPress={() => toggleExpand(key)}>
          <Text style={styles.arrowText}>{expanded[key] ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {expanded[key] && (
        <View style={styles.filterContainer}>
          {options.map((item) => {
            const isSelected = filter[key] === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.tag, isSelected && styles.selected]}
                onPress={() => toggleFilter(key, item)}
              >
                <Text style={isSelected ? styles.selectedText : styles.tagText}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderCard = ({ item }: { item: Clothes }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onLongPress={() => openMenu(item)}
      delayLongPress={250}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.tags.type || '미분류'}</Text>

        <View style={styles.cardTagRow}>
          {!!item.tags.color && <Text style={styles.cardTag}>{item.tags.color}</Text>}
          {!!item.tags.season && <Text style={styles.cardTag}>{item.tags.season}</Text>}
          {!!item.tags.style && <Text style={styles.cardTag}>{item.tags.style}</Text>}
        </View>

        <Text style={styles.cardHint}>사진을 길게 누르면 메뉴가 열립니다</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 옷장</Text>

      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilter((prev) => !prev)}
        >
          <Text style={styles.filterText}>{showFilter ? '필터 닫기' : '필터'}</Text>
        </TouchableOpacity>

        <View style={styles.typeContainer}>
          {['전체', '상의', '하의', '아우터', '신발'].map((type) => {
            const isSelected = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, isSelected && styles.selected]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={isSelected ? styles.selectedText : styles.typeText}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {showFilter && (
        <View style={styles.filterPanel}>
          {renderSection('색상', 'color', FILTER_OPTIONS.color)}
          {renderSection('계절', 'season', FILTER_OPTIONS.season)}
          {renderSection('스타일', 'style', FILTER_OPTIONS.style)}
          {renderSection('분위기', 'mood', FILTER_OPTIONS.mood)}
          {renderSection('핏', 'fit', FILTER_OPTIONS.fit)}
          {renderSection('소재', 'material', FILTER_OPTIONS.material)}
          {renderSection('두께', 'thickness', FILTER_OPTIONS.thickness)}
          {renderSection('포인트', 'point', FILTER_OPTIONS.point)}
        </View>
      )}

      <TouchableOpacity style={styles.recommendBtn} onPress={goRecommend}>
        <Text style={styles.recommendText}>코디 추천 받기</Text>
      </TouchableOpacity>

      <FlatList
        data={filteredClothes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={filteredClothes.length > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={
          filteredClothes.length === 0 ? styles.emptyContainer : styles.listContent
        }
        renderItem={renderCard}
        ListEmptyComponent={
          <Text style={styles.emptyText}>등록된 옷이 없습니다.</Text>
        }
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>메뉴</Text>

            <TouchableOpacity style={styles.modalButton} onPress={goDetail}>
              <Text style={styles.modalButtonText}>상세 보기</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.deleteMenuButton]}
              onPress={handleDelete}
            >
              <Text style={styles.deleteMenuText}>삭제하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={closeMenu}>
              <Text style={styles.cancelButtonText}>닫기</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },

  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  filterBtn: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 8,
  },

  filterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },

  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },

  typeText: {
    color: '#222',
  },

  selected: {
    backgroundColor: '#000',
  },

  selectedText: {
    color: '#fff',
  },

  filterPanel: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#eee',
  },

  sectionBlock: {
    marginBottom: 8,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  label: {
    fontWeight: '600',
    fontSize: 14,
  },

  arrowText: {
    fontSize: 12,
  },

  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },

  tag: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eee',
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },

  tagText: {
    color: '#222',
  },

  recommendBtn: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    alignItems: 'center',
  },

  recommendText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  listContent: {
    paddingBottom: 24,
  },

  columnWrapper: {
    justifyContent: 'space-between',
  },

  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },

  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f2f2f2',
  },

  cardBody: {
    padding: 10,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },

  cardTagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },

  cardTag: {
    fontSize: 12,
    color: '#444',
    backgroundColor: '#f2f2f2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },

  cardHint: {
    fontSize: 11,
    color: '#777',
  },

  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    color: '#666',
    fontSize: 14,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  modalBox: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
    textAlign: 'center',
  },

  modalButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },

  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  deleteMenuButton: {
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#ffcccc',
  },

  deleteMenuText: {
    color: '#d11a2a',
    fontSize: 15,
    fontWeight: '600',
  },

  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#666',
    fontSize: 14,
  },
});