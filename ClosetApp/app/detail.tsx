import { router, useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getVisibleTagEntries, useCloset } from './_closetStore';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { clothes } = useCloset();

  const item = clothes.find((clothesItem) => clothesItem.id === id);

  if (!item) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>데이터가 없습니다.</Text>
      </View>
    );
  }

  const visibleTags = getVisibleTagEntries(item.tags);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image source={{ uri: item.image }} style={styles.image} />

      <Text style={styles.sectionTitle}>선택된 태그</Text>

      {visibleTags.length === 0 ? (
        <Text style={styles.emptyTagText}>표시할 태그가 없습니다.</Text>
      ) : (
        <View style={styles.tagList}>
          {visibleTags.map((tag) => (
            <View key={`${tag.label}-${tag.value}`} style={styles.tagRow}>
              <Text style={styles.tagLabel}>{tag.label}</Text>
              <View style={styles.tagPill}>
                <Text style={styles.tagText}>{tag.value}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push({ pathname: '/edit', params: { id: item.id } })}
      >
        <Text style={styles.buttonText}>수정하기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 15,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  image: {
    width: '100%',
    height: 280,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyTagText: {
    color: '#6b7280',
    marginBottom: 20,
  },
  tagList: {
    marginBottom: 20,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagLabel: {
    width: 72,
    fontSize: 14,
    color: '#6b7280',
  },
  tagPill: {
    flexShrink: 1,
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});