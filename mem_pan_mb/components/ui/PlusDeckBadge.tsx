import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function isPlusDeck(deck: any): boolean {
  return (deck?.accessLevel || deck?.access_level) === 'plus';
}

type PlusDeckBadgeProps = {
  compact?: boolean;
};

export function PlusDeckBadge({ compact = false }: PlusDeckBadgeProps) {
  return (
    <View style={[styles.badge, compact && styles.compactBadge]}>
      <Ionicons name="star" size={compact ? 11 : 13} color="#7c2d12" />
      <Text style={[styles.text, compact && styles.compactText]}>Plus</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  compactBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  text: {
    color: '#7c2d12',
    fontSize: 12,
    fontWeight: '800',
  },
  compactText: {
    fontSize: 11,
  },
});
