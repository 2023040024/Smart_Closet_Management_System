import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import api from './_api';

// ... (타입 정의 및 헬퍼 함수는 기존과 동일하므로 생략 없이 그대로 유지해줘)
type ClothingItem = { id: string; name: string; category: string; color?: string; };
type ClothesApiItem = { clothes_id?: number; id?: number; name?: string; category?: string; color?: string; tags?: { category?: string; color?: string; [key: string]: any; }; };

const tpoOptions = ['데일리', '비즈니스', '면접', '결혼식', '장례식', '운동', '데이트', '모임', '여행'];
const fitOptions = ['잘맞음', '보통', '안맞음'];
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
  // ✅ 파라미터 받아오기 (수정 모드 판별용)
  const params = useLocalSearchParams<{
    editMode?: string;
    editId?: string;
    editDate?: string;
    editMemo?: string;
    editTpo?: string;
    editFit?: string;
    editTemperature?: string;
    editClothes?: string;
  }>();

  const isEditMode = params.editMode === 'true';
  const displayDate = isEditMode && params.editDate ? params.editDate : formatToday();

  const [clothesList, setClothesList] = useState<ClothingItem[]>([]);
  const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
  const [tpo, setTpo] = useState('');
  const [fit, setFit] = useState('');
  const [temperature, setTemperature] = useState('');
  const [memo, setMemo] = useState('');

  const [loadingClothes, setLoadingClothes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // ✅ 수정 모드일 때 넘어온 데이터로 폼 미리 채우기 (Prefill)
  useEffect(() => {
    if (isEditMode) {
      if (params.editMemo) setMemo(params.editMemo);
      if (params.editTpo) setTpo(params.editTpo);
      if (params.editFit) setFit(params.editFit);
      if (params.editTemperature) setTemperature(params.editTemperature);
      if (params.editClothes) {
        try {
          const parsedClothes: ClothingItem[] = JSON.parse(params.editClothes);
          setSelectedClothes(parsedClothes.map((cloth) => String(cloth.id)));
        } catch (e) {
          console.error('옷 데이터 파싱 에러:', e);
        }
      }
    }
  }, [isEditMode, params.editMemo, params.editTpo, params.editFit, params.editTemperature, params.editClothes]);

  useEffect(() => {
    const fetchClothes = async () => {
      // ... (이 부분은 기존 fetchClothes 로직과 100% 동일하게 유지)
      try {
        setLoadingClothes(true);
        const response = await api.get('/clothes');
        const data: ClothesApiItem[] = response.data;
        const mapped: ClothingItem[] = data.map((item, index) => {
          const rawId = item.clothes_id ?? item.id;
          if (rawId === undefined || rawId === null) return null;
          const rawCategory = item.category ?? item.tags?.category;
          const rawColor = item.color ?? item.tags?.color ?? '';
          return { id: String(rawId), name: item.name?.trim() || `옷 ${index + 1}`, category: normalizeCategory(rawCategory), color: rawColor };
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

  const toggleCloth = (id: string) => {
    setSelectedClothes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
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
      const payload = selectedClothes.map((clothesId) => ({
        clothes_id: Number(clothesId),
        worn_date: displayDate, // ✅ 수정 모드면 기존 날짜, 아니면 오늘 날짜
        tpo: tpo || null,
        style: null,
        mood: null,
        feedback_temperature: temperature || null,
        feedback_tpo: fit || null,
        memo: memo.trim() || null,
      }));

      // ✅ 생성/수정 분기 처리
      if (isEditMode) {
  // ✅ 1. 주소를 날짜 기반(/history/date/2026-05-17)으로 변경
  // ✅ 2. payload[0]이 아니라 통째로 배열(payload)을 보냄
        await api.put(`/history/date/${displayDate}`, payload); 
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
      Alert.alert('저장 실패', error.response?.data?.detail || '서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* ✅ 타이틀 동적 변경 */}
      <Stack.Screen options={{ title: isEditMode ? '착용 기록 수정' : '착용 기록 추가' }} />
      <SafeAreaView style={styles.container}>
        {loadingClothes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#111" />
            <Text style={styles.loadingText}>옷 목록 불러오는 중...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.title}>날짜</Text>
              <Text style={styles.value}>{displayDate}</Text>
            </View>

            {/* ... 나머지 JSX는 기존과 완벽하게 동일하므로 그대로 유지 ... */}
            <View style={styles.section}>
              <Text style={styles.title}>오늘 입은 옷</Text>
              {isUsingMockData && <Text style={styles.mockWarningText}>⚠️ 서버 연결 안됨 (더미 데이터 표시 중)</Text>}
              
              {groupedClothes.length > 0 ? (
                groupedClothes.map((group) => (
                  <View key={group.title} style={styles.categoryBlock}>
                    <Text style={styles.subTitle}>{group.title}</Text>
                    <View style={styles.clothRow}>
                      {group.items.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[styles.clothBox, selectedClothes.includes(item.id) && styles.clothBoxSelected]}
                          onPress={() => toggleCloth(item.id)}
                        >
                          <Text style={[styles.clothName, selectedClothes.includes(item.id) && styles.clothNameSelected]}>{item.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))
              ) : (
                !isUsingMockData && <Text style={styles.emptyText}>선택할 수 있는 옷이 없습니다.</Text>
              )}
            </View>

            <View style={styles.section}><Text style={styles.title}>TPO</Text>{renderChips(tpoOptions, tpo, setTpo)}</View>
            <View style={styles.section}><Text style={styles.title}>핏</Text>{renderChips(fitOptions, fit, setFit)}</View>
            <View style={styles.section}><Text style={styles.title}>체감온도</Text>{renderChips(temperatureOptions, temperature, setTemperature)}</View>
            <View style={styles.section}>
              <Text style={styles.title}>메모</Text>
              <TextInput style={styles.input} placeholder="오늘 착장에 대한 메모를 입력하세요" value={memo} onChangeText={setMemo} multiline />
            </View>

            <Pressable style={[styles.saveButton, (saving || isUsingMockData) && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || isUsingMockData}>
              {/* ✅ 버튼 텍스트 동적 변경 */}
              <Text style={styles.saveText}>{saving ? '저장 중...' : (isEditMode ? '수정 완료' : '저장하기')}</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

// ... styles 부분은 기존과 완벽하게 동일하게 유지
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  categoryBlock: { marginTop: 12 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  subTitle: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  value: { fontSize: 15, color: '#111' },
  clothRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clothBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f1f1' },
  clothBoxSelected: { backgroundColor: '#111' },
  clothName: { color: '#333', fontSize: 13 },
  clothNameSelected: { color: '#fff', fontWeight: '600' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f1f1f1' },
  chipSelected: { backgroundColor: '#111' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  saveButton: { marginTop: 10, backgroundColor: '#111', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#777' },
  mockWarningText: { fontSize: 13, color: '#c0392b', marginBottom: 8, lineHeight: 18 },
  emptyText: { fontSize: 14, color: '#888', marginTop: 4 },
});