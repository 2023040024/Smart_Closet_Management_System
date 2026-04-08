import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCloset } from '../_closetStore';

type Tags = {
  type: string;   // ⭐ 추가
  style: string;
  mood: string;
  fit: string;
  material: string;
  thickness: string;
  point: string;
  color: string;
  season: string;
};

export default function RegisterScreen() {
  const { addClothes } = useCloset();

  const [image, setImage] = useState<string | null>(null);

  const [selected, setSelected] = useState<Tags>({
    type: '',   // ⭐ 추가
    style: '',
    mood: '',
    fit: '',
    material: '',
    thickness: '',
    point: '',
    color: '',
    season: '',
  });

  const [loading, setLoading] = useState(false);

  // 📸 이미지 선택
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  // 태그 선택
  const selectTag = (category: keyof Tags, value: string) => {
    setSelected((prev) => ({
      ...prev,
      [category]: prev[category] === value ? '' : value,
    }));
  };

  const renderTags = (items: string[], category: keyof Tags) => {
    return items.map((item) => {
      const isSelected = selected[category] === item;

      return (
        <TouchableOpacity
          key={item}
          style={[styles.tag, isSelected && styles.selectedTag]}
          onPress={() => selectTag(category, item)}
        >
          <Text style={isSelected && styles.selectedText}>
            {item}
          </Text>
        </TouchableOpacity>
      );
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>옷 등록</Text>

      {/* 이미지 */}
      <TouchableOpacity style={styles.imageBox} onPress={pickImage}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <Text style={styles.imageText}>+ 사진 추가</Text>
        )}
      </TouchableOpacity>

      {/* ⭐ 카테고리 */}
      <Text style={styles.label}>
        카테고리 {selected.type ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(['상의','하의','아우터','신발'], 'type')}
      </View>

      {/* 색상 */}
      <Text style={styles.label}>
        색상 {selected.color ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(
          ['블랙','화이트','그레이','베이지','브라운','블루','그린','레드','기타'],
          'color'
        )}
      </View>

      {/* 계절 */}
      <Text style={styles.label}>
        계절 {selected.season ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(['봄','여름','가을','겨울'], 'season')}
      </View>

      {/* 스타일 */}
      <Text style={styles.label}>
        스타일 {selected.style ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(
          ['캐주얼','세미캐주얼','포멀','미니멀','스트릿','댄디','스포티','빈티지','아메카지'],
          'style'
        )}
      </View>

      {/* 분위기 */}
      <Text style={styles.label}>
        분위기 {selected.mood ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(
          ['활동적인','세련된','귀여운','힙한','차분한','고급스러운'],
          'mood'
        )}
      </View>

      {/* 핏 */}
      <Text style={styles.label}>
        핏 {selected.fit ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(['오버핏','슬림핏','와이드핏','크롭','롱기장'], 'fit')}
      </View>

      {/* 소재 */}
      <Text style={styles.label}>
        소재 {selected.material ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(['니트','데님','코튼','패딩'], 'material')}
      </View>

      {/* 두께 */}
      <Text style={styles.label}>
        두께 {selected.thickness ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(['얇음','보통','두꺼움'], 'thickness')}
      </View>

      {/* 포인트 */}
      <Text style={styles.label}>
        포인트 {selected.point ? '(선택됨)' : ''}
      </Text>
      <View style={styles.tagContainer}>
        {renderTags(
          ['프린팅','로고','레이어드','컬러포인트','무지','패턴','스트라이프','체크'],
          'point'
        )}
      </View>

      {/* 초기화 */}
      <TouchableOpacity
        style={styles.resetButton}
        onPress={() =>
          setSelected({
            type: '',   // ⭐ 추가
            style: '',
            mood: '',
            fit: '',
            material: '',
            thickness: '',
            point: '',
            color: '',
            season: '',
          })
        }
      >
        <Text style={styles.resetText}>초기화</Text>
      </TouchableOpacity>

      {/* 등록 */}
      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.5 }]}
        disabled={loading}
        onPress={() => {
          setLoading(true);

          if (!image) {
            Alert.alert('이미지를 선택하세요');
            setLoading(false);
            return;
          }

          addClothes({
            id: Date.now().toString(),
            image,
            tags: selected,
          });

          setTimeout(() => {
            setLoading(false);
            router.replace('/');
          }, 300);
        }}
      >
        <Text style={styles.buttonText}>
          {loading ? '등록 중...' : '등록하기'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },

  imageBox: {
    height: 150,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageText: { color: '#666' },

  label: { fontSize: 16, fontWeight: '600', marginTop: 12 },

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

  resetButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ccc',
    borderRadius: 8,
    alignItems: 'center',
  },

  resetText: {
    color: '#000',
  },

  button: {
    marginTop: 20,
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});