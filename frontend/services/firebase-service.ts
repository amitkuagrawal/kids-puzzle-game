import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== INTERFACES ====================

export interface UserProfile {
  userId: string;
  displayName: string; // First name only
  currentLevel: number;
  totalPuzzlesCompleted: number;
  levelCompletions: { [key: number]: number }; // Puzzles completed per level
  currentStreak: number; // Days played in a row
  longestStreak: number;
  lastPlayedDate: string; // ISO date string
  achievements: string[]; // Achievement IDs
  groupId: string | null; // Group code they belong to
  createdAt: string;
  updatedAt: string;
}

export interface Group {
  groupId: string; // 6-character uppercase code
  groupName: string;
  createdBy: string; // Parent's identifier
  parentEmail: string;
  createdAt: string;
  memberCount: number;
  isActive: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  currentLevel: number;
  totalPuzzlesCompleted: number;
  levelCompletionPercentage: number; // 0-100
  currentStreak: number;
  achievements: string[];
  lastPlayedDate: string;
  rank: number;
}

// ==================== CONSTANTS ====================

const USER_ID_KEY = '@user_id';
const USER_PROFILE_KEY = '@user_profile';
const GROUPS_KEY = '@groups';
const ALL_USERS_KEY = '@all_users';

// Achievement definitions
export const ACHIEVEMENTS = {
  FIRST_PUZZLE: { id: 'first_puzzle', name: 'First Puzzle!', icon: '🎉' },
  LEVEL_1_COMPLETE: { id: 'level_1_complete', name: 'Level 1 Master', icon: '⭐' },
  LEVEL_2_COMPLETE: { id: 'level_2_complete', name: 'Level 2 Master', icon: '🌟' },
  LEVEL_3_COMPLETE: { id: 'level_3_complete', name: 'Level 3 Master', icon: '✨' },
  LEVEL_4_COMPLETE: { id: 'level_4_complete', name: 'Level 4 Master', icon: '💫' },
  LEVEL_5_COMPLETE: { id: 'level_5_complete', name: 'Level 5 Master', icon: '🏆' },
  STREAK_3: { id: 'streak_3', name: '3 Day Streak', icon: '🔥' },
  STREAK_7: { id: 'streak_7', name: '7 Day Streak', icon: '🔥🔥' },
  STREAK_30: { id: 'streak_30', name: '30 Day Streak', icon: '🔥🔥🔥' },
  SPEED_DEMON: { id: 'speed_demon', name: 'Speed Demon', icon: '⚡' },
  PUZZLE_MASTER: { id: 'puzzle_master', name: 'Puzzle Master', icon: '👑' },
};

// ==================== HELPER FUNCTIONS ====================

const getAllGroups = async (): Promise<{ [key: string]: Group }> => {
  try {
    const groupsJson = await AsyncStorage.getItem(GROUPS_KEY);
    return groupsJson ? JSON.parse(groupsJson) : {};
  } catch (error) {
    console.error('Error getting groups:', error);
    return {};
  }
};

const saveAllGroups = async (groups: { [key: string]: Group }): Promise<void> => {
  try {
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch (error) {
    console.error('Error saving groups:', error);
  }
};

const getAllUsers = async (): Promise<{ [key: string]: UserProfile }> => {
  try {
    const usersJson = await AsyncStorage.getItem(ALL_USERS_KEY);
    return usersJson ? JSON.parse(usersJson) : {};
  } catch (error) {
    console.error('Error getting all users:', error);
    return {};
  }
};

const saveAllUsers = async (users: { [key: string]: UserProfile }): Promise<void> => {
  try {
    await AsyncStorage.setItem(ALL_USERS_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving all users:', error);
  }
};

// ==================== USER MANAGEMENT ====================

/**
 * Generate or retrieve user ID
 */
export const getUserId = async (): Promise<string> => {
  try {
    let userId = await AsyncStorage.getItem(USER_ID_KEY);
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await AsyncStorage.setItem(USER_ID_KEY, userId);
    }
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
};

/**
 * Create a new user profile
 */
export const createUserProfile = async (displayName: string): Promise<UserProfile> => {
  try {
    const userId = await getUserId();
    const now = new Date().toISOString();

    const userProfile: UserProfile = {
      userId,
      displayName,
      currentLevel: 1,
      totalPuzzlesCompleted: 0,
      levelCompletions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      currentStreak: 1,
      longestStreak: 1,
      lastPlayedDate: now,
      achievements: [],
      groupId: null,
      createdAt: now,
      updatedAt: now,
    };

    // Save to local storage
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    
    // Also save to all users for leaderboard
    const allUsers = await getAllUsers();
    allUsers[userId] = userProfile;
    await saveAllUsers(allUsers);

    return userProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get user profile
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const profileJson = await AsyncStorage.getItem(USER_PROFILE_KEY);
    return profileJson ? JSON.parse(profileJson) : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (updates: Partial<UserProfile>): Promise<void> => {
  try {
    const currentProfile = await getUserProfile();
    if (!currentProfile) return;

    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Save to local storage
    await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updatedProfile));
    
    // Also update in all users
    const allUsers = await getAllUsers();
    allUsers[currentProfile.userId] = updatedProfile;
    await saveAllUsers(allUsers);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Update streak and last played date
 */
export const updateStreak = async (): Promise<number> => {
  try {
    const profile = await getUserProfile();
    if (!profile) return 1;

    const today = new Date().toISOString().split('T')[0];
    const lastPlayed = profile.lastPlayedDate.split('T')[0];

    let newStreak = profile.currentStreak;

    // Calculate days difference
    const daysDiff = Math.floor(
      (new Date(today).getTime() - new Date(lastPlayed).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 0) {
      // Same day, no change
      return newStreak;
    } else if (daysDiff === 1) {
      // Consecutive day
      newStreak = profile.currentStreak + 1;
    } else {
      // Streak broken
      newStreak = 1;
    }

    const longestStreak = Math.max(newStreak, profile.longestStreak);
    const newAchievements = [...profile.achievements];

    // Award streak achievements
    if (newStreak >= 3 && !newAchievements.includes('streak_3')) {
      newAchievements.push('streak_3');
    }
    if (newStreak >= 7 && !newAchievements.includes('streak_7')) {
      newAchievements.push('streak_7');
    }
    if (newStreak >= 30 && !newAchievements.includes('streak_30')) {
      newAchievements.push('streak_30');
    }

    await updateUserProfile({
      currentStreak: newStreak,
      longestStreak,
      lastPlayedDate: new Date().toISOString(),
      achievements: newAchievements,
    });

    return newStreak;
  } catch (error) {
    console.error('Error updating streak:', error);
    return 1;
  }
};

/**
 * Record puzzle completion
 */
export const recordPuzzleCompletion = async (level: number): Promise<{
  levelUnlocked: boolean;
  newAchievements: string[];
}> => {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      throw new Error('User profile not found');
    }

    // Update streak
    await updateStreak();

    // Update level completions
    const levelCompletions = { ...profile.levelCompletions };
    if (!levelCompletions[level]) {
      levelCompletions[level] = 0;
    }
    if (levelCompletions[level] < 5) {
      levelCompletions[level]++;
    }

    // Update total puzzles
    const totalPuzzlesCompleted = profile.totalPuzzlesCompleted + 1;

    // Check for level unlock
    let currentLevel = profile.currentLevel;
    let levelUnlocked = false;
    if (levelCompletions[level] === 5 && level < 5 && currentLevel === level) {
      currentLevel = level + 1;
      levelUnlocked = true;
    }

    // Check for achievements
    const newAchievements = [...profile.achievements];

    // First puzzle achievement
    if (totalPuzzlesCompleted === 1 && !newAchievements.includes('first_puzzle')) {
      newAchievements.push('first_puzzle');
    }

    // Level completion achievements
    if (levelCompletions[level] === 5) {
      const achievementId = `level_${level}_complete`;
      if (!newAchievements.includes(achievementId)) {
        newAchievements.push(achievementId);
      }
    }

    // Puzzle Master (complete all 5 levels)
    if (currentLevel > 5 && !newAchievements.includes('puzzle_master')) {
      newAchievements.push('puzzle_master');
    }

    // Update profile
    await updateUserProfile({
      currentLevel,
      totalPuzzlesCompleted,
      levelCompletions,
      achievements: newAchievements,
    });

    return {
      levelUnlocked,
      newAchievements: newAchievements.filter((a) => !profile.achievements.includes(a)),
    };
  } catch (error) {
    console.error('Error recording puzzle completion:', error);
    return { levelUnlocked: false, newAchievements: [] };
  }
};

// ==================== GROUP MANAGEMENT ====================

/**
 * Generate unique group code (6 characters)
 */
const generateGroupCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Create a new group (by parent)
 */
export const createGroup = async (
  groupName: string,
  parentEmail: string
): Promise<Group> => {
  try {
    const groups = await getAllGroups();
    
    let groupCode = generateGroupCode();
    let attempts = 0;

    // Ensure unique group code
    while (attempts < 10) {
      if (!groups[groupCode]) {
        break;
      }
      groupCode = generateGroupCode();
      attempts++;
    }

    const group: Group = {
      groupId: groupCode,
      groupName,
      createdBy: parentEmail,
      parentEmail,
      createdAt: new Date().toISOString(),
      memberCount: 0,
      isActive: true,
    };

    // Save group
    groups[groupCode] = group;
    await saveAllGroups(groups);

    return group;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

/**
 * Join a group
 */
export const joinGroup = async (groupCode: string): Promise<boolean> => {
  try {
    const groupCodeUpper = groupCode.toUpperCase().trim();
    const groups = await getAllGroups();

    // Check if group exists
    if (!groups[groupCodeUpper]) {
      return false;
    }

    const group = groups[groupCodeUpper];
    if (!group.isActive) {
      return false;
    }

    // Update user's group
    await updateUserProfile({ groupId: groupCodeUpper });

    // Increment member count
    group.memberCount++;
    groups[groupCodeUpper] = group;
    await saveAllGroups(groups);

    return true;
  } catch (error) {
    console.error('Error joining group:', error);
    return false;
  }
};

/**
 * Leave a group
 */
export const leaveGroup = async (): Promise<void> => {
  try {
    const profile = await getUserProfile();
    if (!profile || !profile.groupId) return;

    const groups = await getAllGroups();
    const group = groups[profile.groupId];

    // Update user's profile
    await updateUserProfile({ groupId: null });

    // Decrement member count
    if (group) {
      group.memberCount = Math.max(0, group.memberCount - 1);
      groups[profile.groupId] = group;
      await saveAllGroups(groups);
    }
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

/**
 * Get group details
 */
export const getGroup = async (groupCode: string): Promise<Group | null> => {
  try {
    const groups = await getAllGroups();
    return groups[groupCode.toUpperCase()] || null;
  } catch (error) {
    console.error('Error getting group:', error);
    return null;
  }
};

// ==================== LEADERBOARD ====================

/**
 * Get leaderboard for a group
 */
export const getGroupLeaderboard = async (groupCode: string): Promise<LeaderboardEntry[]> => {
  try {
    const allUsers = await getAllUsers();
    const groupCodeUpper = groupCode.toUpperCase();
    
    // Filter users in this group
    const groupUsers = Object.values(allUsers).filter(
      user => user.groupId === groupCodeUpper
    );

    // Sort by level (desc), then by total puzzles (desc)
    groupUsers.sort((a, b) => {
      if (b.currentLevel !== a.currentLevel) {
        return b.currentLevel - a.currentLevel;
      }
      return b.totalPuzzlesCompleted - a.totalPuzzlesCompleted;
    });

    // Create leaderboard entries
    const leaderboard: LeaderboardEntry[] = groupUsers.map((user, index) => {
      const totalPuzzlesInLevels = user.currentLevel * 5;
      const completedPuzzles = Object.values(user.levelCompletions).reduce(
        (sum, count) => sum + count,
        0
      );
      const completionPercentage =
        totalPuzzlesInLevels > 0
          ? Math.round((completedPuzzles / totalPuzzlesInLevels) * 100)
          : 0;

      return {
        userId: user.userId,
        displayName: user.displayName,
        currentLevel: user.currentLevel,
        totalPuzzlesCompleted: user.totalPuzzlesCompleted,
        levelCompletionPercentage: completionPercentage,
        currentStreak: user.currentStreak,
        achievements: user.achievements,
        lastPlayedDate: user.lastPlayedDate,
        rank: index + 1,
      };
    });

    return leaderboard.slice(0, 50); // Limit to 50
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};

/**
 * Get user's rank in group
 */
export const getUserRank = async (): Promise<number> => {
  try {
    const profile = await getUserProfile();
    if (!profile || !profile.groupId) return 0;

    const leaderboard = await getGroupLeaderboard(profile.groupId);
    const userEntry = leaderboard.find((entry) => entry.userId === profile.userId);

    return userEntry ? userEntry.rank : 0;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return 0;
  }
};
