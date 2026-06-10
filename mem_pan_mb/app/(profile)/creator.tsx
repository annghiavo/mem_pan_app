import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, useColorScheme, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCreatorProfile, upsertCreatorProfile, getCurrentUser } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

export default function CreatorDashboardScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form states
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#f3f4f6',
        primary: '#5865F2',
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const userRes = await getCurrentUser();
            const userData = userRes.user || userRes.data || userRes;
            if (userData?.id) {
                const data = await getCreatorProfile(userData.id);
                if (data?.profile) {
                    setProfile(data.profile);
                    setDisplayName(data.profile.displayName || '');
                    setBio(data.profile.bio || '');
                    setBankName(data.profile.bankName || '');
                    setBankAccountNumber(data.profile.bankAccountNumber || '');
                    setBankAccountName(data.profile.bankAccountName || '');
                }
            }
        } catch (error) {
            console.error('Failed to fetch creator profile', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await upsertCreatorProfile({
                displayName,
                bio,
                bankName,
                bankAccountNumber,
                bankAccountName
            });
            Alert.alert('Thành công', 'Đã lưu hồ sơ Creator');
            fetchProfile();
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể lưu hồ sơ.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <WebContainer maxWidth={720}>
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Creator Dashboard</Text>
                    <TouchableOpacity onPress={handleSave} disabled={saving}>
                        {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.saveText, { color: theme.primary }]}>Lưu</Text>}
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (
                    <ScrollView style={styles.content}>
                        <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: theme.text }]}>{profile?.followerCount || 0}</Text>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Người theo dõi</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: theme.primary }]}>{profile?.tier === 'partner' ? 'Partner' : 'Standard'}</Text>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Hạng</Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Thông tin hiển thị</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="Tên hiển thị"
                            placeholderTextColor={theme.textMuted}
                            value={displayName}
                            onChangeText={setDisplayName}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="Giới thiệu bản thân (Bio)"
                            placeholderTextColor={theme.textMuted}
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={4}
                        />

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Thông tin nhận tiền (Payout)</Text>
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="Ngân hàng (vd: Vietcombank)"
                            placeholderTextColor={theme.textMuted}
                            value={bankName}
                            onChangeText={setBankName}
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="Số tài khoản"
                            placeholderTextColor={theme.textMuted}
                            value={bankAccountNumber}
                            onChangeText={setBankAccountNumber}
                            keyboardType="numeric"
                        />
                        <TextInput
                            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                            placeholder="Tên chủ tài khoản"
                            placeholderTextColor={theme.textMuted}
                            value={bankAccountName}
                            onChangeText={setBankAccountName}
                            autoCapitalize="characters"
                        />
                        
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </WebContainer>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
    backButton: { padding: 8, marginLeft: -8 },
    headerTitle: { fontSize: 18, fontWeight: 'bold' },
    saveText: { fontSize: 16, fontWeight: 'bold' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { flex: 1, padding: 16 },
    statsCard: { flexDirection: 'row', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    statLabel: { fontSize: 14 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    input: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
});
