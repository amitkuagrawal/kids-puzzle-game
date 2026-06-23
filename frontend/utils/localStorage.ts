import * as LegacyFileSystem from 'expo-file-system/src/legacy/FileSystem';
import { EncodingType } from 'expo-file-system/src/legacy/FileSystem.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PUZZLES_DIR = LegacyFileSystem.documentDirectory ? LegacyFileSystem.documentDirectory + 'puzzles/' : null;
const USER_PUZZLES_KEY = '@user_puzzles';
const LEVEL_PROGRESS_KEY = '@level_progress';

export interface LocalPuzzle {
  id: string;
  name: string;
  category: string;
  imageUri: string;
  base64Data?: string; // For web platform
  created_at: string;
}

// Check if we're on web
const isWeb = Platform.OS === 'web';

// Ensure puzzles directory exists (only for native)
const ensureDirectoryExists = async () => {
  if (isWeb || !PUZZLES_DIR) return;
  
  try {
    const dirInfo = await LegacyFileSystem.getInfoAsync(PUZZLES_DIR);
    if (!dirInfo.exists) {
      await LegacyFileSystem.makeDirectoryAsync(PUZZLES_DIR, { intermediates: true });
    }
  } catch (error) {
    // silenced;
  }
};

// Save image locally
export const saveImageLocally = async (
  base64Image: string,
  puzzleName: string,
  category: string = 'My Pictures'
): Promise<LocalPuzzle> => {
  const puzzleId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  let imageUri: string;
  let base64Data: string | undefined;
  
  if (isWeb || !PUZZLES_DIR) {
    // On web, store base64 directly in AsyncStorage
    imageUri = `data:image/jpeg;base64,${base64Image}`;
    base64Data = base64Image;
  } else {
    // On native, save to file system
    await ensureDirectoryExists();
    const fileName = `${puzzleId}.jpg`;
    const fileUri = PUZZLES_DIR + fileName;
    
    try {
      await LegacyFileSystem.writeAsStringAsync(fileUri, base64Image, {
        encoding: EncodingType.Base64,
      });
      imageUri = fileUri;
    } catch (error) {
      // silenced;
      // Fallback to storing base64 directly
      imageUri = `data:image/jpeg;base64,${base64Image}`;
      base64Data = base64Image;
    }
  }
  
  // Create puzzle metadata
  const puzzle: LocalPuzzle = {
    id: puzzleId,
    name: puzzleName,
    category,
    imageUri,
    base64Data,
    created_at: new Date().toISOString(),
  };
  
  // Save metadata
  const existingPuzzles = await getLocalPuzzles();
  existingPuzzles.push(puzzle);
  await AsyncStorage.setItem(USER_PUZZLES_KEY, JSON.stringify(existingPuzzles));
  
  console.log('Puzzle saved successfully:', puzzleId);
  return puzzle;
};

// Get all local puzzles
export const getLocalPuzzles = async (): Promise<LocalPuzzle[]> => {
  try {
    const puzzlesJson = await AsyncStorage.getItem(USER_PUZZLES_KEY);
    const puzzles = puzzlesJson ? JSON.parse(puzzlesJson) : [];
    console.log('Loaded local puzzles:', puzzles.length);
    return puzzles;
  } catch (error) {
    // silenced;
    return [];
  }
};

// Get local puzzle by ID
export const getLocalPuzzleById = async (puzzleId: string): Promise<LocalPuzzle | null> => {
  const puzzles = await getLocalPuzzles();
  return puzzles.find(p => p.id === puzzleId) || null;
};

// Delete local puzzle
export const deleteLocalPuzzle = async (puzzleId: string): Promise<void> => {
  const puzzles = await getLocalPuzzles();
  const puzzle = puzzles.find(p => p.id === puzzleId);
  
  if (puzzle) {
    // Delete file if it exists and we're on native
    if (!isWeb && puzzle.imageUri && !puzzle.imageUri.startsWith('data:') && PUZZLES_DIR) {
      try {
        await LegacyFileSystem.deleteAsync(puzzle.imageUri, { idempotent: true });
      } catch (error) {
        // silenced;
      }
    }
    
    // Update metadata
    const updatedPuzzles = puzzles.filter(p => p.id !== puzzleId);
    await AsyncStorage.setItem(USER_PUZZLES_KEY, JSON.stringify(updatedPuzzles));
  }
};

// Get image as base64
export const getImageAsBase64 = async (imageUri: string): Promise<string> => {
  // If it's already a data URL, return as-is
  if (imageUri.startsWith('data:')) {
    return imageUri;
  }
  
  // If it's a file URI, read it
  if (!isWeb && PUZZLES_DIR) {
    try {
      const base64 = await LegacyFileSystem.readAsStringAsync(imageUri, {
        encoding: EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      // silenced;
      return imageUri;
    }
  }
  
  return imageUri;
};

// Get puzzles by category
export const getPuzzlesByCategory = async (category: string): Promise<LocalPuzzle[]> => {
  const allPuzzles = await getLocalPuzzles();
  return allPuzzles.filter(p => p.category === category);
};

// Get all categories
export const getCategories = async (): Promise<string[]> => {
  const puzzles = await getLocalPuzzles();
  const categories = new Set(puzzles.map(p => p.category));
  return Array.from(categories);
};

// Level Progress Tracking
export interface LevelProgress {
  currentLevel: number; // Currently unlocked level (1-5)
  levelCompletions: { [key: number]: number }; // Number of puzzles completed per level (0-5)
}

// Get level progress
export const getLevelProgress = async (): Promise<LevelProgress> => {
  try {
    const progressJson = await AsyncStorage.getItem(LEVEL_PROGRESS_KEY);
    if (progressJson) {
      return JSON.parse(progressJson);
    }
    // Default: Start at level 1 with no completions
    return {
      currentLevel: 1,
      levelCompletions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  } catch (error) {
    console.error('Error getting level progress:', error);
    return {
      currentLevel: 1,
      levelCompletions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }
};

// Save level progress
export const saveLevelProgress = async (progress: LevelProgress): Promise<void> => {
  try {
    await AsyncStorage.setItem(LEVEL_PROGRESS_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error('Error saving level progress:', error);
  }
};

// Mark a puzzle as completed in a level
export const markPuzzleCompleted = async (level: number): Promise<boolean> => {
  const progress = await getLevelProgress();

  // Increment completion count for this level (max 5)
  if (!progress.levelCompletions[level]) {
    progress.levelCompletions[level] = 0;
  }

  if (progress.levelCompletions[level] < 5) {
    progress.levelCompletions[level]++;
  }

  // If all 5 puzzles in this level are completed, unlock next level
  let levelUnlocked = false;
  if (progress.levelCompletions[level] === 5 && level < 5) {
    if (progress.currentLevel === level) {
      progress.currentLevel = level + 1;
      levelUnlocked = true;
    }
  }

  await saveLevelProgress(progress);
  return levelUnlocked;
};

// Reset level progress (for testing or reset functionality)
export const resetLevelProgress = async (): Promise<void> => {
  const defaultProgress: LevelProgress = {
    currentLevel: 1,
    levelCompletions: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  await saveLevelProgress(defaultProgress);
};
