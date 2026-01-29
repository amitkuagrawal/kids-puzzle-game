# AdMob Implementation Guide for Kids Puzzle Game

This guide provides step-by-step instructions for implementing Google AdMob ads in the Kids Puzzle Game with child-safe configurations.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AdMob Account Setup](#admob-account-setup)
3. [Install Dependencies](#install-dependencies)
4. [Configure AdMob](#configure-admob)
5. [Implement Interstitial Ads](#implement-interstitial-ads-primary)
6. [Implement Banner Ads](#implement-banner-ads-secondary)
7. [Implement Rewarded Video Ads](#implement-rewarded-video-ads-optional)
8. [Child-Safe Configuration](#child-safe-configuration)
9. [Testing](#testing)
10. [Production Checklist](#production-checklist)

---

## Prerequisites

- Firebase project set up (already done ✅)
- Google AdMob account
- React Native / Expo project (already done ✅)
- iOS/Android app configured

---

## AdMob Account Setup

### Step 1: Create AdMob Account

1. Go to [AdMob](https://admob.google.com/)
2. Sign in with your Google account
3. Click "Get Started"
4. Accept terms and conditions

### Step 2: Create Apps in AdMob

#### For Android:
1. In AdMob dashboard, click "Apps" > "Add App"
2. Select "No" if app not published yet
3. Enter app name: "Kids Puzzle Game"
4. Select platform: Android
5. Click "Add"
6. **Save the App ID** (format: ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY)

#### For iOS:
1. Repeat process for iOS
2. Select platform: iOS
3. **Save the iOS App ID**

### Step 3: Create Ad Units

Create 3 ad units for each platform (Android & iOS):

#### 1. Interstitial Ad Unit (After Puzzle Completion)
- Click "Ad units" > "Add ad unit"
- Select "Interstitial"
- Name: "Puzzle Completion Interstitial"
- Click "Create ad unit"
- **Save the Ad Unit ID** (format: ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ)

#### 2. Banner Ad Unit (Level Selection Screen)
- Select "Banner"
- Name: "Level Selection Banner"
- Ad size: "Banner (320x50)"
- **Save the Ad Unit ID**

#### 3. Rewarded Video Ad Unit (Hints)
- Select "Rewarded"
- Name: "Hint Reward Video"
- Reward amount: 1
- Reward item: "Hint"
- **Save the Ad Unit ID**

### Step 4: Enable Family-Safe Ads

**CRITICAL FOR KIDS' APP:**

1. In AdMob dashboard, go to "Apps" > Select your app
2. Click "App settings"
3. Under "Store presence", add your app store link (once published)
4. Under "Content rating":
   - Select "Designed for families" (Android)
   - Select "Everyone" or "4+" (iOS)
5. Enable "Treat as child-directed" option
6. Save settings

This ensures only family-friendly ads are shown.

---

## Install Dependencies

### For React Native (with Expo)

If using Expo managed workflow, you'll need to eject or use a custom dev client:

```bash
cd frontend

# Install react-native-google-mobile-ads
npm install react-native-google-mobile-ads

# For Expo users, create custom dev client
npx expo install expo-dev-client
npx expo prebuild
```

### For Bare React Native

```bash
cd frontend
npm install react-native-google-mobile-ads

# iOS additional steps
cd ios
pod install
cd ..
```

---

## Configure AdMob

### Step 1: Add App IDs to Configuration

Create `/frontend/app.json` or update existing:

```json
{
  "expo": {
    "name": "Kids Puzzle Game",
    "slug": "kids-puzzle-game",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY",
          "iosAppId": "ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
        }
      ]
    ]
  }
}
```

### Step 2: Add Environment Variables

Add to `/frontend/.env`:

```bash
# AdMob Ad Unit IDs - Android
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_REWARDED_ANDROID=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ

# AdMob Ad Unit IDs - iOS
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ
EXPO_PUBLIC_ADMOB_REWARDED_IOS=ca-app-pub-XXXXXXXXXXXXXXXX/ZZZZZZZZZZ

# For testing, use test IDs (replace with real IDs in production):
# Test Interstitial: ca-app-pub-3940256099942544/1033173712
# Test Banner: ca-app-pub-3940256099942544/6300978111
# Test Rewarded: ca-app-pub-3940256099942544/5224354917
```

### Step 3: Initialize AdMob

Create `/frontend/services/admob-service.ts`:

```typescript
import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';

// Ad Unit IDs
const AD_UNITS = {
  interstitial: Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID,
  }),
  banner: Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID,
  }),
  rewarded: Platform.select({
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS,
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID,
  }),
};

// Initialize AdMob with child-safe settings
export const initializeAdMob = async () => {
  try {
    await mobileAds().initialize();

    // Configure for family-safe ads
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G, // General audiences
      tagForChildDirectedTreatment: true, // COPPA compliance
      tagForUnderAgeOfConsent: true, // GDPR compliance
    });

    console.log('AdMob initialized with family-safe settings');
  } catch (error) {
    console.error('AdMob initialization error:', error);
  }
};

export default AD_UNITS;
```

### Step 4: Initialize on App Start

Update `/frontend/app/_layout.tsx` or `/frontend/app/index.tsx`:

```typescript
import { useEffect } from 'react';
import { initializeAdMob } from '../services/admob-service';

export default function App() {
  useEffect(() => {
    initializeAdMob();
  }, []);

  // ... rest of your component
}
```

---

## Implement Interstitial Ads (Primary)

**Where**: After puzzle completion (every 2-3 puzzles)

**Frequency**: Show after completing 2 or 3 puzzles, not every single one.

### Step 1: Create Interstitial Hook

Create `/frontend/hooks/useInterstitialAd.ts`:

```typescript
import { useEffect, useState } from 'react';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import AD_UNITS from '../services/admob-service';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUZZLE_COUNT_KEY = '@puzzle_count_for_ads';
const PUZZLES_BETWEEN_ADS = 3; // Show ad every 3 puzzles

// Use test ID in development, real ID in production
const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : AD_UNITS.interstitial;

const interstitial = InterstitialAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true, // Privacy-friendly
});

export const useInterstitialAd = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setLoaded(true);
      }
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setLoaded(false);
        interstitial.load(); // Preload next ad
      }
    );

    // Load first ad
    interstitial.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }, []);

  const showAdIfNeeded = async () => {
    try {
      // Get puzzle count
      const countStr = await AsyncStorage.getItem(PUZZLE_COUNT_KEY);
      const count = countStr ? parseInt(countStr) : 0;
      const newCount = count + 1;

      // Save new count
      await AsyncStorage.setItem(PUZZLE_COUNT_KEY, newCount.toString());

      // Show ad every N puzzles
      if (newCount % PUZZLES_BETWEEN_ADS === 0 && loaded) {
        await interstitial.show();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error showing interstitial ad:', error);
      return false;
    }
  };

  return { showAdIfNeeded, loaded };
};
```

### Step 2: Use in Puzzle Game

Update `/frontend/app/child/puzzle-game.tsx`:

```typescript
import { useInterstitialAd } from '../../hooks/useInterstitialAd';

export default function PuzzleGame() {
  const { showAdIfNeeded } = useInterstitialAd();

  // Inside your checkCompletion function, AFTER showing celebration:
  const checkCompletion = async (pieces: PuzzlePiece[]) => {
    if (isComplete) {
      // ... existing completion logic ...

      // Show celebration immediately
      playCelebration();

      // Show ad in background (non-blocking)
      setTimeout(() => {
        showAdIfNeeded();
      }, 2000); // Wait 2 seconds after celebration
    }
  };
}
```

---

## Implement Banner Ads (Secondary)

**Where**: Bottom of level selection screen

**Behavior**: Always visible, non-intrusive

### Step 1: Create Banner Component

Create `/frontend/components/BannerAd.tsx`:

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import AD_UNITS from '../services/admob-service';

const adUnitId = __DEV__ ? TestIds.BANNER : AD_UNITS.banner;

export default function AdBanner() {
  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.BANNER} // 320x50
        requestOptions={{
          requestNonPersonalizedAdsOnly: true,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
  },
});
```

### Step 2: Add to Level Select Screen

Update `/frontend/app/child/level-select.tsx`:

```typescript
import AdBanner from '../../components/BannerAd';

export default function LevelSelect() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {/* ... existing header ... */}
      </View>

      {/* Level Selection */}
      <ScrollView>
        {/* ... existing level cards ... */}
      </ScrollView>

      {/* Banner Ad at bottom */}
      <AdBanner />
    </SafeAreaView>
  );
}
```

---

## Implement Rewarded Video Ads (Optional)

**Where**: Puzzle game screen - offer hint in exchange for watching ad

**Behavior**: User chooses to watch ad to get a hint

### Step 1: Create Rewarded Ad Hook

Create `/frontend/hooks/useRewardedAd.ts`:

```typescript
import { useEffect, useState } from 'react';
import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import AD_UNITS from '../services/admob-service';

const adUnitId = __DEV__ ? TestIds.REWARDED : AD_UNITS.rewarded;

const rewarded = RewardedAd.createForAdRequest(adUnitId, {
  requestNonPersonalizedAdsOnly: true,
});

export const useRewardedAd = (onRewarded: () => void) => {
  const [loaded, setLoaded] = useState(false);
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    const unsubscribeLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setLoaded(true);
      }
    );

    const unsubscribeEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => {
        onRewarded(); // Give hint to user
      }
    );

    const unsubscribeClosed = rewarded.addAdEventListener(
      RewardedAdEventType.CLOSED,
      () => {
        setIsShowing(false);
        setLoaded(false);
        rewarded.load(); // Preload next ad
      }
    );

    // Load first ad
    rewarded.load();

    return () => {
      unsubscribeLoaded();
      unsubscribeEarned();
      unsubscribeClosed();
    };
  }, [onRewarded]);

  const showAd = async () => {
    if (loaded && !isShowing) {
      setIsShowing(true);
      await rewarded.show();
    }
  };

  return { showAd, loaded, isShowing };
};
```

### Step 2: Add Hint Button to Puzzle Game

Update `/frontend/app/child/puzzle-game.tsx`:

```typescript
import { useRewardedAd } from '../../hooks/useRewardedAd';

export default function PuzzleGame() {
  const [hintsRemaining, setHintsRemaining] = useState(3); // Max 3 hints per puzzle

  const handleHintEarned = () => {
    // Give user a hint
    if (hintsRemaining > 0) {
      showHint();
      setHintsRemaining(hintsRemaining - 1);
    }
  };

  const { showAd, loaded } = useRewardedAd(handleHintEarned);

  const handleWatchAdForHint = () => {
    if (hintsRemaining <= 0) {
      Alert.alert('No Hints Left', 'You\'ve used all hints for this puzzle!');
      return;
    }

    Alert.alert(
      'Get a Hint',
      'Watch a short video to get a hint!',
      [
        {
          text: 'Watch Video',
          onPress: () => showAd(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const showHint = () => {
    // Implement hint logic (e.g., auto-place one piece)
    Alert.alert('Hint!', 'A piece has been placed correctly for you!');

    // Find first incorrect piece and move it to correct position
    const incorrectPiece = puzzlePieces.find(
      (p) => p.currentPosition !== p.correctPosition
    );

    if (incorrectPiece) {
      // Swap logic here...
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* ... existing game UI ... */}

      {/* Hint Button */}
      {!isComplete && loaded && hintsRemaining > 0 && (
        <TouchableOpacity style={styles.hintButton} onPress={handleWatchAdForHint}>
          <Ionicons name="bulb" size={24} color="white" />
          <Text style={styles.hintButtonText}>
            Get Hint ({hintsRemaining} left)
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... existing styles ...
  hintButton: {
    position: 'absolute',
    top: 120,
    right: 20,
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  hintButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
```

---

## Child-Safe Configuration

### 1. Request Configuration

Already set in `admob-service.ts`:
- `maxAdContentRating: MaxAdContentRating.G` - Only G-rated ads
- `tagForChildDirectedTreatment: true` - COPPA compliance
- `tagForUnderAgeOfConsent: true` - GDPR compliance
- `requestNonPersonalizedAdsOnly: true` - No personalized ads

### 2. Ad Content Filtering

In AdMob dashboard:
- Enable "Block sensitive categories"
- Block: Dating, Gambling, Politics, etc.
- Enable "Family-safe ads only"

### 3. Frequency Capping

- Interstitial: Every 3 puzzles (not every puzzle)
- Banner: Always visible (non-intrusive size)
- Rewarded: User-initiated only

---

## Testing

### Test with Test Ad Units

For testing, use Google's test ad unit IDs:

```typescript
// In admob-service.ts
import { TestIds } from 'react-native-google-mobile-ads';

const AD_UNITS = __DEV__ ? {
  interstitial: TestIds.INTERSTITIAL,
  banner: TestIds.BANNER,
  rewarded: TestIds.REWARDED,
} : {
  // Real ad units for production
  interstitial: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL,
  banner: process.env.EXPO_PUBLIC_ADMOB_BANNER,
  rewarded: process.env.EXPO_PUBLIC_ADMOB_REWARDED,
};
```

### Test Checklist

- [ ] Interstitial loads and shows after 3 puzzles
- [ ] Banner appears on level selection screen
- [ ] Rewarded video shows when hint button pressed
- [ ] User receives hint after watching rewarded video
- [ ] Ads are child-appropriate (using test ads)
- [ ] No crashes when ad fails to load
- [ ] Frequency capping works correctly

---

## Production Checklist

### Before Publishing:

1. **Replace Test IDs with Real Ad Unit IDs**
   - Update all environment variables
   - Remove `__DEV__` checks or set properly

2. **App Store Compliance**
   - Add "Contains Ads" flag in app store listing
   - Update privacy policy to mention ads
   - Specify ad networks used (Google AdMob)

3. **AdMob Configuration**
   - Verify "Designed for Families" is enabled
   - Verify content rating is appropriate
   - Enable mediation (optional, for better fill rates)

4. **Testing on Real Devices**
   - Test on iOS and Android
   - Verify ads show correctly
   - Check ad frequency
   - Verify no inappropriate ads slip through

5. **Monitor Performance**
   - Watch AdMob dashboard for impressions
   - Check eCPM (earnings per 1000 impressions)
   - Monitor fill rate (how often ads load successfully)
   - Watch for policy violations

### Common Issues

**Issue**: Ads not showing
- **Solution**: Check internet connection, verify ad unit IDs, check AdMob account status

**Issue**: "Ad failed to load"
- **Solution**: Normal in development, ensure test ads work, check request configuration

**Issue**: Low fill rate
- **Solution**: Enable mediation in AdMob, expand targeting, check country availability

**Issue**: Policy violation warning
- **Solution**: Review content, ensure child-directed settings enabled, appeal if incorrect

---

## Revenue Optimization Tips

1. **Ad Placement**
   - Natural break points (after puzzle completion) perform best
   - Don't overdo it - every 2-3 puzzles is optimal
   - User-initiated ads (rewarded) have highest eCPM

2. **Ad Mediation**
   - Enable mediation in AdMob to maximize fill rate
   - Add multiple ad networks (Facebook Audience Network, Unity Ads)
   - Test different networks for best revenue

3. **Regional Targeting**
   - US, UK, Canada have highest eCPM
   - Enable ads in all regions for scale
   - Monitor performance by country

4. **A/B Testing**
   - Test showing ads every 2 vs 3 puzzles
   - Test banner positions
   - Monitor retention vs revenue trade-off

---

## Estimated Revenue

### For 10,000 Monthly Active Users:

**Assumptions:**
- 10 puzzles per user per month = 100,000 puzzle completions
- Interstitial shown every 3 puzzles = ~33,000 ad impressions
- Banner shown on level select = ~50,000 impressions
- Rewarded videos: ~5,000 impressions
- Total: ~88,000 impressions

**Revenue:**
- Average eCPM: $3-8 (kids' apps typically lower)
- Estimated: $264 - $704/month

**With 100,000 MAU:**
- Estimated: $2,640 - $7,040/month

*Note: Actual revenue varies greatly by geography, ad quality, and user engagement.*

---

## Support Resources

- [AdMob Documentation](https://developers.google.com/admob)
- [React Native Google Mobile Ads](https://docs.page/invertase/react-native-google-mobile-ads)
- [COPPA Compliance Guide](https://www.ftc.gov/tips-advice/business-center/guidance/childrens-online-privacy-protection-rule-six-step-compliance)
- [AdMob Policy Center](https://support.google.com/admob/answer/6128543)

---

## Next Steps

1. Create AdMob account
2. Register apps and create ad units
3. Install dependencies
4. Implement ads following this guide
5. Test with test ad units
6. Submit for review with real ad units
7. Monitor and optimize

Good luck with monetization! 🎉
