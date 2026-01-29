# Dependencies Guide

This document lists all required dependencies for the Kids Puzzle Game with social features and monetization.

## Frontend Dependencies

### Required for Social Features (Firebase)

```bash
cd frontend

# Firebase SDK
npm install firebase

# Or if using yarn:
yarn add firebase
```

**Packages:**
- `firebase` - Firebase JavaScript SDK for Firestore, Authentication, Analytics

**Version:** `^10.7.0` or latest

**Configuration files needed:**
- `/frontend/config/firebase.ts` ✅ (already created)
- `/frontend/services/firebase-service.ts` ✅ (already created)
- `/frontend/.env` (create with your Firebase credentials)

### Required for Ads (AdMob)

```bash
cd frontend

# Google Mobile Ads SDK for React Native
npm install react-native-google-mobile-ads

# For Expo users (managed workflow), also install:
npm install expo-dev-client

# Then prebuild to generate native code:
npx expo prebuild

# Or if using yarn:
yarn add react-native-google-mobile-ads
yarn add expo-dev-client
```

**Packages:**
- `react-native-google-mobile-ads` - Official AdMob SDK for React Native
- `expo-dev-client` - Required for Expo apps using native modules

**Version:** Latest stable version

**Configuration files needed:**
- `/frontend/services/admob-service.ts` (create as per guide)
- `/frontend/hooks/useInterstitialAd.ts` (create as per guide)
- `/frontend/hooks/useRewardedAd.ts` (create as per guide)
- `/frontend/components/BannerAd.tsx` (create as per guide)

### Already Installed Dependencies

These should already be in your project:

```json
{
  "dependencies": {
    "expo": "^50.0.0",
    "expo-router": "^3.0.0",
    "react": "18.2.0",
    "react-native": "0.73.0",
    "@react-native-async-storage/async-storage": "^1.21.0",
    "@expo/vector-icons": "^14.0.0",
    "expo-file-system": "^16.0.0",
    "expo-image-picker": "^14.7.0",
    "react-native-safe-area-context": "^4.8.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3"
  }
}
```

## Complete package.json

Here's what your `/frontend/package.json` should look like after adding new dependencies:

```json
{
  "name": "kids-puzzle-game",
  "version": "1.0.0",
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "prebuild": "expo prebuild",
    "clean": "expo prebuild --clean"
  },
  "dependencies": {
    "expo": "~50.0.17",
    "expo-router": "~3.4.8",
    "react": "18.2.0",
    "react-native": "0.73.6",
    "react-native-safe-area-context": "4.8.2",
    "react-native-screens": "~3.29.0",

    "@react-native-async-storage/async-storage": "^1.21.0",
    "@expo/vector-icons": "^14.0.0",
    "expo-file-system": "~16.0.7",
    "expo-image-picker": "~14.7.1",

    "firebase": "^10.7.1",
    "react-native-google-mobile-ads": "^13.2.0",
    "expo-dev-client": "~3.3.8"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@types/react": "~18.2.45",
    "typescript": "^5.1.3"
  },
  "private": true
}
```

## iOS-Specific Setup

### For AdMob on iOS

After installing dependencies, you need to update iOS files:

1. **Install Pods:**
```bash
cd frontend/ios
pod install
cd ..
```

2. **Update Info.plist:**

Add AdMob App ID to `/frontend/ios/YourAppName/Info.plist`:

```xml
<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>

<key>SKAdNetworkItems</key>
<array>
  <dict>
    <key>SKAdNetworkIdentifier</key>
    <string>cstr6suwn9.skadnetwork</string>
  </dict>
  <!-- Add more SKAdNetwork IDs as needed -->
</array>
```

3. **Update Podfile:**

Ensure minimum iOS version in `/frontend/ios/Podfile`:

```ruby
platform :ios, '13.0'
```

## Android-Specific Setup

### For AdMob on Android

1. **Update AndroidManifest.xml:**

Add to `/frontend/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
    <application>
        <!-- AdMob App ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
    </application>
</manifest>
```

2. **Update build.gradle:**

Ensure in `/frontend/android/build.gradle`:

```gradle
buildscript {
    ext {
        minSdkVersion = 23  // Required for AdMob
        compileSdkVersion = 34
        targetSdkVersion = 34
    }
}
```

## Environment Variables

Create `/frontend/.env` file:

```bash
# Backend URL
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# AdMob Ad Unit IDs - Android
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_REWARDED_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ

# AdMob Ad Unit IDs - iOS
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
```

**Don't forget to add `.env` to `.gitignore`!**

## Installation Steps

### Fresh Install

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd kids-puzzle-game

# 2. Install backend dependencies
cd backend
npm install

# 3. Install frontend dependencies
cd ../frontend
npm install

# 4. Install additional dependencies for social features
npm install firebase

# 5. For AdMob (optional, if implementing ads now)
npm install react-native-google-mobile-ads expo-dev-client

# 6. Generate native projects (for Expo)
npx expo prebuild

# 7. For iOS (if on Mac)
cd ios
pod install
cd ..

# 8. Set up environment variables
cp .env.example .env
# Edit .env with your Firebase and AdMob credentials

# 9. Start development server
npm start
```

### Updating Existing Project

If you already have the project:

```bash
cd frontend

# Update dependencies
npm install firebase react-native-google-mobile-ads expo-dev-client

# Regenerate native code
npx expo prebuild --clean

# Install iOS pods (Mac only)
cd ios && pod install && cd ..

# Start
npm start
```

## Troubleshooting

### Common Issues

**Issue**: `Module not found: firebase`
- **Solution**: Run `npm install firebase` in frontend directory

**Issue**: `Expo modules are not configured`
- **Solution**: Run `npx expo prebuild` to generate native code

**Issue**: `Pod install failed` (iOS)
- **Solution**:
  ```bash
  cd ios
  pod cache clean --all
  pod deintegrate
  pod install
  ```

**Issue**: AdMob errors on Android
- **Solution**: Ensure `minSdkVersion` is at least 23 in `build.gradle`

**Issue**: Firebase initialization error
- **Solution**: Verify all environment variables are set correctly in `.env`

## Checking Installed Dependencies

To verify dependencies are installed:

```bash
cd frontend

# List all dependencies
npm list

# Check specific package
npm list firebase
npm list react-native-google-mobile-ads

# Check outdated packages
npm outdated
```

## Updating Dependencies

To update to latest versions:

```bash
cd frontend

# Update all to latest compatible versions
npm update

# Update specific package
npm update firebase

# Update to latest major versions (careful!)
npm install firebase@latest
```

## Production Build Dependencies

For production builds, you may also need:

```bash
# EAS Build (Expo Application Services)
npm install -g eas-cli

# Fastlane (iOS distribution)
# Install via Ruby Gems:
sudo gem install fastlane
```

## Summary

**Minimum Required (already installed):**
- React Native / Expo core packages ✅
- AsyncStorage ✅
- File system ✅
- Image picker ✅

**Required for Social Features (NEW):**
- firebase ⚠️ **INSTALL THIS**

**Required for Ads (NEW):**
- react-native-google-mobile-ads ⚠️ **INSTALL THIS**
- expo-dev-client ⚠️ **INSTALL THIS**

**Total Size:**
- Firebase: ~2-3 MB
- AdMob SDK: ~10-15 MB
- Total additional: ~15-20 MB

## Next Steps

1. Install Firebase: `npm install firebase`
2. Configure Firebase (see FIREBASE_SETUP.md)
3. Test social features (groups, leaderboard)
4. Install AdMob (when ready): `npm install react-native-google-mobile-ads expo-dev-client`
5. Configure AdMob (see ADMOB_IMPLEMENTATION_GUIDE.md)
6. Test ads
7. Publish to app stores

For detailed setup instructions, see:
- `FIREBASE_SETUP.md` - Firebase configuration
- `ADMOB_IMPLEMENTATION_GUIDE.md` - AdMob implementation
- `FEATURE_DISCUSSION.md` - Feature overview and architecture
