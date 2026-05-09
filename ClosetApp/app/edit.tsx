import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { ClothesTags, EMPTY_TAGS, TAG_OPTIONS, useCloset } from './_closetStore';

const API_BASE_URL = 'http://192.168.0.25:8000';

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
  const { updateClothes } = useCloset(); // 기존 로컬 스토어 (필요시 유지)

  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  
  const [imageUri, setImageUri] = useState<string>('');
  const [selected, setSelected] = useState<ClothesTags>(EMPTY_TAGS);
  const [price, setPrice] = useState<string>(''); // 구매가 상태 추가
  const [errorMessage, setErrorMessage] = useState('');

  // 백엔드 API에서 기존 데이터를 불러와서 폼에 채워넣기
  useEffect(() => {
    const fetchEditData = async () => {
      if (!id) {
        setErrorMessage('옷 ID가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/clothes`);
        let data = [];
        try {
          data = await response.json();
        } catch {
          data = [];
        }

        const foundItem =
          data.find((c: any) => String(c.clothes_id) === String(id)) ??
          data.find((c: any) => String(c.id) === String(id));

        if (!foundItem) {
          setErrorMessage('데이터가 없습니다.');
          setLoading(false);
          return;
        }

        // 받아온 데이터를 화면 상태(State)에 매핑
        setSelected({
          category: foundItem.category || '',
          topFit: foundItem.top_fit || foundItem.fit || '',
          bottomFit: foundItem.bottom_fit || foundItem.fit || '',
          color: foundItem.color || '',
          season: foundItem.season || '',
          tone: foundItem.tone || '',
          style: foundItem.style || '',
          mood: foundItem.mood || '',
          material: foundItem.material || '',
          thickness: foundItem.thickness || '',
          point: foundItem.point || '',
          tpo: foundItem.tpo || foundItem.situation || '',
        });

        // 구매가 매핑 (백엔드 변수명이 무엇이든 호환되도록 처리)
        const rawPrice = foundItem.price ?? foundItem.purchase_price;
        if (rawPrice != null && rawPrice !== '') {
          setPrice(String(rawPrice));
        }

        // 이미지 매핑
        setImageUri(resolveImageUri(foundItem.image_url ?? foundItem.image));

      } catch (error) {
        console.error('불러오기 실패:', error);
        setErrorMessage('데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchEditData();
  }, [id]);

  const fitOptions = useMemo(() => {
    if (selected.category === '상의') return [...TAG_OPTIONS.topFit];
    if (selected.category === '하의') return [...TAG_OPTIONS.bottomFit];
    return [];
  }, [selected.category]);

  const toggleTag = <K extends keyof ClothesTags>(key: K, value: ClothesTags[K]) => {
    setSelected((prev) => {
      const next = prev[key] === value ? '' : value;

      if (key === 'category') {
        return {
          ...prev,
          category: next as ClothesTags['category'],
          topFit: '',
          bottomFit: '',
        };
      }

      return { ...prev, [key]: next };
    });
  };

  const renderChips = <K extends keyof ClothesTags>(items: readonly string[], key: K) => (
    <View style={styles.chipWrap}>
      {items.map((itemLabel) => (
        <Chip
          key={`${String(key)}-${itemLabel}`}
          label={itemLabel}
          selected={selected[key] === itemLabel}
          onPress={() => toggleTag(key, itemLabel as ClothesTags[K])}
        />
      ))}
    </View>
  );

  const handleSave = async () => {
    if (!selected.category) {
      Alert.alert('입력 확인', '카테고리를 선택해주세요.');
      return;
    }

    if (selected.category === '상의' && !selected.topFit) {
      Alert.alert('입력 확인', '상의 핏을 선택해주세요.');
      return;
    }

    if (selected.category === '하의' && !selected.bottomFit) {
      Alert.alert('입력 확인', '하의 핏을 선택해주세요.');
      return;
    }

    try {
      setSaveLoading(true);

      // 백엔드에 업데이트할 데이터 구성 (수정할 데이터)
      const updateData = {
        category: selected.category,
        top_fit: selected.category === '상의' ? selected.topFit : '',
        bottom_fit: selected.category === '하의' ? selected.bottomFit : '',
        color: selected.color,
        season: selected.season,
        tone: selected.tone,
        style: selected.style,
        mood: selected.mood,
        material: selected.material,
        thickness: selected.thickness,
        point: selected.point,
        tpo: selected.tpo,
        price: price ? Number(price) : null, // 구매가 추가 전송
      };

      // 백엔드 수정 API 호출 (보통 수정은 PUT 또는 PATCH를 사용합니다)
      const response = await fetch(`${API_BASE_URL}/clothes/${id}`, {
        method: 'PUT', // 만약 백엔드가 PATCH를 쓴다면 PATCH로 변경
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('서버 수정 실패');
      }

      // 기존 로컬 스토어도 업데이트 (앱 내 에러 방지용)
      updateClothes(String(id), { tags: selected });

      Alert.alert('수정 완료', '옷 정보가 성공적으로 수정되었습니다.', [
        { text: '확인', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('수정 중 에러:', error);
      Alert.alert('수정 실패', '옷 정보를 수정하는 중 오류가 발생했습니다.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.emptyText}>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{errorMessage}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>옷 수정</Text>

      {imageUri ? (
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="contain" />
      ) : (
        <View style={[styles.image, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ color: '#9ca3af' }}>이미지 없음</Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>카테고리</Text>
      {renderChips(TAG_OPTIONS.category, 'category')}

      {fitOptions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {selected.category === '상의' ? '상의 핏' : '하의 핏'}
          </Text>
          {selected.category === '상의' && renderChips(TAG_OPTIONS.topFit, 'topFit')}
          {selected.category === '하의' && renderChips(TAG_OPTIONS.bottomFit, 'bottomFit')}
        </>
      )}

      <Text style={styles.sectionTitle}>색</Text>
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

      {/* 구매가 입력 폼 추가 */}
      <Text style={styles.sectionTitle}>구매가 수정</Text>
      <TextInput
        style={styles.priceInput}
        value={price}
        onChangeText={setPrice}
        placeholder="가격을 입력해주세요 (예: 50000)"
        keyboardType="numeric"
        placeholderTextColor="#9ca3af"
      />

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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  emptyText: { color: '#6b7280', fontSize: 15, marginTop: 12 },
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },
  image: { width: '100%', height: 220, borderRadius: 16, marginBottom: 20, backgroundColor: '#f3f4f6' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 10, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: { backgroundColor: '#111827' },
  chipText: { color: '#111827' },
  chipTextSelected: { color: '#fff' },
  // 구매가 입력 인풋 스타일 (register.tsx와 동일하게)
  priceInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9fafb',
    color: '#111827',
    marginBottom: 16,
  },
  button: {
    marginTop: 18,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});