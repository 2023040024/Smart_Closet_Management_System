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
import { Category, ClothesItem, TAG_OPTIONS, useCloset } from '../_closetStore';

const CATEGORY_ORDER: Array<'전체' | Category> = ['전체', ...TAG_OPTIONS.category];

type FilterType = {
  style: string;
  mood: string;
  thickness: string;
  topFit: string;
  bottomFit: string;
  material: string;
  point: string;
  color: string;
  season: string;
  tone: string;
  tpo: string;
};

const FILTER_OPTIONS = {
  color: [...TAG_OPTIONS.color],
  season: [...TAG_OPTIONS.season],
  tone: [...TAG_OPTIONS.tone],
  style: [...TAG_OPTIONS.style],
  mood: [...TAG_OPTIONS.mood],
  topFit: [...TAG_OPTIONS.topFit],
  bottomFit: [...TAG_OPTIONS.bottomFit],
  material: [...TAG_OPTIONS.material],
  thickness: [...TAG_OPTIONS.thickness],
  point: [...TAG_OPTIONS.point],
  tpo: [...TAG_OPTIONS.tpo],
};

export default function HomeScreen() {
  const { clothes, deleteClothes } = useCloset();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<'전체' | Category>('전체');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothesItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [filter, setFilter] = useState<FilterType>({
    style: '',
    mood: '',
    thickness: '',
    topFit: '',
    bottomFit: '',
    material: '',
    point: '',
    color: '',
    season: '',
    tone: '',
    tpo: '',
  });

  const [expanded, setExpanded] = useState<Record<keyof FilterType, boolean>>({
    style: false,
    mood: false,
    thickness: false,
    topFit: false,
    bottomFit: false,
    material: false,
    point: false,
    color: false,
    season: false,
    tone: false,
    tpo: false,
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
      params: {
        category: selectedType === '전체' ? '' : selectedType,
        ...filter,
      },
    });
  };

  const openMenu = (item: ClothesItem) => {
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
    router.push({ pathname: '/detail', params: { id } });
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
    return clothes.filter((item) => {
      const matchType =
        selectedType === '전체' || item.tags.category === selectedType;

      const matchFilter =
        (!filter.style || item.tags.style === filter.style) &&
        (!filter.mood || item.tags.mood === filter.mood) &&
        (!filter.thickness || item.tags.thickness === filter.thickness) &&
        (!filter.topFit || item.tags.topFit === filter.topFit) &&
        (!filter.bottomFit || item.tags.bottomFit === filter.bottomFit) &&
        (!filter.material || item.tags.material === filter.material) &&
        (!filter.point || item.tags.point === filter.point) &&
        (!filter.color || item.tags.color === filter.color) &&
        (!filter.season || item.tags.season === filter.season) &&
        (!filter.tone || item.tags.tone === filter.tone) &&
        (!filter.tpo || item.tags.tpo === filter.tpo);

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

  const renderCard = ({ item }: { item: ClothesItem }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.9}
      onLongPress={() => openMenu(item)}
      delayLongPress={250}
    >
    <View style={styles.cardImageWrap}>
      <Image
        source={{ uri: item.image }}
        style={styles.cardImage}
        resizeMode="contain"
      />
    </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.tags.category || '미분류'}</Text>

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
          {CATEGORY_ORDER.map((type) => {
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
          {renderSection('상의 핏', 'topFit', FILTER_OPTIONS.topFit)}
          {renderSection('하의 핏', 'bottomFit', FILTER_OPTIONS.bottomFit)}
          {renderSection('색상', 'color', FILTER_OPTIONS.color)}
          {renderSection('계절', 'season', FILTER_OPTIONS.season)}
          {renderSection('톤', 'tone', FILTER_OPTIONS.tone)}
          {renderSection('스타일', 'style', FILTER_OPTIONS.style)}
          {renderSection('분위기', 'mood', FILTER_OPTIONS.mood)}
          {renderSection('소재', 'material', FILTER_OPTIONS.material)}
          {renderSection('두께', 'thickness', FILTER_OPTIONS.thickness)}
          {renderSection('포인트', 'point', FILTER_OPTIONS.point)}
          {renderSection('TPO', 'tpo', FILTER_OPTIONS.tpo)}
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

  cardImageWrap: {
    width: '100%',
    height: 220,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },

  cardImage: {
    width: '100%',
    height: 220,
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