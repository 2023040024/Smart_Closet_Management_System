import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Category, ClothesItem, EMPTY_TAGS, TAG_OPTIONS } from '../_closetStore';

const API_BASE_URL = 'http://192.168.1.122:8000';

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

type ClothesApiItem = {
  clothes_id?: number;
  id?: number;
  name?: string;
  category?: string;
  color?: string;
  season?: string;
  tone?: string;
  style?: string;
  mood?: string;
  material?: string;
  thickness?: string;
  point?: string;
  tpo?: string;
  situation?: string;
  fit?: string;
  top_fit?: string | null;
  bottom_fit?: string | null;
  image?: string;
  image_url?: string;
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

const FILTER_SECTIONS: Array<{
  title: string;
  items: Array<{
    label: string;
    key: keyof FilterType;
    options: string[];
  }>;
}> = [
  {
    title: '자주 쓰는 필터',
    items: [
      { label: '색상', key: 'color', options: FILTER_OPTIONS.color },
      { label: '계절', key: 'season', options: FILTER_OPTIONS.season },
      { label: '스타일', key: 'style', options: FILTER_OPTIONS.style },
      { label: 'TPO', key: 'tpo', options: FILTER_OPTIONS.tpo },
    ],
  },
  {
    title: '핏 / 분위기',
    items: [
      { label: '상의 핏', key: 'topFit', options: FILTER_OPTIONS.topFit },
      { label: '하의 핏', key: 'bottomFit', options: FILTER_OPTIONS.bottomFit },
      { label: '분위기', key: 'mood', options: FILTER_OPTIONS.mood },
      { label: '톤', key: 'tone', options: FILTER_OPTIONS.tone },
    ],
  },
  {
    title: '소재 / 디테일',
    items: [
      { label: '소재', key: 'material', options: FILTER_OPTIONS.material },
      { label: '두께', key: 'thickness', options: FILTER_OPTIONS.thickness },
      { label: '포인트', key: 'point', options: FILTER_OPTIONS.point },
    ],
  },
];

function normalizeCategory(category?: string): Category {
  const value = (category || '').trim().toLowerCase();

  if (value === '상의' || value === 'top' || value === 'tops' || value === 'shirt') {
    return '상의';
  }

  if (value === '하의' || value === 'bottom' || value === 'bottoms' || value === 'pants') {
    return '하의';
  }

  if (value === '아우터' || value === 'outer' || value === 'outerwear' || value === 'jacket') {
    return '아우터';
  }

  if (value === '신발' || value === 'shoe' || value === 'shoes' || value === 'sneakers') {
    return '신발';
  }

  return '악세사리';
}

function resolveImageUri(image?: string) {
  if (!image) return '';

  if (
    image.startsWith('http://') ||
    image.startsWith('https://') ||
    image.startsWith('file://')
  ) {
    return image;
  }

  if (image.startsWith('/')) {
    return `${API_BASE_URL}${image}`;
  }

  return `${API_BASE_URL}/${image}`;
}

function pickValidTag<T extends readonly string[]>(
  options: T,
  value?: string | null
): T[number] | '' {
  if (!value) return '';

  return options.includes(value) ? (value as T[number]) : '';
}

function mapApiItemToClothesItem(item: ClothesApiItem): ClothesItem | null {
  const rawId = item.clothes_id ?? item.id;

  if (!rawId) return null;

  const category = normalizeCategory(item.category);
  const fitValue = item.fit ?? item.top_fit ?? item.bottom_fit ?? '';

  const color = pickValidTag(TAG_OPTIONS.color, item.color);
  const season = pickValidTag(TAG_OPTIONS.season, item.season);
  const tone = pickValidTag(TAG_OPTIONS.tone, item.tone);
  const style = pickValidTag(TAG_OPTIONS.style, item.style);
  const mood = pickValidTag(TAG_OPTIONS.mood, item.mood);
  const material = pickValidTag(TAG_OPTIONS.material, item.material);
  const thickness = pickValidTag(TAG_OPTIONS.thickness, item.thickness);
  const point = pickValidTag(TAG_OPTIONS.point, item.point);
  const tpo = pickValidTag(TAG_OPTIONS.tpo, item.tpo ?? item.situation);

  const topFit =
    category === '상의'
      ? pickValidTag(TAG_OPTIONS.topFit, fitValue)
      : '';

  const bottomFit =
    category === '하의'
      ? pickValidTag(TAG_OPTIONS.bottomFit, fitValue)
      : '';

  return {
    id: String(rawId),
    image: resolveImageUri(item.image_url ?? item.image),
    createdAt: new Date().toISOString(),
    tags: {
      ...EMPTY_TAGS,
      category,
      color,
      season,
      tone,
      style,
      mood,
      material,
      thickness,
      point,
      tpo,
      topFit,
      bottomFit,
    },
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const filterScrollRef = useRef<ScrollView | null>(null);

  const [clothes, setClothes] = useState<ClothesItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const [selectedType, setSelectedType] = useState<'전체' | Category>('전체');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothesItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentFilterPage, setCurrentFilterPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    style: true,
    mood: false,
    thickness: false,
    topFit: false,
    bottomFit: false,
    material: false,
    point: false,
    color: true,
    season: true,
    tone: false,
    tpo: true,
  });

  const [showAllOptions, setShowAllOptions] = useState<
    Partial<Record<keyof FilterType, boolean>>
  >({});

  const fetchClothes = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage('');

      const response = await fetch(`${API_BASE_URL}/clothes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      let data: ClothesApiItem[] = [];

      try {
        data = await response.json();
      } catch {
        data = [];
      }

      if (!response.ok) {
        throw new Error(`옷 목록 조회 실패 (${response.status})`);
      }

      const mapped = data
        .map(mapApiItemToClothesItem)
        .filter(Boolean) as ClothesItem[];

      setClothes(mapped);
    } catch (error) {
      console.error('옷 목록 불러오기 실패:', error);
      setErrorMessage(
        error instanceof Error ? error.message : '옷 목록을 불러오지 못했습니다.'
      );
      setClothes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchClothes();
    }, [fetchClothes])
  );

  const activeFilterCount = useMemo(() => {
    return Object.values(filter).filter(Boolean).length;
  }, [filter]);

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

  const resetFilters = () => {
    setFilter({
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
    if (!selectedItem || deletingId) return;

    Alert.alert('삭제 확인', '이 옷을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeletingId(selectedItem.id);

            const response = await fetch(
              `${API_BASE_URL}/clothes/${Number(selectedItem.id)}`,
              {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

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

            closeMenu();
            await fetchClothes();
          } catch (error) {
            console.error('옷 삭제 실패:', error);
            Alert.alert(
              '삭제 실패',
              error instanceof Error
                ? error.message
                : '옷을 삭제하지 못했습니다.'
            );
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const goRecommend = () => {
    router.push('/(tabs)/recommend');
  };

  const handleFilterPageChange = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const pageWidth = width - 32;
    const offsetX = e.nativeEvent.contentOffset.x;
    const nextPage = Math.round(offsetX / pageWidth);
    setCurrentFilterPage(nextPage);
  };

  const moveToFilterPage = (pageIndex: number) => {
    const pageWidth = width - 32;
    filterScrollRef.current?.scrollTo({
      x: pageIndex * pageWidth,
      animated: true,
    });
    setCurrentFilterPage(pageIndex);
  };

  const renderSection = (
    label: string,
    key: keyof FilterType,
    options: string[]
  ) => {
    const visibleOptions = showAllOptions[key] ? options : options.slice(0, 5);

    return (
      <View style={styles.filterItemBlock}>
        <TouchableOpacity
          style={styles.filterItemHeader}
          onPress={() => toggleExpand(key)}
          activeOpacity={0.85}
        >
          <View style={styles.filterItemHeaderLeft}>
            <Text style={styles.filterItemLabel}>{label}</Text>
            {!!filter[key] && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>선택됨</Text>
              </View>
            )}
          </View>
          <Text style={styles.arrowText}>{expanded[key] ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {expanded[key] && (
          <View>
            <View style={styles.optionWrap}>
              {visibleOptions.map((item, index) => {
                const isSelected = filter[key] === item;
                return (
                  <TouchableOpacity
                    key={`${key}-${item}-${index}`}
                    style={[
                      styles.optionChip,
                      isSelected && styles.optionChipSelected,
                    ]}
                    onPress={() => toggleFilter(key, item)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        isSelected && styles.optionChipTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {options.length > 5 && (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() =>
                  setShowAllOptions((prev) => ({
                    ...prev,
                    [key]: !prev[key],
                  }))
                }
                activeOpacity={0.85}
              >
                <Text style={styles.moreButtonText}>
                  {showAllOptions[key] ? '접기' : `더보기 +${options.length - 5}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderCard = (item: ClothesItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.card}
      activeOpacity={0.9}
      onLongPress={() => openMenu(item)}
      delayLongPress={250}
    >
      <View style={styles.cardImageWrap}>
        {item.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={28} color="#888" />
            <Text style={styles.imageFallbackText}>이미지 없음</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle}>{item.tags.category || '미분류'}</Text>

        <View style={styles.cardTagRow}>
          {!!item.tags.color && <Text style={styles.cardTag}>{item.tags.color}</Text>}
          {!!item.tags.season && <Text style={styles.cardTag}>{item.tags.season}</Text>}
          {!!item.tags.style && <Text style={styles.cardTag}>{item.tags.style}</Text>}
        </View>

        <Text style={styles.cardHint}>길게 눌러 상세 메뉴 보기</Text>
      </View>
    </TouchableOpacity>
  );

  const pageWidth = width - 32;
  const innerCardWidth = pageWidth - 4;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>옷 목록 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerTextBox}>
            <Text style={styles.title}>내 옷장</Text>
            <Text style={styles.subtitle}>등록한 옷을 확인하고 관리해보세요.</Text>
          </View>

          <TouchableOpacity style={styles.moveRecommendBtn} onPress={goRecommend}>
            <Text style={styles.moveRecommendText}>추천</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryActionBtn, showFilter && styles.primaryActionBtnActive]}
            onPress={() => setShowFilter((prev) => !prev)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={showFilter ? 'close-outline' : 'options-outline'}
              size={18}
              color="#fff"
              style={styles.primaryActionIcon}
            />
            <Text style={styles.primaryActionText}>
              {showFilter ? '닫기' : '필터'}
            </Text>
          </TouchableOpacity>

          {activeFilterCount > 0 && (
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={resetFilters}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryActionText}>초기화 {activeFilterCount}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.typeScrollContent}
          style={styles.typeScroll}
        >
          {CATEGORY_ORDER.map((type) => {
            const isSelected = selectedType === type;

            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, isSelected && styles.typeBtnSelected]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.85}
              >
                <Text style={[styles.typeText, isSelected && styles.typeTextSelected]}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {showFilter && (
          <View style={styles.filterPanel}>
            <View style={styles.filterPanelHeader}>
              <View style={styles.filterPanelHeaderText}>
                <Text style={styles.filterPanelTitle}>상세 필터</Text>
                <Text style={styles.filterPanelSubtitle}>
                  좌우로 넘기면서 그룹별로 필터를 볼 수 있어요.
                </Text>
              </View>
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountBadgeText}>{activeFilterCount}개 선택</Text>
              </View>
            </View>

            <ScrollView
              ref={filterScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleFilterPageChange}
              style={styles.filterSlider}
            >
              {FILTER_SECTIONS.map((section, index) => (
                <View
                  key={`${section.title}-${index}`}
                  style={[styles.filterSlide, { width: pageWidth }]}
                >
                  <View style={[styles.filterSectionCard, { width: innerCardWidth }]}>
                    <Text style={styles.filterSectionTitle}>{section.title}</Text>
                    {section.items.map((sectionItem, index) => (
                      <View key={`${section.title}-${sectionItem.key}-${index}`}>
                        {renderSection(sectionItem.label, sectionItem.key, sectionItem.options)}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.paginationWrap}>
              {FILTER_SECTIONS.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => moveToFilterPage(index)}
                  style={[
                    styles.paginationDot,
                    currentFilterPage === index && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>옷 목록</Text>
          <Text style={styles.resultCount}>{filteredClothes.length}개</Text>
        </View>

        {errorMessage ? (
          <View style={styles.messageBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchClothes}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : filteredClothes.length === 0 ? (
          <Text style={styles.emptyText}>조건에 맞는 옷이 없습니다.</Text>
        ) : (
          <View style={styles.grid}>
            {filteredClothes.map((item) => renderCard(item))}
          </View>
        )}
      </ScrollView>

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
              disabled={!!deletingId}
            >
              <Text style={styles.deleteMenuText}>
                {deletingId ? '삭제 중...' : '삭제하기'}
              </Text>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: '#fff',
  },

  scrollContent: {
    paddingBottom: 28,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 10,
  },

  headerTextBox: {
    flex: 1,
    paddingRight: 8,
  },

  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 6,
    color: '#111',
  },

  subtitle: {
    fontSize: 14,
    color: '#6b6b6b',
    lineHeight: 20,
  },

  moveRecommendBtn: {
    backgroundColor: '#f3f3f3',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e4e4e4',
    alignSelf: 'flex-start',
  },

  moveRecommendText: {
    color: '#222',
    fontSize: 13,
    fontWeight: '700',
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },

  primaryActionBtn: {
    backgroundColor: '#111',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  primaryActionBtnActive: {
    backgroundColor: '#333',
  },

  primaryActionIcon: {
    marginRight: 6,
  },

  primaryActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  secondaryActionBtn: {
    backgroundColor: '#f2f2f2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },

  secondaryActionText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },

  typeScroll: {
    marginBottom: 14,
  },

  typeScrollContent: {
    paddingRight: 8,
  },

  typeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  typeBtnSelected: {
    backgroundColor: '#111',
  },

  typeText: {
    color: '#222',
    fontSize: 14,
    fontWeight: '600',
  },

  typeTextSelected: {
    color: '#fff',
  },

  filterPanel: {
    marginBottom: 16,
  },

  filterPanelHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },

  filterPanelHeaderText: {
    flex: 1,
  },

  filterPanelTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 2,
  },

  filterPanelSubtitle: {
    fontSize: 13,
    color: '#777',
    lineHeight: 18,
  },

  filterCountBadge: {
    backgroundColor: '#111',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },

  filterCountBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  filterSlider: {
    marginHorizontal: -2,
  },

  filterSlide: {
    alignItems: 'center',
  },

  filterSectionCard: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#ededed',
    borderRadius: 18,
    padding: 14,
  },

  filterSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },

  filterItemBlock: {
    marginBottom: 10,
  },

  filterItemHeader: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e4e4e4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  filterItemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },

  filterItemLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },

  activeBadge: {
    backgroundColor: '#efefef',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9d9d9',
  },

  activeBadgeText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '700',
  },

  arrowText: {
    fontSize: 12,
    color: '#444',
    fontWeight: '700',
  },

  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },

  optionChip: {
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dcdcdc',
    justifyContent: 'center',
  },

  optionChipSelected: {
    backgroundColor: '#111',
    borderColor: '#111',
    borderWidth: 1.5,
  },

  optionChipText: {
    color: '#333',
    fontSize: 13,
    fontWeight: '600',
  },

  optionChipTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },

  moreButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  moreButtonText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '700',
  },

  paginationWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },

  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#d5d5d5',
  },

  paginationDotActive: {
    width: 20,
    backgroundColor: '#111',
  },

  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 2,
  },

  resultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
  },

  resultCount: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  card: {
    width: '48.2%',
    backgroundColor: '#fff',
    borderRadius: 18,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ededed',
  },

  cardImageWrap: {
    width: '100%',
    height: 180,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#efefef',
  },

  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#f2f2f2',
  },

  imageFallback: {
    width: '100%',
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    gap: 6,
  },

  imageFallbackText: {
    fontSize: 12,
    color: '#777',
    fontWeight: '600',
  },

  cardBody: {
    padding: 12,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111',
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
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
    fontWeight: '600',
  },

  cardHint: {
    fontSize: 11,
    color: '#7a7a7a',
  },

  emptyText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 40,
  },

  messageBox: {
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  errorText: {
    color: '#c0392b',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },

  retryButton: {
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },

  retryButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#777',
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
    borderRadius: 20,
    padding: 18,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
    textAlign: 'center',
    color: '#111',
  },

  modalButton: {
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },

  modalButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  deleteMenuButton: {
    backgroundColor: '#fff1f1',
    borderWidth: 1,
    borderColor: '#ffcccc',
  },

  deleteMenuText: {
    color: '#d11a2a',
    fontSize: 15,
    fontWeight: '700',
  },

  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },

  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
});