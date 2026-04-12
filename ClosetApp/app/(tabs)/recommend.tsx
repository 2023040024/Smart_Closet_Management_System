import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function normalizeParam(value: string | string[] | undefined): string {
  if (!value) return '선택되지 않음';
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    return filtered.length > 0 ? filtered.join(', ') : '선택되지 않음';
  }
  return value.trim() ? value : '선택되지 않음';
}

type OutfitItem = {
  label: string;
  name: string;
  tags: string[];
};

type OutfitCardData = {
  title: string;
  description: string;
  items: OutfitItem[];
};

const mockOutfits: OutfitCardData[] = [
  {
    title: '추천 코디 1',
    description: '상황에 어울리는 기본 코디 조합입니다.',
    items: [
      { label: '상의', name: '화이트 셔츠', tags: ['미니멀', '차분한'] },
      { label: '하의', name: '블랙 슬랙스', tags: ['포멀', '세련된'] },
      { label: '아우터', name: '베이지 자켓', tags: ['세미캐주얼'] },
      { label: '신발', name: '화이트 스니커즈', tags: ['데일리'] },
      { label: '악세사리', name: '실버 시계', tags: ['깔끔한'] },
    ],
  },
  {
    title: '추천 코디 2',
    description: '조금 더 편안한 분위기의 코디 조합입니다.',
    items: [
      { label: '상의', name: '네이비 니트', tags: ['캐주얼', '차분한'] },
      { label: '하의', name: '아이보리 팬츠', tags: ['미니멀'] },
      { label: '아우터', name: '그레이 코트', tags: ['고급스러운'] },
      { label: '신발', name: '로퍼', tags: ['세련된'] },
      { label: '악세사리', name: '블랙 백', tags: ['심플'] },
    ],
  },
];

function TagChip({ text }: { text: string }) {
  return <Text style={styles.tag}>{text}</Text>;
}

function OutfitItemCard({ item }: { item: OutfitItem }) {
  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemLabel}>{item.label}</Text>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.imagePlaceholderText}>이미지 예정</Text>
      </View>
      <Text style={styles.itemName}>{item.name}</Text>

      <View style={styles.tagRow}>
        {item.tags.map((tag, index) => (
          <TagChip key={`${item.label}-${tag}-${index}`} text={tag} />
        ))}
      </View>
    </View>
  );
}

export default function RecommendScreen() {
  const params = useLocalSearchParams();

  const season = normalizeParam(params.season as string | string[] | undefined);
  const tpo = normalizeParam(params.tpo as string | string[] | undefined);
  const style = normalizeParam(params.style as string | string[] | undefined);
  const mood = normalizeParam(params.mood as string | string[] | undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>
      <Text style={styles.subtitle}>
        상황에 맞는 코디를 추천해드릴게요.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 조건</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>계절</Text>
          <Text style={styles.valueText}>{season}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>TPO</Text>
          <Text style={styles.valueText}>{tpo}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>스타일</Text>
          <Text style={styles.valueText}>{style}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>분위기</Text>
          <Text style={styles.valueText}>{mood}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 결과</Text>

        {mockOutfits.map((outfit, index) => (
          <View key={index} style={styles.outfitCard}>
            <Text style={styles.outfitTitle}>{outfit.title}</Text>
            <Text style={styles.outfitDescription}>{outfit.description}</Text>

            {outfit.items.map((item, itemIndex) => (
              <OutfitItemCard
                key={`${outfit.title}-${item.label}-${itemIndex}`}
                item={item}
              />
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  inputBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  outfitCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  outfitTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  imagePlaceholderText: {
    fontSize: 13,
    color: '#6B7280',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
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
    fontWeight: '600',
  },
});