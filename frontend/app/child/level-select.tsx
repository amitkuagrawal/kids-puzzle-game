import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLevelProgress, LevelProgress } from '../../utils/localStorage';
import { getUserProfile, getGroup, leaveGroup } from '../../services/firebase-service';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Puzzle {
  id: string;
  name: string;
  image_base64: string;
  created_at: string;
}

interface LevelData {
  level: number;
  name: string;
  icon: string;
  color: string;
  gridSize: string;
  pieces: number;
  difficulty: string;
  description: string;
}

const LEVELS: LevelData[] = [
  {
    level: 1,
    name: 'Level 1',
    icon: '⭐',
    color: '#4CAF50',
    gridSize: '2×2',
    pieces: 4,
    difficulty: 'baby_easy',
    description: '5 Puzzles to Complete',
  },
  {
    level: 2,
    name: 'Level 2',
    icon: '🌟',
    color: '#2196F3',
    gridSize: '3×3',
    pieces: 9,
    difficulty: 'easy',
    description: '5 Puzzles to Complete',
  },
  {
    level: 3,
    name: 'Level 3',
    icon: '✨',
    color: '#FF9800',
    gridSize: '3×4',
    pieces: 12,
    difficulty: 'medium',
    description: '5 Puzzles to Complete',
  },
  {
    level: 4,
    name: 'Level 4',
    icon: '💫',
    color: '#9C27B0',
    gridSize: '4×4',
    pieces: 16,
    difficulty: 'hard',
    description: '5 Puzzles to Complete',
  },
  {
    level: 5,
    name: 'Level 5',
    icon: '🏆',
    color: '#F44336',
    gridSize: '4×5',
    pieces: 20,
    difficulty: 'expert',
    description: '5 Puzzles to Complete',
  },
];

export default function LevelSelect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { categoryName } = params;

  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [levelPuzzles, setLevelPuzzles] = useState<{ [key: number]: Puzzle[] }>({});
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userGroup, setUserGroup] = useState<any>(null);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  useEffect(() => {
    checkUserProfile();
  }, []);

  const checkUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      if (!profile) {
        // No profile, redirect to welcome
        router.replace('/child/welcome');
        return;
      }

      setUserProfile(profile);

      // Check if user is in a group
      if (profile.groupId) {
        const group = await getGroup(profile.groupId);
        if (group) {
          setUserGroup(group);
          setShowWelcomeBack(true);
          setCheckingProfile(false);
          setLoading(false); // Must set loading to false to show welcome screen
          return;
        }
      }

      setCheckingProfile(false);
      loadProgressAndPuzzles();
    } catch (error) {
      console.error('Error checking profile:', error);
      setCheckingProfile(false);
      loadProgressAndPuzzles();
    }
  };

  const handleContinueWithGroup = () => {
    setShowWelcomeBack(false);
    loadProgressAndPuzzles();
  };

  const handlePlayIndividually = async () => {
    // Leave the group and play alone
    await leaveGroup();
    setUserGroup(null);
    setShowWelcomeBack(false);
    loadProgressAndPuzzles();
  };

  const loadProgressAndPuzzles = async () => {
    try {
      setLoading(true);

      // Load progress
      const levelProgress = await getLevelProgress();
      setProgress(levelProgress);

      // Try to load puzzles from backend with timeout
      let allPuzzles: Puzzle[] = [];

      try {
        // Create fetch with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch(`${BACKEND_URL}/api/puzzles/preloaded`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const categories = await response.json();

        // Get all puzzles from all categories (excluding Uncategorized)
        categories.forEach((cat: any) => {
          if (cat.category !== 'Uncategorized' && cat.puzzles) {
            allPuzzles.push(...cat.puzzles);
          }
        });
      } catch (fetchError) {
        // If fetch fails or times out, create placeholder puzzles
        console.log('Using placeholder puzzles (backend not available)');

        // Create 25 placeholder puzzles (5 per level)
        for (let i = 1; i <= 25; i++) {
          allPuzzles.push({
            id: `placeholder-${i}`,
            name: `Puzzle ${i}`,
            image_base64: '', // Empty - will be handled by puzzle selection screen
            created_at: new Date().toISOString(),
          });
        }
      }

      // Distribute puzzles across 5 levels (5 puzzles per level)
      const puzzlesPerLevel: { [key: number]: Puzzle[] } = {
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
      };

      // Ensure we have enough puzzles
      const totalNeeded = 25; // 5 levels × 5 puzzles
      if (allPuzzles.length < totalNeeded) {
        // If we don't have enough unique puzzles, we'll repeat some
        while (allPuzzles.length < totalNeeded) {
          allPuzzles.push(...allPuzzles.slice(0, totalNeeded - allPuzzles.length));
        }
      }

      // Assign 5 puzzles to each level
      for (let level = 1; level <= 5; level++) {
        const startIndex = (level - 1) * 5;
        puzzlesPerLevel[level] = allPuzzles.slice(startIndex, startIndex + 5);
      }

      setLevelPuzzles(puzzlesPerLevel);
    } catch (error) {
      console.error('Error loading progress and puzzles:', error);
      Alert.alert('Error', 'Could not load level data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectLevel = (level: number) => {
    if (!progress) return;

    // Check if level is unlocked
    if (level > progress.currentLevel) {
      Alert.alert(
        '🔒 Level Locked',
        `Complete all 5 puzzles in ${LEVELS[level - 2].name} to unlock this level!`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Navigate to puzzle selection for this level
    const puzzles = levelPuzzles[level] || [];
    if (puzzles.length === 0) {
      Alert.alert('Oops!', 'No puzzles available for this level.');
      return;
    }

    router.push({
      pathname: '/child/puzzle-list',
      params: {
        level: level.toString(),
        levelName: LEVELS[level - 1].name,
        difficulty: LEVELS[level - 1].difficulty,
        pieces: LEVELS[level - 1].pieces.toString(),
        puzzles: JSON.stringify(puzzles),
      },
    });
  };

  const getLevelStatus = (level: number): string => {
    if (!progress) return '';

    if (level > progress.currentLevel) {
      return '🔒 Locked';
    }

    const completions = progress.levelCompletions[level] || 0;
    if (completions === 5) {
      return '✅ Completed!';
    }

    return `${completions}/5 Completed`;
  };

  const isLevelUnlocked = (level: number): boolean => {
    return progress ? level <= progress.currentLevel : false;
  };

  if (checkingProfile || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>{checkingProfile ? 'Getting ready...' : 'Loading levels...'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show welcome back screen if user is in a group
  if (showWelcomeBack && userProfile && userGroup) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.welcomeBackContainer}>
          <Text style={styles.welcomeBackEmoji}>👋</Text>
          <Text style={styles.welcomeBackTitle}>Welcome back, {userProfile.displayName}!</Text>
          
          <View style={styles.groupInfoCard}>
            <Ionicons name="people" size={40} color="#2196F3" />
            <Text style={styles.groupInfoTitle}>You're in a group!</Text>
            <Text style={styles.groupInfoName}>{userGroup.groupName}</Text>
            <Text style={styles.groupInfoCode}>Code: {userGroup.groupId}</Text>
          </View>
          
          <TouchableOpacity style={styles.continueGroupButton} onPress={handleContinueWithGroup}>
            <Ionicons name="trophy" size={24} color="white" />
            <Text style={styles.continueGroupText}>Continue with Group</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.playAloneButton} onPress={handlePlayIndividually}>
            <Ionicons name="person" size={20} color="#666" />
            <Text style={styles.playAloneText}>Play Individually (Leave Group)</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Level!</Text>
        <TouchableOpacity
          onPress={() => router.push('/child/leaderboard')}
          style={styles.leaderboardButton}
        >
          <Ionicons name="trophy" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Level Selection */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.levelsContainer}>
          {LEVELS.map((levelData) => {
            const unlocked = isLevelUnlocked(levelData.level);
            const status = getLevelStatus(levelData.level);

            return (
              <TouchableOpacity
                key={levelData.level}
                style={[
                  styles.levelCard,
                  { borderColor: levelData.color },
                  !unlocked && styles.levelCardLocked,
                ]}
                onPress={() => selectLevel(levelData.level)}
                activeOpacity={unlocked ? 0.7 : 1}
                disabled={!unlocked}
              >
                <View style={[styles.levelIconContainer, { backgroundColor: levelData.color }]}>
                  <Text style={styles.levelIcon}>{levelData.icon}</Text>
                  {!unlocked && (
                    <View style={styles.lockOverlay}>
                      <Ionicons name="lock-closed" size={40} color="white" />
                    </View>
                  )}
                </View>

                <View style={styles.levelInfo}>
                  <Text style={[styles.levelName, !unlocked && styles.textLocked]}>
                    {levelData.name}
                  </Text>
                  <Text style={[styles.levelDescription, !unlocked && styles.textLocked]}>
                    {levelData.description}
                  </Text>
                  <View style={styles.levelDetails}>
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="grid"
                        size={18}
                        color={unlocked ? levelData.color : '#999'}
                      />
                      <Text style={[styles.detailText, !unlocked && styles.textLocked]}>
                        {levelData.gridSize} Grid
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Ionicons
                        name="extension-puzzle"
                        size={18}
                        color={unlocked ? levelData.color : '#999'}
                      />
                      <Text style={[styles.detailText, !unlocked && styles.textLocked]}>
                        {levelData.pieces} Pieces
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: levelData.color }]}>
                    <Text style={styles.statusText}>{status}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom padding */}
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2196F3',
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  backButton: {
    padding: 5,
  },
  leaderboardButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 42,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 20,
    color: '#4CAF50',
    marginTop: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  levelsContainer: {
    paddingHorizontal: 20,
    gap: 15,
  },
  levelCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  levelCardLocked: {
    opacity: 0.6,
  },
  levelIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  levelIcon: {
    fontSize: 50,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'space-between',
  },
  levelName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  levelDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  levelDetails: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 5,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  textLocked: {
    color: '#999',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  // Welcome back styles
  welcomeBackContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeBackEmoji: {
    fontSize: 60,
    marginBottom: 10,
  },
  welcomeBackTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  groupInfoCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 25,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  groupInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 10,
  },
  groupInfoName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
  },
  groupInfoCode: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  continueGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 16,
    width: '100%',
    marginBottom: 12,
  },
  continueGroupText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  playAloneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    width: '100%',
  },
  playAloneText: {
    fontSize: 14,
    color: '#666',
  },
});
