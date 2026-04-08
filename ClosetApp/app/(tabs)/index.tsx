import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
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
  tags: FilterType;
};

export default function HomeScreen() {
  const { clothes, deleteClothes } = useCloset();
  const router = useRouter();

  const [search, setSearch] = useState('');

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

  const filteredClothes = (clothes as Clothes[]).filter((item) => {
    const matchFilter =
      (!filter.style || item.tags.style === filter.style) &&
      (!filter.mood || item.tags.mood === filter.mood) &&
      (!filter.thickness || item.tags.thickness === filter.thickness) &&
      (!filter.fit || item.tags.fit === filter.fit) &&
      (!filter.material || item.tags.material === filter.material) &&
      (!filter.point || item.tags.point === filter.point) &&
      (!filter.color || item.tags.color === filter.color) &&
      (!filter.season || item.tags.season === filter.season);

    const matchSearch =
      !search ||
      Object.values(item.tags).some((tag) => tag.includes(search));

    return matchFilter && matchSearch;
  });

  const goRecommend = () => {
    router.push({
      pathname: '/(tabs)/recommend',
      params: filter,
    });
  };

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
                <Text style={isSelected && styles.selectedText}>{item}</Text>
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

      <TextInput
        style={styles.searchInput}
        placeholder="검색 (예: 캐주얼, 니트)"
        value={search}
        onChangeText={setSearch}
      />

      {/* ⭐ register.tsx 순서 완전 일치 */}

      {renderSection('색상', 'color', ['블랙','화이트','그레이','베이지','브라운','블루','그린','레드','기타'])}

      {renderSection('계절', 'season', ['봄','여름','가을','겨울'])}

      {renderSection('스타일', 'style', ['캐주얼','세미캐주얼','포멀','미니멀','스트릿','댄디','스포티','빈티지','아메카지'])}

      {renderSection('분위기', 'mood', ['활동적인','세련된','귀여운','힙한','차분한','고급스러운'])}

      {renderSection('핏', 'fit', ['오버핏','슬림핏','와이드핏','크롭','롱기장'])}

      {renderSection('소재', 'material', ['니트','데님','코튼','패딩'])}

      {renderSection('두께', 'thickness', ['얇음','보통','두꺼움'])}

      {/* ⭐ 빠졌던 포인트 복구 */}
      {renderSection('포인트', 'point', ['프린팅','로고','레이어드','컬러포인트','무지','패턴','스트라이프','체크'])}

      <TouchableOpacity style={styles.recommendBtn} onPress={goRecommend}>
        <Text style={styles.recommendText}>코디 추천 받기</Text>
      </TouchableOpacity>

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
  title: { fontSize: 24, fontWeight: 'bold' },

  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  label: { fontSize: 14, fontWeight: '600' },

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

  selected: { backgroundColor: '#000' },
  selectedText: { color: '#fff' },

  recommendBtn: {
    backgroundColor: '#000',
    padding: 12,
    borderRadius: 10,
    marginVertical: 15,
    alignItems: 'center',
  },

  recommendText: { color: '#fff', fontWeight: 'bold' },

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