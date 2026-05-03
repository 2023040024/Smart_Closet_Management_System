import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const API_BASE_URL = 'http://192.168.1.122:8000';

type DetailApiItem = {
  clothes_id?: number;
  id?: number;
  name?: string;
  category?: string;
  color?: string;
  season?: string;
  tone?: string | null;
  style?: string;
  mood?: string | null;
  material?: string | null;
  thickness?: string | null;
  point?: string | null;
  tpo?: string | null;
  situation?: string | null;
  fit?: string | null;
  top_fit?: string | null;
  bottom_fit?: string | null;
  image?: string | null;
  image_url?: string | null;
  status?: string | null;
  wear_count?: number | null;
  last_worn_date?: string | null;
  purchase_price?: number | null;
  created_at?: string | null;
};

function resolveImageUri(image?: string | null) {
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

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [item, setItem] = useState<DetailApiItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) {
        setErrorMessage('옷 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage('');

        const response = await fetch(`${API_BASE_URL}/clothes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let data: DetailApiItem[] = [];

        try {
          data = await response.json();
        } catch {
          data = [];
        }

        if (!response.ok) {
          throw new Error(`상세 조회 실패 (${response.status})`);
        }

        const foundItem =
          data.find((clothesItem) => String(clothesItem.clothes_id) === String(id)) ??
          data.find((clothesItem) => String(clothesItem.id) === String(id)) ??
          null;

        if (!foundItem) {
          setErrorMessage('데이터가 없습니다.');
          setItem(null);
          return;
        }

        setItem(foundItem);
      } catch (error) {
        console.error('옷 상세 불러오기 실패:', error);
        setErrorMessage(
          error instanceof Error ? error.message : '상세 정보를 불러오지 못했습니다.'
        );
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

 const visibleTags = useMemo(() => {
  if (!item) return [];

  const fitValue = item.fit ?? item.top_fit ?? item.bottom_fit ?? '';
  const tpoValue = item.tpo ?? item.situation ?? '';

  return [
    { label: '이름', value: item.name },
    { label: '카테고리', value: item.category },
    { label: '색상', value: item.color },
    { label: '계절', value: item.season },
    { label: '톤', value: item.tone },
    { label: '스타일', value: item.style },
    { label: '분위기', value: item.mood },
    { label: '핏', value: fitValue },
    { label: '소재', value: item.material },
    { label: '두께', value: item.thickness },
    { label: '포인트', value: item.point },
    { label: 'TPO', value: tpoValue },
    { label: '마지막 착용일', value: item.last_worn_date },
  ].filter(
    (tag) =>
      tag.value !== undefined &&
      tag.value !== null &&
      String(tag.value).trim() !== ''
  );
}, [item]);

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.emptyText}>상세 정보를 불러오는 중...</Text>
      </View>
    );
  }

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{errorMessage || '데이터가 없습니다.'}</Text>
      </View>
    );
  }

  const imageUri = resolveImageUri(item.image_url ?? item.image);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.image} 
          resizeMode="contain"
          />
      ) : (
        <View style={styles.imageFallback}>
          <Text style={styles.imageFallbackText}>이미지가 없습니다.</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>선택된 태그</Text>

      {visibleTags.length === 0 ? (
        <Text style={styles.emptyTagText}>표시할 태그가 없습니다.</Text>
      ) : (
        <View style={styles.tagList}>
          {visibleTags.map((tag) => (
            <View key={`${tag.label}-${tag.value}`} style={styles.tagRow}>
              <Text style={styles.tagLabel}>{tag.label}</Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{String(tag.value)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push({ pathname: '/edit', params: { id: String(id) } })}
      >
        <Text style={styles.buttonText}>수정하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
  },
  imageFallback: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackText: {
    color: '#6b7280',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyTagText: {
    color: '#6b7280',
    marginBottom: 20,
  },
  tagList: {
    marginBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagLabel: {
    width: 88,
    fontSize: 14,
    color: '#6b7280',
  },
  tagPill: {
    flexShrink: 1,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});