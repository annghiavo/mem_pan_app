import React, { useState } from 'react';
import { View, StyleSheet, useColorScheme, Text, TouchableOpacity, Platform } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayoutWeb() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const pathname = usePathname();

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#e5e7eb',
        primary: '#5865F2',
        hover: isDark ? '#3f3f46' : '#f3f4f6',
        activeOverlay: isDark ? 'rgba(88, 101, 242, 0.15)' : 'rgba(88, 101, 242, 0.1)',
    };

    const navItems = [
        { name: 'Trang chủ', route: '/', icon: 'home-outline', activeIcon: 'home' },
        { name: 'Tạo', route: '/create', icon: 'add-circle-outline', activeIcon: 'add-circle' },
        { name: 'Thư viện', route: '/library', icon: 'folder-outline', activeIcon: 'folder' },
    ];

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Sidebar for Desktop/Tablet */}
            <View style={[styles.sidebar, { backgroundColor: theme.surface, borderRightColor: theme.border }]}>
                <View style={styles.logoContainer}>
                    <Text style={[styles.logoText, { color: theme.primary }]}>MemPan</Text>
                </View>

                <View style={styles.navContainer}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.route || pathname.startsWith(item.route + '/') && item.route !== '/';
                        // Exception for '/' since everything starts with it
                        const exactActive = item.route === '/' ? pathname === '/' : isActive;
                        const iconName = exactActive ? item.activeIcon : item.icon;

                        return (
                            <NavItem
                                key={item.route}
                                item={item}
                                isActive={exactActive}
                                iconName={iconName}
                                theme={theme}
                                onPress={() => router.push(item.route as any)}
                            />
                        );
                    })}
                </View>

                {/* Bottom Avatar / Settings */}
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.profileSection} onPress={() => router.push('/(profile)' as any)}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={20} color="#fff" />
                    </View>
                    <Text style={[styles.profileText, { color: theme.text }]}>Hồ sơ</Text>
                </TouchableOpacity>
            </View>

            {/* Main Content Area */}
            <View style={[styles.mainContent, { backgroundColor: theme.background }]}>
                <Slot />
            </View>
        </View>
    );
}

// NavItem handles hover state natively on web via react-native-web
function NavItem({ item, isActive, iconName, theme, onPress }: any) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <TouchableOpacity
            activeOpacity={0.7}
            onPress={onPress}
            // @ts-ignore - React Native Web specific event
            onMouseEnter={() => setIsHovered(true)}
            // @ts-ignore
            onMouseLeave={() => setIsHovered(false)}
            style={[
                styles.navItem,
                (isHovered && !isActive) && { backgroundColor: theme.hover },
                isActive && { backgroundColor: theme.activeOverlay }
            ]}
        >
            <Ionicons
                name={iconName as any}
                size={24}
                color={isActive ? theme.primary : theme.textMuted}
            />
            <Text style={[
                styles.navText,
                { color: isActive ? theme.primary : theme.text },
                isActive && { fontWeight: '600' }
            ]}>
                {item.name}
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        // @ts-ignore
        height: '100vh',
        overflow: 'hidden',
    },
    sidebar: {
        width: 260,
        borderRightWidth: 1,
        paddingVertical: 24,
        paddingHorizontal: 16,
        flexShrink: 0,
        flexDirection: 'column',
        // @ts-ignore
        display: 'flex',
    },
    logoContainer: {
        marginBottom: 40,
        paddingHorizontal: 12,
    },
    logoText: {
        fontSize: 26,
        fontWeight: 'bold',
    },
    navContainer: {
        gap: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 16,
        cursor: 'pointer',
        transitionDuration: '0.2s', // Web specific
    },
    navText: {
        fontSize: 16,
        fontWeight: '500',
    },
    mainContent: {
        flex: 1,
        overflow: 'auto', // Web specific scrolling within the main view
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginTop: 20,
        borderRadius: 8,
        gap: 12,
        cursor: 'pointer',
    },
    avatarPlaceholder: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#5865F2',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileText: {
        fontSize: 16,
        fontWeight: '500',
    }
});
