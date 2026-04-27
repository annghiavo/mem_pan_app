import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch, Alert, ActivityIndicator, Platform, Linking, Modal, TextInput, Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, logoutUser, getRefreshToken, clearAuth, changePassword } from '../../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const colorScheme = useColorScheme();
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  // Dynamic Theme Colors
  const isDark = colorScheme === 'dark';
  const theme = {
    background: isDark ? '#111111' : '#f8f9fa',
    surface: isDark ? '#1c1c1e' : '#ffffff',
    text: isDark ? '#f4f4f5' : '#1f2937',
    textMuted: isDark ? '#a1a1aa' : '#6b7280',
    border: isDark ? '#27272a' : '#f3f4f6',
    borderStrong: isDark ? '#3f3f46' : '#e5e7eb',
    icon: isDark ? '#d4d4d8' : '#9ca3af',
    primary: '#5865F2',
  };

  useEffect(() => {
    fetchUser();
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme) {
        setIsDarkMode(savedTheme === 'dark');
        Appearance.setColorScheme(savedTheme as any);
      }
    } catch (e) { }
  };

  const toggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    const newTheme = value ? 'dark' : 'light';
    Appearance.setColorScheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (e) { }
  };

  const fetchUser = async () => {
    try {
      setLoading(true);
      const data = await getCurrentUser();
      setUser(data.user || data.data || data); // Handle potentially different API response shapes
    } catch (error) {
      console.error('Failed to fetch user', error);
      // If we fail to fetch the user (e.g. not logged in), we should handle it gracefully
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Đăng xuất",
          onPress: async () => {
            try {
              setLoggingOut(true);
              const refreshToken = getRefreshToken();
              if (refreshToken) {
                await logoutUser(refreshToken);
              }
            } catch (error) {
              console.error('Logout error', error);
            } finally {
              clearAuth();
              setLoggingOut(false);
              Alert.alert('Thành công', 'Đăng xuất thành công!');
              router.replace('/(auth)/login');
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Xóa tài khoản",
      "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa tài khoản vĩnh viễn?",
      [
        { text: "Hủy", style: "cancel" },
        { text: "Xóa", onPress: () => console.log("Delete account requested"), style: "destructive" }
      ]
    );
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu cũ và mới');
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(oldPassword, newPassword);
      Alert.alert('Thành công', 'Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  };

  const renderSettingItem = (title: string, value?: string, onPress?: () => void, isSwitch?: boolean, switchValue?: boolean, onSwitchChange?: (val: boolean) => void) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      disabled={isSwitch || !onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemContent}>
        <Text style={[styles.settingItemTitle, { color: theme.text }]}>{title}</Text>
        {!!value ? <Text style={[styles.settingItemValue, { color: theme.textMuted }]}>{value}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: theme.borderStrong, true: theme.primary }}
          thumbColor={Platform.OS === 'ios' ? '#ffffff' : (switchValue ? '#ffffff' : '#f4f3f4')}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={theme.icon} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Cài đặt</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Thông tin cá nhân</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            {renderSettingItem('Tên người dùng', user?.username || 'Người dùng', () => { })}
            {renderSettingItem('Email', user?.email || 'Chưa cập nhật', () => { })}
            {renderSettingItem('Đổi mật khẩu', undefined, () => setShowPasswordModal(true))}
          </View>

          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Giao diện</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            {renderSettingItem('Chế độ tối (Dark Mode)', undefined, undefined, true, isDarkMode, toggleDarkMode)}
          </View>

          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Ưu tiên</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            {renderSettingItem('Thông báo đẩy', undefined, undefined, true, pushNotifications, setPushNotifications)}
            {renderSettingItem('Hiệu ứng âm thanh', undefined, undefined, true, soundEffects, setSoundEffects)}
          </View>

          <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Dự án</Text>
          <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
            {renderSettingItem('Mã nguồn trên GitHub', undefined, () => {
              Linking.openURL('https://github.com/anprovip/mem_pan_app');
            })}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.logoutButton, { backgroundColor: isDark ? '#27272a' : '#f3f4f6' }]}
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <Text style={[styles.logoutButtonText, { color: theme.text }]}>Đăng xuất</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
              <Text style={styles.deleteButtonText}>Xóa tài khoản</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.versionContainer}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>Q</Text>
            </View>
            <Text style={[styles.versionText, { color: theme.textMuted }]}>v10.32</Text>
          </View>
        </ScrollView>
      )}

      {/* Change Password Modal */}
      <Modal visible={showPasswordModal} transparent={true} animationType="slide">
        <View style={[styles.fullScreenModal, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
              <Text style={[styles.cancelText, { color: theme.textMuted }]}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Đổi mật khẩu</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={styles.saveText}>Lưu</Text>}
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Mật khẩu cũ</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.borderStrong }]}
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Nhập mật khẩu cũ"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
            <Text style={[styles.inputLabel, { color: theme.text }]}>Mật khẩu mới</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.borderStrong }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nhập mật khẩu mới"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6b7280',
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemContent: {
    flex: 1,
  },
  settingItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  settingItemValue: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  actionsContainer: {
    marginTop: 32,
    gap: 12,
  },
  logoutButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b5563',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  versionContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#5865F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  fullScreenModal: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 50 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  cancelText: { fontSize: 16, color: '#6b7280' },
  saveText: { fontSize: 16, color: '#5865F2', fontWeight: 'bold' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  modalBody: { padding: 16 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 16 },
  textInput: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, fontSize: 16, color: '#1f2937', borderWidth: 1, borderColor: '#e5e7eb' }
});
