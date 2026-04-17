import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { ClothesItem, TAG_OPTIONS, useCloset } from '../_closetStore';

type OutfitSet = {
  outer?: ClothesItem;
  top?: ClothesItem;
  bottom?: ClothesItem;
  shoes?: ClothesItem;
};

type RecommendFilterType = {
  category: string[];
  season: string[];
  style: string[];
  mood: string[];
  tpo: string[];
};

const FILTER_OPTIONS = {
  category: [...TAG_OPTIONS.category],
  season: [...TAG_OPTIONS.season],
  style: [...TAG_OPTIONS.style],
  mood: [...TAG_OPTIONS.mood],
  tpo: [...TAG_OPTIONS.tpo],
};

const FILTER_LABELS: Record<keyof RecommendFilterType, string> = {
  category: '카테고리',
  season: '계절',
  style: '스타일',
  mood: '분위기',
  tpo: 'TPO',
};

const INITIAL_FILTERS: RecommendFilterType = {
  category: [],
  season: [],
  style: [],
  mood: [],
  tpo: [],
};

const INITIAL_EXPANDED: Record<keyof RecommendFilterType, boolean> = {
  category: true,
  season: true,
  style: true,
  mood: false,
  tpo: true,
};

function includesAny(source?: string, targets?: string[]) {
  if (!targets || targets.length === 0) return true;
  if (!source || source.trim() === '') return false;
  return targets.includes(source);
}

function filterItems(items: ClothesItem[], filters: RecommendFilterType) {
  return items.filter((item) => {
    const categoryMatch =
      filters.category.length === 0 || filters.category.includes(item.tags.category);

    const seasonMatch =
      filters.season.length === 0 || includesAny(item.tags.season, filters.season);

    const styleMatch =
      filters.style.length === 0 || includesAny(item.tags.style, filters.style);

    const moodMatch =
      filters.mood.length === 0 || includesAny(item.tags.mood, filters.mood);

    const tpoMatch =
      filters.tpo.length === 0 || includesAny(item.tags.tpo, filters.tpo);

    return (
      categoryMatch &&
      seasonMatch &&
      styleMatch &&
      moodMatch &&
      tpoMatch
    );
  });
}

function createOutfits(items: ClothesItem[]): OutfitSet[] {
  const tops = items.filter((item) => item.tags.category === '상의');
  const bottoms = items.filter((item) => item.tags.category === '하의');
  const outers = items.filter((item) => item.tags.category === '아우터');
  const shoes = items.filter((item) => item.tags.category === '신발');

  const outfits: OutfitSet[] = [];
  const maxCount = Math.min(3, tops.length, bottoms.length);

  for (let i = 0; i < maxCount; i++) {
    outfits.push({
      outer: outers[i],
      top: tops[i],
      bottom: bottoms[i],
      shoes: shoes[i],
    });
  }

  return outfits;
}

function TagChip({ text }: { text: string }) {
  if (!text) return null;
  return <Text style={styles.tag}>{text}</Text>;
}

function getItemTitle(item: ClothesItem) {
  const color = item.tags.color || '무색상';
  const category = item.tags.category || '옷';
  return `${color} ${category}`;
}

function buildRecommendReason(filters: RecommendFilterType, outfit: OutfitSet) {
  const reasons: string[] = [];

  if (filters.season.length > 0) {
    reasons.push(`선택한 계절(${filters.season.join(', ')}) 조건을 반영했습니다`);
  }

  if (filters.style.length > 0) {
    reasons.push(`선택한 스타일(${filters.style.join(', ')})에 맞는 조합을 우선 고려했습니다`);
  }

  if (filters.mood.length > 0) {
    reasons.push(`선택한 분위기(${filters.mood.join(', ')})와 어울리는 아이템을 반영했습니다`);
  }

  if (filters.tpo.length > 0) {
    reasons.push(`TPO(${filters.tpo.join(', ')})에 맞는 코디를 기준으로 추천했습니다`);
  }

  if (outfit.outer) {
    reasons.push('아우터부터 보기 쉬운 순서로 정리했습니다');
  } else {
    reasons.push('현재 보유한 옷 기준으로 자연스러운 조합을 구성했습니다');
  }

  return reasons.join('. ') + '.';
}

function OutfitItemCard({
  label,
  item,
}: {
  label: string;
  item?: ClothesItem;
}) {
  if (!item) return null;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeaderRow}>
        <Text style={styles.itemBadge}>{label}</Text>
      </View>

      {item.image ? (
        <View style={styles.imageBox}>
          <Image
            source={{ uri: item.image }}
            style={styles.itemImage}
            resizeMode="contain"
          />
        </View>
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
        </View>
      )}

      <Text style={styles.itemName}>{getItemTitle(item)}</Text>

      <View style={styles.tagRow}>
        <TagChip text={item.tags.style} />
        <TagChip text={item.tags.mood} />
        <TagChip text={item.tags.tpo} />
      </View>
    </View>
  );
}

export default function RecommendScreen() {
  const { clothes } = useCloset();
  const { width } = useWindowDimensions();

  const [filters, setFilters] = useState<RecommendFilterType>(INITIAL_FILTERS);
  const [expanded, setExpanded] =
    useState<Record<keyof RecommendFilterType, boolean>>(INITIAL_EXPANDED);
  const [recommendedOutfits, setRecommendedOutfits] = useState<OutfitSet[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const toggleExpand = (key: keyof RecommendFilterType) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleFilter = (key: keyof RecommendFilterType, value: string) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);

      return {
        ...prev,
        [key]: exists
          ? prev[key].filter((item) => item !== value)
          : [...prev[key], value],
      };
    });
  };

  const selectedSummary = useMemo(() => {
    const allSelected = Object.values(filters).flat();
    return allSelected.length > 0 ? allSelected.join(', ') : '선택된 조건이 없습니다';
  }, [filters]);

  const handleRecommend = () => {
    const filteredItems = filterItems(clothes, filters);
    const outfits = createOutfits(filteredItems);

    setRecommendedOutfits(outfits);
    setHasSearched(true);
  };

  const resetFilters = () => {
    setFilters(INITIAL_FILTERS);
    setRecommendedOutfits([]);
    setHasSearched(false);
  };

  const pageWidth = width - 64;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>
      <Text style={styles.subtitle}>
        추천 조건을 직접 선택하고 코디를 추천받아보세요.
      </Text>

      <View style={styles.summaryBox}>
        <Text style={styles.summaryLabel}>현재 선택 조건</Text>
        <Text style={styles.summaryText}>{selectedSummary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 조건</Text>

        {(Object.keys(FILTER_OPTIONS) as Array<keyof RecommendFilterType>).map((key) => (
          <View key={key} style={styles.filterSection}>
            <Pressable
              style={styles.filterHeader}
              onPress={() => toggleExpand(key)}
            >
              <Text style={styles.filterTitle}>{FILTER_LABELS[key]}</Text>
              <Text style={styles.arrowText}>{expanded[key] ? '▲' : '▼'}</Text>
            </Pressable>

            {expanded[key] && (
              <View style={styles.filterChipWrap}>
                {FILTER_OPTIONS[key].map((option) => {
                  const isSelected = filters[key].includes(option);

                  return (
                    <Pressable
                      key={option}
                      style={[
                        styles.filterChip,
                        isSelected && styles.filterChipSelected,
                      ]}
                      onPress={() => toggleFilter(key, option)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          isSelected && styles.filterChipTextSelected,
                        ]}
                      >
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        ))}

        <View style={styles.actionRow}>
          <Pressable style={styles.resetButton} onPress={resetFilters}>
            <Text style={styles.resetButtonText}>초기화</Text>
          </Pressable>

          <Pressable style={styles.recommendButton} onPress={handleRecommend}>
            <Text style={styles.recommendButtonText}>추천 받기</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 결과</Text>

        {!hasSearched ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>아직 추천 결과가 없습니다</Text>
            <Text style={styles.emptyText}>
              추천 조건을 선택한 뒤 추천 받기를 눌러주세요.
            </Text>
          </View>
        ) : recommendedOutfits.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>추천 결과가 없습니다</Text>
            <Text style={styles.emptyText}>
              등록된 옷의 카테고리나 선택한 조건을 확인해주세요.
            </Text>
            <Text style={styles.emptyText}>
              최소 상의 1개와 하의 1개가 있어야 코디를 만들 수 있습니다.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.swipeHint}>
              좌우로 넘겨서 다른 추천 코디를 확인하세요.
            </Text>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              decelerationRate="fast"
              snapToInterval={pageWidth}
              snapToAlignment="start"
              contentContainerStyle={styles.outfitSliderContent}
            >
              {recommendedOutfits.map((outfit, index) => (
                <View
                  key={index}
                  style={[styles.outfitSlide, { width: pageWidth }]}
                >
                  <View style={styles.outfitCard}>
                    <Text style={styles.outfitTitle}>추천 코디 {index + 1}</Text>
                    <Text style={styles.outfitDescription}>
                      {buildRecommendReason(filters, outfit)}
                    </Text>

                    <OutfitItemCard label="아우터" item={outfit.outer} />
                    <OutfitItemCard label="상의" item={outfit.top} />
                    <OutfitItemCard label="하의" item={outfit.bottom} />
                    <OutfitItemCard label="신발" item={outfit.shoes} />
                  </View>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
    lineHeight: 22,
  },
  summaryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  summaryText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  arrowText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#EEF2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  filterChipSelected: {
    backgroundColor: '#111827',
  },
  filterChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
  },
  recommendButton: {
    flex: 1,
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  recommendButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  swipeHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '600',
  },
  outfitSliderContent: {
    paddingRight: 8,
  },
  outfitSlide: {
    marginRight: 12,
  },
  outfitCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  outfitTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  outfitDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 14,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  itemBadge: {
    backgroundColor: '#E8EEF9',
    color: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  imageBox: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  itemName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 4,
  },
});