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

import { Platform, PermissionsAndroid } from 'react-native';
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

// notifee is used to display a system notification when a push arrives while
// the app is in the FOREGROUND. By contract, FCM's `notification` payload is
// only auto-rendered by the OS when the app is in the background/killed — so
// without notifee, foreground messages would only fire `onMessage` and the
// user would see nothing.
let notifee: any = null;
let AndroidImportance: any = null;
if (Platform.OS !== 'web') {
  try {
    const mod = require('@notifee/react-native');
    notifee = mod.default;
    AndroidImportance = mod.AndroidImportance;
  } catch (e) {
    console.warn('[notifications] notifee not available:', e);
  }
}

const FCM_TOKEN_KEY = 'fcmToken';
const TIMEZONE_KEY = 'lastReportedTimezone';

// Channel ID for both reminder notification types. Must stay stable — Android
// 8+ does not let us mutate a channel's importance/sound after creation.
const REMINDERS_CHANNEL_ID = 'reminders';

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
 * Requests notification permission and returns true if granted.
 *
 * - iOS: handled by Firebase Messaging's requestPermission (system dialog).
 * - Android 13+ (API 33): requires the runtime POST_NOTIFICATIONS permission
 *   — without it, the OS silently drops every notification we try to display
 *   even though FCM reports successful delivery. Firebase's requestPermission
 *   does NOT request this for us on Android, so we ask explicitly here.
 * - Android <13: notification permission is granted at install time; this
 *   resolves true without prompting.
 */
async function requestPermission(): Promise<boolean> {
  if (!messaging || Platform.OS === 'web') return false;

  // Android 13+ runtime permission.
  if (Platform.OS === 'android' && typeof Platform.Version === 'number' && Platform.Version >= 33) {
    try {
      const result = await PermissionsAndroid.request(
        'android.permission.POST_NOTIFICATIONS' as any,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        console.warn('[notifications] POST_NOTIFICATIONS denied:', result);
        return false;
      }
    } catch (e) {
      console.warn('[notifications] POST_NOTIFICATIONS request failed:', e);
      return false;
    }
  }

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
 * Creates the reminders notification channel on Android 8+. No-op on iOS and
 * older Android versions. Safe to call repeatedly.
 */
async function ensureChannel(): Promise<void> {
  if (!notifee || Platform.OS !== 'android') return;
  try {
    await notifee.createChannel({
      id: REMINDERS_CHANNEL_ID,
      name: 'Nhắc học',
      importance: AndroidImportance?.HIGH ?? 4,
    });
  } catch (e) {
    console.warn('[notifications] createChannel failed:', e);
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
 * Call this once on app start AND once after a successful login. Idempotent.
 *
 * IMPORTANT: token registration + timezone sync both hit authed backend
 * endpoints. If we run before the user has logged in, those requests 401 and
 * the FCM token never lands in the DB — so the user never receives reminder
 * pushes. We guard on the presence of an auth token here so that the call
 * from app/_layout.tsx on a fresh install exits cleanly, and the call from
 * the login-success path is what actually registers the device.
 */
export async function bootstrapNotifications(): Promise<void> {
  if (!messaging) return;

  // Bail out if the user isn't logged in yet — backend calls below need auth.
  const authToken = await AsyncStorage.getItem('authToken');
  if (!authToken) return;

  // 1. Permission + initial token registration.
  const enabledPref = await AsyncStorage.getItem('pushNotificationsEnabled');
  if (enabledPref === 'false') return;

  const granted = await requestPermission();
  if (!granted) return;

  // Create the Android notification channel before any onMessage fires.
  await ensureChannel();

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

  // 4. Foreground messages. The OS does NOT auto-display the FCM notification
  //    payload while the app is in the foreground — we render it ourselves
  //    via notifee so the user sees a real system banner regardless of app
  //    state. (Background/killed delivery is still handled by the OS using
  //    the FCM notification field; we don't double-display there.)
  messaging().onMessage(async (msg: any) => {
    console.log('[notifications] foreground push:', msg?.data?.type, msg);
    if (!notifee) return;
    const title = msg?.notification?.title ?? '';
    const body = msg?.notification?.body ?? '';
    if (!title && !body) return;
    try {
      await notifee.displayNotification({
        title,
        body,
        data: msg?.data ?? {},
        android: {
          channelId: REMINDERS_CHANNEL_ID,
          pressAction: { id: 'default' },
          smallIcon: 'ic_notification', // fallback to app icon if missing
        },
      });
    } catch (e) {
      console.warn('[notifications] foreground displayNotification failed:', e);
    }
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
