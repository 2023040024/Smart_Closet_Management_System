import { useLocalSearchParams } from 'expo-router';
import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ClothesItem, useCloset } from '../_closetStore';

type OutfitSet = {
  top?: ClothesItem;
  bottom?: ClothesItem;
  outer?: ClothesItem;
  shoes?: ClothesItem;
  accessory?: ClothesItem;
};

function normalizeParam(value: string | string[] | undefined): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((v) => v.split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function displayText(values: string[]) {
  return values.length > 0 ? values.join(', ') : '선택되지 않음';
}

function includesAny(source?: string, targets?: string[]) {
  if (!targets || targets.length === 0) return true;
  if (!source || source.trim() === '') return false;
  return targets.includes(source);
}

function filterItems(
  items: ClothesItem[],
  categoryFilters: string[],
  seasonFilters: string[],
  tpoFilters: string[],
  styleFilters: string[],
  moodFilters: string[]
) {
  return items.filter((item) => {
    const categoryMatch =
      categoryFilters.length === 0 || categoryFilters.includes(item.tags.category);

    const seasonMatch =
      seasonFilters.length === 0 || includesAny(item.tags.season, seasonFilters);

    const tpoMatch =
      tpoFilters.length === 0 || includesAny(item.tags.tpo, tpoFilters);

    const styleMatch =
      styleFilters.length === 0 || includesAny(item.tags.style, styleFilters);

    const moodMatch =
      moodFilters.length === 0 || includesAny(item.tags.mood, moodFilters);

    return categoryMatch && seasonMatch && tpoMatch && styleMatch && moodMatch;
  });
}

function createOutfits(items: ClothesItem[]): OutfitSet[] {
  const tops = items.filter((item) => item.tags.category === '상의');
  const bottoms = items.filter((item) => item.tags.category === '하의');
  const outers = items.filter((item) => item.tags.category === '아우터');
  const shoes = items.filter((item) => item.tags.category === '신발');
  const accessories = items.filter((item) => item.tags.category === '악세사리');

  const outfits: OutfitSet[] = [];
  const maxCount = Math.min(3, tops.length, bottoms.length);

  for (let i = 0; i < maxCount; i++) {
    outfits.push({
      top: tops[i],
      bottom: bottoms[i],
      outer: outers[i],
      shoes: shoes[i],
      accessory: accessories[i],
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

function getFitText(item: ClothesItem) {
  if (item.tags.category === '상의') return item.tags.topFit;
  if (item.tags.category === '하의') return item.tags.bottomFit;
  return '';
}

function OutfitItemCard({
  label,
  item,
}: {
  label: string;
  item?: ClothesItem;
}) {
  if (!item) return null;

  const fitText = getFitText(item);

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeaderRow}>
        <Text style={styles.itemBadge}>{label}</Text>
      </View>

      {item.image ? (
        <Image source={{ uri: item.image }} style={styles.itemImage} />
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
        <TagChip text={fitText} />
      </View>
    </View>
  );
}

export default function RecommendScreen() {
  const params = useLocalSearchParams();
  const { clothes } = useCloset();

  const categoryFilters = useMemo(
    () => normalizeParam(params.category as string | string[] | undefined),
    [params.category]
  );

  const seasonFilters = useMemo(
    () => normalizeParam(params.season as string | string[] | undefined),
    [params.season]
  );

  const tpoFilters = useMemo(
    () => normalizeParam(params.tpo as string | string[] | undefined),
    [params.tpo]
  );

  const styleFilters = useMemo(
    () => normalizeParam(params.style as string | string[] | undefined),
    [params.style]
  );

  const moodFilters = useMemo(
    () => normalizeParam(params.mood as string | string[] | undefined),
    [params.mood]
  );

  const filteredItems = useMemo(() => {
    return filterItems(
      clothes,
      categoryFilters,
      seasonFilters,
      tpoFilters,
      styleFilters,
      moodFilters
    );
  }, [clothes, categoryFilters, seasonFilters, tpoFilters, styleFilters, moodFilters]);

  const outfitResults = useMemo(() => {
    return createOutfits(filteredItems);
  }, [filteredItems]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>
      <Text style={styles.subtitle}>
        상황에 맞는 코디를 추천해드릴게요.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 조건</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>카테고리</Text>
          <Text style={styles.valueText}>{displayText(categoryFilters)}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>계절</Text>
          <Text style={styles.valueText}>{displayText(seasonFilters)}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>TPO</Text>
          <Text style={styles.valueText}>{displayText(tpoFilters)}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>스타일</Text>
          <Text style={styles.valueText}>{displayText(styleFilters)}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>분위기</Text>
          <Text style={styles.valueText}>{displayText(moodFilters)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 결과</Text>

        {outfitResults.length === 0 ? (
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
          outfitResults.map((outfit, index) => (
            <View key={index} style={styles.outfitCard}>
              <Text style={styles.outfitTitle}>추천 코디 {index + 1}</Text>
              <Text style={styles.outfitDescription}>
                선택한 조건을 반영한 코디 조합입니다.
              </Text>

              <OutfitItemCard label="상의" item={outfit.top} />
              <OutfitItemCard label="하의" item={outfit.bottom} />
              <OutfitItemCard label="아우터" item={outfit.outer} />
              <OutfitItemCard label="신발" item={outfit.shoes} />
              <OutfitItemCard label="악세사리" item={outfit.accessory} />
            </View>
          ))
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
  inputBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  valueText: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 22,
    fontWeight: '600',
  },
  outfitCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
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
  itemImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
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