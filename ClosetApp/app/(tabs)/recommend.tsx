import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';

import { ClothesItem, useCloset } from '../_closetStore';

type RecommendParams = {
  category?: string;
  color?: string;
  season?: string;
  tone?: string;
  style?: string;
  mood?: string;
  topFit?: string;
  bottomFit?: string;
  material?: string;
  thickness?: string;
  point?: string;
  tpo?: string;
};

export default function RecommendScreen() {
  const { clothes } = useCloset();
  const params = useLocalSearchParams<RecommendParams>();

  const recommended = useMemo(() => {
    return clothes.filter((item: ClothesItem) => {
      const tags = item.tags;

      return (
        (!params.category || tags.category === params.category) &&
        (!params.color || tags.color === params.color) &&
        (!params.season || tags.season === params.season) &&
        (!params.tone || tags.tone === params.tone) &&
        (!params.style || tags.style === params.style) &&
        (!params.mood || tags.mood === params.mood) &&
        (!params.topFit || tags.topFit === params.topFit) &&
        (!params.bottomFit || tags.bottomFit === params.bottomFit) &&
        (!params.material || tags.material === params.material) &&
        (!params.thickness || tags.thickness === params.thickness) &&
        (!params.point || tags.point === params.point) &&
        (!params.tpo || tags.tpo === params.tpo)
      );
    });
  }, [clothes, params]);

  const selectedFilters = [
    ['카테고리', params.category],
    ['색', params.color],
    ['계절', params.season],
    ['톤', params.tone],
    ['스타일', params.style],
    ['분위기', params.mood],
    ['상의 핏', params.topFit],
    ['하의 핏', params.bottomFit],
    ['소재', params.material],
    ['두께', params.thickness],
    ['포인트', params.point],
    ['TPO', params.tpo],
  ].filter(([, value]) => !!value);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>코디 추천</Text>

      <View style={styles.filterSummary}>
        {selectedFilters.length === 0 ? (
          <Text style={styles.summaryText}>
            선택된 조건이 없습니다. 전체 목록 기준으로 보여줍니다.
          </Text>
        ) : (
          selectedFilters.map(([label, value]) => (
            <View key={`${label}-${value}`} style={styles.summaryChip}>
              <Text style={styles.summaryChipText}>
                {label}: {value}
              </Text>
            </View>
          ))
        )}
      </View>

      <FlatList
        data={recommended}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={recommended.length > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={recommended.length === 0 ? styles.emptyWrap : styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.imageWrap}>
              <Image
                source={{ uri: item.image }}
                style={styles.image}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.cardTitle}>{item.tags.category || '미분류'}</Text>
            <Text style={styles.cardMeta}>
              {[item.tags.color, item.tags.style, item.tags.tpo].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>추천 결과가 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  summaryText: {
    color: '#6b7280',
  },
  summaryChip: {
    backgroundColor: '#f3f4f6',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginRight: 8,
    marginBottom: 8,
  },
  summaryChipText: {
    color: '#111827',
    fontSize: 13,
  },
  listContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    margin: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  imageWrap: {
    width: '100%',
    height: 240,
    backgroundColor: '#f7f7f7',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  image: {
    width: '92%',
    height: '92%',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  cardMeta: {
    color: '#4b5563',
    paddingHorizontal: 10,
    paddingBottom: 12,
    paddingTop: 4,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#6b7280',
  },
});