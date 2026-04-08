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

// 타입
type FilterType = {
  style: string;
  mood: string;
  thickness: string;
  fit: string;
  material: string;
  point: string;
  color: string;   // ⭐ 추가
  season: string;  // ⭐ 추가
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
    color: '',    // ⭐ 추가
    season: '',   // ⭐ 추가
  });

  const [expanded, setExpanded] = useState({
    style: false,
    mood: false,
    thickness: false,
    fit: false,
    material: false,
    point: false,
    color: false,   // ⭐ 추가
    season: false,  // ⭐ 추가
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
      (!filter.color || item.tags.color === filter.color) &&     // ⭐ 추가
      (!filter.season || item.tags.season === filter.season);    // ⭐ 추가

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

      {/* ⭐ 추가된 부분 */}
      {renderSection('색상', 'color', ['블랙','화이트','그레이','베이지','브라운','블루','그린','레드','기타'])}
      {renderSection('계절', 'season', ['봄','여름','가을','겨울'])}

      {renderSection('스타일', 'style', ['캐주얼','세미캐주얼','포멀','미니멀','스트릿'])}
      {renderSection('분위기', 'mood', ['활동적인','세련된','귀여운','힙한','차분한'])}
      {renderSection('두께', 'thickness', ['얇음','보통','두꺼움'])}
      {renderSection('핏', 'fit', ['슬림','레귤러','루즈','오버핏'])}
      {renderSection('소재', 'material', ['면','니트','데님','가죽'])}
      {renderSection('포인트', 'point', ['무지','로고','프린팅','패턴'])}

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