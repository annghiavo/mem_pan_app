const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/v1';

let authToken = '';
let currentRefreshToken = '';

export const setAuthToken = (token: string) => {
  authToken = token;
};

export const setRefreshToken = (token: string) => {
  currentRefreshToken = token;
};

export const getRefreshToken = () => {
  return currentRefreshToken;
};

export const clearAuth = () => {
  authToken = '';
  currentRefreshToken = '';
};

const request = async (endpoint: string, options: RequestInit = {}) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

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

export const deleteDeck = (deckId: string) => {
  return request(`/decks/${deckId}`, { method: 'DELETE' });
};

// --- Cards ---
export const getDeckCards = (deckId: string) => {
  return request(`/decks/${deckId}/cards`);
};

export const bulkCreateCards = (deckId: string, cards: any[]) => {
  return request(`/decks/${deckId}/cards/bulk`, {
    method: 'POST',
    body: JSON.stringify({ cards }),
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
