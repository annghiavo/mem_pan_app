# mem_pan App — Developer Documentation

**Last updated**: 2026-05-12  
**Project**: mem_pan (Memory Panel) — Spaced Repetition Flashcard Platform  
**Author**: An Nghia Vo

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Mobile App (mem_pan_mb)](#3-mobile-app-mem_pan_mb)
   - 3.1 [Tech Stack](#31-tech-stack)
   - 3.2 [Configuration Files](#32-configuration-files)
   - 3.3 [Routing Architecture](#33-routing-architecture)
   - 3.4 [Screen-by-Screen Breakdown](#34-screen-by-screen-breakdown)
   - 3.5 [Services Layer](#35-services-layer)
   - 3.6 [Business Logic Utilities](#36-business-logic-utilities)
   - 3.7 [Types](#37-types)
   - 3.8 [UI Components](#38-ui-components)
   - 3.9 [Theming & Styling](#39-theming--styling)
   - 3.10 [State Management](#310-state-management)
   - 3.11 [Testing](#311-testing)
4. [Admin Web App (mem_pan_admin)](#4-admin-web-app-mem_pan_admin)
   - 4.1 [Tech Stack](#41-tech-stack)
   - 4.2 [Configuration Files](#42-configuration-files)
   - 4.3 [Routing & Auth Guard](#43-routing--auth-guard)
   - 4.4 [Pages](#44-pages)
   - 4.5 [API Layer](#45-api-layer)
   - 4.6 [State Management](#46-state-management)
   - 4.7 [Components](#47-components)
5. [Shared Concepts](#5-shared-concepts)
   - 5.1 [Authentication Flow](#51-authentication-flow)
   - 5.2 [API Contract & Response Patterns](#52-api-contract--response-patterns)
   - 5.3 [SRS (Spaced Repetition System)](#53-srs-spaced-repetition-system)
6. [How to Run](#6-how-to-run)
7. [Environment Variables](#7-environment-variables)
8. [Common Patterns & Conventions](#8-common-patterns--conventions)
9. [Known Architecture Decisions](#9-known-architecture-decisions)

---

## 1. Project Overview

**mem_pan** is a flashcard-based learning platform inspired by Quizlet. Users can:

- Create **decks** (study sets) containing **cards** (term/definition pairs with optional images)
- Organize decks into **folders**
- Study via **flashcard flip mode** or a **quiz mode** (multiple choice, written, true/false)
- Track memorization progress powered by a **Spaced Repetition System (SRS)**
- Import cards from CSV, Excel, or PDF files

The platform consists of two applications:

| App | Path | Purpose |
|-----|------|---------|
| Mobile App | `mem_pan_mb/` | End-user iOS/Android/Web app built with Expo |
| Admin Web | `mem_pan_admin/admin-web/` | Internal admin dashboard for managing users, decks, and reports |

Both apps communicate with a shared backend REST API (running separately, not included in this repo).

---

## 2. Monorepo Structure

```
mem_pan_app/
├── mem_pan_mb/               # Mobile app (Expo + React Native)
│   ├── app/                  # File-based routes (Expo Router)
│   ├── components/           # Reusable UI components
│   ├── services/             # API client (all backend calls)
│   ├── utils/                # Pure business logic helpers
│   ├── types/                # TypeScript interfaces
│   ├── constants/            # Theme colors, fonts
│   ├── hooks/                # Custom React hooks
│   ├── __tests__/            # Unit tests
│   ├── assets/               # Images, fonts
│   ├── app.json              # Expo configuration
│   ├── package.json
│   └── tsconfig.json
│
├── mem_pan_admin/
│   └── admin-web/            # Admin dashboard (React + Vite)
│       ├── src/
│       │   ├── api/          # Axios clients per domain
│       │   ├── store/        # Zustand global state
│       │   ├── pages/        # Route-level page components
│       │   ├── components/   # Shared UI components
│       │   └── types/        # TypeScript interfaces
│       ├── vite.config.ts
│       └── package.json
│
└── DOCUMENTATION.md          # This file
```

This is a simple co-located monorepo (no shared packages/workspaces). Each sub-project manages its own dependencies independently.

---

## 3. Mobile App (mem_pan_mb)

### 3.1 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React Native | 0.81.5 | Cross-platform mobile UI |
| Meta-framework | Expo | 54.0.34 | Build toolchain, native modules, OTA updates |
| Routing | Expo Router | 6.0.23 | File-based navigation (like Next.js for mobile) |
| Language | TypeScript | 5.9.2 | Static typing |
| Persistent storage | AsyncStorage | latest | Store auth token between sessions |
| File picking | expo-document-picker | latest | Import CSV/Excel/PDF files |
| Image picking | expo-image-picker | latest | Upload card images |
| PDF parsing | pdfjs-dist | latest | Extract text from PDF imports |
| CSV parsing | papaparse | latest | Parse CSV files for bulk card import |
| Excel parsing | xlsx | latest | Parse `.xlsx` files for bulk card import |
| Audio/Video | expo-av | latest | Text-to-speech playback support |
| Testing | Jest + jest-expo | 30.3.0 / 55.0.16 | Unit tests for business logic |

**Experimental features enabled** (in `app.json`):
- React Compiler — auto-memoization of components
- Typed Routes — compile-time route safety
- New Architecture — Fabric renderer + JSI

### 3.2 Configuration Files

#### `app.json`
The central Expo configuration file. Key settings:
- `expo.name` / `expo.slug` — App display name and URL slug
- `expo.plugins` — Native module plugins (camera, document picker, etc.)
- `expo.splash` — Splash screen image and background
- `expo.ios` / `expo.android` — Platform-specific bundle IDs and permissions
- `expo.experiments.typedRoutes: true` — Enables compile-time route type checking
- `expo.experiments.reactCompiler: true` — Enables React Compiler (auto-memo)

#### `tsconfig.json`
- Extends `expo/tsconfig.base`
- Adds path alias `@/*` → project root (e.g., `@/services/api` instead of `../../services/api`)
- `strict: true` enabled

#### `jest.config.js`
- Uses `jest-expo` preset
- Transforms for React Native
- Mocks for `AsyncStorage` and `expo-router`

### 3.3 Routing Architecture

The app uses **Expo Router**, which turns the `app/` directory into a route tree — the same concept as Next.js App Router, but for React Native.

```
app/
├── _layout.tsx               # Root layout — wraps everything, auth guard + theme
├── index.tsx                 # Entry point — checks auth, redirects accordingly
├── modal.tsx                 # Modal template
│
├── (auth)/                   # Auth route group (no tab bar)
│   ├── _layout.tsx           # Stack navigator for auth screens
│   ├── login.tsx             # Login screen
│   └── register.tsx          # Registration screen
│
├── (tabs)/                   # Main tab route group
│   ├── _layout.tsx           # Tab bar with 3 tabs
│   ├── index.tsx             # Home tab (dashboard)
│   ├── create.tsx            # Create tab (deck or folder)
│   └── library.tsx           # Library tab (decks & folders list)
│
├── (profile)/                # Profile route group (stack)
│   ├── _layout.tsx           # Stack navigator for profile
│   ├── index.tsx             # Profile screen
│   ├── achievements.tsx      # Achievement badges
│   └── settings.tsx          # Account settings
│
├── module/
│   ├── [id].tsx              # Deck detail screen (dynamic route)
│   └── create.tsx            # Create new deck screen
│
├── folder/
│   ├── [id].tsx              # Folder detail screen (dynamic route)
│   └── create.tsx            # Create new folder screen
│
├── quiz/
│   └── [id].tsx              # Quiz/study session screen (dynamic route)
│
├── flashcard/
│   └── [id].tsx              # Flashcard flip mode (dynamic route)
│
├── practice-setup/
│   └── [id].tsx              # Pre-study settings screen
│
└── quiz-settings/
    └── [id].tsx              # Quiz customization screen
```

**Route groups** (folders wrapped in parentheses like `(tabs)`) are a routing concept — they don't appear in the URL/path but allow different layout wrappers for different sections.

**Dynamic routes** (files like `[id].tsx`) capture a URL parameter. Access it with `useLocalSearchParams()`.

**Navigation flow**:
```
app/index.tsx
    ↓ has token?
    ├── YES → /(tabs)/index   (Home dashboard)
    └── NO  → /(auth)/login
```

### 3.4 Screen-by-Screen Breakdown

#### `app/index.tsx` — Splash / Auth Router
- **Purpose**: Entry point. Reads `authToken` from AsyncStorage, then navigates.
- **Key calls**: `AsyncStorage.getItem('authToken')`, `AsyncStorage.getItem('theme')`
- **Navigation**: `router.replace('/(tabs)')` or `router.replace('/(auth)/login')`
- **Also applies**: Saved theme preference on first load

---

#### `app/(auth)/login.tsx` — Login Screen
- **Purpose**: Email + password form. On success, saves token and navigates to home.
- **Key calls**: `setAuthToken(token)`, `setRefreshToken(refreshToken)` from `services/api.ts`
- **State**: `email`, `password`, `loading`, `error` — all local `useState`
- **Navigation**: `router.replace('/(tabs)')` on success

---

#### `app/(tabs)/index.tsx` — Home Dashboard
- **Purpose**: Shows the user's recent activity — recent study sessions and recent decks.
- **Key calls**:
  - `getRecentDecks()` — list of recently accessed decks
  - `getDeck(id)` — detail for each recent deck
  - `getDeckProgress(id)` — memorization % per deck (for progress bars)
- **UI elements**: User avatar, search bar, progress bars, deck grid
- **Refresh**: `useFocusEffect` re-fetches data every time the tab is focused

---

#### `app/(tabs)/create.tsx` — Create Screen
- **Purpose**: Entry point for creation. Shows two buttons: "Create Module" and "Create Folder".
- **Navigation**: `router.push('/module/create')` or `router.push('/folder/create')`

---

#### `app/(tabs)/library.tsx` — Library Screen
- **Purpose**: Lists all user's decks and folders with tabs to switch between them.
- **Key calls**: `getDecks()`, `getFolders()`
- **UI**: Two tabs (Decks / Folders), each with a flat list + pull-to-refresh

---

#### `app/(profile)/index.tsx` — Profile Screen
- **Purpose**: Shows user info (avatar, username, email) and menu links.
- **Key calls**: `getCurrentUser()`
- **Navigation**: Links to Achievements and Settings sub-screens
- **Avatar**: Shows image from URL, or falls back to initials from username

---

#### `app/(profile)/achievements.tsx` — Achievements Screen
- **Purpose**: Displays earned achievement badges and study statistics.
- **Key calls**: (achievement-related API endpoints)

---

#### `app/(profile)/settings.tsx` — Settings Screen
- **Purpose**: Account settings — change password, toggle theme, manage avatar.
- **Key calls**: `changePassword()`, `uploadAvatar()`, `updateDeckSettings()`

---

#### `app/module/create.tsx` — Create Deck Screen
- **Purpose**: Form to create a new deck with cards.
- **Key calls**:
  - `createDeck(name, description, isPublic)` — creates the deck first
  - `bulkCreateCards(deckId, cards)` — adds all cards in one request
  - `createCard(deckId, data)` — for cards with images (multipart)
- **Features**:
  - Dynamic card list (add/remove cards)
  - Language pair selection (13+ languages)
  - Import from CSV, Excel, or PDF — parses file client-side, then bulk-creates cards
- **State**: Complex local state managing the card array and import status

---

#### `app/module/[id].tsx` — Deck Detail Screen
- **Purpose**: Shows a deck's info and all its cards. Entry point to study modes.
- **Key calls**:
  - `getDeck(id)` — deck metadata
  - `getDeckCards(id)` — all cards in the deck
  - `getDeckProgress(id)` — memorization progress
- **Actions**: Edit deck, Delete deck, Move to folder, Start Quiz, Start Flashcards
- **Navigation**:
  - `router.push('/quiz/${id}')` — start quiz
  - `router.push('/flashcard/${id}')` — start flashcard mode

---

#### `app/flashcard/[id].tsx` — Flashcard Mode
- **Purpose**: Simple flip-card study. Swipe through cards, tap to flip term ↔ definition.
- **Key calls**: `getDeckCards(deckId)`
- **Animation**: 3D card flip using `Animated.Value` with `rotateY` interpolation
- **State**: `currentIndex`, `isFlipped`, `showFront` (which side is the question)

---

#### `app/quiz/[id].tsx` — Quiz / Study Session Screen
- **Purpose**: Full interactive study session. The most complex screen in the app.
- **Flow**:
  1. Load deck settings from `getDeckStudySettings(deckId)`
  2. Load cards from `getDeckCards(deckId)`
  3. `startStudySession(deckId, settings)` — creates a session on the server
  4. Generate questions using `generateQuestions()` from `utils/learningLogic.ts`
  5. For each question: show prompt, capture answer, check answer, show feedback
  6. After each answer: `reviewCard(sessionId, cardId, rating)` — submits SRS rating
  7. `finishStudySession(sessionId)` — closes session, gets summary stats
- **Question types**: Multiple Choice, Written (text input), Flashcard (flip to reveal)
- **Answer checking**: Levenshtein distance for written answers (flexible mode)
- **SRS rating**: Based on correctness + response time (see Section 5.3)
- **Settings**: Shuffle, TTS, answer side (term or definition), strictness level

---

#### `app/folder/create.tsx` — Create Folder Screen
- **Purpose**: Simple form to create a named folder.
- **Key calls**: `createFolder(name, description)`

---

#### `app/folder/[id].tsx` — Folder Detail Screen
- **Purpose**: Shows all decks inside a folder.
- **Key calls**: `getFolder(folderId)` — returns folder + its decks

---

### 3.5 Services Layer

**File**: `mem_pan_mb/services/api.ts`

This is the **single file responsible for all backend communication**. Every network call in the app goes through this file. No other file should contain `fetch()` calls.

#### Structure

```typescript
// Base URL (set via environment variable)
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080/v1';

// In-memory token cache (also persisted to AsyncStorage)
let authToken: string | null = null;

// Central fetch wrapper
async function apiFetch(path, options) {
  // 1. Auto-attach Authorization header
  // 2. On 401 → call clearAuth() (logout)
  // 3. Return parsed JSON or throw on error
}
```

#### Auth Management

| Function | Description |
|----------|-------------|
| `setAuthToken(token)` | Save token to AsyncStorage + in-memory cache |
| `setRefreshToken(token)` | Save refresh token to AsyncStorage |
| `clearAuth()` | Clear both tokens from AsyncStorage + memory (logout) |

#### API Functions by Domain

**Users**

| Function | HTTP | Path | Description |
|----------|------|------|-------------|
| `getCurrentUser()` | GET | `/users/me` | Fetch logged-in user's profile |
| `changePassword(old, new)` | PATCH | `/users/me/password` | Change password |
| `uploadAvatar(uri, mime, name)` | POST | `/users/me/avatar` | Upload profile picture (multipart) |

**Decks**

| Function | HTTP | Path | Description |
|----------|------|------|-------------|
| `getDecks(page, pageSize)` | GET | `/decks` | Paginated list of user's decks |
| `createDeck(name, desc, isPublic)` | POST | `/decks` | Create a new deck |
| `getDeck(deckId)` | GET | `/decks/{id}` | Fetch deck + creator info |
| `updateDeck(deckId, name, desc)` | PUT | `/decks/{id}` | Rename/redescribe a deck |
| `updateDeckSettings(deckId, settings)` | PATCH | `/decks/{id}/settings` | Update study settings |
| `updateDeckVisibility(deckId, isPublic)` | PATCH | `/decks/{id}/visibility` | Make public/private |
| `deleteDeck(deckId)` | DELETE | `/decks/{id}` | Delete deck permanently |
| `getPublicDecks(page, pageSize)` | GET | `/decks/public` | Browse public decks |
| `getDeckStats(deckId)` | GET | `/decks/{id}/stats` | Deck statistics |
| `cloneDeck(deckId)` | POST | `/decks/{id}/clone` | Copy a public deck to own library |

**Cards**

| Function | HTTP | Path | Description |
|----------|------|------|-------------|
| `getDeckCards(deckId)` | GET | `/decks/{id}/cards` | All cards in a deck |
| `createCard(deckId, data)` | POST | `/decks/{id}/cards` | Create card (multipart for images) |
| `bulkCreateCards(deckId, cards)` | POST | `/decks/{id}/cards/bulk` | Create many cards at once (JSON) |
| `getCard(cardId)` | GET | `/cards/{id}` | Single card detail |
| `updateCard(cardId, data)` | PUT | `/cards/{id}` | Update card content |
| `deleteCard(cardId)` | DELETE | `/cards/{id}` | Delete a card |

**Folders**

| Function | HTTP | Path | Description |
|----------|------|------|-------------|
| `getFolders()` | GET | `/folders` | All user's folders |
| `createFolder(name, desc)` | POST | `/folders` | Create a folder |
| `getFolder(folderId)` | GET | `/folders/{id}` | Folder + its decks |
| `updateFolder(folderId, name, desc)` | PATCH | `/folders/{id}` | Rename a folder |
| `deleteFolder(folderId)` | DELETE | `/folders/{id}` | Delete a folder |
| `addDeckToFolder(folderId, deckId)` | POST | `/folders/{id}/decks/{deckId}` | Add deck to folder |
| `removeDeckFromFolder(folderId, deckId)` | DELETE | `/folders/{id}/decks/{deckId}` | Remove deck from folder |

**Study / Progress**

| Function | HTTP | Path | Description |
|----------|------|------|-------------|
| `getRecentDecks()` | GET | `/study/decks/recent` | Recently studied decks |
| `getDeckProgress(deckId)` | GET | `/study/decks/{id}/progress` | Memorized card count |
| `getDueCards(deckId?)` | GET | `/study/cards/due` | Cards due for review |
| `startStudySession(deckId, settings)` | POST | `/study/sessions` | Open a new session |
| `reviewCard(sessionId, cardId, rating)` | POST | `/study/sessions/{id}/cards/{cardId}` | Submit SRS rating (1–4) |
| `finishStudySession(sessionId)` | POST | `/study/sessions/{id}/finish` | Close session, get results |
| `getDeckStudySettings(deckId)` | GET | `/study/decks/{id}/settings` | Fetch saved study settings |

### 3.6 Business Logic Utilities

**File**: `mem_pan_mb/utils/learningLogic.ts`

This file contains **pure functions** — no React, no API calls, no side effects. All study-mode logic lives here so it can be unit-tested independently of the UI.

#### Question Generation

```
generateQuestions(cards, settings)
    ↓
distributeQuestionTypes(count, enabledTypes)   → determines how many of each type
    ↓ for each slot:
    ├── buildMCQuestion(card, allCards, answerSide, shuffle)
    ├── buildTFQuestion(card, allCards, answerSide, isTrue)
    └── buildWrittenQuestion(card, answerSide)
```

**`buildMCQuestion(card, allCards, answerSide, shuffle)`**
- Picks 3 wrong-answer distractors from `allCards`
- Shuffles options if `shuffle` is true
- Returns: `{ type: 'mc', prompt, options: string[], correctIndex }`

**`buildTFQuestion(card, allCards, answerSide, isTrue)`**
- 50% chance of being true (correct pair) or false (swapped with another card's answer)
- Returns: `{ type: 'tf', prompt, statement, isTrue }`

**`buildWrittenQuestion(card, answerSide)`**
- Returns: `{ type: 'written', prompt, correctAnswer }`

#### Answer Checking

**`checkWrittenAnswer(userAnswer, correctAnswer, strictness)`**

| Mode | Behavior |
|------|----------|
| `'strict'` | Case-insensitive exact match |
| `'flexible'` | Normalize punctuation + Levenshtein distance tolerance |

The Levenshtein threshold scales with answer length so short answers require exact matches while long answers allow a few typos.

#### SRS Rating Calculation

**`calculateRating(isCorrect, durationMs)`**

| Condition | Rating | Meaning |
|-----------|--------|---------|
| Wrong answer | 1 | Again (show soon) |
| Correct, < 3s | 4 | Easy (push far out) |
| Correct, 3–8s | 3 | Good (normal interval) |
| Correct, > 8s | 2 | Hard (push less far) |

#### Helper Functions

| Function | Description |
|----------|-------------|
| `calculateQuizResult(answers)` | Returns `{ correct, incorrect, percentage }` |
| `canDisableType(target, current)` | Prevents disabling the last enabled question type |
| `clampQuestionCount(requested, total)` | Clamps to `[2, totalCards]` |
| `computeProgressPercent(memorized, total)` | Returns `0–100` for progress bars |

### 3.7 Types

**File**: `mem_pan_mb/types/studySettings.ts`

```typescript
interface StudySettings {
  shuffleTerms: boolean;          // Randomize card order
  textToSpeech: boolean;          // Read prompts aloud
  answerWithTerm: boolean;        // Show definition, answer with term
  answerWithDefinition: boolean;  // Show term, answer with definition
  questionTypeFlashcards: boolean;
  questionTypeMultipleChoice: boolean;
  questionTypeWritten: boolean;
  strictnessLevel: 'flexible' | 'strict';
  requireRetypingCorrectAnswer: boolean; // Force retyping after wrong answer
}
```

**Default settings**: MC and Written enabled, no shuffle, flexible strictness.

### 3.8 UI Components

**Directory**: `mem_pan_mb/components/`

| File | Purpose |
|------|---------|
| `themed-text.tsx` | `<Text>` that automatically uses light/dark theme color |
| `themed-view.tsx` | `<View>` that automatically uses light/dark theme background |
| `external-link.tsx` | Opens a URL in the system browser |
| `haptic-tab.tsx` | Tab bar button with haptic feedback (iOS) |
| `hello-wave.tsx` | Animated waving hand emoji (used on home) |
| `parallax-scroll-view.tsx` | ScrollView with a parallax hero image header |
| `ui/collapsible.tsx` | Expandable/collapsible section |
| `ui/icon-symbol.tsx` | Cross-platform icon component |
| `ui/icon-symbol.ios.tsx` | iOS-specific SF Symbols variant of the icon component |

These are all generic presentational components. Business logic belongs in screens or `utils/`.

### 3.9 Theming & Styling

**File**: `mem_pan_mb/constants/theme.ts`

```typescript
export const Colors = {
  light: {
    primary: '#5865F2',    // Main brand color (indigo)
    background: '#FFFFFF',
    text: '#11181C',
    // ...
  },
  dark: {
    primary: '#5865F2',
    background: '#151718',
    text: '#ECEDEE',
    // ...
  },
};

export const Fonts = {
  ios: { fontFamily: 'San Francisco' },
  android: { fontFamily: 'Roboto' },
  web: { fontFamily: 'system-ui' },
};
```

**How to use in a component**:

```typescript
import { useThemeColor } from '@/hooks/use-theme-color';

const backgroundColor = useThemeColor({}, 'background');
const textColor = useThemeColor({}, 'text');
```

Styling uses React Native's `StyleSheet.create()` — no CSS-in-JS libraries. Colors are resolved at runtime based on `useColorScheme()`.

### 3.10 State Management

The mobile app uses **local component state only** — no Redux, no Zustand, no Context API for data.

| Concern | Where it lives |
|---------|---------------|
| Auth token | AsyncStorage (persistent) + module-level variable in `api.ts` |
| UI state (forms, loading, error) | `useState` in each screen component |
| Theme preference | AsyncStorage key `'theme'` |
| API data | Fetched per-screen, no shared cache |

Screens re-fetch data on focus using `useFocusEffect` from `@react-navigation/native`. Pull-to-refresh is handled with `RefreshControl` on `ScrollView` or `FlatList`.

### 3.11 Testing

**Directory**: `mem_pan_mb/__tests__/`

**File**: `learning-flow.test.tsx` — Unit tests for `utils/learningLogic.ts`

Tests cover:
- `clampQuestionCount` — boundary clamping
- `canDisableType` — prevents disabling last type
- `buildMCQuestion` — correct options structure
- `buildTFQuestion` — true/false logic
- `buildWrittenQuestion` — prompt + answer
- `generateQuestions` — full question set generation
- `checkWrittenAnswer` — strict and flexible modes
- `calculateQuizResult` — score aggregation
- `calculateRating` — SRS rating by time
- `computeProgressPercent` — progress bar calculation

**Run tests**:
```bash
cd mem_pan_mb
npm test
# or for a single file:
npx jest __tests__/learning-flow.test.tsx
```

---

## 4. Admin Web App (mem_pan_admin)

### 4.1 Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.2.5 | UI rendering |
| Router | React Router DOM | 7.15.0 | Client-side routing |
| State | Zustand | 5.0.13 | Auth state (persisted to localStorage) |
| Data fetching | TanStack React Query | 5.100.9 | API cache + automatic refetching |
| HTTP client | Axios | 1.16.0 | HTTP requests with interceptors |
| UI primitives | Radix UI (Dialog) | latest | Accessible modal dialogs |
| Icons | Lucide React | latest | SVG icon set |
| Build tool | Vite | 8.0.10 | Dev server + bundler |
| Language | TypeScript | 6.0.2 | Static typing |

### 4.2 Configuration Files

#### `vite.config.ts`
- Dev server runs at `localhost:5173`
- Proxies `/v1/*` requests to the backend (Firebase Cloud Workstations URL) to avoid CORS during development
- To change backend URL, edit the `proxy` target in `vite.config.ts`

#### `tsconfig.app.json`
- Strict mode enabled
- `moduleResolution: "bundler"` for Vite compatibility

### 4.3 Routing & Auth Guard

**File**: `src/App.tsx`

```
/               → redirect to /reports
/login          → LoginPage (public)
/reports        → ReportsPage (private — requires admin token)
/users          → UsersPage (private)
/decks          → DecksPage (private)
```

**`PrivateRoute` component**: Checks `useAuthStore((s) => s.token)`. If no token, redirects to `/login`.

```tsx
// Pattern for adding a new protected page:
<Route path="/new-page" element={<PrivateRoute><NewPage /></PrivateRoute>} />
```

### 4.4 Pages

**File**: `src/pages/LoginPage.tsx`
- Email + password form
- Calls `loginUser(email, password)` → receives `{ token, user }`
- Checks `user.role === 'admin'` — shows warning and rejects non-admins
- On success: stores token + role in Zustand, navigates to `/reports`

---

**File**: `src/pages/ReportsPage.tsx`
- Lists user-submitted reports (abuse, content violations, etc.)
- Filter tabs: All / Pending / Reviewing / Resolved / Dismissed
- Pagination
- Clicking a report opens `ProcessReportModal`
- Data: `useQuery({ queryFn: listReports })` via React Query

---

**File**: `src/pages/UsersPage.tsx`
- Lists all registered users
- Admin actions: ban user, reset password, view profile

---

**File**: `src/pages/DecksPage.tsx`
- Lists all decks in the system (not just one user's)
- Admin actions: view, delete flagged decks

### 4.5 API Layer

**Directory**: `src/api/`

#### `client.ts` — Axios Instance
```typescript
const client = axios.create({ baseURL: '/v1' });

// Request interceptor: auto-attach token from Zustand store
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: 401/403 → clear auth + redirect to login
client.interceptors.response.use(null, (error) => {
  if (error.response?.status === 401 || 403) {
    localStorage.clear();
    window.location.href = '/login';
  }
  return Promise.reject(error);
});
```

#### `auth.ts` — Auth API calls
| Function | Description |
|----------|-------------|
| `loginUser(email, password)` | POST `/auth/login` |
| `extractAccessToken(response)` | Safely pull token from response |
| `extractUserRole(response)` | Safely pull role from response |

#### `reports.ts` — Reports API calls
| Function | Description |
|----------|-------------|
| `listReports(status, page)` | GET `/admin/reports` with filters |
| `processReport(reportId, action)` | PATCH `/admin/reports/{id}` |

### 4.6 State Management

**File**: `src/store/authStore.ts`

Uses Zustand with the `persist` middleware (saves to `localStorage`):

```typescript
interface AuthState {
  token: string | null;
  role: string | null;
  setAuth: (token: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create(
  persist<AuthState>(
    (set) => ({
      token: null,
      role: null,
      setAuth: (token, role) => set({ token, role }),
      logout: () => set({ token: null, role: null }),
    }),
    { name: 'admin-auth' }  // localStorage key
  )
);
```

**Usage in a component**:
```tsx
const { token, setAuth, logout } = useAuthStore();
```

### 4.7 Components

**Directory**: `src/components/`

| File | Purpose |
|------|---------|
| `layout/Sidebar.tsx` | Left navigation menu with page links |
| `layout/TopBar.tsx` | Top header showing current user info + logout button |
| `common/StatusBadge.tsx` | Colored badge for report status (Pending, Resolved, etc.) |
| `reports/ReportTable.tsx` | Table component displaying a list of reports |
| `reports/ProcessReportModal.tsx` | Radix Dialog modal for taking action on a report |

---

## 5. Shared Concepts

### 5.1 Authentication Flow

**Mobile App**:
```
1. User submits email + password on login screen
2. POST /auth/login → { token, refreshToken, user }
3. setAuthToken(token) → AsyncStorage + memory
4. setRefreshToken(refreshToken) → AsyncStorage
5. All subsequent apiFetch() calls → Authorization: Bearer {token}
6. 401 response → clearAuth() → app-level redirect to login
7. app/index.tsx on next launch → reads AsyncStorage → auto-login
```

**Admin Web**:
```
1. Admin submits email + password on login page
2. POST /auth/login → { token, user }
3. Verify user.role === 'admin'
4. useAuthStore.setAuth(token, role) → Zustand → persisted to localStorage
5. Axios interceptor auto-attaches token to every request
6. 401/403 → localStorage.clear() + redirect to /login
7. On page refresh → Zustand rehydrates from localStorage → auto-login
```

### 5.2 API Contract & Response Patterns

The backend API is at `BASE_URL/v1`. The app handles variable response shapes defensively:

```typescript
// Example: getDeck may return different shapes
const deck = data.deck ?? data.data ?? data;
const creatorUsername = data.creatorUsername ?? data.creator?.username ?? '';
```

When adding new API calls, check what shape the backend actually returns before assuming a structure. Use the existing patterns in `api.ts` as reference.

**Error handling pattern** in screens:
```typescript
try {
  setLoading(true);
  const result = await someApiCall();
  setData(result);
} catch (error) {
  setError(error instanceof Error ? error.message : 'Something went wrong');
} finally {
  setLoading(false);
}
```

### 5.3 SRS (Spaced Repetition System)

The SRS determines how soon a card is shown again based on how well the user recalled it.

**Rating scale** (sent to `reviewCard(sessionId, cardId, rating)`):

| Rating | Name | Trigger | Next review |
|--------|------|---------|-------------|
| 1 | Again | Wrong answer | Very soon |
| 2 | Hard | Correct but slow (>8s) | Moderate interval |
| 3 | Good | Correct, normal speed (3–8s) | Standard interval |
| 4 | Easy | Correct, fast (<3s) | Long interval |

The interval scheduling itself is handled server-side. The app only sends the rating number.

**Progress tracking**: `getDeckProgress(deckId)` returns `{ totalCount, memorizedCount }`. A card is "memorized" when its SRS interval exceeds a threshold defined by the backend.

---

## 6. How to Run

### Mobile App

```bash
cd mem_pan_mb

# Install dependencies
npm install

# Start development server
npm start           # Expo Go / Metro bundler
npm run ios         # iOS Simulator (macOS only)
npm run android     # Android emulator
npm run web         # Browser

# Run tests
npm test
```

### Admin Web

```bash
cd mem_pan_admin/admin-web

# Install dependencies
npm install

# Start development server (with backend proxy)
npm run dev         # http://localhost:5173

# Build for production
npm run build       # Output in dist/

# Preview production build locally
npm run preview
```

---

## 7. Environment Variables

### Mobile App (`mem_pan_mb/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080/v1` | Backend API base URL |

Create `.env` at `mem_pan_mb/.env`:
```
EXPO_PUBLIC_API_URL=https://your-backend.com/v1
```

> Variables prefixed with `EXPO_PUBLIC_` are inlined at build time and visible in the app bundle. Never put secrets here.

### Admin Web (`mem_pan_admin/admin-web/vite.config.ts`)

The backend URL for the admin web is configured in the Vite proxy (`vite.config.ts`), not in an `.env` file. Change the `target` value in the proxy configuration to point to a different backend.

---

## 8. Common Patterns & Conventions

### Fetching data in a screen

```typescript
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useFocusEffect(
  useCallback(() => {
    let active = true;
    async function load() {
      try {
        const result = await someApiCall();
        if (active) setData(result);
      } catch (e) {
        if (active) setError('Failed to load');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };  // cleanup on unmount
  }, [])
);
```

### Navigating with typed routes

```typescript
import { router } from 'expo-router';

// Navigate to a static route
router.push('/(tabs)');

// Navigate to a dynamic route
router.push(`/module/${deckId}`);

// Replace (no back button)
router.replace('/(auth)/login');

// Go back
router.back();
```

### Reading route parameters

```typescript
import { useLocalSearchParams } from 'expo-router';

const { id } = useLocalSearchParams<{ id: string }>();
```

### Multipart (file upload) requests

```typescript
const form = new FormData();
form.append('file', {
  uri: localFileUri,
  type: mimeType,
  name: fileName,
} as any);

await apiFetch('/users/me/avatar', {
  method: 'POST',
  body: form,
  // do NOT set Content-Type — fetch sets it automatically with boundary
});
```

---

## 9. Known Architecture Decisions

| Decision | Reason |
|----------|--------|
| No global data cache in mobile app | Keeps complexity low; screens are small enough that per-screen fetch is fast |
| All API calls in one file (`api.ts`) | Single place to update base URL, auth headers, and error handling |
| Pure functions in `utils/learningLogic.ts` | Enables unit testing without React test renderer |
| Expo Router file-based routing | Consistent with web conventions; typed routes catch broken links at compile time |
| Admin uses React Query, mobile does not | Admin pages have more complex data dependencies; mobile screens are simpler and benefit from manual refresh control |
| No shared package between mobile and admin | Avoids monorepo tooling complexity; the apps share no code at this stage |
| SRS rating sent as integer (1–4) | Backend owns the scheduling algorithm; client only sends effort rating |
