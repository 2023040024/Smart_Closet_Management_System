import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

function normalizeParam(value: string | string[] | undefined): string {
  if (!value) return '선택되지 않음';
  if (Array.isArray(value)) {
    const filtered = value.filter(Boolean);
    return filtered.length > 0 ? filtered.join(', ') : '선택되지 않음';
  }
  return value.trim() ? value : '선택되지 않음';
}

export default function RecommendScreen() {
  const params = useLocalSearchParams();

  const season = normalizeParam(params.season as string | string[] | undefined);
  const tpo = normalizeParam(params.tpo as string | string[] | undefined);
  const style = normalizeParam(params.style as string | string[] | undefined);
  const mood = normalizeParam(params.mood as string | string[] | undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>코디 추천</Text>
      <Text style={styles.subtitle}>
        상황에 맞는 코디를 추천해드릴게요.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 조건</Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>계절</Text>
          <Text style={styles.valueText}>{season}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>TPO</Text>
          <Text style={styles.valueText}>{tpo}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>스타일</Text>
          <Text style={styles.valueText}>{style}</Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>분위기</Text>
          <Text style={styles.valueText}>{mood}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>추천 결과</Text>

        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>추천 결과 영역</Text>
          <Text style={styles.resultText}>
            다음 단계에서 코디 카드 UI와 추천 결과가 표시됩니다.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  inputBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  valueText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  resultBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});