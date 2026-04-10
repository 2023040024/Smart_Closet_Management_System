import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useCloset } from '../_closetStore';

export default function EditScreen() {
  const { id } = useLocalSearchParams();
  const { clothes, deleteClothes, addClothes } = useCloset();

  const item = clothes.find((c: any) => c.id === id);

  const defaultTags = {
    type: '',
    style: '',
    mood: '',
    fit: '',
    material: '',
    thickness: '',
    point: '',
    color: '',
    season: '',
  };

  const [selected, setSelected] = useState(item?.tags || defaultTags);

  if (!item) return <Text>데이터 없음</Text>;

  const selectTag = (category: keyof typeof selected, value: string) => {
    setSelected((prev: any) => ({
      ...prev,
      [category]: prev[category] === value ? '' : value,
    }));
  };

  const renderTags = (items: string[], category: keyof typeof selected) => {
    return items.map((item) => {
      const isSelected = selected[category] === item;

      return (
        <TouchableOpacity
          key={item}
          style={[styles.tag, isSelected && styles.selectedTag]}
          onPress={() => selectTag(category, item)}
        >
          <Text style={isSelected && styles.selectedText}>{item}</Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>옷 수정</Text>

      <Text style={styles.label}>스타일</Text>
      <View style={styles.tagContainer}>
        {renderTags(['캐주얼', '세미캐주얼', '포멀', '미니멀', '스트릿', '댄디', '스포티', '빈티지', '아메카지'], 'style')}
      </View>

      <Text style={styles.label}>분위기</Text>
      <View style={styles.tagContainer}>
        {renderTags(['활동적인', '세련된', '귀여운', '힙한', '차분한', '고급스러운'], 'mood')}
      </View>

      <Text style={styles.label}>핏</Text>
      <View style={styles.tagContainer}>
        {renderTags(['오버핏', '슬림핏', '와이드핏', '크롭', '롱기장'], 'fit')}
      </View>

      <Text style={styles.label}>소재</Text>
      <View style={styles.tagContainer}>
        {renderTags(['니트', '데님', '코튼', '패딩'], 'material')}
      </View>

      <Text style={styles.label}>두께</Text>
      <View style={styles.tagContainer}>
        {renderTags(['얇음', '보통', '두꺼움'], 'thickness')}
      </View>

      <Text style={styles.label}>포인트</Text>
      <View style={styles.tagContainer}>
        {renderTags(['프린팅', '로고', '레이어드', '컬러포인트', '무지', '패턴', '스트라이프', '체크'], 'point')}
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          deleteClothes(item.id);

          addClothes({
            ...item,
            id: item.id,
            tags: selected,
          });

          router.back();
        }}
      >
        <Text style={styles.buttonText}>수정 완료</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eee',
    borderRadius: 20,
    margin: 4,
  },
  selectedTag: {
    backgroundColor: '#000',
  },
  selectedText: {
    color: '#fff',
  },
  button: {
    marginTop: 20,
    backgroundColor: 'blue',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});