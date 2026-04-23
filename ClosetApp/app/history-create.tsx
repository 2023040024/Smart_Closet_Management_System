import { Stack, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
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
  color: string;
};

// 👉 임시 옷 데이터 (나중에 API로 교체)
const clothesData: ClothingItem[] = [
  { id: 'c1', name: '블랙 셔츠', category: '상의', color: '블랙' },
  { id: 'c2', name: '베이지 슬랙스', category: '하의', color: '베이지' },
  { id: 'c3', name: '화이트 스니커즈', category: '신발', color: '화이트' },
  { id: 'c4', name: '네이비 자켓', category: '아우터', color: '네이비' },
];

// 👉 TPO (수정된 최종 버전)
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

export default function HistoryCreateScreen() {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedClothes, setSelectedClothes] = useState<string[]>([]);
  const [tpo, setTpo] = useState('');
  const [fit, setFit] = useState('');
  const [temperature, setTemperature] = useState('');
  const [memo, setMemo] = useState('');

  // 👉 카테고리별로 묶기
  const groupedClothes = useMemo(() => {
    return {
      상의: clothesData.filter((item) => item.category === '상의'),
      하의: clothesData.filter((item) => item.category === '하의'),
      아우터: clothesData.filter((item) => item.category === '아우터'),
      신발: clothesData.filter((item) => item.category === '신발'),
    };
  }, []);

  // 👉 옷 선택 토글
  const toggleCloth = (id: string) => {
    setSelectedClothes((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  // 👉 공통 칩 UI
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

  // 👉 저장
  const handleSave = () => {
    if (selectedClothes.length === 0) {
      Alert.alert('안내', '옷을 선택해주세요.');
      return;
    }

    if (!tpo) {
      Alert.alert('안내', 'TPO를 선택해주세요.');
      return;
    }

    const payload = {
      date: today,
      clothesIds: selectedClothes,
      tpo,
      fit,
      temperature,
      memo,
    };

    console.log('저장 데이터:', payload);

    Alert.alert('저장 완료', '착용 기록이 저장되었습니다.', [
      {
        text: '확인',
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ title: '착용 기록 추가' }} />

      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          
          {/* 날짜 */}
          <View style={styles.section}>
            <Text style={styles.title}>날짜</Text>
            <Text style={styles.value}>{today}</Text>
          </View>

          {/* 옷 선택 */}
          <View style={styles.section}>
            <Text style={styles.title}>오늘 입은 옷</Text>

            {Object.entries(groupedClothes).map(([category, items]) => (
              <View key={category} style={{ marginTop: 10 }}>
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
                        <Text style={styles.clothName}>{item.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>

          {/* TPO */}
          <View style={styles.section}>
            <Text style={styles.title}>TPO</Text>
            {renderChips(tpoOptions, tpo, setTpo)}
          </View>

          {/* 핏 */}
          <View style={styles.section}>
            <Text style={styles.title}>핏</Text>
            {renderChips(fitOptions, fit, setFit)}
          </View>

          {/* 체감온도 */}
          <View style={styles.section}>
            <Text style={styles.title}>체감온도</Text>
            {renderChips(temperatureOptions, temperature, setTemperature)}
          </View>

          {/* 메모 */}
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

          {/* 저장 버튼 */}
          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>저장하기</Text>
          </Pressable>

        </ScrollView>
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

  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});