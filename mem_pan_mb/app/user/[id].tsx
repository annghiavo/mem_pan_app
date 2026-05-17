import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Modal, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { WebContainer } from '../../components/ui/WebContainer';
import { useThemeColor } from '../../hooks/use-theme-color';
import { ReportSheet } from '../../components/ui/ReportSheet';
import { getUserPublicProfile } from '../../services/api';

export default function UserProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();

    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        getUserPublicProfile(id as string)
            .then((res: any) => {
                setUser(res.user || res);
            })
            .catch(() => setUser(null))
            .finally(() => setLoading(false));
    }, [id]);

    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const [showReportSheet, setShowReportSheet] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');
    const muteColor = '#9ca3af';
    const primaryColor = '#5865F2';

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={primaryColor} />
                </View>
            </SafeAreaView>
        );
    }

    if (!user) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor }]}>
                <WebContainer maxWidth={720}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={textColor} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 }}>
                        <Text style={{ color: textColor }}>Không tìm thấy người dùng</Text>
                    </View>
                </WebContainer>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor }]}>
            <WebContainer maxWidth={720}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={textColor} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => setShowOptionsModal(true)}>
                        <Ionicons name="ellipsis-horizontal" size={24} color={textColor} />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* User Info */}
                    <View style={styles.userInfoContainer}>
                        <View style={styles.avatarWrapper}>
                            {user.avatarUrl ? (
                                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                            ) : (
                                <View style={[styles.avatarPlaceholder, { backgroundColor: primaryColor }]}>
                                    <Ionicons name="person" size={40} color="#fff" />
                                </View>
                            )}
                            <View style={styles.educationBadge}>
                                <Ionicons name="school" size={12} color="#fff" />
                            </View>
                        </View>
                        <Text style={[styles.userName, { color: textColor }]}>{user.username || user.fullName}</Text>
                    </View>

                    {/* Content */}
                    <View style={styles.contentContainer}>
                        {user.createdAt ? (
                            <Text style={[styles.dateText, { color: muteColor }]}>
                                Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                            </Text>
                        ) : null}
                        <Text style={[styles.emptyText, { color: muteColor }]}>Không có dữ liệu</Text>
                    </View>
                </ScrollView>
            </WebContainer>

            {/* Options Modal */}
            <Modal visible={showOptionsModal} transparent={true} animationType="fade">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowOptionsModal(false)}>
                    <View style={[styles.bottomSheet, { backgroundColor: '#fff' }]}>
                        <View style={styles.bottomSheetHandle} />
                        <TouchableOpacity style={styles.optionItem} onPress={() => {
                            setShowOptionsModal(false);
                            setShowReportSheet(true);
                        }}>
                            <Ionicons name="flag-outline" size={24} color="#ef4444" />
                            <Text style={[styles.optionText, { color: '#ef4444' }]}>Báo cáo người dùng này</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Report Sheet */}
            <ReportSheet
                visible={showReportSheet}
                onClose={() => setShowReportSheet(false)}
                targetType="user"
                targetId={id as string}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    iconButton: {
        padding: 8,
        borderRadius: 20,
    },
    userInfoContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 12,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    educationBadge: {
        position: 'absolute',
        top: 0,
        left: 0,
        backgroundColor: '#3b82f6',
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    tabsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    tab: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 8,
    },
    activeTab: {
        borderBottomWidth: 2,
        borderBottomColor: '#5865F2',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
    },
    contentContainer: {
        padding: 16,
    },
    dateText: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },
    cardsList: {
        gap: 12,
    },
    deckCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    deckTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    deckTermsCount: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 12,
    },
    deckAuthor: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    smallAvatar: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    deckAuthorName: {
        fontSize: 14,
        fontWeight: '500',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        paddingBottom: 40,
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e5e7eb',
        alignSelf: 'center',
        marginBottom: 20,
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    optionText: {
        fontSize: 18,
        marginLeft: 16,
    },
});
