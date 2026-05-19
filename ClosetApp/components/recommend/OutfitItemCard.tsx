import { Image, StyleSheet, Text, View } from 'react-native';
import { ClothesItem } from '../../app/_closetStore';
import { TagChip } from './TagChip';

const API_BASE_URL = 'http://192.168.1.122:8000';

function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('file://')) return image;
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

export function OutfitItemCard({ label, item }: { label: string; item?: ClothesItem }) {
  // 💡 데이터가 없으면 '데이터 없음'이라는 표시라도 해서 디버깅을 도와줍니다.
  if (!item) return (
    <View style={styles.itemCard}>
      <Text style={styles.imagePlaceholderText}>{label} 데이터 매칭 실패</Text>
    </View>
  );

  const fitText = item.tags.category === '상의' ? item.tags.topFit : 
                  item.tags.category === '하의' ? item.tags.bottomFit : '';

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeaderRow}>
        <Text style={styles.itemBadge}>{label}</Text>
      </View>

      {item.image ? (
        <Image source={{ uri: resolveImageUri(item.image) }} style={styles.itemImage} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>이미지 없음</Text>
        </View>
      )}

      <Text style={styles.itemName}>{`${item.tags.color || ''} ${item.tags.category}`}</Text>

      <View style={styles.tagRow}>
        {/* ✅ 조건부 렌더링 적용: 데이터가 있을 때만 TagChip을 그립니다. */}
        {item.tags.style ? <TagChip text={item.tags.style} /> : null}
        {item.tags.mood ? <TagChip text={item.tags.mood} /> : null}
        {fitText ? <TagChip text={fitText} /> : null}
        
        {/* ✅ 누락되었던 TPO(상황) 태그 추가 */}
        {item.tags.tpo ? <TagChip text={item.tags.tpo} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  itemCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  itemHeaderRow: { flexDirection: 'row', marginBottom: 10 },
  itemBadge: { backgroundColor: '#E8EEF9', color: '#2563EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  itemImage: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#E5E7EB', marginBottom: 12, resizeMode: 'cover' },
  imagePlaceholder: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  imagePlaceholderText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  itemName: { fontSize: 17, fontWeight: '800', color: '#111827', marginBottom: 10 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});