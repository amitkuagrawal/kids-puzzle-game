# Firebase Setup Guide

This guide explains how to set up Firebase for the Kids Puzzle Game app.

## Prerequisites

1. A Google account
2. Node.js and npm installed
3. Project already uses Expo/React Native

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `kids-puzzle-game` (or your preferred name)
4. Disable Google Analytics (optional for kids' app)
5. Click "Create project"

## Step 2: Register Your App

### For Web/Expo Go:
1. In Firebase Console, click the web icon (</>) to add a web app
2. Register app with nickname: "Kids Puzzle Game Web"
3. **Do NOT** check "Firebase Hosting" (not needed)
4. Click "Register app"
5. Copy the `firebaseConfig` object

### For iOS (if building standalone):
1. Click the iOS icon to add an iOS app
2. Enter iOS bundle ID (e.g., `com.yourcompany.kidspuzzle`)
3. Download `GoogleService-Info.plist`
4. Add to your iOS project

### For Android (if building standalone):
1. Click the Android icon to add an Android app
2. Enter Android package name (e.g., `com.yourcompany.kidspuzzle`)
3. Download `google-services.json`
4. Add to your Android project

## Step 3: Configure Firestore Database

1. In Firebase Console, go to "Build" > "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll add security rules later)
4. Select location closest to your users
5. Click "Enable"

## Step 4: Set Up Security Rules

In Firestore, go to "Rules" tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users collection - users can read/write their own profile
    match /users/{userId} {
      allow read: if true; // Anyone can read for leaderboard
      allow write: if request.auth != null || request.resource.data.userId == userId;
    }

    // Groups collection
    match /groups/{groupId} {
      allow read: if true; // Anyone can read group info
      allow create: if request.resource.data.groupId != null; // Anyone can create group
      allow update: if true; // Allow member count updates
    }
  }
}
```

**Note**: These are permissive rules for initial testing. For production, implement proper authentication.

## Step 5: Set Up Environment Variables

1. Create `.env` file in `/frontend` directory:

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

2. Add `.env` to `.gitignore`:
```
.env
.env.local
```

3. Get values from Firebase Console:
   - Go to Project Settings (gear icon)
   - Scroll to "Your apps" section
   - Click on your web app
   - Copy values from `firebaseConfig` object

## Step 6: Install Firebase Dependencies

Run in `/frontend` directory:

```bash
npm install firebase
# or
yarn add firebase
```

## Step 7: Initialize Firestore Collections

The app will automatically create collections, but you can pre-create them:

1. In Firestore, click "Start collection"
2. Create `users` collection with a dummy document:
   - Document ID: `dummy`
   - Field: `placeholder` (string) = `delete_me`
3. Create `groups` collection similarly
4. Delete the dummy documents after first real data is added

## Step 8: Set Up Indexes (Optional but Recommended)

For better query performance, create these indexes:

1. Go to Firestore > Indexes
2. Create composite index for leaderboard queries:
   - Collection: `users`
   - Fields to index:
     - `groupId` (Ascending)
     - `currentLevel` (Descending)
     - `totalPuzzlesCompleted` (Descending)
   - Query scope: Collection

**Note**: Firebase will prompt you to create indexes automatically when queries fail. You can create them on-demand.

## Step 9: Enable Anonymous Authentication (Optional)

For better security without requiring login:

1. Go to "Build" > "Authentication"
2. Click "Get started"
3. Click "Anonymous" and enable it
4. This allows using `request.auth` in security rules

## Step 10: Set Up AdMob (Next Phase)

AdMob setup is separate and will be covered in the ads implementation phase.

## Database Schema

### Users Collection (`users`)

```typescript
{
  userId: string;              // Unique user ID
  displayName: string;         // First name only
  currentLevel: number;        // 1-5
  totalPuzzlesCompleted: number;
  levelCompletions: {          // Puzzles completed per level
    1: number,
    2: number,
    3: number,
    4: number,
    5: number
  };
  currentStreak: number;       // Days in a row
  longestStreak: number;
  lastPlayedDate: string;      // ISO date
  achievements: string[];      // Achievement IDs
  groupId: string | null;      // Group code or null
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
}
```

### Groups Collection (`groups`)

```typescript
{
  groupId: string;             // 6-character code (document ID)
  groupName: string;           // Parent-chosen name
  createdBy: string;           // Parent identifier
  parentEmail: string;         // Parent's email
  createdAt: string;           // ISO timestamp
  memberCount: number;         // Number of kids in group
  isActive: boolean;           // Active status
}
```

## Testing Your Setup

1. Run the app: `npm start` in `/frontend`
2. Try creating a user profile
3. Try creating a group
4. Try joining a group
5. Check Firebase Console to see if data appears in Firestore

## Troubleshooting

### Error: "Firebase not initialized"
- Check that all environment variables are set correctly
- Restart your development server after adding `.env` file

### Error: "Missing or insufficient permissions"
- Check Firestore security rules
- Ensure rules are not in "production mode" (too restrictive)

### Error: "Network request failed"
- Check your internet connection
- Verify Firebase project is active
- Check if API key is correct

### Data not appearing in Firestore
- Check browser console for errors
- Verify collection names match exactly
- Check security rules allow writes

## Production Considerations

### Before Launching to Production:

1. **Strengthen Security Rules**:
   - Require authentication for all writes
   - Add field validation
   - Prevent data tampering

2. **Set Up Backup**:
   - Enable daily automatic backups in Firestore settings
   - Export data regularly

3. **Monitor Usage**:
   - Set up billing alerts
   - Monitor Firestore usage (reads/writes)
   - Firebase free tier limits:
     - 50K reads/day
     - 20K writes/day
     - 1GB storage

4. **Add Rate Limiting**:
   - Implement client-side request throttling
   - Use Firebase Cloud Functions for backend validation

5. **COPPA Compliance**:
   - Ensure no personal data collected from kids
   - Get verifiable parental consent
   - Add privacy policy

## Estimated Costs

### Firebase Free Tier (Spark Plan):
- **Firestore**: 50K reads, 20K writes, 1GB storage per day
- **Authentication**: Unlimited
- **Hosting**: 10GB storage, 360MB/day transfer
- **Functions**: 125K invocations, 40K GB-seconds

### For 10,000 MAU (Monthly Active Users):
- Estimated reads: ~300K/day (30 per user)
- Estimated writes: ~100K/day (10 per user)
- **Estimated cost**: $25-50/month (Firebase Blaze pay-as-you-go)

### Cost Optimization:
- Cache data locally (already implemented)
- Batch updates
- Use Cloud Functions for complex queries
- Set up Firebase budget alerts

## Next Steps

1. Complete Firebase setup following this guide
2. Test group creation and joining
3. Implement parent dashboard UI
4. Add leaderboard display
5. Integrate AdMob (separate guide)

## Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Getting Started](https://firebase.google.com/docs/firestore/quickstart)
- [Firebase Pricing](https://firebase.google.com/pricing)
- [Firebase Support](https://firebase.google.com/support)
