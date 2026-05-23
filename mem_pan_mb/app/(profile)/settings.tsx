import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch, ActivityIndicator, Platform, Linking, Modal, TextInput, Appearance, useColorScheme, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUser, logoutUser, getRefreshToken, clearAuth, changePassword, uploadAvatar, registerDeviceToken, unregisterDeviceToken, sendTestNotification } from '../../services/api';
import { WebContainer } from '../../components/ui/WebContainer';
import { showAlert, showConfirm } from '../../utils/alert';

// Firebase messaging is not available on web
let messaging: any = null;
if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (e) {
    console.warn('Firebase messaging not available');
  }
}

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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const pushPref = await AsyncStorage.getItem('pushNotificationsEnabled');
      if (pushPref !== null) setPushNotifications(pushPref === 'true');

      const soundPref = await AsyncStorage.getItem('soundEffectsEnabled');
      if (soundPref !== null) setSoundEffects(soundPref === 'true');
    } catch (e) { }
  };

  const handlePushNotificationsToggle = async (value: boolean) => {
    if (Platform.OS === 'web' || !messaging) {
      showAlert('Không hỗ trợ', 'Thông báo đẩy chỉ hoạt động trên ứng dụng di động.');
      return;
    }
    if (value) {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        showAlert('Cần cấp quyền', 'Vui lòng bật thông báo trong cài đặt điện thoại.');
        return;
      }

      try {
        const token = await messaging().getToken();
        await registerDeviceToken(token, Platform.OS);
        await AsyncStorage.setItem('fcmToken', token);
        await AsyncStorage.setItem('pushNotificationsEnabled', 'true');
        setPushNotifications(true);
      } catch (e) {
        showAlert('Lỗi', 'Không thể đăng ký thông báo.');
      }
    } else {
      try {
        const token = await AsyncStorage.getItem('fcmToken');
        if (token) {
          await unregisterDeviceToken(token);
          await AsyncStorage.removeItem('fcmToken');
        }
        await AsyncStorage.setItem('pushNotificationsEnabled', 'false');
        setPushNotifications(false);
      } catch (e) {
        showAlert('Lỗi', 'Không thể tắt thông báo.');
      }
    }
  };

  const handleSoundEffectsToggle = async (value: boolean) => {
    setSoundEffects(value);
    try {
      await AsyncStorage.setItem('soundEffectsEnabled', value ? 'true' : 'false');
    } catch (e) { }
  };

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
      const userData = data.user || data.data || data;
      setUser(userData);
      if (userData?.avatarUrl) {
        setAvatarUrl(userData.avatarUrl);
      }
    } catch (error) {
      console.error('Failed to fetch user', error);
      // If we fail to fetch the user (e.g. not logged in), we should handle it gracefully
    } finally {
      setLoading(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Quyền truy cập', 'Cần quyền truy cập thư viện ảnh để thay đổi ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      const mimeType = asset.mimeType || 'image/jpeg';
      const fileName = asset.fileName || `avatar_${Date.now()}.jpg`;

      setUploadingAvatar(true);
      const response = await uploadAvatar(uri, mimeType, fileName);
      const newUrl = response.avatarUrl || response.url || response.avatar_url;
      if (newUrl) {
        setAvatarUrl(newUrl);
      }
      showAlert('Thành công', 'Đã cập nhật ảnh đại diện!');
    } catch (error: any) {
      console.error('Avatar upload error', error);
      showAlert('Lỗi', error.message || 'Không thể tải lên ảnh đại diện.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    showConfirm(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất?",
      async () => {
        try {
          setLoggingOut(true);
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            await logoutUser(refreshToken);
          }
        } catch (error) {
          console.error('Logout error', error);
        } finally {
          await clearAuth();
          setLoggingOut(false);
          showAlert('Thành công', 'Đăng xuất thành công!', () => router.replace('/(auth)/login'));
          if (Platform.OS !== 'web') router.replace('/(auth)/login');
        }
      },
      "Đăng xuất",
      "Hủy"
    );
  };

  const handleDeleteAccount = () => {
    showConfirm(
      "Xóa tài khoản",
      "Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa tài khoản vĩnh viễn?",
      () => console.log("Delete account requested"),
      "Xóa",
      "Hủy"
    );
  };

  const [sendingTestPush, setSendingTestPush] = useState(false);

  const handleSendTestNotification = async (type: 'study_reminder' | 'streak_warning') => {
    if (sendingTestPush) return;
    try {
      setSendingTestPush(true);
      const res: any = await sendTestNotification({
        notificationType: type,
        dueCount: 5,
        streak: 4,
      });
      const deviceCount = res?.deviceCount ?? res?.device_count ?? 0;
      const title = res?.title ?? '';
      const body = res?.body ?? '';
      if (deviceCount === 0) {
        showAlert(
          'Chưa có thiết bị',
          'Chưa có FCM token nào được đăng ký. Hãy bật "Thông báo đẩy" ở trên rồi thử lại.'
        );
      } else {
        showAlert(
          `Đã gửi (${deviceCount} thiết bị)`,
          `${title}\n${body}`
        );
      }
    } catch (e: any) {
      showAlert('Lỗi', e?.message || 'Không gửi được thông báo test.');
    } finally {
      setSendingTestPush(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) {
      showAlert('Lỗi', 'Vui lòng nhập đầy đủ mật khẩu cũ và mới');
      return;
    }

    try {
      setChangingPassword(true);
      await changePassword(oldPassword, newPassword);
      showAlert('Thành công', 'Đổi mật khẩu thành công!');
      setShowPasswordModal(false);
      setOldPassword('');
      setNewPassword('');
    } catch (error: any) {
      showAlert('Lỗi', error.message || 'Không thể đổi mật khẩu');
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
      <WebContainer maxWidth={720}>
        <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
          <TouchableOpacity style={[styles.backButton, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Cài đặt</Text>
          <View style={{ width: 24 }} />
        </View>
      </WebContainer>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <WebContainer maxWidth={720} paddingHorizontal={0}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} disabled={uploadingAvatar} activeOpacity={0.7}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarInitial}>{(user?.username || 'U').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={[styles.avatarOverlay, { backgroundColor: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
                  {uploadingAvatar ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="camera" size={20} color="#ffffff" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={[styles.avatarName, { color: theme.text }]}>{user?.username || 'Người dùng'}</Text>
              <Text style={[styles.avatarEmail, { color: theme.textMuted }]}>{user?.email || ''}</Text>
            </View>

            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Thông tin cá nhân</Text>
            <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              {renderSettingItem('Tên người dùng', user?.username || 'Người dùng', () => { })}
              {renderSettingItem('Email', user?.email || 'Chưa cập nhật')}
              {renderSettingItem('Đổi mật khẩu', undefined, () => setShowPasswordModal(true))}
            </View>

            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Giao diện</Text>
            <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              {renderSettingItem('Chế độ tối (Dark Mode)', undefined, undefined, true, isDarkMode, toggleDarkMode)}
            </View>

            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Ưu tiên</Text>
            <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              {renderSettingItem('Thông báo đẩy', undefined, undefined, true, pushNotifications, handlePushNotificationsToggle)}
              {renderSettingItem('Hiệu ứng âm thanh', undefined, undefined, true, soundEffects, handleSoundEffectsToggle)}
            </View>

            <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Dự án</Text>
            <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
              {renderSettingItem('Mã nguồn trên GitHub', undefined, () => {
                Linking.openURL('https://github.com/anprovip/mem_pan_app');
              })}
            </View>

            {__DEV__ && (
              <>
                <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Debug</Text>
                <View style={[styles.sectionContainer, { backgroundColor: theme.surface, shadowColor: isDark ? 'transparent' : '#000' }]}>
                  {renderSettingItem(
                    sendingTestPush ? 'Đang gửi…' : 'Gửi thông báo test: Nhắc học',
                    undefined,
                    () => handleSendTestNotification('study_reminder')
                  )}
                  {renderSettingItem(
                    sendingTestPush ? 'Đang gửi…' : 'Gửi thông báo test: Cảnh báo streak',
                    undefined,
                    () => handleSendTestNotification('streak_warning')
                  )}
                </View>
              </>
            )}

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
          </WebContainer>
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
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  avatarEmail: {
    fontSize: 14,
    marginTop: 4,
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
