import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, useWindowDimensions } from 'react-native';
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
                { cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' } as any,
                isHovered && { transform: [{ translateY: -2 }], boxShadow: `0 6px 12px ${theme.shadowColor}15` } as any,
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
    const { width: screenWidth } = useWindowDimensions();
    const isMobile = screenWidth < 600;

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#e5e7eb',
        primary: '#5865F2',
        iconBg: isDark ? '#312e81' : '#EEF2FF',
        shadowColor: '#000000',
    };

    const cardStyle = {
        width: isMobile ? ('100%' as any) : 380,
        flexDirection: 'row' as const,
        alignItems: 'flex-start' as const,
        padding: isMobile ? 18 : 24,
        borderRadius: 16,
        borderWidth: 1,
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[
                styles.contentWrapper,
                {
                    paddingHorizontal: isMobile ? 16 : 32,
                    paddingVertical: isMobile ? 24 : 40,
                }
            ]}>
                <View style={{ marginBottom: isMobile ? 24 : 40 }}>
                    <Text style={[styles.headerTitle, { color: theme.text, fontSize: isMobile ? 24 : 32 }]}>
                        Tạo mới
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: theme.textMuted, fontSize: isMobile ? 14 : 16 }]}>
                        Chọn nội dung bạn muốn tạo để bắt đầu học
                    </Text>
                </View>

                <View style={[
                    styles.gridContent,
                    {
                        flexDirection: isMobile ? 'column' : 'row',
                        gap: isMobile ? 16 : 24,
                    }
                ]}>
                    <HoverableCard
                        theme={theme}
                        style={[cardStyle, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/module/create' as any)}
                    >
                        <View style={[
                            styles.iconContainer,
                            {
                                backgroundColor: theme.iconBg,
                                width: isMobile ? 52 : 64,
                                height: isMobile ? 52 : 64,
                            }
                        ]}>
                            <Ionicons name="albums-outline" size={isMobile ? 26 : 32} color={theme.primary} />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: theme.text, fontSize: isMobile ? 17 : 20 }]}>
                                Học phần
                            </Text>
                            <Text style={[styles.optionSubtitle, { color: theme.textMuted, fontSize: isMobile ? 13 : 15 }]}>
                                Tạo học phần mới với các thuật ngữ và định nghĩa tương ứng để học tập.
                            </Text>
                        </View>
                    </HoverableCard>

                    <HoverableCard
                        theme={theme}
                        style={[cardStyle, { backgroundColor: theme.surface, borderColor: theme.border }]}
                        onPress={() => router.push('/folder/create' as any)}
                    >
                        <View style={[
                            styles.iconContainer,
                            {
                                backgroundColor: theme.iconBg,
                                width: isMobile ? 52 : 64,
                                height: isMobile ? 52 : 64,
                            }
                        ]}>
                            <Ionicons name="folder-outline" size={isMobile ? 26 : 32} color={theme.primary} />
                        </View>
                        <View style={styles.optionTextContainer}>
                            <Text style={[styles.optionTitle, { color: theme.text, fontSize: isMobile ? 17 : 20 }]}>
                                Thư mục
                            </Text>
                            <Text style={[styles.optionSubtitle, { color: theme.textMuted, fontSize: isMobile ? 13 : 15 }]}>
                                Tổ chức và nhóm các học phần của bạn lại với nhau để dễ dàng quản lý.
                            </Text>
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
    },
    contentWrapper: {
        width: '100%',
        maxWidth: 900,
    },
    headerTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        lineHeight: 22,
    },
    gridContent: {
        flexWrap: 'wrap',
    },
    iconContainer: {
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        flexShrink: 0,
    },
    optionTextContainer: {
        flex: 1,
        paddingTop: 4,
    },
    optionTitle: {
        fontWeight: 'bold',
        marginBottom: 6,
    },
    optionSubtitle: {
        lineHeight: 20,
    },
});
