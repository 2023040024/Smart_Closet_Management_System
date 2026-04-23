import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { ClothesTags, EMPTY_TAGS, TAG_OPTIONS } from '../_closetStore';

const API_BASE_URL = 'http://10.181.197.59:8000';

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
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function getImageMimeType(uri: string) {
  const lowerUri = uri.toLowerCase();

  if (lowerUri.endsWith('.png')) return 'image/png';
  if (lowerUri.endsWith('.heic')) return 'image/heic';
  if (lowerUri.endsWith('.webp')) return 'image/webp';

  return 'image/jpeg';
}

function getImageFileName(uri: string) {
  const parts = uri.split('/');
  const lastPart = parts[parts.length - 1];

  if (lastPart && lastPart.includes('.')) {
    return lastPart;
  }

  return `clothes_${Date.now()}.jpg`;
}

function getClothesName(selected: ClothesTags) {
  const parts: string[] = [];

  if (selected.color) parts.push(selected.color);

  if (selected.category === '상의' && selected.topFit) {
    parts.push(selected.topFit);
  }

  if (selected.category === '하의' && selected.bottomFit) {
    parts.push(selected.bottomFit);
  }

  if (selected.category) parts.push(selected.category);

  if (parts.length === 0) {
    return '이름없는 옷';
  }

  return parts.join(' ');
}

function getFitValue(selected: ClothesTags) {
  if (selected.category === '상의') return selected.topFit;
  if (selected.category === '하의') return selected.bottomFit;
  return '';
}

function stringifyErrorDetail(responseData: any, status: number) {
  if (typeof responseData?.detail === 'string') {
    return responseData.detail;
  }

  if (Array.isArray(responseData?.detail)) {
    return responseData.detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item?.msg) return item.msg;
        return JSON.stringify(item);
      })
      .join('\n');
  }

  if (responseData?.detail && typeof responseData.detail === 'object') {
    return JSON.stringify(responseData.detail);
  }

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  return `등록 실패 (${status})`;
}

export default function RegisterScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClothesTags>(EMPTY_TAGS);
  const [loading, setLoading] = useState(false);

  const fitLabel = useMemo(() => {
    if (selected.category === '상의') return '상의 핏';
    if (selected.category === '하의') return '하의 핏';
    return '핏';
  }, [selected.category]);

  const fitOptions = useMemo(() => {
    if (selected.category === '상의') return [...TAG_OPTIONS.topFit];
    if (selected.category === '하의') return [...TAG_OPTIONS.bottomFit];
    return [];
  }, [selected.category]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 1,
      allowsEditing: false,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

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

  const saveClothesToApi = async () => {
    if (!image) {
      throw new Error('이미지가 없습니다.');
    }

    const formData = new FormData();

    const generatedName = getClothesName(selected);
    const fitValue = getFitValue(selected);

    formData.append('name', generatedName);
    formData.append('category', selected.category || '');
    formData.append('color', selected.color || '');
    formData.append('season', selected.season || '');
    formData.append('style', selected.style || '');

    if (selected.material) {
      formData.append('material', selected.material);
    }

    if (selected.thickness) {
      formData.append('thickness', selected.thickness);
    }

    if (fitValue) {
      formData.append('fit', fitValue);
    }

    formData.append('image', {
      uri: image,
      name: getImageFileName(image),
      type: getImageMimeType(image),
    } as any);

    const response = await fetch(`${API_BASE_URL}/clothes`, {
      method: 'POST',
      body: formData,
    });

    let responseData: any = null;

    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    console.log('clothes register response:', responseData);

    if (!response.ok) {
      throw new Error(stringifyErrorDetail(responseData, response.status));
    }

    return responseData;
  };

  const handleSave = async () => {
    if (!image) {
      Alert.alert('입력 확인', '이미지를 먼저 선택해주세요.');
      return;
    }

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

    if (!selected.color) {
      Alert.alert('입력 확인', '색을 선택해주세요.');
      return;
    }

    if (!selected.season) {
      Alert.alert('입력 확인', '계절을 선택해주세요.');
      return;
    }

    if (!selected.style) {
      Alert.alert('입력 확인', '스타일을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);

      await saveClothesToApi();

      Alert.alert('등록 완료', '옷이 서버에 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            setImage(null);
            setSelected(EMPTY_TAGS);
            router.replace('/(tabs)');
          },
        },
      ]);
    } catch (error) {
      console.error('옷 등록 실패:', error);

      Alert.alert(
        '등록 실패',
        error instanceof Error ? error.message : '옷 등록 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderChips = <K extends keyof ClothesTags>(items: readonly string[], key: K) => (
    <View style={styles.chipWrap}>
      {items.map((item) => (
        <Chip
          key={`${String(key)}-${item}`}
          label={item}
          selected={selected[key] === item}
          onPress={() => toggleTag(key, item as ClothesTags[K])}
        />
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>옷 등록</Text>

      <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        ) : (
          <Text style={styles.imagePlaceholder}>+ 사진 추가</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>카테고리</Text>
      {renderChips(TAG_OPTIONS.category, 'category')}

      {fitOptions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>{fitLabel}</Text>
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

      <TouchableOpacity style={styles.resetButton} onPress={() => setSelected(EMPTY_TAGS)}>
        <Text style={styles.resetButtonText}>태그 초기화</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, loading && styles.disabledButton]}
        onPress={handleSave}
        disabled={loading}
      >
        <Text style={styles.saveButtonText}>{loading ? '등록 중...' : '등록하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 16 },
  imageBox: {
    height: 220,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  imagePlaceholder: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
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
  resetButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  resetButtonText: { color: '#111827', fontWeight: '600' },
  saveButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#111827',
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});