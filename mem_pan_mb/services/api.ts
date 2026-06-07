import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// React Native's FormData accepts `{ uri, type, name }` and builds a real
// multipart file part. The browser's FormData does NOT — it coerces the object
// to `[object Object]`, dropping the file. On web we must resolve the URI to a
// Blob/File first; on native, keep the RN object shape.
async function appendImageFile(
  formData: FormData,
  field: string,
  image: { uri: string; type: string; name: string },
): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = await fetch(image.uri).then(r => r.blob());
    const filename = image.name || `image_${Date.now()}.${(image.type || 'image/jpeg').split('/')[1] || 'jpg'}`;
    const fileLike = typeof File !== 'undefined'
      ? new File([blob], filename, { type: image.type || blob.type || 'image/jpeg' })
      : blob;
    formData.append(field, fileLike as any, filename);
    return;
  }
  formData.append(field, {
    uri: image.uri,
    type: image.type,
    name: image.name,
  } as any);
}

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/v1'; let authToken = '';
let currentRefreshToken = '';

// --- API call logging (dev only) ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LOG_API = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';

// Resolve the URL of the Metro dev server so we can POST log entries to its
// /__devlog endpoint (handled by metro.config.js). This is how the app's
// API calls end up printed in the `npx expo start` terminal.
const resolveMetroDevLogUrl = (): string | null => {
  if (!LOG_API) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = Constants;
  const hostUri: string | undefined =
    c.expoConfig?.hostUri ||
    c.expoGoConfig?.debuggerHost ||
    c.manifest?.debuggerHost ||
    c.manifest?.hostUri ||
    c.manifest2?.extra?.expoGo?.debuggerHost;
  if (!hostUri) return null;
  // hostUri is host:port — strip any trailing path/query
  const host = hostUri.split('/')[0].split('?')[0];
  return `http://${host}/__devlog`;
};

const METRO_DEVLOG_URL = resolveMetroDevLogUrl();

const sendDevLog = (entry: Record<string, unknown>) => {
  if (!LOG_API || !METRO_DEVLOG_URL) return;
  // Fire-and-forget. Never await, never throw.
  try {
    fetch(METRO_DEVLOG_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(() => { /* ignore */ });
  } catch { /* ignore */ }
};

if (LOG_API) {
  console.log(`[API] logger active — base URL: ${API_URL}`);
  if (METRO_DEVLOG_URL) {
    console.log(`[API] piping logs to Metro dev server: ${METRO_DEVLOG_URL}`);
    sendDevLog({ kind: 'info', message: `logger attached — base URL: ${API_URL}` });
  } else {
    console.log('[API] Metro dev-log endpoint not resolved (Constants.expoConfig.hostUri missing)');
  }
}

const redact = (data: any, depth = 0): any => {
  if (!data || typeof data !== 'object' || depth > 5) return data;
  if (Array.isArray(data)) {
    if (data.length > 5) {
      return [...data.slice(0, 5).map(item => redact(item, depth + 1)), `... (${data.length - 5} more items)`];
    }
    return data.map(item => redact(item, depth + 1));
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = /password|token|secret|authorization/i.test(k) ? '***' : redact(v, depth + 1);
  }
  return out;
};

// In-memory map of request start times so logResponse can report duration.
const requestStartedAt = new Map<string, number>();
const reqKey = (method: string, url: string) => `${method} ${url}`;

export const logRequest = (method: string, url: string, body?: any) => {
  if (!LOG_API) return;
  let parsed: any = body;
  if (typeof body === 'string') {
    try { parsed = JSON.parse(body); } catch { /* keep string */ }
  } else if (typeof FormData !== 'undefined' && body instanceof FormData) {
    parsed = '<FormData>';
  }
  const safe = redact(parsed);
  requestStartedAt.set(reqKey(method, url), Date.now());
  console.log(`[API →] ${method} ${url}`, safe ?? '');
  sendDevLog({ kind: 'request', method, url, body: safe });
};

export const logResponse = (method: string, url: string, status: number, data: any) => {
  if (!LOG_API) return;
  const startedAt = requestStartedAt.get(reqKey(method, url));
  const durationMs = startedAt ? Date.now() - startedAt : undefined;
  if (startedAt) requestStartedAt.delete(reqKey(method, url));
  const safeData = redact(data);
  if (status >= 400) {
    console.warn(`[API ✗] ${status} ${method} ${url}`, safeData);
  } else {
    console.log(`[API ←] ${status} ${method} ${url}`, safeData);
  }
  sendDevLog({ kind: 'response', method, url, status, data: safeData, durationMs });
};

export const setAuthToken = async (token: string) => {
  authToken = token;
  await AsyncStorage.setItem('authToken', token);
};

export const setRefreshToken = async (token: string) => {
  currentRefreshToken = token;
  await AsyncStorage.setItem('refreshToken', token);
};

export const getRefreshToken = () => {
  return currentRefreshToken;
};

export const clearAuth = async () => {
  authToken = '';
  currentRefreshToken = '';
  await AsyncStorage.removeItem('authToken');
  await AsyncStorage.removeItem('refreshToken');
};

// Maps an HTTP status to a user-friendly Vietnamese fallback message. Used
// whenever the server's own message is missing or unsafe to display.
const statusFallbackMessage = (status: number): string => {
  if (status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
  if (status === 404) return 'Không tìm thấy dữ liệu yêu cầu.';
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
  if (status === 400 || status === 422) return 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.';
  return 'Có lỗi xảy ra, vui lòng thử lại.';
};

// Extracts a safe, human-readable message from an API error body. Backends may
// send `message` as a string, an array (NestJS/class-validator), or omit it.
// Anything that looks like a raw HTML page / stack trace (tags, or absurdly
// long) is discarded so it never reaches the UI — we fall back to a
// status-based message instead. The raw body is still logged for debugging.
const extractApiMessage = (data: any, status: number): string => {
  const raw = data?.message ?? data?.error;
  let msg: string | undefined;
  if (typeof raw === 'string') msg = raw;
  else if (Array.isArray(raw)) msg = raw.filter((x) => typeof x === 'string').join('\n');
  if (!msg || !msg.trim()) return statusFallbackMessage(status);
  if (/<\/?[a-z][\s\S]*>/i.test(msg) || msg.length > 300) return statusFallbackMessage(status);
  return msg.trim();
};

const handleResponse = async (response: Response, method = 'GET', url = '', quiet = false) => {
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    // Server returned non-JSON (e.g. an HTML 5xx page or proxy block page).
    // Log the raw body for debugging but never surface it to the user.
    logResponse(method, url, response.status, `<invalid JSON> ${responseText}`);
    throw new Error(
      response.status >= 500
        ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
        : 'Máy chủ trả về dữ liệu không hợp lệ. Vui lòng thử lại.'
    );
  }

  if (!quiet) logResponse(method, url, response.status, data);

  if (!response.ok) {
    if (response.status === 401) {
      const onPublicAuthRoute =
        typeof window !== 'undefined' &&
        /\/(reset-password|login|register)(\b|\/|\?|$)/.test(window.location?.pathname || '');
      await clearAuth();
      if (!onPublicAuthRoute) {
        try {
          const { router } = require('expo-router');
          router.replace('/(auth)/login');
        } catch (err) { }
      }
      return {};
    }
    throw new Error(extractApiMessage(data, response.status));
  }

  return data;
};

const request = async (endpoint: string, options: RequestInit = {}, extraOpts?: { quiet?: boolean }) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (!authToken) {
    authToken = await AsyncStorage.getItem('authToken') || '';
    currentRefreshToken = await AsyncStorage.getItem('refreshToken') || '';
  }

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const method = (options.method || 'GET').toUpperCase();
  const url = `${API_URL}${endpoint}`;
  if (!extraOpts?.quiet) logRequest(method, url, options.body);

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    return await handleResponse(response, method, url, extraOpts?.quiet);
  } catch (err: any) {
    if (LOG_API && !extraOpts?.quiet) console.error(`[API ✗] ${method} ${url}`, err?.message ?? err);
    if (!extraOpts?.quiet) sendDevLog({ kind: 'error', method, url, message: String(err?.message ?? err) });
    throw err;
  }
};

// --- Auth & Users ---
export const forgotPassword = (email: string) => {
  return request('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
};

export const resetPassword = (token: string, newPassword: string) => {
  return request('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, newPassword }),
  });
};

export const logoutUser = (refreshToken: string) => {
  return request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
};

export const getCurrentUser = () => {
  return request('/users/me');
};

export const getUserPublicProfile = (userId: string) => {
  return request(`/users/${userId}`);
};

export const changePassword = (oldPassword: string, newPassword: string) => {
  return request('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify({ oldPassword, newPassword }),
  });
};

export const uploadAvatar = async (uri: string, mimeType: string, fileName: string) => {
  if (!authToken) {
    authToken = await AsyncStorage.getItem('authToken') || '';
    currentRefreshToken = await AsyncStorage.getItem('refreshToken') || '';
  }

  const formData = new FormData();
  await appendImageFile(formData, 'avatar', { uri, type: mimeType, name: fileName });

  const url = `${API_URL}/users/me/avatar`;
  logRequest('POST', url, formData);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response, 'POST', url);
};

// --- Decks ---
export const getDecks = (page = 1, pageSize = 20) => {
  return request(`/decks?page=${page}&pageSize=${pageSize}`);
};

export const getAllLibraryDecks = async () => {
  try {
    // 1. Fetch created/cloned decks
    const decksRes = await getDecks(1, 100);
    const ownedDecks = (decksRes.decks || []).map((d: any) => ({
      ...d,
      _isOwned: true,
      _isCloned: !!(d.clonedFrom || d.cloned_from)
    }));

    // 2. Fetch recently studied deck IDs
    const recentRes = await getRecentDecks().catch(() => ({ decks: [] }));
    const recentDecks = recentRes.decks || [];

    // 3. Find missing deck IDs
    const ownedDeckIds = new Set(ownedDecks.map((d: any) => d.deckId || d.deck_id));
    const missingDeckIds = recentDecks
      .filter((r: any) => !ownedDeckIds.has(r.deckId || r.deck_id))
      .map((r: any) => r.deckId || r.deck_id);

    // 4. Fetch missing decks — 404s are expected (deck deleted/hidden) so we
    //    use a quiet helper that suppresses the noisy error logs for them.
    const fetchedDecks = await Promise.all(
      missingDeckIds.map((id: string) =>
        request(`/decks/${id}`, {}, { quiet: true }).catch(() => null)
      )
    );
    // Extract the actual deck object from GetDeckResponse
    const validFetchedDecks = fetchedDecks
      .filter((res: any) => res && res.deck)
      .map((res: any) => ({
        ...res.deck,
        _isOwned: false,
        _isCloned: !!(res.deck.clonedFrom || res.deck.cloned_from)
      }));

    // 5. Merge
    return {
      decks: [...ownedDecks, ...validFetchedDecks],
    };
  } catch (error) {
    console.error("Error in getAllLibraryDecks:", error);
    return { decks: [] };
  }
};

export const createDeck = (name: string, description: string, isPublic: boolean) => {
  return request('/decks', {
    method: 'POST',
    body: JSON.stringify({ name, description, isPublic }),
  });
};

export const getDeck = (deckId: string) => {
  return request(`/decks/${deckId}`);
};

export const updateDeck = (deckId: string, name: string, description: string) => {
  return request(`/decks/${deckId}`, {
    method: 'PUT',
    body: JSON.stringify({ name, description }),
  });
};

export const updateDeckSettings = (deckId: string, settings: any) => {
  return request(`/decks/${deckId}/settings`, {
    method: 'PATCH',
    body: JSON.stringify({ settings }),
  });
};

export const updateDeckVisibility = (deckId: string, isPublic: boolean) => {
  return request(`/decks/${deckId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify({ isPublic }),
  });
};

export const deleteDeck = (deckId: string) => {
  return request(`/decks/${deckId}`, { method: 'DELETE' });
};

export const getPublicDecks = (page = 1, pageSize = 20, userId?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (userId) params.set('userId', userId);
  return request(`/decks/public?${params.toString()}`);
};

// Top public decks by number of learners within the trending window (default
// last 7 days). Response: { decks: [{ deck, learnerCount }] }.
export const getTopPublicDecks = (limit = 20, windowDays?: number) => {
  const params = new URLSearchParams({ limit: String(limit) });
  if (windowDays && windowDays > 0) params.set('windowDays', String(windowDays));
  return request(`/decks/public/top?${params.toString()}`);
};

export const getPublicFolders = (page = 1, pageSize = 20, userId?: string) => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (userId) params.set('userId', userId);
  return request(`/folders/public?${params.toString()}`);
};

export const getDeckStats = (deckId: string) => {
  return request(`/stats/decks/${deckId}`);
};

export const cloneDeck = (deckId: string) => {
  return request(`/decks/${deckId}/clone`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

// --- Cards ---
export const getDeckCards = (deckId: string) => {
  return request(`/decks/${deckId}/cards`);
};

export const createCard = async (deckId: string, data: {
  contentFront: string;
  contentBack: string;
  image?: { uri: string; type: string; name: string };
  imageUrl?: string;
  position?: number;
  langFront?: string;
  langBack?: string
}) => {
  if (!authToken) {
    authToken = (await AsyncStorage.getItem('authToken')) || '';
    currentRefreshToken = (await AsyncStorage.getItem('refreshToken')) || '';
  }

  const formData = new FormData();
  formData.append('content_front', data.contentFront);
  formData.append('content_back', data.contentBack);
  if (data.image) {
    await appendImageFile(formData, 'image', data.image);
  }
  if (data.imageUrl) {
    formData.append('image_url', data.imageUrl);
  }
  if (data.position !== undefined) {
    formData.append('position', data.position.toString());
  }
  if (data.langFront) {
    formData.append('lang_front', data.langFront);
  }
  if (data.langBack) {
    formData.append('lang_back', data.langBack);
  }

  const url = `${API_URL}/decks/${deckId}/cards`;
  logRequest('POST', url, formData);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response, 'POST', url);
};

export const bulkCreateCards = (deckId: string, cards: { contentFront: string; contentBack: string; imageUrl?: string; langFront?: string; langBack?: string; position?: number }[]) => {
  const formattedCards = cards.map(c => ({
    content_front: c.contentFront,
    content_back: c.contentBack,
    image_url: c.imageUrl,
    lang_front: c.langFront,
    lang_back: c.langBack,
    position: c.position,
  }));
  return request(`/decks/${deckId}/cards/bulk`, {
    method: 'POST',
    body: JSON.stringify({ cards: formattedCards }),
  });
};

export const getCard = (cardId: string) => {
  return request(`/cards/${cardId}`);
};

export const updateCard = async (cardId: string, data: {
  contentFront?: string;
  contentBack?: string;
  image?: { uri: string; type: string; name: string };
  imageUrl?: string;
  langFront?: string;
  langBack?: string
}) => {
  if (!authToken) {
    authToken = (await AsyncStorage.getItem('authToken')) || '';
    currentRefreshToken = (await AsyncStorage.getItem('refreshToken')) || '';
  }

  // No new image file: send JSON (backend expects JSON for text-only updates)
  if (!data.image) {
    const body: Record<string, any> = {};
    if (data.contentFront !== undefined) body.content_front = data.contentFront;
    if (data.contentBack !== undefined) body.content_back = data.contentBack;
    if (data.imageUrl !== undefined) body.image_url = data.imageUrl;
    if (data.langFront !== undefined) body.lang_front = data.langFront;
    if (data.langBack !== undefined) body.lang_back = data.langBack;

    const url = `${API_URL}/cards/${cardId}`;
    const jsonBody = JSON.stringify(body);
    logRequest('PUT', url, jsonBody);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: jsonBody,
    });
    return handleResponse(response, 'PUT', url);
  }

  // New image file provided: send multipart FormData
  const formData = new FormData();
  if (data.contentFront) formData.append('content_front', data.contentFront);
  if (data.contentBack) formData.append('content_back', data.contentBack);
  await appendImageFile(formData, 'image', data.image);
  if (data.imageUrl) formData.append('image_url', data.imageUrl);
  if (data.langFront) formData.append('lang_front', data.langFront);
  if (data.langBack) formData.append('lang_back', data.langBack);

  const url = `${API_URL}/cards/${cardId}`;
  logRequest('PUT', url, formData);
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response, 'PUT', url);
};

export const deleteCard = (cardId: string) => {
  return request(`/cards/${cardId}`, { method: 'DELETE' });
};

export const reorderCards = (deckId: string, cardIds: string[]) => {
  return request(`/decks/${deckId}/cards/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ card_ids: cardIds }),
  });
};

// --- Folders ---
export const getFolders = () => {
  return request('/folders');
};

export const createFolder = (name: string, description: string = '') => {
  return request('/folders', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  });
};

export const getFolder = (folderId: string) => {
  return request(`/folders/${folderId}`);
};

export const updateFolder = (folderId: string, name: string, description: string) => {
  return request(`/folders/${folderId}`, {
    method: 'PATCH',
    body: JSON.stringify({ name, description }),
  });
};

export const deleteFolder = (folderId: string) => {
  return request(`/folders/${folderId}`, { method: 'DELETE' });
};

export const addDeckToFolder = (folderId: string, deckId: string) => {
  return request(`/folders/${folderId}/decks/${deckId}`, { method: 'POST', body: JSON.stringify({}) });
};

export const removeDeckFromFolder = (folderId: string, deckId: string) => {
  return request(`/folders/${folderId}/decks/${deckId}`, { method: 'DELETE' });
};

// --- Study ---
export const getRecentDecks = () => {
  return request('/study/decks/recent');
};

export const getDeckProgress = (deckId: string) => {
  return request(`/study/decks/${deckId}/progress`);
};

export const getDueCards = (deckId?: string) => {
  const query = deckId ? `?deckId=${deckId}` : '';
  return request(`/study/due${query}`);
};

export const startStudySession = (deckId: string, newCardsLimit: number = 10, reviewLimit: number = 20) => {
  return request('/study/sessions', {
    method: 'POST',
    body: JSON.stringify({ deckId, newCardsLimit, reviewLimit }),
  });
};

export const getRecentSessionCards = () => {
  return request('/study/sessions/recent/cards');
};

export const getStudySession = (sessionId: string) => {
  return request(`/study/sessions/${sessionId}`);
};

export const finishStudySession = (sessionId: string) => {
  return request(`/study/sessions/${sessionId}/finish`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

export const reviewCard = (sessionId: string, cardId: string, rating: number, durationMs: number) => {
  // Forward the device's IANA timezone so stats-service can bucket the
  // review into the right local hour and day for the activity histogram +
  // streak boundary. Required by the reminder cron jobs.
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch { /* keep default */ }
  return request(`/study/sessions/${sessionId}/review`, {
    method: 'POST',
    body: JSON.stringify({ cardId, rating, durationMs, timezone }),
  });
};

export const getDeckStudySettings = (deckId: string) => {
  return request(`/study/decks/${deckId}/settings`);
};

export const updateDeckStudySettings = (deckId: string, settings: {
  shuffleTerms: boolean;
  textToSpeech: boolean;
  answerWithTerm: boolean;
  answerWithDefinition: boolean;
  questionTypeFlashcards: boolean;
  questionTypeMultipleChoice: boolean;
  questionTypeWritten: boolean;
  strictnessLevel: string;
  requireRetypingCorrectAnswer: boolean;
}) => {
  return request(`/study/decks/${deckId}/settings`, {
    method: 'PUT',
    body: JSON.stringify({ settings }),
  });
};

export const checkAnswerAPI = (deckId: string, userAnswer: string, correctAnswer: string) => {
  return request(`/study/decks/${deckId}/check-answer`, {
    method: 'POST',
    body: JSON.stringify({ deckId, userAnswer, correctAnswer }),
  });
};

// --- Stats ---
export const getUserStats = () => {
  let timezone = 'UTC';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch { /* keep default */ }
  const params = new URLSearchParams({ timezone });
  return request(`/stats/me?${params.toString()}`);
};

export const getUserHeatmap = (fromDate?: string, toDate?: string) => {
  const params = new URLSearchParams();
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  const q = params.toString() ? `?${params}` : '';
  return request(`/stats/me/heatmap${q}`);
};

export const getUserDeckStats = () => request('/stats/me/decks');

// Sends the device's IANA timezone (e.g. "Asia/Ho_Chi_Minh") to the backend.
// Used by the reminder cron jobs to compute the correct local time for the
// streak boundary and study-reminder send time. Safe to call repeatedly.
export const updateUserTimezone = (timezone: string) => {
  return request('/users/me', {
    method: 'PATCH',
    body: JSON.stringify({ timezone }),
  });
};

// --- Notifications ---
export const registerDeviceToken = (token: string, deviceName: string = '') => {
  return request('/notifications/devices', {
    method: 'POST',
    body: JSON.stringify({ token, device_name: deviceName }),
  });
};

export const unregisterDeviceToken = (token: string) => {
  return request(`/notifications/devices/${encodeURIComponent(token)}`, {
    method: 'DELETE',
  });
};

// Triggers a test push to the caller's registered devices (or to an explicit
// token). Bypasses the scheduler's window/dedup/due-count gating — see
// services/notification-service/internal/gapi/rpc_test_notification.go.
export const sendTestNotification = (params?: {
  notificationType?: 'study_reminder' | 'streak_warning';
  token?: string;
  dueCount?: number;
  streak?: number;
}) => {
  return request('/notifications/devices:test', {
    method: 'POST',
    body: JSON.stringify({
      notification_type: params?.notificationType ?? 'study_reminder',
      token: params?.token ?? '',
      due_count: params?.dueCount ?? 5,
      streak: params?.streak ?? 0,
    }),
  });
};

// --- Import ---
export const parseImportFile = async (
  fileSource: string | Blob,
  mimeType: string,
  fileName: string,
  fileType: 'csv' | 'tsv' | 'pdf'
) => {
  if (!authToken) {
    authToken = (await AsyncStorage.getItem('authToken')) || '';
    currentRefreshToken = (await AsyncStorage.getItem('refreshToken')) || '';
  }

  const formData = new FormData();
  if (typeof fileSource === 'string') {
    // React Native: pass the file descriptor object
    formData.append('file', {
      uri: fileSource,
      type: mimeType,
      name: fileName,
    } as any);
  } else {
    // Web: pass the real File/Blob so the multipart body is well-formed
    formData.append('file', fileSource, fileName);
  }
  formData.append('file_type', fileType);

  const url = `${API_URL}/import/parse`;
  logRequest('POST', url, formData);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response, 'POST', url);
};

// --- Search ---
export const searchCards = (query: string = '', deckId?: string, page: number = 1, pageSize: number = 20) => {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (deckId) params.set('deckId', deckId);
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  return request(`/search/cards?${params.toString()}`);
};

export const searchDecks = (query: string = '', scope: string = 'DECK_SCOPE_UNSPECIFIED', page: number = 1, pageSize: number = 20) => {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (scope) params.set('scope', scope);
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  return request(`/search/decks?${params.toString()}`);
};

export const searchFolders = (query: string = '', page: number = 1, pageSize: number = 20) => {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  return request(`/search/folders?${params.toString()}`);
};

export const searchUsers = (query: string = '', page: number = 1, pageSize: number = 20) => {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  params.set('page', page.toString());
  params.set('pageSize', pageSize.toString());
  return request(`/search/users?${params.toString()}`);
};

// --- Reports ---
export const reportDeck = (deckId: string, payload: { reasonCategory: string; description?: string }) => {
  return request(`/decks/${deckId}/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};

export const reportUser = (userId: string, payload: { reasonCategory: string; description?: string }) => {
  return request(`/users/${userId}/reports`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
};
