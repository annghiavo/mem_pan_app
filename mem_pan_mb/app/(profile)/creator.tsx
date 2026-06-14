import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, useColorScheme, TextInput, Alert, Image, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
    BillingBank,
    createMyWithdrawal,
    getBillingBanks,
    getCreatorProfile,
    getCurrentUser,
    getMyBalanceHistory,
    getMyEarningsSummary,
    getMyPayoutAccount,
    upsertCreatorProfile,
    upsertMyPayoutAccount,
    CreatorBalanceHistoryItem,
    CreatorEarningsSummary,
} from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';

const bankLabel = (bank: BillingBank) => `${bank.short_name} - ${bank.name} (${bank.bin})`;

const formatVND = (amount: number) => {
    try {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(amount || 0);
    } catch {
        return `${Math.round(amount || 0).toLocaleString('vi-VN')} VND`;
    }
};

const MINIMUM_WITHDRAWAL = 1000; // dev testing; production = 100000

const withdrawalSuccessMessage = (amount: number, status?: string) => {
    const normalized = (status || '').trim().toLowerCase();
    if (normalized === 'paid') {
        return `Đã rút ${formatVND(amount)} thành công.`;
    }
    return `Yêu cầu rút ${formatVND(amount)} đã được gửi. Trạng thái: ${status || 'processing'}`;
};

const formatHistoryDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};

const historyTitle = (item: CreatorBalanceHistoryItem) => {
    if (item.type === 'earning_credit') {
        return `Doanh thu tháng ${item.pool_month || ''}`.trim();
    }
    return item.withdrawal_status === 'paid' ? 'Rút tiền thành công' : 'Yêu cầu rút tiền';
};

const historyStatusLabel = (item: CreatorBalanceHistoryItem) => {
    if (item.type === 'earning_credit') return item.earning_status || item.ledger_status;
    if (item.withdrawal_status === 'paid') return 'Đã rút';
    if (item.withdrawal_status === 'failed') return 'Thất bại';
    return item.payos_payout_state || item.withdrawal_status || item.ledger_status;
};

export default function CreatorDashboardScreen() {
    const router = useRouter();
    const [earningsSummary, setEarningsSummary] = useState<CreatorEarningsSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [banksLoading, setBanksLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [banks, setBanks] = useState<BillingBank[]>([]);
    const [bankQuery, setBankQuery] = useState('');
    const [selectedBankBin, setSelectedBankBin] = useState('');
    const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
    const [bankAccountNumber, setBankAccountNumber] = useState('');
    const [bankAccountName, setBankAccountName] = useState('');

    // Withdrawal state
    const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawing, setWithdrawing] = useState(false);
    const [showConfirmStep, setShowConfirmStep] = useState(false);
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyItems, setHistoryItems] = useState<CreatorBalanceHistoryItem[]>([]);

    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#111111' : '#f8f9fa',
        surface: isDark ? '#1c1c1e' : '#ffffff',
        surfaceAlt: isDark ? '#27272a' : '#f9fafb',
        text: isDark ? '#f4f4f5' : '#1f2937',
        textMuted: isDark ? '#a1a1aa' : '#6b7280',
        border: isDark ? '#27272a' : '#f3f4f6',
        primary: '#5865F2',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
    };

    const selectedBank = useMemo(
        () => banks.find((bank) => bank.bin === selectedBankBin),
        [banks, selectedBankBin]
    );

    const filteredBanks = useMemo(() => {
        const q = bankQuery.trim().toLowerCase();
        const list = q
            ? banks.filter((bank) => {
                const haystack = `${bank.short_name} ${bank.name} ${bank.code} ${bank.bin}`.toLowerCase();
                return haystack.includes(q);
            })
            : banks;
        return list.slice(0, 12);
    }, [banks, bankQuery]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            await Promise.all([fetchProfile(), fetchEarningsSummary(), fetchBanks(), fetchPayoutAccount()]);
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const userRes = await getCurrentUser();
            const userData = userRes.user || userRes.data || userRes;
            if (userData?.id) {
                const data = await getCreatorProfile(userData.id);
                if (data?.profile) {
                    setDisplayName(data.profile.displayName || '');
                    setBio(data.profile.bio || '');
                }
            }
        } catch (error) {
            console.error('Failed to fetch creator profile', error);
        }
    };

    const fetchEarningsSummary = async () => {
        try {
            const summary = await getMyEarningsSummary(true);
            setEarningsSummary(summary || null);
        } catch (error) {
            console.error('Failed to fetch creator earnings summary', error);
            setEarningsSummary(null);
        }
    };

    const fetchBanks = async () => {
        try {
            setBanksLoading(true);
            const list = await getBillingBanks();
            setBanks(list);
        } catch (error) {
            console.error('Failed to fetch billing banks', error);
        } finally {
            setBanksLoading(false);
        }
    };

    const fetchPayoutAccount = async () => {
        try {
            const account = await getMyPayoutAccount(true);
            if (!account?.bank_bin) return;
            setSelectedBankBin(account.bank_bin || '');
            setBankQuery(account.bank_short_name || account.bank_name || account.bank_bin || '');
            setBankAccountNumber(account.account_number || '');
            setBankAccountName(account.account_name || '');
        } catch (error: any) {
            if (error?.status !== 404) {
                console.error('Failed to fetch payout account', error);
            }
        }
    };

    const selectBank = (bank: BillingBank) => {
        setSelectedBankBin(bank.bin);
        setBankQuery(bankLabel(bank));
        setBankDropdownOpen(false);
    };

    const handleBankQueryChange = (value: string) => {
        setBankQuery(value);
        setBankDropdownOpen(true);
        const exact = banks.find((bank) => bankLabel(bank).toLowerCase() === value.trim().toLowerCase());
        setSelectedBankBin(exact?.bin || '');
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await upsertCreatorProfile({ displayName, bio });

            const hasPayoutFields = Boolean(bankQuery.trim() || bankAccountNumber.trim() || bankAccountName.trim());
            if (hasPayoutFields) {
                const bank = selectedBank;
                if (!bank) {
                    Alert.alert('Thiếu ngân hàng', 'Vui lòng chọn ngân hàng từ danh sách gợi ý.');
                    return;
                }
                if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
                    Alert.alert('Thiếu thông tin', 'Vui lòng nhập số tài khoản và tên chủ tài khoản.');
                    return;
                }
                await upsertMyPayoutAccount({
                    bank_bin: bank.bin,
                    bank_code: bank.code,
                    bank_short_name: bank.short_name,
                    bank_name: bank.name,
                    bank_logo: bank.logo || '',
                    account_number: bankAccountNumber.trim(),
                    account_name: bankAccountName.trim(),
                });
            }

            Alert.alert('Thành công', 'Đã lưu hồ sơ Creator và thông tin nhận tiền');
            fetchInitialData();
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể lưu hồ sơ.');
        } finally {
            setSaving(false);
        }
    };

    const executeWithdrawal = async (amount: number) => {
        setWithdrawing(true);
        try {
            const result = await createMyWithdrawal({ amount_vnd: amount });
            setWithdrawalModalVisible(false);
            setShowConfirmStep(false);
            setWithdrawAmount('');
            // Update balance from response
            if (result.balance) {
                setEarningsSummary(result.balance);
            } else {
                await fetchEarningsSummary();
            }
            const message = withdrawalSuccessMessage(amount, result.status);
            if (Platform.OS === 'web') {
                window.alert(message);
            } else {
                Alert.alert('Thành công', message);
            }
        } catch (error: any) {
            const errorMsg = error.message || 'Không thể rút tiền lúc này.';
            if (Platform.OS === 'web') {
                window.alert(`Lỗi rút tiền: ${errorMsg}`);
            } else {
                Alert.alert('Lỗi rút tiền', errorMsg);
            }
        } finally {
            setWithdrawing(false);
        }
    };

    const handleWithdraw = async () => {
        const amount = parseInt(withdrawAmount.replace(/\D/g, ''), 10);
        if (!amount || isNaN(amount)) {
            if (Platform.OS === 'web') {
                window.alert('Lỗi: Vui lòng nhập số tiền hợp lệ.');
            } else {
                Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ.');
            }
            return;
        }
        if (amount < MINIMUM_WITHDRAWAL) {
            if (Platform.OS === 'web') {
                window.alert(`Số tiền quá nhỏ: Số tiền rút tối thiểu là ${formatVND(MINIMUM_WITHDRAWAL)}.`);
            } else {
                Alert.alert('Số tiền quá nhỏ', `Số tiền rút tối thiểu là ${formatVND(MINIMUM_WITHDRAWAL)}.`);
            }
            return;
        }
        const available = earningsSummary?.available_balance_vnd || 0;
        if (amount > available) {
            if (Platform.OS === 'web') {
                window.alert(`Không đủ số dư: Số dư khả dụng chỉ còn ${formatVND(available)}.`);
            } else {
                Alert.alert('Không đủ số dư', `Số dư khả dụng chỉ còn ${formatVND(available)}.`);
            }
            return;
        }
        if (!selectedBank || !bankAccountNumber.trim() || !bankAccountName.trim()) {
            if (Platform.OS === 'web') {
                window.alert('Thiếu thông tin: Vui lòng thiết lập thông tin nhận tiền trước khi rút.');
            } else {
                Alert.alert('Thiếu thông tin', 'Vui lòng thiết lập thông tin nhận tiền trước khi rút.');
            }
            return;
        }

        // Chuyển sang bước xác nhận trên UI, không dùng blocking dialog
        setShowConfirmStep(true);
    };

    const openHistory = async () => {
        setHistoryModalVisible(true);
        setHistoryLoading(true);
        try {
            const result = await getMyBalanceHistory(120, 0, true);
            setHistoryItems(result.items || []);
        } catch (error: any) {
            const errorMsg = error.message || 'Không thể tải lịch sử giao dịch.';
            if (Platform.OS === 'web') {
                window.alert(`Lỗi tải lịch sử: ${errorMsg}`);
            } else {
                Alert.alert('Lỗi tải lịch sử', errorMsg);
            }
        } finally {
            setHistoryLoading(false);
        }
    };

    const canWithdraw = (earningsSummary?.available_balance_vnd || 0) >= MINIMUM_WITHDRAWAL && !!selectedBank && !!bankAccountNumber.trim();

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
            </WebContainer>

            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
                    <WebContainer maxWidth={720} paddingHorizontal={0}>
                        {/* === Balance Overview === */}
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Số dư</Text>
                        <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <View style={styles.balanceMain}>
                                <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>Khả dụng</Text>
                                <Text style={[styles.balanceAmount, { color: theme.success }]}>
                                    {formatVND(earningsSummary?.available_balance_vnd || 0)}
                                </Text>
                            </View>
                            <View style={styles.balanceRow}>
                                <View style={styles.balanceItem}>
                                    <Text style={[styles.balanceSmallLabel, { color: theme.textMuted }]}>Tổng đã kiếm</Text>
                                    <Text style={[styles.balanceSmallValue, { color: theme.text }]}>
                                        {formatVND(earningsSummary?.total_earned_amount_vnd || 0)}
                                    </Text>
                                </View>
                                <View style={styles.balanceItem}>
                                    <Text style={[styles.balanceSmallLabel, { color: theme.textMuted }]}>Đã rút</Text>
                                    <Text style={[styles.balanceSmallValue, { color: theme.text }]}>
                                        {formatVND(earningsSummary?.total_withdrawn_amount_vnd || 0)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.historyButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                            onPress={openHistory}
                        >
                            <Ionicons name="receipt-outline" size={19} color={theme.primary} />
                            <Text style={[styles.historyButtonText, { color: theme.primary }]}>Lịch sử giao dịch</Text>
                            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
                        </TouchableOpacity>

                        {/* Stats row */}
                        <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: theme.text }]}>{earningsSummary?.current_learners || 0}</Text>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Người học hiện tại</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statValue, { color: theme.textMuted, fontSize: 14 }]}>
                                    {earningsSummary?.latest_pool_month || '—'}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textMuted }]}>Kỳ gần nhất</Text>
                            </View>
                        </View>

                        {/* Withdraw Button */}
                        <TouchableOpacity
                            style={[styles.withdrawButton, { backgroundColor: canWithdraw ? theme.primary : theme.border }]}
                            disabled={!canWithdraw}
                            onPress={() => { setWithdrawAmount(''); setShowConfirmStep(false); setWithdrawalModalVisible(true); }}
                        >
                            <Ionicons name="wallet-outline" size={20} color={canWithdraw ? '#fff' : theme.textMuted} />
                            <Text style={[styles.withdrawButtonText, { color: canWithdraw ? '#fff' : theme.textMuted }]}>
                                Rút tiền
                            </Text>
                        </TouchableOpacity>
                        {!canWithdraw && (
                            <Text style={[styles.withdrawHint, { color: theme.textMuted }]}>
                                {!selectedBank || !bankAccountNumber.trim()
                                    ? 'Thiết lập thông tin nhận tiền bên dưới trước khi rút.'
                                    : `Cần tối thiểu ${formatVND(MINIMUM_WITHDRAWAL)} để rút.`}
                            </Text>
                        )}

                        {/* Profile Section */}
                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 28 }]}>Thông tin hiển thị</Text>
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

                        {/* Payout Account Section */}
                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 24 }]}>Thông tin nhận tiền (Payout)</Text>
                        <View style={styles.fieldBlock}>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
                                placeholder={banksLoading ? 'Đang tải danh sách ngân hàng...' : 'Tìm ngân hàng theo tên, mã hoặc BIN'}
                                placeholderTextColor={theme.textMuted}
                                value={bankQuery}
                                onChangeText={handleBankQueryChange}
                                onFocus={() => setBankDropdownOpen(true)}
                                autoCorrect={false}
                            />
                            {bankDropdownOpen && filteredBanks.length > 0 ? (
                                <View style={[styles.bankDropdown, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                                    {filteredBanks.map((bank) => (
                                        <TouchableOpacity key={bank.bin} style={styles.bankOption} onPress={() => selectBank(bank)}>
                                            {bank.logo ? <Image source={{ uri: bank.logo }} style={styles.bankLogo} /> : <View style={[styles.bankLogoFallback, { backgroundColor: theme.surfaceAlt }]} />}
                                            <View style={styles.bankTextWrap}>
                                                <Text style={[styles.bankShortName, { color: theme.text }]}>{bank.short_name} ({bank.bin})</Text>
                                                <Text style={[styles.bankFullName, { color: theme.textMuted }]} numberOfLines={1}>{bank.name}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ) : null}
                        </View>
                        {selectedBank ? (
                            <View style={[styles.selectedBankCard, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
                                {selectedBank.logo ? <Image source={{ uri: selectedBank.logo }} style={styles.selectedBankLogo} /> : null}
                                <View style={styles.bankTextWrap}>
                                    <Text style={[styles.bankShortName, { color: theme.text }]}>{selectedBank.short_name} - BIN {selectedBank.bin}</Text>
                                    <Text style={[styles.bankFullName, { color: theme.textMuted }]}>{selectedBank.name}</Text>
                                </View>
                            </View>
                        ) : null}
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
                    </WebContainer>
                </ScrollView>
            )}

                {/* Balance History Modal */}
                <Modal visible={historyModalVisible} transparent animationType="fade" onRequestClose={() => setHistoryModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, styles.historyModalContent, { backgroundColor: theme.surface }]}>
                            <View style={styles.historyHeader}>
                                <View>
                                    <Text style={[styles.modalTitle, { color: theme.text }]}>Lịch sử giao dịch</Text>
                                    <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                                        Doanh thu hạch toán và các lần rút tiền
                                    </Text>
                                </View>
                                <TouchableOpacity style={[styles.iconButton, { backgroundColor: theme.surfaceAlt }]} onPress={() => setHistoryModalVisible(false)}>
                                    <Ionicons name="close" size={20} color={theme.text} />
                                </TouchableOpacity>
                            </View>

                            <View style={[styles.historySummary, { backgroundColor: theme.surfaceAlt }]}>
                                <View style={styles.historySummaryItem}>
                                    <Text style={[styles.balanceSmallLabel, { color: theme.textMuted }]}>Đã kiếm</Text>
                                    <Text style={[styles.balanceSmallValue, { color: theme.text }]}>{formatVND(earningsSummary?.total_earned_amount_vnd || 0)}</Text>
                                </View>
                                <View style={styles.historySummaryItem}>
                                    <Text style={[styles.balanceSmallLabel, { color: theme.textMuted }]}>Đã rút</Text>
                                    <Text style={[styles.balanceSmallValue, { color: theme.text }]}>{formatVND(earningsSummary?.total_withdrawn_amount_vnd || 0)}</Text>
                                </View>
                                <View style={styles.historySummaryItem}>
                                    <Text style={[styles.balanceSmallLabel, { color: theme.textMuted }]}>Khả dụng</Text>
                                    <Text style={[styles.balanceSmallValue, { color: theme.success }]}>{formatVND(earningsSummary?.available_balance_vnd || 0)}</Text>
                                </View>
                            </View>

                            {historyLoading ? (
                                <View style={styles.historyLoading}>
                                    <ActivityIndicator size="small" color={theme.primary} />
                                </View>
                            ) : (
                                <ScrollView style={styles.historyList} contentContainerStyle={styles.historyListContent}>
                                    {historyItems.length === 0 ? (
                                        <Text style={[styles.emptyHistoryText, { color: theme.textMuted }]}>Chưa có giao dịch.</Text>
                                    ) : (
                                        historyItems.map((item) => {
                                            const isEarning = item.type === 'earning_credit';
                                            const amountColor = isEarning ? theme.success : theme.danger;
                                            const amountPrefix = isEarning ? '+' : '-';
                                            return (
                                                <View key={item.transaction_id} style={[styles.historyItem, { borderColor: theme.border }]}>
                                                    <View style={[styles.historyIcon, { backgroundColor: isEarning ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)' }]}>
                                                        <Ionicons name={isEarning ? 'trending-up-outline' : 'wallet-outline'} size={18} color={amountColor} />
                                                    </View>
                                                    <View style={styles.historyBody}>
                                                        <View style={styles.historyTopRow}>
                                                            <Text style={[styles.historyTitle, { color: theme.text }]} numberOfLines={1}>
                                                                {historyTitle(item)}
                                                            </Text>
                                                            <Text style={[styles.historyAmount, { color: amountColor }]}>
                                                                {amountPrefix}{formatVND(item.absolute_amount_vnd)}
                                                            </Text>
                                                        </View>
                                                        <Text style={[styles.historyMeta, { color: theme.textMuted }]}>
                                                            {formatHistoryDate(item.occurred_at)} • {historyStatusLabel(item)}
                                                        </Text>
                                                        {isEarning ? (
                                                            <Text style={[styles.historyMeta, { color: theme.textMuted }]}>
                                                                {item.eligible_learners || 0} người học • điểm {item.weighted_score || '0'}
                                                            </Text>
                                                        ) : (
                                                            <Text style={[styles.historyMeta, { color: theme.textMuted }]} numberOfLines={1}>
                                                                {item.payout_to_bin || '—'} • {item.payout_to_account_number || '—'}{item.payos_payout_state ? ` • ${item.payos_payout_state}` : ''}
                                                            </Text>
                                                        )}
                                                        {item.payout_failed_reason ? (
                                                            <Text style={[styles.historyError, { color: theme.danger }]} numberOfLines={2}>{item.payout_failed_reason}</Text>
                                                        ) : null}
                                                    </View>
                                                </View>
                                            );
                                        })
                                    )}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </Modal>

                {/* Withdrawal Modal */}
                <Modal visible={withdrawalModalVisible} transparent animationType="fade" onRequestClose={() => setWithdrawalModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
                             <Text style={[styles.modalTitle, { color: theme.text }]}>
                                 {showConfirmStep ? 'Xác nhận rút tiền' : 'Rút tiền'}
                             </Text>
 
                             {showConfirmStep ? (
                                 <View style={{ marginVertical: 12 }}>
                                     <Text style={[styles.modalSubtitle, { color: theme.text, fontSize: 15, textAlign: 'center', marginBottom: 12, lineHeight: 22 }]}>
                                         Bạn có chắc chắn muốn rút <Text style={{ fontWeight: 'bold', color: theme.success }}>{formatVND(parseInt(withdrawAmount.replace(/\D/g, ''), 10))}</Text> về tài khoản ngân hàng sau?
                                     </Text>
                                     {selectedBank && bankAccountNumber ? (
                                         <View style={[styles.modalAccountInfo, { backgroundColor: theme.surfaceAlt, borderColor: theme.border, marginVertical: 8, padding: 16 }]}>
                                             <Text style={[styles.modalAccountText, { color: theme.text, fontWeight: '700', fontSize: 16 }]}>
                                                 {selectedBank.short_name} • {bankAccountNumber}
                                             </Text>
                                             <Text style={[styles.modalAccountText, { color: theme.textMuted, fontSize: 14, marginTop: 6, textTransform: 'uppercase' }]}>
                                                 {bankAccountName}
                                             </Text>
                                         </View>
                                     ) : null}
                                 </View>
                             ) : (
                                 <>
                                     <Text style={[styles.modalSubtitle, { color: theme.textMuted }]}>
                                         Khả dụng: {formatVND(earningsSummary?.available_balance_vnd || 0)}
                                     </Text>
                                     <Text style={[styles.modalSubtitle, { color: theme.textMuted, marginTop: 2, marginBottom: 16, fontSize: 12 }]}>
                                         Tối thiểu: {formatVND(MINIMUM_WITHDRAWAL)}
                                     </Text>
 
                                     <TextInput
                                         style={[styles.input, styles.amountInput, { backgroundColor: theme.surfaceAlt, color: theme.text, borderColor: theme.border }]}
                                         placeholder="Nhập số tiền (VND)"
                                         placeholderTextColor={theme.textMuted}
                                         value={withdrawAmount}
                                         onChangeText={setWithdrawAmount}
                                         keyboardType="numeric"
                                         autoFocus
                                     />
 
                                     {selectedBank && bankAccountNumber ? (
                                         <View style={[styles.modalAccountInfo, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}>
                                             <Text style={[styles.modalAccountText, { color: theme.text }]}>
                                                 {selectedBank.short_name} • {bankAccountNumber}
                                             </Text>
                                             <Text style={[styles.modalAccountText, { color: theme.textMuted, fontSize: 13 }]}>
                                                 {bankAccountName}
                                             </Text>
                                         </View>
                                     ) : null}
                                 </>
                             )}
 
                             <View style={styles.modalActions}>
                                 <TouchableOpacity
                                     style={[styles.modalBtn, { backgroundColor: theme.border }]}
                                     onPress={() => showConfirmStep ? setShowConfirmStep(false) : setWithdrawalModalVisible(false)}
                                 >
                                     <Text style={[styles.modalBtnText, { color: theme.text }]}>
                                         {showConfirmStep ? 'Quay lại' : 'Huỷ'}
                                     </Text>
                                 </TouchableOpacity>
                                 <TouchableOpacity
                                     style={[styles.modalBtn, { backgroundColor: theme.primary, opacity: withdrawing ? 0.6 : 1 }]}
                                     onPress={() => showConfirmStep ? executeWithdrawal(parseInt(withdrawAmount.replace(/\D/g, ''), 10)) : handleWithdraw()}
                                     disabled={withdrawing}
                                 >
                                     {withdrawing
                                         ? <ActivityIndicator size="small" color="#fff" />
                                         : <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                                             {showConfirmStep ? 'Xác nhận rút' : 'Tiếp tục'}
                                         </Text>
                                     }
                                 </TouchableOpacity>
                             </View>
                        </View>
                    </View>
                </Modal>
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

    // Balance card
    balanceCard: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
    balanceMain: { alignItems: 'center', marginBottom: 16 },
    balanceLabel: { fontSize: 14, marginBottom: 4 },
    balanceAmount: { fontSize: 28, fontWeight: 'bold' },
    balanceRow: { flexDirection: 'row', justifyContent: 'space-between' },
    balanceItem: { flex: 1, alignItems: 'center' },
    balanceSmallLabel: { fontSize: 12, marginBottom: 2, textAlign: 'center' },
    balanceSmallValue: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
    historyButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, marginBottom: 16, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyButtonText: { flex: 1, fontSize: 15, fontWeight: '700' },

    // Stats
    statsCard: { flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
    statItem: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
    statLabel: { fontSize: 13, textAlign: 'center' },

    // Withdraw
    withdrawButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginBottom: 6 },
    withdrawButtonText: { fontSize: 16, fontWeight: '700' },
    withdrawHint: { fontSize: 12, textAlign: 'center', marginBottom: 16 },

    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    input: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 12, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    fieldBlock: { position: 'relative', zIndex: 5 },
    bankDropdown: { borderWidth: 1, borderRadius: 12, marginTop: -8, marginBottom: 12, overflow: 'hidden' },
    bankOption: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
    bankLogo: { width: 36, height: 36, resizeMode: 'contain' },
    bankLogoFallback: { width: 36, height: 36, borderRadius: 8 },
    bankTextWrap: { flex: 1, minWidth: 0 },
    bankShortName: { fontSize: 14, fontWeight: '700' },
    bankFullName: { fontSize: 12, marginTop: 2 },
    selectedBankCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
    selectedBankLogo: { width: 40, height: 40, resizeMode: 'contain' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 24 },
    historyModalContent: { maxWidth: 560, maxHeight: '86%', padding: 18 },
    historyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
    iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    historySummary: { flexDirection: 'row', borderRadius: 12, padding: 12, marginBottom: 12 },
    historySummaryItem: { flex: 1, alignItems: 'center' },
    historyLoading: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
    historyList: { maxHeight: 520 },
    historyListContent: { paddingBottom: 4 },
    emptyHistoryText: { textAlign: 'center', paddingVertical: 36, fontSize: 14 },
    historyItem: { flexDirection: 'row', gap: 10, borderBottomWidth: 1, paddingVertical: 12 },
    historyIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    historyBody: { flex: 1, minWidth: 0 },
    historyTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    historyTitle: { flex: 1, fontSize: 14, fontWeight: '700' },
    historyAmount: { fontSize: 14, fontWeight: '800' },
    historyMeta: { fontSize: 12, marginTop: 3 },
    historyError: { fontSize: 12, marginTop: 4 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    modalSubtitle: { fontSize: 14 },
    amountInput: { fontSize: 22, fontWeight: '600', textAlign: 'center', paddingVertical: 18 },
    modalAccountInfo: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 16 },
    modalAccountText: { fontSize: 14, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 12 },
    modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    modalBtnText: { fontSize: 16, fontWeight: '600' },
});
