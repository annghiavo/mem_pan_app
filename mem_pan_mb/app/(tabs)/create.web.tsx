import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

// Web specific hoverable wrapper
function HoverableCard({ children, style, onPress, theme }: any) {
    const [isHovered, setIsHovered] = useState(false);
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            // @ts-ignore
            onMouseEnter={() => setIsHovered(true)}
            // @ts-ignore
            onMouseLeave={() => setIsHovered(false)}
            style={[
                style,
                { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
                isHovered && { transform: [{ translateY: -2 }], boxShadow: `0 6px 12px ${theme.shadowColor}15` }
            ]}
        >
            {children}
        </TouchableOpacity>
    );
}

export default function CreateWebScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#e5e7eb',
        primary: '#5865F2',
        iconBg: isDark ? '#312e81' : '#EEF2FF',
        shadowColor: isDark ? '#000000' : '#000000',
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.contentWrapper}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Tạo mới</Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>Chọn nội dung bạn muốn tạo để bắt đầu học</Text>
                </View>

                <View style={styles.gridContent}>
                    <HoverableCard
                        theme={theme}
                        style={[styles.createOption, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/module/create' as any)}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
                            <Ionicons name="albums-outline" size={32} color={theme.primary} />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: theme.text }]}>Học phần</Text>
                            <Text style={[styles.optionSubtitle, { color: theme.textMuted }]}>Tạo học phần mới với các thuật ngữ và định nghĩa tương ứng để học tập.</Text>
                        </View>
                    </HoverableCard>

                    <HoverableCard
                        theme={theme}
                        style={[styles.createOption, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/folder/create' as any)}
                    >
                        <View style={[styles.iconContainer, { backgroundColor: theme.iconBg }]}>
                            <Ionicons name="folder-outline" size={32} color={theme.primary} />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: theme.text }]}>Thư mục</Text>
                            <Text style={[styles.optionSubtitle, { color: theme.textMuted }]}>Tổ chức và nhóm các học phần của bạn lại với nhau để dễ dàng quản lý.</Text>
                        </View>
                    </HoverableCard>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 40,
    },
    contentWrapper: {
        width: '100%',
        maxWidth: 900,
        paddingHorizontal: 32,
    },
    header: {
        marginBottom: 40,
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
    },
    gridContent: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 24,
    },
    createOption: {
        width: 380,
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    optionTextContainer: {
        flex: 1,
        paddingTop: 4,
    },
    optionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    optionSubtitle: {
        fontSize: 15,
        lineHeight: 22,
    }
});
