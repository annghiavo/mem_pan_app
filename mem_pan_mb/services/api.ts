import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/v1'; let authToken = '';
let currentRefreshToken = '';

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

const handleResponse = async (response: Response) => {
  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText}`);
  }

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
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

const request = async (endpoint: string, options: RequestInit = {}) => {
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

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return handleResponse(response);
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
  formData.append('avatar', {
    uri,
    type: mimeType,
    name: fileName,
  } as any);

  const response = await fetch(`${API_URL}/users/me/avatar`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response);
};

// --- Decks ---
export const getDecks = (page = 1, pageSize = 20) => {
  return request(`/decks?page=${page}&pageSize=${pageSize}`);
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

export const getPublicDecks = (page = 1, pageSize = 20) => {
  return request(`/decks/public?page=${page}&pageSize=${pageSize}`);
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
    formData.append('image', {
      uri: data.image.uri,
      type: data.image.type,
      name: data.image.name,
    } as any);
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

  const response = await fetch(`${API_URL}/decks/${deckId}/cards`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response);
};

export const bulkCreateCards = (deckId: string, cards: { contentFront: string; contentBack: string; imageUrl?: string; langFront?: string; langBack?: string }[]) => {
  const formattedCards = cards.map(c => ({
    content_front: c.contentFront,
    content_back: c.contentBack,
    image_url: c.imageUrl,
    lang_front: c.langFront,
    lang_back: c.langBack
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

    const response = await fetch(`${API_URL}/cards/${cardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  }

  // New image file provided: send multipart FormData
  const formData = new FormData();
  if (data.contentFront) formData.append('content_front', data.contentFront);
  if (data.contentBack) formData.append('content_back', data.contentBack);
  formData.append('image', {
    uri: data.image.uri,
    type: data.image.type,
    name: data.image.name,
  } as any);
  if (data.imageUrl) formData.append('image_url', data.imageUrl);
  if (data.langFront) formData.append('lang_front', data.langFront);
  if (data.langBack) formData.append('lang_back', data.langBack);

  const response = await fetch(`${API_URL}/cards/${cardId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response);
};

export const deleteCard = (cardId: string) => {
  return request(`/cards/${cardId}`, { method: 'DELETE' });
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
  return request(`/study/sessions/${sessionId}/review`, {
    method: 'POST',
    body: JSON.stringify({ cardId, rating, durationMs }),
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
export const getUserStats = () => request('/stats/me');

export const getUserHeatmap = (fromDate?: string, toDate?: string) => {
  const params = new URLSearchParams();
  if (fromDate) params.set('fromDate', fromDate);
  if (toDate) params.set('toDate', toDate);
  const q = params.toString() ? `?${params}` : '';
  return request(`/stats/me/heatmap${q}`);
};

export const getUserDeckStats = () => request('/stats/me/decks');

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

  const response = await fetch(`${API_URL}/import/parse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  return handleResponse(response);
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
