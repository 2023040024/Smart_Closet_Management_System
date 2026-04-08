import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCloset } from '../_closetStore';

type FilterType = {
  style: string;
  mood: string;
  thickness: string;
  fit: string;
  material: string;
  point: string;
  color: string;
  season: string;
};

type Clothes = {
  id: string;
  image: string;
  tags: FilterType & { type: string };
};

export default function HomeScreen() {
  const { clothes, deleteClothes } = useCloset();
  const router = useRouter();

  const [selectedType, setSelectedType] = useState<string>('전체');
  const [showFilter, setShowFilter] = useState(false);

  const [filter, setFilter] = useState<FilterType>({
    style: '',
    mood: '',
    thickness: '',
    fit: '',
    material: '',
    point: '',
    color: '',
    season: '',
  });

  const [expanded, setExpanded] = useState({
    style: false,
    mood: false,
    thickness: false,
    fit: false,
    material: false,
    point: false,
    color: false,
    season: false,
  });

  const toggleFilter = (category: keyof FilterType, value: string) => {
    setFilter((prev) => ({
      ...prev,
      [category]: prev[category] === value ? '' : value,
    }));
  };

  const toggleExpand = (category: keyof typeof expanded) => {
    setExpanded((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  // ⭐ 추천 이동
  const goRecommend = () => {
    router.push({
      pathname: '/(tabs)/recommend',
      params: filter,
    });
  };

  const filteredClothes = (clothes as Clothes[]).filter((item) => {
    const matchType =
      selectedType === '전체' || item.tags.type === selectedType;

    const matchFilter =
      (!filter.style || item.tags.style === filter.style) &&
      (!filter.mood || item.tags.mood === filter.mood) &&
      (!filter.thickness || item.tags.thickness === filter.thickness) &&
      (!filter.fit || item.tags.fit === filter.fit) &&
      (!filter.material || item.tags.material === filter.material) &&
      (!filter.point || item.tags.point === filter.point) &&
      (!filter.color || item.tags.color === filter.color) &&
      (!filter.season || item.tags.season === filter.season);

    return matchType && matchFilter;
  });

  const renderSection = (
    label: string,
    key: keyof FilterType,
    options: string[]
  ) => (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity onPress={() => toggleExpand(key)}>
          <Text>{expanded[key] ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {expanded[key] && (
        <View style={styles.filterContainer}>
          {options.map((item) => {
            const isSelected = filter[key] === item;
            return (
              <TouchableOpacity
                key={item}
                style={[styles.tag, isSelected && styles.selected]}
                onPress={() => toggleFilter(key, item)}
              >
                <Text style={isSelected && styles.selectedText}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 옷장</Text>

      {/* ⭐ 필터 + 카테고리 한 줄 */}
      <View style={styles.topRow}>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilter((prev) => !prev)}
        >
          <Text style={styles.filterText}>필터</Text>
        </TouchableOpacity>

        <View style={styles.typeContainer}>
          {['전체','상의','하의','아우터','신발'].map((type) => {
            const isSelected = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeBtn, isSelected && styles.selected]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={isSelected && styles.selectedText}>
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ⭐ 필터 영역 */}
      {showFilter && (
        <>
          {renderSection('색상', 'color', ['블랙','화이트','그레이','베이지','브라운','블루','그린','레드','기타'])}
          {renderSection('계절', 'season', ['봄','여름','가을','겨울'])}
          {renderSection('스타일', 'style', ['캐주얼','세미캐주얼','포멀','미니멀','스트릿','댄디','스포티','빈티지','아메카지'])}
          {renderSection('분위기', 'mood', ['활동적인','세련된','귀여운','힙한','차분한','고급스러운'])}
          {renderSection('핏', 'fit', ['오버핏','슬림핏','와이드핏','크롭','롱기장'])}
          {renderSection('소재', 'material', ['니트','데님','코튼','패딩'])}
          {renderSection('두께', 'thickness', ['얇음','보통','두꺼움'])}
          {renderSection('포인트', 'point', ['프린팅','로고','레이어드','컬러포인트','무지','패턴','스트라이프','체크'])}
        </>
      )}

      {/* ⭐ 추천 버튼 */}
      <TouchableOpacity style={styles.recommendBtn} onPress={goRecommend}>
        <Text style={styles.recommendText}>코디 추천 받기</Text>
      </TouchableOpacity>

      {/* 리스트 */}
      <FlatList
        data={filteredClothes}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/detail?id=${item.id}`)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />

            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteClothes(item.id)}
            >
              <Text style={styles.deleteText}>삭제</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 10 },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  filterBtn: {
    backgroundColor: '#000',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
  },

  filterText: {
    color: '#fff',
    fontSize: 12,
  },

  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  typeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#eee',
    borderRadius: 10,
    marginRight: 5,
  },

  selected: { backgroundColor: '#000' },
  selectedText: { color: '#fff' },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  label: { fontWeight: '600' },

  filterContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  tag: {
    padding: 6,
    backgroundColor: '#eee',
    borderRadius: 20,
    margin: 4,
  },

  recommendBtn: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    marginVertical: 10,
    alignItems: 'center',
  },

  recommendText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  card: { flex: 1, margin: 8, alignItems: 'center' },

  image: { width: 100, height: 100 },

  deleteButton: {
    marginTop: 6,
    backgroundColor: 'red',
    padding: 6,
    borderRadius: 6,
  },

  deleteText: { color: '#fff' },
});