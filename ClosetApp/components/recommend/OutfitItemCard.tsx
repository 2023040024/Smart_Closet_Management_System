import { router } from 'expo-router'; // 라우터 추가
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClothesItem } from '../../app/_closetStore';
import { TagChip } from './TagChip';

const API_BASE_URL = 'http://192.168.0.25:8000';

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
    // ✨ Commit 3: 상세 보기 연결 (TouchableOpacity 추가)
    <TouchableOpacity activeOpacity={0.7} onPress={handlePress}>
      <View style={styles.itemCard}>
        <View style={styles.itemHeaderRow}>
          <Text style={styles.itemBadge}>{label}</Text>
        </View>

        {item.image ? (
          <View style={styles.itemImageContainer}>
            {/* ✨ Commit 1: 이미지 비율 조정 (contain 유지) */}
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
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  itemHeaderRow: { flexDirection: 'row', marginBottom: 10 },
  itemBadge: { backgroundColor: '#E8EEF9', color: '#2563EB', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  // ✨ Commit 1: 카드 리팩토링 (회색 배경 컨테이너 추가로 이미지와 카드 분리)
  itemImageContainer: { width: '100%', height: 200, backgroundColor: '#F3F4F6', borderRadius: 12, marginBottom: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  itemImage: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: 200, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  imagePlaceholderText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  itemName: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});