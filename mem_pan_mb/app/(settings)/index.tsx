import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser, logoutUser, getRefreshToken, clearAuth } from '../../services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  useEffect(() => {
    fetchUser();
  }, []);

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

  const renderSettingItem = (title: string, value?: string, onPress?: () => void, isSwitch?: boolean, switchValue?: boolean, onSwitchChange?: (val: boolean) => void) => (
    <TouchableOpacity 
      style={styles.settingItem} 
      onPress={onPress} 
      disabled={isSwitch || !onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingItemContent}>
        <Text style={styles.settingItemTitle}>{title}</Text>
        {value && <Text style={styles.settingItemValue}>{value}</Text>}
      </View>
      {isSwitch ? (
        <Switch 
          value={switchValue} 
          onValueChange={onSwitchChange}
          trackColor={{ false: '#d1d5db', true: '#5865F2' }}
          thumbColor={Platform.OS === 'ios' ? '#ffffff' : (switchValue ? '#ffffff' : '#f4f3f4')}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 24 }} /> {/* Spacer */}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5865F2" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeader}>Thông tin cá nhân</Text>
          <View style={styles.sectionContainer}>
            {renderSettingItem('Tên người dùng', user?.username || 'Người dùng', () => {})}
            {renderSettingItem('Email', user?.email || 'Chưa cập nhật', () => {})}
            {renderSettingItem('Tạo mật khẩu', undefined, () => {})}
          </View>

          <Text style={styles.sectionHeader}>Ưu tiên</Text>
          <View style={styles.sectionContainer}>
            {renderSettingItem('Thông báo đẩy', undefined, undefined, true, pushNotifications, setPushNotifications)}
            {renderSettingItem('Hiệu ứng âm thanh', undefined, undefined, true, soundEffects, setSoundEffects)}
          </View>
          
          <Text style={styles.sectionHeader}>Giới thiệu</Text>
          <View style={styles.sectionContainer}>
            {renderSettingItem('Quyền riêng tư', undefined, () => {})}
            {renderSettingItem('Quyền riêng tư California', undefined, () => {})}
            {renderSettingItem('Điều khoản dịch vụ', undefined, () => {})}
            {renderSettingItem('Giấy phép mã nguồn mở', undefined, () => {})}
            {renderSettingItem('Trung tâm Hỗ trợ', undefined, () => {})}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={styles.logoutButton} 
              onPress={handleLogout}
              disabled={loggingOut}
            >
              {loggingOut ? (
                <ActivityIndicator color="#111827" />
              ) : (
                <Text style={styles.logoutButtonText}>Đăng xuất</Text>
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
             <Text style={styles.versionText}>v10.32</Text>
          </View>
        </ScrollView>
      )}
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
  }
});
