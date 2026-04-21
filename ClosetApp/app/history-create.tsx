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
  '데일리',
  '비즈니스',
  '면접',
  '결혼식',
  '장례식',
  '운동',
  '데이트',
  '모임',
  '여행',
];

const fitOptions = ['슬림', '레귤러', '오버핏'];
const temperatureOptions = ['추움', '적당함', '더움'];


/**
 * 실제 폰(Expo Go) 테스트 시 PC IPv4 주소로 수정
 */
const API_BASE_URL = 'http://192.168.1.122:8000';

const MOCK_CLOTHES_IDS = ['1', '2', '3', '4'];

function formatToday() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCategory(category?: string) {
  const value = (category || '').trim().toLowerCase();

  if (value === '상의' || value === 'top' || value === 'tops' || value === 'shirt') {
    return '상의';
  }

  if (value === '하의' || value === 'bottom' || value === 'bottoms' || value === 'pants') {
    return '하의';
  }

  if (value === '아우터' || value === 'outer' || value === 'outerwear' || value === 'jacket') {
    return '아우터';
  }

  if (value === '신발' || value === 'shoe' || value === 'shoes' || value === 'sneakers') {
    return '신발';
  }

  if (
    value === '악세사리' ||
    value === '악세서리' ||
    value === '액세서리' ||
    value === 'accessory' ||
    value === 'accessories'
  ) {
    return '악세사리';
  }

  return '기타';
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

  return `저장 실패 (${status})`;
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

  useEffect(() => {
    const fetchClothes = async () => {
      try {
        setLoadingClothes(true);

        const response = await fetch(`${API_BASE_URL}/clothes`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        let data: ClothesApiItem[] = [];

        try {
          data = await response.json();
          console.log('clothes api data:', data);
        } catch {
          data = [];
        }

        if (!response.ok) {
          throw new Error(`옷 목록 조회 실패 (${response.status})`);
        }

        const mapped: ClothingItem[] = data
          .map((item, index) => {
            const rawId = item.clothes_id ?? item.id;

            if (rawId === undefined || rawId === null) {
              return null;
            }

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
            { id: '3', name: '화이트 스니커즈', category: '신발' },
            { id: '4', name: '네이비 자켓', category: '아우터' },
          ]);
        } else {
          setIsUsingMockData(false);
          setClothesList(mapped);
        }
      } catch (error) {
        console.error('옷 목록 불러오기 실패:', error);

        setIsUsingMockData(true);
        setClothesList([
          { id: '1', name: '블랙 셔츠', category: '상의' },
          { id: '2', name: '베이지 슬랙스', category: '하의' },
          { id: '3', name: '화이트 스니커즈', category: '신발' },
          { id: '4', name: '네이비 자켓', category: '아우터' },
        ]);

        Alert.alert(
          '안내',
          '옷 목록 API를 불러오지 못해 임시 데이터로 표시합니다.'
        );
      } finally {
        setLoadingClothes(false);
      }
    };

    fetchClothes();
  }, []);

  const groupedClothes = useMemo(() => {
    return {
      상의: clothesList.filter((item) => item.category === '상의'),
      하의: clothesList.filter((item) => item.category === '하의'),
      아우터: clothesList.filter((item) => item.category === '아우터'),
      신발: clothesList.filter((item) => item.category === '신발'),
      악세사리: clothesList.filter((item) => item.category === '악세사리'),
      기타: clothesList.filter((item) => item.category === '기타'),
    };
  }, [clothesList]);

  const toggleCloth = (id: string) => {
    setSelectedClothes((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderChips = (
    options: string[],
    selected: string,
    setValue: (value: string) => void
  ) => {
    return (
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = selected === option;

          return (
            <Pressable
              key={option}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => setValue(option)}
            >
              <Text
                style={[
                  styles.chipText,
                  isSelected && styles.chipTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const saveHistory = async () => {
    const payload = selectedClothes.map((clothesId) => ({
      clothes_id: Number(selectedClothes[0]),
      worn_date: today,
      // 백엔드가 추가 필드를 받는 구조면 아래 주석 해제해서 테스트
      //feedback_tpo: tpo || null,
      //feedback_fit: fit || null,
      //feedback_temperature: temperature || null,
      memo: memo.trim() || null,
    }));

    console.log('history save payload:', payload);

    const response = await fetch(`${API_BASE_URL}/history`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let responseData: any = null;

    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }

    console.log('history save response:', responseData);

    if (!response.ok) {
      const message = stringifyErrorDetail(responseData, response.status);
      throw new Error(message);
    }

    return responseData;
  };

  const handleSave = async () => {
    if (isUsingMockData) {
      Alert.alert(
        '안내',
        '현재는 더미 데이터 사용 중이라 기록을 실제로 저장할 수 없습니다.'
      );
      return;
    }

    if (selectedClothes.length === 0) {
      Alert.alert('안내', '옷을 선택해주세요.');
      return;
    }

    try {
      setSaving(true);

      await saveHistory();

      Alert.alert('저장 완료', '착용 기록이 저장되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            router.replace('/(tabs)/history');
          },
        },
      ]);
    } catch (error) {
      console.error('착용 기록 저장 실패:', error);

      Alert.alert(
        '저장 실패',
        error instanceof Error ? error.message : JSON.stringify(error)
      );
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
                <Text style={styles.mockWarningText}>
                  ⚠️ 현재 더미 데이터 사용 중 (백엔드 /clothes 미연동)
                </Text>
              )}

              {clothesList.length === 0 && (
                <Text style={styles.emptyClothesText}>
                  등록된 옷이 없습니다.
                </Text>
              )}

              {Object.entries(groupedClothes).map(([category, items]) => {
                if (items.length === 0) return null;

                return (
                  <View key={category} style={styles.categoryBlock}>
                    <Text style={styles.subTitle}>{category}</Text>

                    <View style={styles.clothRow}>
                      {items.map((item) => {
                        const isSelected = selectedClothes.includes(item.id);

                        return (
                          <Pressable
                            key={item.id}
                            style={[
                              styles.clothBox,
                              isSelected && styles.clothBoxSelected,
                            ]}
                            onPress={() => toggleCloth(item.id)}
                          >
                            <Text
                              style={[
                                styles.clothName,
                                isSelected && styles.clothNameSelected,
                              ]}
                            >
                              {item.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
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
              style={[
                styles.saveButton,
                (saving || clothesList.length === 0 || isUsingMockData) &&
                  styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving || clothesList.length === 0 || isUsingMockData}
            >
              <Text style={styles.saveText}>
                {saving
                  ? '저장 중...'
                  : isUsingMockData
                  ? '더미 데이터 상태에서는 저장 불가'
                  : '저장하기'}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 40 },

  section: {
    marginBottom: 20,
  },

  categoryBlock: {
    marginTop: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },

  subTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },

  value: {
    fontSize: 15,
    color: '#111',
  },

  clothRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  clothBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f1f1f1',
  },

  clothBoxSelected: {
    backgroundColor: '#111',
  },

  clothName: {
    color: '#333',
    fontSize: 13,
  },

  clothNameSelected: {
    color: '#fff',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f1f1',
  },

  chipSelected: {
    backgroundColor: '#111',
  },

  chipText: {
    fontSize: 13,
    color: '#333',
  },

  chipTextSelected: {
    color: '#fff',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  saveButton: {
    marginTop: 10,
    backgroundColor: '#111',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  saveButtonDisabled: {
    opacity: 0.6,
  },

  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#777',
  },

  emptyClothesText: {
    fontSize: 14,
    color: '#777',
    marginTop: 8,
    lineHeight: 20,
  },

  mockWarningText: {
    fontSize: 13,
    color: '#c0392b',
    marginBottom: 8,
    lineHeight: 18,
  },
});