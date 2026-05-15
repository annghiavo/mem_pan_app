import React from 'react';
import { TextInput, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { IconSymbol } from './icon-symbol';
import { ThemedView } from '../themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
    autoFocus?: boolean;
    style?: ViewStyle;
}

export function SearchBar({ value, onChangeText, onSubmit, placeholder = 'Search...', autoFocus, style }: SearchBarProps) {
    const iconColor = useThemeColor({}, 'icon');
    const textColor = useThemeColor({}, 'text');
    const backgroundColor = useThemeColor({}, 'background');

    return (
        <ThemedView style={[styles.container, { backgroundColor }, style]}>
            <IconSymbol name="magnifyingglass" size={20} color={iconColor} style={styles.icon} />
            <TextInput
                style={[styles.input, { color: textColor }]}
                value={value}
                onChangeText={onChangeText}
                onSubmitEditing={onSubmit}
                autoFocus={autoFocus}
                placeholder={placeholder}
                placeholderTextColor={iconColor}
                returnKeyType="search"
            />
            {value.length > 0 && (
                <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
                    <IconSymbol name="xmark.circle.fill" size={20} color={iconColor} />
                </TouchableOpacity>
            )}
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    clearBtn: {
        padding: 4,
    },
});
