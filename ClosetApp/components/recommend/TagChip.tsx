import React from 'react';
import { Text, StyleSheet } from 'react-native';

export function TagChip({ text }: { text?: string | null }) {
  if (!text || !text.trim()) return null;
  return <Text style={styles.tag}>{text}</Text>;
}

const styles = StyleSheet.create({
  tag: {
    backgroundColor: '#EEF2FF',
    color: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
});