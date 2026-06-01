import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
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
    editMode?: string; editId?: string; editDate?: string; editMemo?: string;
    editTpo?: string; editTpoSuitability?: string; editTemperature?: string;
    editClothesIds?: string; editClothes?: string; editHistoryIds?: string; 
  }>();

  const isEditMode = params.editMode === 'true';
  const initialDate = (isEditMode && params.editDate) ? new Date(params.editDate) : new Date();
  
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (date) setSelectedDate(date);
  };

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const yyyy = selectedDate.getFullYear();
  const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const dd = String(selectedDate.getDate()).padStart(2, '0');
  const uiDate = `${yyyy}. ${mm}. ${dd} (${days[selectedDate.getDay()]})`;

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
      if (params.editTemperature) setTemperature(params.editTemperature === '적당' ? '적당함' : params.editTemperature);
      
      // ✨ 파라미터 호환성을 완벽하게 처리하여 무조건 체크 표시가 복구되도록 수정
      try {
        let idsToSelect: string[] = [];
        if (params.editClothesIds) {
          const parsedIds = JSON.parse(params.editClothesIds);
          idsToSelect = parsedIds.map(String);
        } else if (params.editClothes) {
          const parsedClothes = JSON.parse(params.editClothes);
          idsToSelect = parsedClothes.map((cloth: any) => String(cloth.id));
        }
        if (idsToSelect.length > 0) {
          setSelectedClothes(idsToSelect);
        }
      } catch (e) {
        console.error('옷 선택 복구 에러:', e);
      }
    }
  }, [isEditMode, params.editMemo, params.editTpo, params.editTpoSuitability, params.editTemperature, params.editClothesIds, params.editClothes]);

  useEffect(() => {
    const fetchClothes = async () => {
      try {
        setLoadingClothes(true);
        const response = await api.get('/clothes');
        const data: ClothesApiItem[] = response.data;
        const mapped: ClothingItem[] = data.map((item, index) => {
          const rawId = item.clothes_id ?? item.id;
          if (rawId === undefined || rawId === null) return null;
          const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";
          const rawImageUrl = item.image_url;
          return { 
            id: String(rawId), name: item.name?.trim() || `옷 ${index + 1}`, 
            category: normalizeCategory(item.category ?? item.tags?.category), color: item.color ?? item.tags?.color ?? '',
            imageUrl: rawImageUrl ? (rawImageUrl.startsWith('http') ? rawImageUrl : `${API_BASE_URL}${rawImageUrl}`) : undefined 
          };
        }).filter(Boolean) as ClothingItem[];

        if (mapped.length === 0) {
          setIsUsingMockData(true);
          setClothesList([{ id: '1', name: '블랙 셔츠', category: '상의' }, { id: '2', name: '베이지 슬랙스', category: '하의' }]);
        } else {
          setIsUsingMockData(false);
          setClothesList(mapped);
        }
      } catch (error: any) {
        setIsUsingMockData(true);
        if (error.response?.status === 401) Alert.alert('인증 오류', '세션이 만료되었습니다. 다시 로그인해주세요.');
      } finally { setLoadingClothes(false); }
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
      if (prev.includes(id)) return prev.filter((itemId) => itemId !== id);
      const filteredPrev = prev.filter((prevId) => clothesList.find((c) => c.id === prevId)?.category !== category);
      return [...filteredPrev, id];
    });
  };

  const renderChips = (options: string[], selected: string, setValue: (value: string) => void) => (
    <View style={styles.chipRow}>
      {options.map((option) => (
        <Pressable key={option} style={[styles.chip, selected === option && styles.chipSelected]} onPress={() => setValue(option)}>
          <Text style={[styles.chipText, selected === option && styles.chipTextSelected]}>{option}</Text>
        </Pressable>
      ))}
    </View>
  );

  const handleSave = async () => {
    if (isUsingMockData) { Alert.alert('안내', '더미 데이터 상태입니다. 다시 로그인해주세요.'); return; }
    if (selectedClothes.length === 0) { Alert.alert('안내', '옷을 선택해주세요.'); return; }

    try {
      setSaving(true);
      const submitDate = `${yyyy}-${mm}-${dd}`;
      const payload = selectedClothes.map((clothesId) => ({
        clothes_id: Number(clothesId), worn_date: submitDate, 
        tpo: tpo && tpo.trim() !== "" ? tpo.trim() : null, style: null, mood: null,
        feedback_temperature: temperature && temperature.trim() !== "" ? temperature.trim() : null,
        feedback_tpo: tpoSuitability && tpoSuitability.trim() !== "" ? tpoSuitability.trim() : null,
        memo: memo && memo.trim() !== "" ? memo.trim() : null,
      }));

      if (isEditMode) {
        const originalDate = params.editDate;
        if (originalDate && submitDate !== originalDate) {
          await api.post('/history', payload);
          if (params.editHistoryIds) {
            const oldIds = JSON.parse(params.editHistoryIds);
            for (const id of oldIds) await api.delete(`/history/${Number(id)}`);
          }
        } else {
          await api.put(`/history`, payload); 
        }
        Alert.alert('수정 완료', '착용 기록이 수정되었습니다.', [{ text: '확인', onPress: () => router.replace('/(tabs)/history') }]);
      } else {
        await api.post('/history', payload);
        Alert.alert('저장 완료', '착용 기록이 저장되었습니다.', [{ text: '확인', onPress: () => router.replace('/(tabs)/history') }]);
      }
    } catch (error: any) {
      Alert.alert('저장 실패', error.response?.data?.detail || error.message || '서버 오류가 발생했습니다.');
    } finally { setSaving(false); }
  };

  return (
    <>
      <Stack.Screen options={{ title: isEditMode ? '착용 기록 수정' : '착용 기록 추가' }} />
      <SafeAreaView style={styles.container}>
        {loadingClothes ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#111" /><Text style={styles.loadingText}>옷 목록 불러오는 중...</Text></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>날짜</Text>
              <Pressable style={styles.dateBox} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-clear-outline" size={24} color="#4F46E5" />
                <Text style={styles.dateText}>{uiDate}</Text>
              </Pressable>
            </View>

            {showDatePicker && <DateTimePicker value={selectedDate} mode="date" display="default" onChange={handleDateChange} />}
            {showDatePicker && Platform.OS === 'ios' && <Pressable style={styles.iosDatePickerDone} onPress={() => setShowDatePicker(false)}><Text style={styles.iosDatePickerDoneText}>날짜 선택 완료</Text></Pressable>}

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
                          <Pressable key={item.id} style={styles.clothCard} onPress={() => toggleCloth(item.id, item.category)}>
                            <View style={[styles.imageContainer, isSelected && styles.imageContainerSelected]}>
                              <Image source={{ uri: item.imageUrl || 'https://via.placeholder.com/100?text=No+Img' }} style={styles.clothImage} resizeMode="contain" />
                              {isSelected && <View style={styles.checkOverlay}><Ionicons name="checkmark-circle" size={28} color="#fff" /></View>}
                            </View>
                            <Text style={[styles.clothName, isSelected && styles.clothNameSelected]} numberOfLines={1}>{item.name}</Text>
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

            <View style={styles.section}><Text style={styles.sectionTitle}>TPO (상황)</Text>{renderChips(tpoOptions, tpo, setTpo)}</View>
            <View style={styles.section}><Text style={styles.sectionTitle}>TPO 적합도</Text>{renderChips(tpoSuitabilityOptions, tpoSuitability, setTpoSuitability)}</View>
            <View style={styles.section}><Text style={styles.sectionTitle}>체감온도</Text>{renderChips(temperatureOptions, temperature, setTemperature)}</View>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>메모</Text>
              <TextInput style={styles.input} placeholder="오늘 착장에 대한 메모를 편하게 남겨주세요." placeholderTextColor="#94A3B8" value={memo} onChangeText={setMemo} multiline />
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
  dateBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  dateText: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  iosDatePickerDone: { alignItems: 'center', backgroundColor: '#E2E8F0', padding: 12, borderRadius: 8, marginBottom: 20 },
  iosDatePickerDoneText: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  categoryBlock: { marginBottom: 20 },
  subTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', marginBottom: 12 },
  clothRowScroll: { flexDirection: 'row', gap: 12, paddingBottom: 4, paddingRight: 16 },
  clothCard: { width: 90, alignItems: 'center' },
  imageContainer: { width: 90, height: 90, borderRadius: 12, backgroundColor: '#F1F5F9', marginBottom: 8, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  imageContainerSelected: { borderColor: '#4F46E5' }, 
  clothImage: { width: '90%', height: '90%' },
  checkOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(79, 70, 229, 0.5)', justifyContent: 'center', alignItems: 'center' },
  clothName: { fontSize: 13, color: '#475569', textAlign: 'center', fontWeight: '500' },
  clothNameSelected: { color: '#4F46E5', fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  chipSelected: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  chipText: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  chipTextSelected: { color: '#FFFFFF' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 16, minHeight: 120, textAlignVertical: 'top', fontSize: 15, color: '#334155', lineHeight: 22 },
  saveButton: { marginTop: 10, backgroundColor: '#111', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 3 },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
  mockWarningText: { fontSize: 13, color: '#EF4444', marginBottom: 12, fontWeight: '600' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 4 },
});