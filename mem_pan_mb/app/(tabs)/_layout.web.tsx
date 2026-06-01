import React, { useState, useEffect } from 'react';
import { View, StyleSheet, useColorScheme, Text, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../services/api';

const MOBILE_BREAKPOINT = 768;

export default function TabLayoutWeb() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const router = useRouter();
    const pathname = usePathname();

    const { width } = useWindowDimensions();
    const isMobile = width < MOBILE_BREAKPOINT;
    const [menuOpen, setMenuOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [username, setUsername] = useState('');

    useEffect(() => {
        getCurrentUser().then(data => {
            const u = data.user || data.data || data;
            if (u?.username) setUsername(u.username);
            if (u?.avatarUrl) setAvatarUrl(u.avatarUrl);
        }).catch(() => {});
    }, []);

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

    // Navigate and (on mobile) collapse the drawer so it stops blocking the screen.
    const navigateTo = (route: string) => {
        router.push(route as any);
        if (isMobile) setMenuOpen(false);
    };

    const sidebar = (
        <View
            style={[
                styles.sidebar,
                { backgroundColor: theme.surface, borderRightColor: theme.border },
                isMobile && styles.sidebarMobile,
            ]}
        >
            <View style={styles.logoRow}>
                <Text style={[styles.logoText, { color: theme.primary }]}>Mem Pan</Text>
                {isMobile && (
                    <TouchableOpacity
                        onPress={() => setMenuOpen(false)}
                        style={styles.iconButton}
                        accessibilityLabel="Đóng menu"
                    >
                        <Ionicons name="close" size={26} color={theme.text} />
                    </TouchableOpacity>
                )}
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
                            onPress={() => navigateTo(item.route)}
                        />
                    );
                })}
            </View>

            {/* Bottom Avatar / Settings */}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.profileSection} onPress={() => navigateTo('/(profile)')}>
                <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                    ) : username ? (
                        <Text style={styles.avatarText}>{username.charAt(0).toUpperCase()}</Text>
                    ) : (
                        <Ionicons name="person" size={20} color="#fff" />
                    )}
                </View>
                <Text style={[styles.profileText, { color: theme.text }]}>Hồ sơ</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Desktop: fixed sidebar always visible */}
            {!isMobile && sidebar}

            {/* Main Content Area */}
            <View style={[styles.mainContent, { backgroundColor: theme.background }]}>
                {/* Mobile: top bar with hamburger to reveal the menu */}
                {isMobile && (
                    <View style={[styles.topBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
                        <TouchableOpacity
                            onPress={() => setMenuOpen(true)}
                            style={styles.iconButton}
                            accessibilityLabel="Mở menu"
                        >
                            <Ionicons name="menu" size={26} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.logoText, { color: theme.primary }]}>Mem Pan</Text>
                    </View>
                )}
                <View style={styles.contentInner}>
                    <Slot />
                </View>
            </View>

            {/* Mobile: collapsible drawer overlay */}
            {isMobile && menuOpen && (
                <View style={styles.overlay}>
                    <TouchableOpacity
                        style={styles.backdrop}
                        activeOpacity={1}
                        onPress={() => setMenuOpen(false)}
                        accessibilityLabel="Đóng menu"
                    />
                    {sidebar}
                </View>
            )}
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
    sidebarMobile: {
        // Inside the overlay the drawer should fill the column height.
        height: '100%',
        maxWidth: '80%',
        // @ts-ignore
        boxShadow: '2px 0 16px rgba(0,0,0,0.25)',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        flexDirection: 'column',
        overflow: 'hidden',
    },
    contentInner: {
        flex: 1,
        overflow: 'auto', // Web specific scrolling within the main view
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        flexShrink: 0,
    },
    iconButton: {
        padding: 6,
        borderRadius: 8,
        cursor: 'pointer',
    },
    overlay: {
        // @ts-ignore
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        zIndex: 1000,
    },
    backdrop: {
        // @ts-ignore
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        cursor: 'pointer',
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
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    profileText: {
        fontSize: 16,
        fontWeight: '500',
    }
});
