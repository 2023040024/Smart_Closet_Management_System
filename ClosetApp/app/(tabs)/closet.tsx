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
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import api from '../_api';
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

export default function ClosetScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const filterScrollRef = useRef<ScrollView | null>(null);

  const { clothes, fetchClothes } = useCloset();
  const [loading, setLoading] = useState(false);

  const [overloadBanner, setOverloadBanner] = useState<{
    total_warnings: number;
    ai_advice: string;
  } | null>(null);

  const [selectedType, setSelectedType] = useState<'전체' | Category>('전체');
  const [showFilter, setShowFilter] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothesItem | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [currentFilterPage, setCurrentFilterPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [disposalBanner, setDisposalBanner] = useState<{
    items: any[];
    ai_advice: string;
  } | null>(null);

  const [filter, setFilter] = useState<FilterType>({
    style: '', mood: '', thickness: '', topFit: '', bottomFit: '',
    material: '', point: '', color: '', season: '', tone: '', tpo: '',
  });

  const [expanded, setExpanded] = useState<Record<keyof FilterType, boolean>>({
    style: true, mood: false, thickness: false, topFit: false, bottomFit: false,
    material: false, point: false, color: true, season: true, tone: false, tpo: true,
  });

  const [showAllOptions, setShowAllOptions] = useState<Partial<Record<keyof FilterType, boolean>>>({});

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const load = async () => {
        if (!isMounted) return;
        setLoading(true);
        try {
          await fetchClothes();
          
          const statsRes = await api.get('/stats/overload');
          const disposalRes = await api.get('/stats/dispose', {
            params: { current_season: getCurrentSeason() } 
          });

          if (isMounted) {
            setOverloadBanner(statsRes.data);
            setDisposalBanner(disposalRes.data);
          }
        } catch (error) {
          console.error("데이터 로드 실패:", error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };
      load();
      return () => { isMounted = false; };
    }, [])
  );

  function getCurrentSeason(): string {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return '봄';
    if (month >= 6 && month <= 8) return '여름';
    if (month >= 9 && month <= 11) return '가을';
    return '겨울';
  }

  const filteredClothes = useMemo(() => {
    return clothes.filter((item) => {
      const matchType = selectedType === '전체' || item.tags.category === selectedType;
      const matchFilter =
        (!filter.style || item.tags.style === filter.style) &&
        (!filter.mood || item.tags.mood === filter.mood) &&
        (!filter.color || item.tags.color === filter.color) &&
        (!filter.tpo || item.tags.tpo === filter.tpo) &&
        (!filter.season || item.tags.season === filter.season) &&
        (!filter.tone || item.tags.tone === filter.tone) &&
        (!filter.topFit || item.tags.topFit === filter.topFit) &&
        (!filter.bottomFit || item.tags.bottomFit === filter.bottomFit) &&
        (!filter.material || item.tags.material === filter.material) &&
        (!filter.thickness || item.tags.thickness === filter.thickness) &&
        (!filter.point || item.tags.point === filter.point);

      return matchType && matchFilter;
    });
  }, [clothes, selectedType, filter]);

  const activeFilterCount = useMemo(() => Object.values(filter).filter(Boolean).length, [filter]);

  const toggleFilter = (category: keyof FilterType, value: string) => {
    setFilter((prev) => ({ ...prev, [category]: prev[category] === value ? '' : value }));
  };

  const toggleExpand = (category: keyof FilterType) => {
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));
  };

  const resetFilters = () => {
    setFilter({ style: '', mood: '', thickness: '', topFit: '', bottomFit: '', material: '', point: '', color: '', season: '', tone: '', tpo: '' });
  };

  const openMenu = (item: ClothesItem) => { setSelectedItem(item); setMenuVisible(true); };
  const closeMenu = () => { setMenuVisible(false); setSelectedItem(null); };

  const goDetail = () => { if (!selectedItem) return; const id = selectedItem.id; closeMenu(); router.push({ pathname: '/detail', params: { id } }); };

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
            await api.delete(`/clothes/${selectedItem.id}`);
            closeMenu();
            await fetchClothes();

            const statsRes = await api.get('/stats/overload');
            setOverloadBanner(statsRes.data);
          } catch (e) { Alert.alert('삭제 실패'); }
          finally { setDeletingId(null); }
        },
      },
    ]);
  };

  const handleFilterPageChange = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pageWidthSize = width - 32;
    const offsetX = e.nativeEvent.contentOffset.x;
    setCurrentFilterPage(Math.round(offsetX / pageWidthSize));
  };

  const renderSection = (label: string, key: keyof FilterType, options: string[]) => {
    const visibleOptions = showAllOptions[key] ? options : options.slice(0, 5);

    return (
      <View style={styles.filterItemBlock}>
        <TouchableOpacity style={styles.filterItemHeader} onPress={() => toggleExpand(key)} activeOpacity={0.85}>
          <View style={styles.filterItemHeaderLeft}>
            <Text style={styles.filterItemLabel}>{label}</Text>
            {!!filter[key] && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>선택됨</Text></View>}
            
            {expanded[key] && options.length > 5 && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  setShowAllOptions((prev) => ({ ...prev, [key]: !prev[key] }));
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.moreButtonInlineText}>
                  {showAllOptions[key] ? '접기' : `더보기 +${options.length - 5}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.arrowText}>{expanded[key] ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {expanded[key] && (
          <View style={styles.optionWrap}>
            {visibleOptions.map((item, index) => (
              <TouchableOpacity 
                key={`${key}-${item}-${index}`} 
                style={[styles.optionChip, filter[key] === item && styles.optionChipSelected]} 
                onPress={() => toggleFilter(key, item)} 
                activeOpacity={0.85}
              >
                <Text style={[styles.optionChipText, filter[key] === item && styles.optionChipTextSelected]}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  // ✨ 옷 카드의 렌더링 부분에서 불필요한 카테고리 텍스트 타이틀을 제거했습니다.
  const renderCard = (item: ClothesItem) => (
    <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.9} onLongPress={() => openMenu(item)} onPress={() => router.push({ pathname: '/detail', params: { id: item.id } })} delayLongPress={250}>
      <View style={styles.cardImageWrap}>
        <Image source={{ uri: item.image }} style={styles.cardImage} resizeMode="contain" />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTagRow}>
          {!!item.tags.color && <Text style={styles.cardTag}>{item.tags.color}</Text>}
          {!!item.tags.style && <Text style={styles.cardTag}>{item.tags.style}</Text>}
          {!!item.tags.tpo && <Text style={[styles.cardTag, styles.tpoTag]}>{item.tags.tpo}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && clothes.length === 0) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#111" /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#111" />
          </TouchableOpacity>
          
          <View style={styles.headerTextBox}>
            <Text style={styles.title}>내 옷장</Text>
            <Text style={styles.subtitle} numberOfLines={1}>등록한 옷을 확인하고 관리해보세요.</Text>
          </View>
        </View>

        {clothes.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="shirt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyStateTitle}>등록된 옷이 없습니다</Text>
            <Text style={styles.emptyStateDesc}>첫 번째 옷을 등록하고 스마트한 옷장을 시작해보세요!</Text>
            <TouchableOpacity style={styles.emptyStateBtn} onPress={() => router.push('/(tabs)/register')}>
              <Text style={styles.emptyStateBtnText}>옷 등록하러 가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.primaryActionBtn, showFilter && styles.primaryActionBtnActive]} onPress={() => setShowFilter((prev) => !prev)} activeOpacity={0.85}>
                <Ionicons name={showFilter ? 'close-outline' : 'options-outline'} size={18} color="#fff" style={styles.primaryActionIcon} />
                <Text style={styles.primaryActionText}>{showFilter ? '닫기' : '필터'}</Text>
              </TouchableOpacity>
              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.secondaryActionBtn} onPress={resetFilters} activeOpacity={0.85}>
                  <Text style={styles.secondaryActionText}>초기화 {activeFilterCount}</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeScrollContent} style={styles.typeScroll}>
              {CATEGORY_ORDER.map((type) => (
                <TouchableOpacity key={type} style={[styles.typeBtn, selectedType === type && styles.typeBtnSelected]} onPress={() => setSelectedType(type)} activeOpacity={0.85}>
                  <Text style={[styles.typeText, selectedType === type && styles.typeTextSelected]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {showFilter && (
              <View style={styles.filterPanel}>
                <ScrollView ref={filterScrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={handleFilterPageChange}>
                  {FILTER_SECTIONS.map((section, index) => (
                    <View key={index} style={{ width: width - 32 }}>
                      <View style={styles.filterSectionCard}>
                        <Text style={styles.filterSectionTitle}>{section.title}</Text>
                        {section.items.map((sectionItem, idx) => (
                          <View key={idx}>
                            {renderSection(sectionItem.label, sectionItem.key, sectionItem.options)}
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.paginationWrap}>
                  {FILTER_SECTIONS.map((_, index) => (
                    <View key={index} style={[styles.paginationDot, currentFilterPage === index && styles.paginationDotActive]} />
                  ))}
                </View>
              </View>
            )}

            {overloadBanner && overloadBanner.total_warnings > 0 && (
              <View style={styles.overloadBannerBox}>
                <View style={styles.overloadBannerHeader}>
                  <Ionicons name="warning" size={16} color="#dc2626" />
                  <Text style={styles.overloadBannerTitle}>충동 소비 주의보 ({overloadBanner.total_warnings}건)</Text>
                </View>
                <Text style={styles.overloadBannerText}>{overloadBanner.ai_advice}</Text>
              </View>
            )}

            {disposalBanner && disposalBanner.items?.length > 0 && (
              <View style={styles.disposalBannerBox}>
                <View style={styles.disposalBannerHeader}>
                  <Ionicons name="trash-outline" size={16} color="#d97706" />
                  <Text style={styles.disposalBannerTitle}>정리가 필요한 옷이 있어요</Text>
                </View>
                <Text style={styles.disposalBannerText}>{disposalBanner.ai_advice}</Text>
              </View>
            )}

            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>옷 목록</Text>
              <Text style={styles.resultCount}>{filteredClothes.length}개</Text>
            </View>

            <View style={styles.grid}>
              {filteredClothes.map((item) => renderCard(item))}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={closeMenu}>
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>메뉴</Text>
            <TouchableOpacity style={styles.modalButton} onPress={goDetail}><Text style={styles.modalButtonText}>상세 보기</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.modalButton, styles.deleteMenuButton]} onPress={handleDelete} disabled={!!deletingId}>
              <Text style={styles.deleteMenuText}>{deletingId ? '삭제 중...' : '삭제하기'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={closeMenu}><Text style={styles.cancelButtonText}>닫기</Text></TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16, backgroundColor: '#fff' },
  scrollContent: { paddingBottom: 28 },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: { marginRight: 12 },
  headerTextBox: { flex: 1 },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 2, color: '#111' },
  subtitle: { fontSize: 14, color: '#6b6b6b' },
  
  actionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  primaryActionBtn: { backgroundColor: '#111', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  primaryActionBtnActive: { backgroundColor: '#333' },
  primaryActionIcon: { marginRight: 6 },
  primaryActionText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondaryActionBtn: { backgroundColor: '#f2f2f2', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  secondaryActionText: { color: '#333', fontSize: 13, fontWeight: '600' },
  typeScroll: { marginBottom: 14 },
  typeScrollContent: { paddingRight: 8 },
  typeBtn: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: '#f2f2f2', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  typeBtnSelected: { backgroundColor: '#111' },
  typeText: { color: '#222', fontSize: 14, fontWeight: '600' },
  typeTextSelected: { color: '#fff' },
  
  filterPanel: { marginBottom: 16 },
  filterSectionCard: { backgroundColor: '#fafafa', borderWidth: 1, borderColor: '#ededed', borderRadius: 18, padding: 14 },
  filterSectionTitle: { fontSize: 15, fontWeight: '800', color: '#111', marginBottom: 10 },
  
  filterItemBlock: { marginBottom: 10 },
  filterItemHeader: { minHeight: 38, borderRadius: 10, backgroundColor: '#f8f8f8', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#e4e4e4', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterItemHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  filterItemLabel: { fontSize: 13, fontWeight: '700', color: '#111' },
  activeBadge: { backgroundColor: '#efefef', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: '#d9d9d9' },
  activeBadgeText: { color: '#333', fontSize: 10, fontWeight: '700' },
  moreButtonInlineText: { fontSize: 11, color: '#4f46e5', fontWeight: '700', marginLeft: 4 }, 
  arrowText: { fontSize: 11, color: '#444', fontWeight: '700' },
  
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }, 
  optionChip: { 
    minHeight: 34, 
    paddingVertical: 6, 
    paddingHorizontal: 14, 
    backgroundColor: '#F8FAFC', 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    justifyContent: 'center', 
    marginRight: 8,
    marginBottom: 8
  },
  optionChipSelected: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  optionChipText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  optionChipTextSelected: { color: '#2563EB', fontWeight: '800' },
  
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
  resultTitle: { fontSize: 17, fontWeight: '800', color: '#111' },
  resultCount: { fontSize: 13, color: '#666', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
  cardImageWrap: { width: '100%', height: 160, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center' },
  cardImage: { width: '100%', height: '100%' },
  // ✨ cardTitle(카테고리 텍스트) 스타일 삭제 및 cardBody 패딩 조정
  cardBody: { padding: 12 }, 
  cardTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  cardTag: { fontSize: 11, color: '#4b5563', backgroundColor: '#f3f4f6', paddingHorizontal: 8, height: 24, lineHeight: 24, borderRadius: 6, fontWeight: '500', textAlign: 'center', overflow: 'hidden' },
  tpoTag: { backgroundColor: '#eef2ff', color: '#4f46e5' },
  
  loadingContainer: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  
  emptyStateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyStateTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginTop: 16, marginBottom: 8 },
  emptyStateDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  emptyStateBtn: { backgroundColor: '#111', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  emptyStateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalBox: { width: '100%', backgroundColor: '#fff', borderRadius: 20, padding: 18 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 14, textAlign: 'center', color: '#111' },
  modalButton: { backgroundColor: '#111', paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginBottom: 10 },
  modalButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteMenuButton: { backgroundColor: '#fff1f1', borderWidth: 1, borderColor: '#ffcccc' },
  deleteMenuText: { color: '#d11a2a', fontSize: 15, fontWeight: '700' },
  cancelButton: { paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#666', fontSize: 14, fontWeight: '600' },
  paginationWrap: { flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 6 },
  paginationDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ddd' },
  paginationDotActive: { backgroundColor: '#111', width: 20 },

  overloadBannerBox: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2', borderRadius: 16, padding: 14, marginBottom: 16 },
  overloadBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  overloadBannerTitle: { fontSize: 13, fontWeight: '800', color: '#dc2626' },
  overloadBannerText: { fontSize: 14, color: '#4b5563', lineHeight: 20, fontWeight: '600' },

  disposalBannerBox: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fef3c7', borderRadius: 16, padding: 14, marginBottom: 16 },
  disposalBannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  disposalBannerTitle: { fontSize: 13, fontWeight: '800', color: '#d97706' },
  disposalBannerText: { fontSize: 14, color: '#4b5563', lineHeight: 20, fontWeight: '600' },
});