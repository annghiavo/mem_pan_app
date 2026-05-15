import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { reportDeck, reportUser } from '../../services/api';
import { ThemedText } from '../themed-text';
import { useThemeColor } from '../../hooks/use-theme-color';

type ReportTarget = 'deck' | 'user';

interface ReportSheetProps {
    visible: boolean;
    onClose: () => void;
    targetType: ReportTarget;
    targetId: string;
}

const DECK_REASONS = [
    { label: 'Nội dung có thông tin không chính xác', value: 'misinformation' },
    { label: 'Nội dung không phù hợp', value: 'inappropriate_content' },
    { label: 'Nội dung được sử dụng để gian lận', value: 'other' },
    { label: 'Nó vi phạm quyền sở hữu tài sản trí tuệ của tôi', value: 'copyright_violation' },
];

const USER_REASONS = [
    { label: 'Tài khoản của người dùng này có chứa nội dung không phù hợp', value: 'inappropriate_content' },
    { label: 'Tôi thấy lo lắng về người dùng này', value: 'harassment' },
];

export function ReportSheet({ visible, onClose, targetType, targetId }: ReportSheetProps) {
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const backgroundColor = useThemeColor({}, 'background');
    const textColor = useThemeColor({}, 'text');

    const reasons = targetType === 'deck' ? DECK_REASONS : USER_REASONS;
    const title = targetType === 'deck' ? 'Báo cáo học phần này' : 'Báo cáo người dùng này';
    const subtitle = targetType === 'deck' ? 'Vì sao bạn lại báo cáo học phần này?' : 'Vì sao bạn lại báo cáo người dùng này?';

    const handleSubmit = async () => {
        if (!selectedReason) return;
        setLoading(true);
        try {
            if (targetType === 'deck') {
                await reportDeck(targetId, { reasonCategory: selectedReason });
            } else {
                await reportUser(targetId, { reasonCategory: selectedReason });
            }
            Alert.alert('Thành công', 'Cảm ơn bạn. Báo cáo đã được gửi để xem xét.', [{ text: 'Đóng', onPress: onClose }]);
            setSelectedReason(null);
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể gửi báo cáo. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setSelectedReason(null);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.sheet, { backgroundColor }]}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                            <Ionicons name="close" size={24} color={textColor} />
                        </TouchableOpacity>
                        <ThemedText style={styles.title}>{title}</ThemedText>
                        <View style={{ width: 40 }} />
                    </View>

                    <SafeAreaView style={{ flex: 1 }}>
                        <View style={styles.content}>
                            <ThemedText style={styles.subtitle}>{subtitle}</ThemedText>

                            <View style={styles.optionsList}>
                                {reasons.map((r, i) => (
                                    <TouchableOpacity
                                        key={i}
                                        style={styles.optionRow}
                                        onPress={() => setSelectedReason(r.value)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.radioContainer}>
                                            <View style={[
                                                styles.radio,
                                                selectedReason === r.value && styles.radioSelected
                                            ]} />
                                        </View>
                                        <ThemedText style={styles.optionText}>{r.label}</ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[
                                    styles.submitButton,
                                    !selectedReason && styles.submitButtonDisabled
                                ]}
                                onPress={handleSubmit}
                                disabled={!selectedReason || loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>Tiếp tục</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        height: '90%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 10,
        overflow: 'hidden', // Added to remove flat color bleeding on SafeAreaView
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#f8f9fa' // Slightly darker header based on the layout
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 20,
    },
    content: {
        padding: 24,
        flex: 1,
        backgroundColor: '#ffffff'
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 24,
    },
    optionsList: {
        marginBottom: 32,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    radioContainer: {
        marginRight: 16,
    },
    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
    },
    radioSelected: {
        borderColor: '#5865F2',
        borderWidth: 6,
    },
    optionText: {
        fontSize: 16,
        flex: 1,
    },
    submitButton: {
        backgroundColor: '#5865F2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 'auto',
    },
    submitButtonDisabled: {
        backgroundColor: '#f3f4f6',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
