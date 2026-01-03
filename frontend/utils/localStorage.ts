import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PUZZLES_DIR = FileSystem.documentDirectory ? FileSystem.documentDirectory + 'puzzles/' : null;
const USER_PUZZLES_KEY = '@user_puzzles';

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
    const dirInfo = await FileSystem.getInfoAsync(PUZZLES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(PUZZLES_DIR, { intermediates: true });
    }
  } catch (error) {
    console.error('Error creating directory:', error);
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
      await FileSystem.writeAsStringAsync(fileUri, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      imageUri = fileUri;
    } catch (error) {
      console.error('Error saving file:', error);
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
    console.error('Error getting local puzzles:', error);
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
        await FileSystem.deleteAsync(puzzle.imageUri, { idempotent: true });
      } catch (error) {
        console.error('Error deleting file:', error);
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
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return `data:image/jpeg;base64,${base64}`;
    } catch (error) {
      console.error('Error reading file:', error);
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
