import React from 'react';
import { TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { ThemedView } from '../themed-view';
import { ThemedText } from '../themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SegmentedControlProps {
    tabs: string[];
    activeIndex: number;
    onChange: (index: number) => void;
}

export function SegmentedControl({ tabs, activeIndex, onChange }: SegmentedControlProps) {
    const activeColor = useThemeColor({}, 'tint');

    return (
        <ThemedView style={styles.container}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
                {tabs.map((tab, index) => {
                    const isActive = index === activeIndex;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[
                                styles.tab,
                                isActive && { borderBottomColor: activeColor, borderBottomWidth: 2 }
                            ]}
                            onPress={() => onChange(index)}
                        >
                            <ThemedText style={[styles.tabText, isActive && { color: activeColor, fontWeight: 'bold' }]}>
                                {tab}
                            </ThemedText>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ebebeb',
    },
    scroll: {
        paddingHorizontal: 16,
        gap: 16,
    },
    tab: {
        paddingBottom: 8,
    },
    tabText: {
        fontSize: 16,
    },
});
