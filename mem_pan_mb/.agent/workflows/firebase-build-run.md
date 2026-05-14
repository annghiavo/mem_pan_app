---
description: How to setup and run the app with Firebase Native SDKs
---
# React Native Firebase with Expo Dev Client Setup

Since this application uses native Firebase modules (`@react-native-firebase/app`), it cannot run in the standard Expo Go app. You need to use `expo-dev-client` and build the native folders.

## Prerequisites

Ensure you have `google-services.json` inside the root of your `mem_pan_mb/` directory.

## 1. Local Setup

Run the prebuild command to generate the `android` (and `ios`) native folders automatically:
```bash
npx expo prebuild --clean
```

## 2. Run the App

Instead of using `npm start` or `npx expo start` to run with Expo Go, you need to compile and run the native app. Choose the platform you are testing on.

**For Android (Emulator or physical device connected):**
```bash
npx expo run:android
```

**For iOS (Mac only, requires Xcode):**
```bash
npx expo run:ios
```

## 3. Subsequent Starts

After the app is installed on your device/emulator once via `run:android` or `run:ios`, you can start the development server quickly without rebuilding native code:
```bash
npx expo start --dev-client
```

This will run a special version of the bundler targeting the Dev Client installed on your device.
