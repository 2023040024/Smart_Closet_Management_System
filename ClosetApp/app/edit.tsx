import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from './_api';
import { ClothesTags, EMPTY_TAGS, TAG_OPTIONS, useCloset } from './_closetStore';

const API_BASE_URL = 'http://192.168.0.25:8000';

function resolveImageUri(image?: string | null) {
  if (!image) return '';
  if (image.startsWith('http') || image.startsWith('file://')) return image;
  return image.startsWith('/') ? `${API_BASE_URL}${image}` : `${API_BASE_URL}/${image}`;
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function EditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { updateClothes, fetchClothes } = useCloset(); 

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  const [imageUri, setImageUri] = useState<string>('');
  const [name, setName] = useState<string>(''); 
  const [selected, setSelected] = useState<ClothesTags>(EMPTY_TAGS);
  const [price, setPrice] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchEditData = async () => {
      if (!id) {
        setErrorMessage('옷 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get('/clothes');
        const data = Array.isArray(response.data) ? response.data : [];

        const foundItem =
          data.find((c: any) => String(c.id) === String(id)) ??
          data.find((c: any) => String(c.clothes_id) === String(id));

        if (!foundItem) {
          setErrorMessage('데이터가 없습니다.');
          setLoading(false);
          return;
        }

        // ⭐ 핵심 수정: 계층화된 tags 객체에서 데이터를 먼저 찾도록 수정
        const s = foundItem.tags || {};

        setName(foundItem.name || '');
        setSelected({
          category: s.category || foundItem.category || '',
          topFit: s.top_fit || s.topFit || foundItem.top_fit || foundItem.fit || '',
          bottomFit: s.bottom_fit || s.bottomFit || foundItem.bottom_fit || foundItem.fit || '',
          color: s.color || foundItem.color || '',
          season: s.season || foundItem.season || '',
          tone: s.tone || foundItem.tone || '',
          style: s.style || foundItem.style || '',
          mood: s.mood || foundItem.mood || '',
          material: s.material || foundItem.material || '',
          thickness: s.thickness || foundItem.thickness || '',
          point: s.point || foundItem.point || '',
          tpo: s.situation || s.tpo || foundItem.situation || foundItem.tpo || '', 
        });

        const rawPrice = foundItem.price ?? foundItem.purchase_price;
        setPrice(rawPrice != null ? String(rawPrice) : '');
        
        // 이미지 필드명 변경 대응 (image 우선)
        setImageUri(resolveImageUri(foundItem.image ?? foundItem.image_url));

      } catch (error: any) {
        setErrorMessage('데이터 로드 실패');
      } finally {
        setLoading(false);
      }
    };

    fetchEditData();
  }, [id]);

  const toggleTag = <K extends keyof ClothesTags>(key: K, value: ClothesTags[K]) => {
    setSelected((prev) => {
      const next = prev[key] === value ? '' : value;
      if (key === 'category') {
        return { ...prev, category: next as ClothesTags['category'], topFit: '', bottomFit: '' };
      }
      return { ...prev, [key]: next };
    });
  };

  const renderChips = <K extends keyof ClothesTags>(items: readonly string[], key: K) => (
    <View style={styles.chipWrap}>
      {items.map((label) => (
        <Chip
          key={`${String(key)}-${label}`}
          label={label}
          selected={selected[key] === label}
          onPress={() => toggleTag(key, label as ClothesTags[K])}
        />
      ))}
    </View>
  );

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('입력 확인', '옷 이름을 입력해주세요.');
      return;
    }

    try {
      setSaveLoading(true);

      const updateData = {
        name: name.trim(),
        category: selected.category,
        top_fit: selected.category === '상의' ? (selected.topFit || null) : null,
        bottom_fit: selected.category === '하의' ? (selected.bottomFit || null) : null,
        color: selected.color || null,
        season: selected.season || null,
        tone: selected.tone || null,
        style: selected.style || null,
        mood: selected.mood || null,
        material: selected.material || null,
        thickness: selected.thickness || null,
        point: selected.point || null,
        situation: selected.tpo || null, 
        price: price ? Math.floor(Number(price)) : 0,
        status: null, 
      };

      await api.put(`/clothes/${id}`, updateData);
      await fetchClothes(); 
      updateClothes(String(id), { name, tags: selected });

      Alert.alert('수정 완료', '성공적으로 수정되었습니다.', [
        { text: '확인', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert('수정 실패', '데이터 형식을 확인해주세요.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) return <View style={styles.emptyContainer}><ActivityIndicator size="large" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>옷 수정</Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, styles.center]}><Text style={{ color: '#9ca3af' }}>이미지 없음</Text></View>
      )}

      <Text style={styles.sectionTitle}>옷 이름</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="옷 이름" />

      <Text style={styles.sectionTitle}>카테고리</Text>
      {renderChips(TAG_OPTIONS.category, 'category')}

      {selected.category === '상의' && (
        <>
          <Text style={styles.sectionTitle}>상의 핏</Text>
          {renderChips(TAG_OPTIONS.topFit, 'topFit')}
        </>
      )}

      {selected.category === '하의' && (
        <>
          <Text style={styles.sectionTitle}>하의 핏</Text>
          {renderChips(TAG_OPTIONS.bottomFit, 'bottomFit')}
        </>
      )}

      <Text style={styles.sectionTitle}>색상</Text>
      {renderChips(TAG_OPTIONS.color, 'color')}

      <Text style={styles.sectionTitle}>계절</Text>
      {renderChips(TAG_OPTIONS.season, 'season')}

      <Text style={styles.sectionTitle}>톤</Text>
      {renderChips(TAG_OPTIONS.tone, 'tone')}

      <Text style={styles.sectionTitle}>스타일</Text>
      {renderChips(TAG_OPTIONS.style, 'style')}

      <Text style={styles.sectionTitle}>분위기</Text>
      {renderChips(TAG_OPTIONS.mood, 'mood')}

      <Text style={styles.sectionTitle}>소재</Text>
      {renderChips(TAG_OPTIONS.material, 'material')}

      <Text style={styles.sectionTitle}>두께</Text>
      {renderChips(TAG_OPTIONS.thickness, 'thickness')}

      <Text style={styles.sectionTitle}>포인트</Text>
      {renderChips(TAG_OPTIONS.point, 'point')}

      <Text style={styles.sectionTitle}>TPO</Text>
      {renderChips(TAG_OPTIONS.tpo, 'tpo')}

      <Text style={styles.sectionTitle}>구매가 수정</Text>
      <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="가격" />

      <TouchableOpacity 
        style={[styles.button, saveLoading && styles.disabledButton]} 
        onPress={handleSave}
        disabled={saveLoading}
      >
        <Text style={styles.buttonText}>{saveLoading ? '저장 중...' : '수정 완료'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  // 스타일은 이전과 동일
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  center: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },
  image: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20, backgroundColor: '#f3f4f6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 14, marginBottom: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#f3f4f6', marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: '#111827' },
  chipText: { color: '#111827', fontSize: 13 },
  chipTextSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#f9fafb', color: '#111827', marginBottom: 16 },
  button: { marginTop: 18, backgroundColor: '#111827', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});