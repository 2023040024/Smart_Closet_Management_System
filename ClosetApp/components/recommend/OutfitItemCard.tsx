import { router } from 'expo-router';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClothesItem } from '../../app/_closetStore';
import { TagChip } from './TagChip';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('file://')) return image;
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

export function OutfitItemCard({ label, item }: { label: string; item?: ClothesItem }) {
  if (!item) return (
    <View style={styles.itemCard}>
      <Text style={styles.imagePlaceholderText}>{label} 데이터 매칭 실패</Text>
    </View>
  );

  // 데이터 우회 처리 (recommend.tsx의 로직 통합)
  const category = (item as any).category || item.tags?.category || ''; 
  const fitText = category === '상의' ? item.tags?.topFit : 
                  category === '하의' ? item.tags?.bottomFit : '';

  // 상세 보기 페이지로 이동하는 핸들러 (id 전달)
  const handlePress = () => {
    router.push(`/detail?id=${item.id}`);
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <View style={styles.itemCard}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.itemBadge}>{label}</Text>
        </View>

        {item.image ? (
          <View style={styles.itemImageContainer}>
            <Image 
              source={{ uri: resolveImageUri(item.image) }} 
              style={styles.itemImage} 
              resizeMode="contain" 
            />
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
          </View>
        )}

        <Text style={styles.itemName}>{`${item.tags?.color || ''} ${category}`}</Text>

        <View style={styles.tagRow}>
          {item.tags?.style ? <TagChip text={item.tags.style} /> : null}
          {item.tags?.mood ? <TagChip text={item.tags.mood} /> : null}
          {fitText ? <TagChip text={fitText} /> : null}
          {item.tags?.tpo ? <TagChip text={item.tags.tpo} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
  itemHeaderRow: { flexDirection: 'row', marginBottom: 12 },
  itemBadge: { backgroundColor: '#F1F5F9', color: '#475569', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  
  itemImageContainer: { 
    width: '100%', 
    height: 280,
    backgroundColor: '#F8FAFC',
    borderRadius: 12, 
    marginBottom: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    overflow: 'hidden'
  },

  itemImage: { width: '100%', height: '100%' },

  imagePlaceholder: { 
    width: '100%', 
    height: 280, 
    borderRadius: 12, 
    backgroundColor: '#F8FAFC', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  
  imagePlaceholderText: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  itemName: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 12 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});