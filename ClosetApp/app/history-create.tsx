import { Ionicons } from '@expo/vector-icons';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import api from './_api';

type ClothingItem = { id: string; name: string; category: string; color?: string; imageUrl?: string; };
type ClothesApiItem = { clothes_id?: number; id?: number; name?: string; category?: string; color?: string; image_url?: string; tags?: { category?: string; color?: string; [key: string]: any; }; };

const tpoOptions = ['데일리', '비즈니스', '면접', '결혼식', '장례식', '운동', '데이트', '모임', '여행'];
const tpoSuitabilityOptions = ['잘 어울림', '보통', '안 어울림']; 
const temperatureOptions = ['추움', '적당함', '더움']; 

function formatToday() { return new Date().toISOString().slice(0, 10); }

function normalizeCategory(category?: string) {
  const value = (category || '').trim().toLowerCase();
  if (value === '상의' || value === 'top' || value === 'tops' || value === 'shirt') return '상의';
  if (value === '하의' || value === 'bottom' || value === 'bottoms' || value === 'pants') return '하의';
  if (value === '아우터' || value === 'outer' || value === 'outerwear' || value === 'jacket') return '아우터';
  if (value === '신발' || value === 'shoe' || value === 'shoes' || value === 'sneakers') return '신발';
  if (value === '악세사리' || value === '악세서리' || value === '액세서리' || value === 'accessory' || value === 'accessories') return '악세사리';
  return '기타';
}

export default function HistoryCreateScreen() {
  const params = useLocalSearchParams<{
    editMode?: string;
    editId?: string;
    editDate?: string;
    editMemo?: string;
    editTpo?: string;
    editTpoSuitability?: string; 
    editTemperature?: string;
    editClothes?: string;
  }>();

  const isEditMode = params.editMode === 'true';
  
  // 서버 전송용 원본 날짜 (YYYY-MM-DD)
  const rawDate = isEditMode && params.editDate ? params.editDate : formatToday();
  
  // 화면 표시용 예쁜 날짜 (YYYY. MM. DD (요일))
  let uiDate = rawDate;
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
    const dateObj = new Date(rawDate);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    uiDate = `${rawDate.replace(/-/g, '. ')} (${days[dateObj.getDay()]})`;
  }

  const [clothesList, setClothesList] = useState<ClothingItem[]>([]);
  const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
  const [tpo, setTpo] = useState('');
  const [tpoSuitability, setTpoSuitability] = useState(''); 
  const [temperature, setTemperature] = useState('');
  const [memo, setMemo] = useState('');

  const [loadingClothes, setLoadingClothes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      if (params.editMemo) setMemo(params.editMemo);
      if (params.editTpo) setTpo(params.editTpo);
      if (params.editTpoSuitability) setTpoSuitability(params.editTpoSuitability); 
      
      if (params.editTemperature) {
        setTemperature(params.editTemperature === '적당' ? '적당함' : params.editTemperature);
      }
      
      if (params.editClothes) {
        try {
          const parsedClothes: ClothingItem[] = JSON.parse(params.editClothes);
          setSelectedClothes(parsedClothes.map((cloth) => String(cloth.id)));
        } catch (e) {
          console.error('옷 데이터 파싱 에러:', e);
        }
      }
    }
  }, [isEditMode, params.editMemo, params.editTpo, params.editTpoSuitability, params.editTemperature, params.editClothes]);

  useEffect(() => {
    const fetchClothes = async () => {
      try {
        setLoadingClothes(true);
        const response = await api.get('/clothes');
        const data: ClothesApiItem[] = response.data;
        const mapped: ClothingItem[] = data.map((item, index) => {
          const rawId = item.clothes_id ?? item.id;
          if (rawId === undefined || rawId === null) return null;
          const rawCategory = item.category ?? item.tags?.category;
          const rawColor = item.color ?? item.tags?.color ?? '';
          
          const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
          const rawImageUrl = item.image_url;
          const fullImageUrl = rawImageUrl 
            ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${API_BASE_URL}${rawImageUrl}`)
            : undefined;

          return { 
            id: String(rawId), 
            name: item.name?.trim() || `옷 ${index + 1}`, 
            category: normalizeCategory(rawCategory), 
            color: rawColor,
            imageUrl: fullImageUrl 
          };
        }).filter(Boolean) as ClothingItem[];

        if (mapped.length === 0) {
          setIsUsingMockData(true);
          setClothesList([
            { id: '1', name: '블랙 셔츠', category: '상의' },
            { id: '2', name: '베이지 슬랙스', category: '하의' },
          ]);
        } else {
          setIsUsingMockData(false);
          setClothesList(mapped);
        }
      } catch (error: any) {
        console.error('옷 목록 불러오기 실패:', error);
        setIsUsingMockData(true);
        if (error.response?.status === 401) {
          Alert.alert('인증 오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
        }
      } finally {
        setLoadingClothes(false);
      }
    };
    fetchClothes();
  }, []);

  const groupedClothes = useMemo(() => {
    const groups = [
      { title: '아우터', items: clothesList.filter((item) => item.category === '아우터') },
      { title: '상의', items: clothesList.filter((item) => item.category === '상의') },
      { title: '하의', items: clothesList.filter((item) => item.category === '하의') },
      { title: '신발', items: clothesList.filter((item) => item.category === '신발') },
      { title: '악세사리', items: clothesList.filter((item) => item.category === '악세사리') },
      { title: '기타', items: clothesList.filter((item) => item.category === '기타') },
    ];
    return groups.filter((g) => g.items.length > 0);
  }, [clothesList]);

  const toggleCloth = (id: string, category: string) => {
    setSelectedClothes((prev) => {
      // 1. 이미 선택된 옷을 다시 누르면 선택 해제
      if (prev.includes(id)) {
        return prev.filter((itemId) => itemId !== id);
      }
      
      // 2. 새로운 옷을 선택한 경우, 같은 카테고리의 다른 옷이 이미 선택되어 있다면 제거
      const filteredPrev = prev.filter((prevId) => {
        const prevCloth = clothesList.find((c) => c.id === prevId);
        return prevCloth?.category !== category;
      });
      
      // 3. 같은 카테고리의 기존 옷이 지워진 상태에서 새 옷 추가
      return [...filteredPrev, id];
    });
  };

  const renderChips = (options: string[], selected: string, setValue: (value: string) => void) => (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable
          key={option}
          style={[styles.chip, selected === option && styles.chipSelected]}
          onPress={() => setValue(option)}
        >
          <Text style={[styles.chipText, selected === option && styles.chipTextSelected]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );

  const handleSave = async () => {
    if (isUsingMockData) {
      Alert.alert('안내', '현재는 더미 데이터 상태라 저장이 불가능합니다. 다시 로그인해주세요.');
      return;
    }
    if (selectedClothes.length === 0) {
      Alert.alert('안내', '옷을 선택해주세요.');
      return;
    }

    try {
      setSaving(true);

      const payload = selectedClothes.map((clothesId) => {
        const numericId = Number(clothesId);
        if (isNaN(numericId)) {
          throw new Error(`유효하지 않은 옷 ID가 포함되어 있습니다: ${clothesId}`);
        }

        return {
          clothes_id: numericId,
          worn_date: rawDate, 
          tpo: tpo && tpo.trim() !== "" ? tpo.trim() : null,
          style: null,
          mood: null,
          feedback_temperature: temperature && temperature.trim() !== "" ? temperature.trim() : null,
          feedback_tpo: tpoSuitability && tpoSuitability.trim() !== "" ? tpoSuitability.trim() : null,
          memo: memo && memo.trim() !== "" ? memo.trim() : null,
        };
      });

      if (isEditMode) {
        await api.put(`/history`, payload); 
        Alert.alert('수정 완료', '착용 기록이 수정되었습니다.', [
          { text: '확인', onPress: () => router.replace('/(tabs)/history') },
        ]);
      } else {
        await api.post('/history', payload);
        Alert.alert('저장 완료', '착용 기록이 저장되었습니다.', [
          { text: '확인', onPress: () => router.replace('/(tabs)/history') },
        ]);
      }
    } catch (error: any) {
      console.error('착용 기록 저장 실패:', error);
      if (error.response && error.response.data) {
        Alert.alert('저장 실패 (422)', JSON.stringify(error.response.data.detail));
      } else {
        Alert.alert('저장 실패', error.message || '서버 오류가 발생했습니다.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: isEditMode ? '착용 기록 수정' : '착용 기록 추가' }} />
      <SafeAreaView style={styles.container}>
        {loadingClothes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.loadingText}>옷 목록 불러오는 중...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* ✨ 날짜 섹션: 달력 아이콘과 전용 박스로 강조 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>날짜</Text>
              <View style={styles.dateBox}>
                <Ionicons name="calendar-clear-outline" size={24} color="#4F46E5" />
                <Text style={styles.dateText}>{uiDate}</Text>
              </View>
            </View>

            {/* ✨ 입은 옷 섹션: 이미지 썸네일 카드로 개편 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>오늘 입은 옷</Text>
              {isUsingMockData && <Text style={styles.mockWarningText}>⚠️ 서버 연결 안됨 (더미 데이터 표시 중)</Text>}
              
              {groupedClothes.length > 0 ? (
                groupedClothes.map((group) => (
                  <View key={group.title} style={styles.categoryBlock}>
                    <Text style={styles.subTitle}>{group.title}</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.clothRowScroll}>
                      {group.items.map((item) => {
                        const isSelected = selectedClothes.includes(item.id);
                        return (
                          <Pressable
                            key={item.id}
                            style={styles.clothCard}
                            onPress={() => toggleCloth(item.id, item.category)}
                          >
                            <View style={[styles.imageContainer, isSelected && styles.imageContainerSelected]}>
                              <Image 
                                source={{ uri: item.imageUrl || 'https://via.placeholder.com/100?text=No+Img' }} 
                                style={styles.clothImage} 
                                resizeMode="contain" 
                              />
                              {/* 선택 시 나타나는 보라색 반투명 오버레이와 체크 표시 */}
                              {isSelected && (
                                <View style={styles.checkOverlay}>
                                  <Ionicons name="checkmark-circle" size={28} color="#fff" />
                                </View>
                              )}
                            </View>
                            <Text style={[styles.clothName, isSelected && styles.clothNameSelected]} numberOfLines={1}>
                              {item.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ))
              ) : (
                !isUsingMockData && <Text style={styles.emptyText}>선택할 수 있는 옷이 없습니다.</Text>
              )}
            </View>

            {/* ✨ 폼 섹션: 넓고 깔끔한 디자인 */}
            <View style={styles.section}><Text style={styles.sectionTitle}>TPO (상황)</Text>{renderChips(tpoOptions, tpo, setTpo)}</View>
            <View style={styles.section}><Text style={styles.sectionTitle}>TPO 적합도</Text>{renderChips(tpoSuitabilityOptions, tpoSuitability, setTpoSuitability)}</View>
            <View style={styles.section}><Text style={styles.sectionTitle}>체감온도</Text>{renderChips(temperatureOptions, temperature, setTemperature)}</View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>메모</Text>
              <TextInput 
                style={styles.input} 
                placeholder="오늘 착장에 대한 메모를 편하게 남겨주세요." 
                placeholderTextColor="#94A3B8"
                value={memo} 
                onChangeText={setMemo} 
                multiline 
              />
            </View>

            <Pressable style={[styles.saveButton, (saving || isUsingMockData) && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || isUsingMockData}>
              <Text style={styles.saveText}>{saving ? '저장 중...' : (isEditMode ? '수정 완료' : '저장하기')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 60 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 14 },
  
  // ✨ 날짜 강조 영역
  dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  
  categoryBlock: { marginBottom: 20 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12 },
  
  // ✨ 옷 이미지 썸네일 카드 영역
  clothRowScroll: { flexDirection: 'row', gap: 12, paddingBottom: 4, paddingRight: 16 },
  clothCard: { width: 90, alignItems: 'center' },
  imageContainer: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#F1F5F9', marginBottom: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  imageContainerSelected: { borderColor: '#4F46E5' }, // 선택 시 보라색 테두리
  clothImage: { width: '90%', height: '90%' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(79, 70, 229, 0.5)', justifyContent: 'center', alignItems: 'center' },
  clothName: { fontSize: 13, color: '#475569', textAlign: 'center', fontWeight: '500' },
  clothNameSelected: { color: '#4F46E5', fontWeight: '700' },
  
  // ✨ 태그(칩) 선택 영역
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  chipSelected: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  chipText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },
  
  // ✨ 메모 입력 영역
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 15, color: '#334155', lineHeight: 22 },
  
  saveButton: { marginTop: 10, backgroundColor: '#111', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  mockWarningText: { fontSize: 13, color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
});