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

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText}`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuth();
      try {
        const { router } = require('expo-router');
        router.replace('/(auth)/login');
      } catch (err) {}
      return {};
    }
    throw new Error(data.message || 'API request failed');
  }

  return data;
};

// --- Auth & Users ---
export const logoutUser = (refreshToken: string) => {
  return request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
};

export const getCurrentUser = () => {
  return request('/users/me');
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

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText}`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuth();
      try {
        const { router } = require('expo-router');
        router.replace('/(auth)/login');
      } catch (err) {}
      return {};
    }
    throw new Error(data.message || 'Avatar upload failed');
  }

  return data;
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
  return request(`/decks/${deckId}/stats`);
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

export const createCard = (deckId: string, data: { contentFront: string; contentBack: string; imageUrl?: string; position?: number; langFront?: string; langBack?: string }) => {
  return request(`/decks/${deckId}/cards`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const bulkCreateCards = (deckId: string, cards: { contentFront: string; contentBack: string; imageUrl?: string; langFront?: string; langBack?: string }[]) => {
  return request(`/decks/${deckId}/cards/bulk`, {
    method: 'POST',
    body: JSON.stringify({ cards }),
  });
};

export const getCard = (cardId: string) => {
  return request(`/cards/${cardId}`);
};

export const updateCard = (cardId: string, data: { contentFront?: string; contentBack?: string; imageUrl?: string; langFront?: string; langBack?: string }) => {
  return request(`/cards/${cardId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
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

// --- Import ---
export const parseImportFile = async (uri: string, mimeType: string, fileName: string, fileType: 'csv' | 'tsv' | 'pdf') => {
  if (!authToken) {
    authToken = (await AsyncStorage.getItem('authToken')) || '';
    currentRefreshToken = (await AsyncStorage.getItem('refreshToken')) || '';
  }

  const formData = new FormData();
  formData.append('file', {
    uri,
    type: mimeType,
    name: fileName,
  } as any);
  formData.append('file_type', fileType);

  const response = await fetch(`${API_URL}/import/parse`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    body: formData,
  });

  const responseText = await response.text();
  let data;
  try {
    data = responseText ? JSON.parse(responseText) : {};
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText}`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      await clearAuth();
      try {
        const { router } = require('expo-router');
        router.replace('/(auth)/login');
      } catch (err) {}
      return {};
    }
    throw new Error(data.message || 'File parse failed');
  }

  return data;
};
