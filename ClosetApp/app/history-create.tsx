import { Stack, router } from 'expo-router';
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

// ✅ 1. 인터셉터 가져오기 (파일 위치가 app 폴더 안이라면 ./_api)
import api from './_api';

type ClothingItem = {
  id: string;
  name: string;
  category: string;
  color?: string;
};

type ClothesApiItem = {
  clothes_id?: number;
  id?: number;
  name?: string;
  category?: string;
  color?: string;
};

const tpoOptions = [
  '데일리', '비즈니스', '면접', '결혼식', '장례식', '운동', '데이트', '모임', '여행',
];

const fitOptions = ['잘맞음', '보통', '안맞음'];
const temperatureOptions = ['추움', '적당함', '더움'];

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

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
  const today = formatToday();

  const [clothesList, setClothesList] = useState<ClothingItem[]>([]);
  const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
  const [tpo, setTpo] = useState('');
  const [fit, setFit] = useState('');
  const [temperature, setTemperature] = useState('');
  const [memo, setMemo] = useState('');

  const [loadingClothes, setLoadingClothes] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isUsingMockData, setIsUsingMockData] = useState(false);

  // ✅ 옷 목록 불러오기 (인터셉터 적용)
  useEffect(() => {
    const fetchClothes = async () => {
      try {
        setLoadingClothes(true);
        // api.get을 사용하면 자동으로 헤더에 토큰이 들어갑니다.
        const response = await api.get('/clothes');
        const data: ClothesApiItem[] = response.data;

        const mapped: ClothingItem[] = data
          .map((item, index) => {
            const rawId = item.clothes_id ?? item.id;
            if (rawId === undefined || rawId === null) return null;

            return {
              id: String(rawId),
              name: item.name?.trim() || `옷 ${index + 1}`,
              category: normalizeCategory(item.category),
              color: item.color ?? '',
            };
          })
          .filter(Boolean) as ClothingItem[];

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
        
        // 401 에러 시 더미 데이터로 전환하며 안내
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

  const groupedClothes = useMemo(() => ({
    상의: clothesList.filter((item) => item.category === '상의'),
    하의: clothesList.filter((item) => item.category === '하의'),
    아우터: clothesList.filter((item) => item.category === '아우터'),
    신발: clothesList.filter((item) => item.category === '신발'),
    악세사리: clothesList.filter((item) => item.category === '악세사리'),
    기타: clothesList.filter((item) => item.category === '기타'),
  }), [clothesList]);

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
          <Text style={[styles.chipText, selected === option && styles.chipTextSelected]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  // ✅ 기록 저장 (인터셉터 적용)
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
        worn_date: today,
        tpo: tpo || null,
        style: null,
        mood: null,
        feedback_temperature: temperature || null,
        feedback_tpo: fit || null,
        memo: memo.trim() || null,
      }));

      // ✅ fetch 대신 api.post 사용
      await api.post('/history', payload);

      Alert.alert('저장 완료', '착용 기록이 저장되었습니다.', [
        { text: '확인', onPress: () => router.replace('/(tabs)/history') },
      ]);
    } catch (error: any) {
      console.error('착용 기록 저장 실패:', error);
      Alert.alert('저장 실패', error.response?.data?.detail || '서버 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '착용 기록 추가' }} />
      <SafeAreaView style={styles.container}>
        {loadingClothes ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>옷 목록 불러오는 중...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.title}>날짜</Text>
              <Text style={styles.value}>{today}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.title}>오늘 입은 옷</Text>
              {isUsingMockData && (
                <Text style={styles.mockWarningText}>⚠️ 서버 연결 안됨 (더미 데이터 표시 중)</Text>
              )}
              {Object.entries(groupedClothes).map(([category, items]) => (
                items.length > 0 && (
                  <View key={category} style={styles.categoryBlock}>
                    <Text style={styles.subTitle}>{category}</Text>
                    <View style={styles.clothRow}>
                      {items.map((item) => (
                        <Pressable
                          key={item.id}
                          style={[styles.clothBox, selectedClothes.includes(item.id) && styles.clothBoxSelected]}
                          onPress={() => toggleCloth(item.id)}
                        >
                          <Text style={[styles.clothName, selectedClothes.includes(item.id) && styles.clothNameSelected]}>
                            {item.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.title}>TPO</Text>
              {renderChips(tpoOptions, tpo, setTpo)}
            </View>

            <View style={styles.section}>
              <Text style={styles.title}>핏</Text>
              {renderChips(fitOptions, fit, setFit)}
            </View>

            <View style={styles.section}>
              <Text style={styles.title}>체감온도</Text>
              {renderChips(temperatureOptions, temperature, setTemperature)}
            </View>

            <View style={styles.section}>
              <Text style={styles.title}>메모</Text>
              <TextInput
                style={styles.input}
                placeholder="오늘 착장에 대한 메모를 입력하세요"
                value={memo}
                onChangeText={setMemo}
                multiline
              />
            </View>

            <Pressable
              style={[styles.saveButton, (saving || isUsingMockData) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || isUsingMockData}
            >
              <Text style={styles.saveText}>{saving ? '저장 중...' : '저장하기'}</Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

// 스타일 시트는 기존 것 유지
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  categoryBlock: { marginTop: 10 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  subTitle: { fontSize: 13, color: '#666', marginBottom: 6 },
  value: { fontSize: 15, color: '#111' },
  clothRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  clothBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#f1f1f1' },
  clothBoxSelected: { backgroundColor: '#111' },
  clothName: { color: '#333', fontSize: 13 },
  clothNameSelected: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f1f1f1' },
  chipSelected: { backgroundColor: '#111' },
  chipText: { fontSize: 13, color: '#333' },
  chipTextSelected: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  saveButton: { marginTop: 10, backgroundColor: '#111', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#777' },
  mockWarningText: { fontSize: 13, color: '#c0392b', marginBottom: 8, lineHeight: 18 },
});