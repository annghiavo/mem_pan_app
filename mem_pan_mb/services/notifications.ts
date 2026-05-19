// notifications.ts — wraps Firebase Cloud Messaging for the two reminder
// cron pushes ("study_reminder" + "streak_warning") published by the backend.
//
// What this file owns:
//   - Permission request (iOS) and FCM token registration with the backend.
//   - The background message handler that fires when the app is killed or in
//     the background — required for OS-level notification delivery.
//   - Foreground in-app message handler.
//   - Token refresh handling.
//   - Reporting the device's IANA timezone to the backend on login (the
//     backend uses it to compute the correct local send time for each cron).
//
// Call `bootstrapNotifications()` once on app start (e.g. from app/_layout.tsx)
// AFTER the user is authenticated. It is safe to call multiple times.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  registerDeviceToken,
  unregisterDeviceToken,
  updateUserTimezone,
} from './api';

// Firebase modules are not available on web. Lazy-require so the bundle
// still builds for the web target.
let messaging: any = null;
if (Platform.OS !== 'web') {
  try {
    messaging = require('@react-native-firebase/messaging').default;
  } catch (e) {
    console.warn('[notifications] Firebase messaging not available:', e);
  }
}

const FCM_TOKEN_KEY = 'fcmToken';
const TIMEZONE_KEY = 'lastReportedTimezone';

/**
 * Reports the device's IANA timezone to the backend if it changed since the
 * last report. Stored locally so a roaming device only PATCHes when needed.
 */
export async function syncTimezone(): Promise<void> {
  const tz = getDeviceTimezone();
  if (!tz) return;
  try {
    const last = await AsyncStorage.getItem(TIMEZONE_KEY);
    if (last === tz) return;
    await updateUserTimezone(tz);
    await AsyncStorage.setItem(TIMEZONE_KEY, tz);
  } catch (e) {
    console.warn('[notifications] syncTimezone failed:', e);
  }
}

/**
 * Returns the device's IANA timezone, e.g. "Asia/Ho_Chi_Minh". Falls back to
 * "UTC" on the rare platforms where Intl is unavailable.
 */
export function getDeviceTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Requests notification permission (iOS) and returns true if granted.
 * On Android, permission is granted at install time and this returns true.
 */
async function requestPermission(): Promise<boolean> {
  if (!messaging || Platform.OS === 'web') return false;
  try {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (e) {
    console.warn('[notifications] requestPermission failed:', e);
    return false;
  }
}

/**
 * Fetches the current FCM token, registers it with the backend, and caches
 * it locally so we can revoke on logout.
 */
async function registerToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    const token: string = await messaging().getToken();
    if (!token) return null;
    await registerDeviceToken(token, Platform.OS);
    await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    return token;
  } catch (e) {
    console.warn('[notifications] registerToken failed:', e);
    return null;
  }
}

/**
 * Call this once on app start, AFTER login. Idempotent.
 */
export async function bootstrapNotifications(): Promise<void> {
  if (!messaging) return;

  // 1. Permission + initial token registration.
  const enabledPref = await AsyncStorage.getItem('pushNotificationsEnabled');
  if (enabledPref === 'false') return;

  const granted = await requestPermission();
  if (!granted) return;

  await registerToken();

  // 2. Report timezone — used by both reminder cron jobs.
  await syncTimezone();

  // 3. React to FCM token rotation (Firebase periodically refreshes tokens).
  messaging().onTokenRefresh(async (token: string) => {
    try {
      await registerDeviceToken(token, Platform.OS);
      await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
    } catch (e) {
      console.warn('[notifications] token refresh registration failed:', e);
    }
  });

  // 4. Foreground messages. The OS does not show a system notification when
  //    the app is in the foreground — we can surface our own UI here if we
  //    want, but for now we only log.
  messaging().onMessage(async (msg: any) => {
    console.log('[notifications] foreground push:', msg?.data?.type, msg);
  });
}

/**
 * Called from the (profile)/settings.tsx toggle handler when the user
 * disables notifications. Unregisters and clears the cached token.
 */
export async function disableNotifications(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_KEY);
    if (token) {
      await unregisterDeviceToken(token);
    }
    await AsyncStorage.removeItem(FCM_TOKEN_KEY);
    await AsyncStorage.setItem('pushNotificationsEnabled', 'false');
  } catch (e) {
    console.warn('[notifications] disableNotifications failed:', e);
  }
}

// ─── Background handler ────────────────────────────────────────────────────
// IMPORTANT: setBackgroundMessageHandler MUST be called at module load time
// (before the React tree mounts) so that the JS runtime is registered as a
// headless task. Without this, notifications sent while the app is *killed*
// will still be delivered by the OS, but their `data` payload will not be
// processed by JS — which means we can't do things like increment a badge
// count locally.
//
// The system notification itself (title + body the user sees on the lock
// screen) is shown by the OS based on the FCM message's `notification` field,
// independently of whether JS is running. So both reminders WILL appear to
// the user even if this handler is missing — this handler is for our own
// telemetry / local state.
if (messaging) {
  messaging().setBackgroundMessageHandler(async (msg: any) => {
    // We only get here when the app is in background/killed AND the message
    // has a `data` payload. The two reminder pushes both include:
    //   data.type      ∈ {"study_reminder", "streak_warning"}
    //   data.due_count = "N"     (number of cards to review today)
    //   data.streak    = "X"     (current streak, 0 if none)
    console.log(
      '[notifications] background push:',
      msg?.data?.type,
      'due=', msg?.data?.due_count,
      'streak=', msg?.data?.streak,
    );
    // Nothing else to do — the OS handles the visible notification.
  });
}
