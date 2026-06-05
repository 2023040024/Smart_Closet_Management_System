import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '../_api';
import { ClothesTags, EMPTY_TAGS, TAG_OPTIONS, useCloset } from '../_closetStore';

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
      activeOpacity={0.7}
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
  return lastPart && lastPart.includes('.') ? lastPart : `clothes_${Date.now()}.jpg`;
}

function getClothesName(selected: ClothesTags) {
  const parts: string[] = [];
  if (selected.color) parts.push(selected.color);
  if (selected.category === '상의' && selected.topFit) parts.push(selected.topFit);
  if (selected.category === '하의' && selected.bottomFit) parts.push(selected.bottomFit);
  if (selected.category) parts.push(selected.category);
  return parts.length === 0 ? '이름없는 옷' : parts.join(' ');
}

function stringifyErrorDetail(responseData: any, status: number) {
  if (typeof responseData?.detail === 'string') return responseData.detail;
  if (Array.isArray(responseData?.detail)) {
    return responseData.detail.map((item: any) => item?.msg || JSON.stringify(item)).join('\n');
  }
  return responseData?.message || `등록 실패 (${status})`;
}

export default function RegisterScreen() {
  const { fetchClothes } = useCloset(); 
  const [image, setImage] = useState<string | null>(null);
  const [selected, setSelected] = useState<ClothesTags>(EMPTY_TAGS);
  const [price, setPrice] = useState<string>('');
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
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const toggleTag = <K extends keyof ClothesTags>(key: K, value: ClothesTags[K]) => {
    setSelected((prev) => {
      const next = prev[key] === value ? '' : value;
      if (key === 'category') {
        return { ...prev, category: next as ClothesTags['category'], topFit: '', bottomFit: '' };
      }
      return { ...prev, [key]: next };
    });
  };

  const saveClothesToApi = async () => {
    if (!image) throw new Error('이미지가 없습니다.');

    const formData = new FormData();
    const generatedName = getClothesName(selected);

    formData.append('name', generatedName);
    formData.append('category', selected.category || '');
    formData.append('top_fit', selected.category === '상의' ? (selected.topFit || '') : '');
    formData.append('bottom_fit', selected.category === '하의' ? (selected.bottomFit || '') : '');
    formData.append('color', selected.color || '');
    formData.append('season', selected.season || '');
    formData.append('tone', selected.tone || '');
    formData.append('style', selected.style || '');
    formData.append('mood', selected.mood || '');
    formData.append('material', selected.material || '');
    formData.append('thickness', selected.thickness || '');
    formData.append('point', selected.point || '');
    formData.append('situation', selected.tpo || ''); 
    formData.append('price', price || '0');

    formData.append('image', {
      uri: image,
      name: getImageFileName(image),
      type: getImageMimeType(image),
    } as any);

    const response = await api.post('/clothes', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  };

  const handleSave = async () => {
    if (!image) { Alert.alert('입력 확인', '이미지를 먼저 선택해주세요.'); return; }
    if (!selected.category) { Alert.alert('입력 확인', '카테고리를 선택해주세요.'); return; }
    if (selected.category === '상의' && !selected.topFit) { Alert.alert('입력 확인', '상의 핏을 선택해주세요.'); return; }
    if (selected.category === '하의' && !selected.bottomFit) { Alert.alert('입력 확인', '하의 핏을 선택해주세요.'); return; }
    if (!selected.color) { Alert.alert('입력 확인', '색을 선택해주세요.'); return; }
    if (!selected.season) { Alert.alert('입력 확인', '계절을 선택해주세요.'); return; }
    if (!selected.style) { Alert.alert('입력 확인', '스타일을 선택해주세요.'); return; }

    try {
      setLoading(true);
      await saveClothesToApi();
      await fetchClothes();

      Alert.alert('등록 완료', '옷이 서버에 등록되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            setImage(null);
            setSelected(EMPTY_TAGS);
            setPrice('');
            router.replace('/(tabs)');
          },
        },
      ]);
    } catch (error: any) {
      let errorMessage = '옷 등록 중 오류가 발생했습니다.';
      if (error.response && error.response.data) {
        errorMessage = stringifyErrorDetail(error.response.data, error.response.status);
      }
      Alert.alert('등록 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderChips = <K extends keyof ClothesTags>(items: readonly string[], key: K) => (
    <View style={styles.chipRowWrapper}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScrollContent}>
        {items.map((item) => (
          <Chip
            key={`${String(key)}-${item}`}
            label={item}
            selected={selected[key] === item}
            onPress={() => toggleTag(key, item as ClothesTags[K])}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={[styles.title, { marginBottom: 0 }]}>옷 등록</Text>
      </View>

      <TouchableOpacity style={styles.imageBox} onPress={pickImage} activeOpacity={0.8}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.placeholderWrap}>
            <Ionicons name="camera-outline" size={32} color="#94A3B8" />
            <Text style={styles.imagePlaceholder}>사진을 선택해 주세요</Text>
          </View>
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
      
      <Text style={styles.sectionTitle}>구매가</Text>
      <TextInput 
        style={styles.priceInput} 
        value={price} 
        onChangeText={setPrice} 
        placeholder="가격을 입력해주세요 (선택)" 
        keyboardType="numeric" 
        placeholderTextColor="#9ca3af" 
      />
      
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading} activeOpacity={0.8}>
        <Text style={styles.saveButtonText}>{loading ? '등록 중...' : '옷장에 등록하기'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { 
    padding: 20, 
    paddingBottom: 40, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 16 : 16 
  },
  
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827' }, 
  
  imageBox: { 
    height: 160, 
    borderRadius: 16, 
    backgroundColor: '#F8FAFC', 
    justifyContent: 'center', 
    alignItems: 'center', 
    overflow: 'hidden', 
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed'
  },
  placeholderWrap: { alignItems: 'center', gap: 8 },
  image: { width: '100%', height: '100%', backgroundColor: '#F8FAFC' },
  imagePlaceholder: { color: '#64748B', fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#475569', marginTop: 16, marginBottom: 10, marginLeft: 2 },
  
  chipRowWrapper: { marginBottom: 6 },
  chipScrollContent: { paddingRight: 20 },
  chip: { 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 20, 
    backgroundColor: '#F8FAFC', 
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  chipSelected: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  chipText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: '#2563EB', fontWeight: '800' },
  
  priceInput: { 
    borderWidth: 1, 
    borderColor: '#E2E8F0', 
    borderRadius: 12, 
    padding: 14, 
    fontSize: 15, 
    backgroundColor: '#F8FAFC', 
    color: '#111827', 
    marginBottom: 24,
    marginTop: 8
  },
  saveButton: { 
    marginTop: 8, 
    paddingVertical: 16, 
    borderRadius: 12, 
    backgroundColor: '#2563EB', // 라이트 테마 블루 포인트 색상 적용
    alignItems: 'center' 
  },
  saveButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
});