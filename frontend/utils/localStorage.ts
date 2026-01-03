import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUZZLES_DIR = FileSystem.documentDirectory + 'puzzles/';
const USER_PUZZLES_KEY = '@user_puzzles';

export interface LocalPuzzle {
  id: string;
  name: string;
  category: string;
  imageUri: string;
  created_at: string;
}

// Ensure puzzles directory exists
const ensureDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PUZZLES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PUZZLES_DIR, { intermediates: true });
  }
};

// Save image locally
export const saveImageLocally = async (
  base64Image: string,
  puzzleName: string,
  category: string = 'My Pictures'
): Promise<LocalPuzzle> => {
  await ensureDirectoryExists();
  
  const puzzleId = `local_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const fileName = `${puzzleId}.jpg`;
  const fileUri = PUZZLES_DIR + fileName;
  
  // Save image file
  await FileSystem.writeAsStringAsync(fileUri, base64Image, {
    encoding: FileSystem.EncodingType.Base64,
  });
  
  // Create puzzle metadata
  const puzzle: LocalPuzzle = {
    id: puzzleId,
    name: puzzleName,
    category,
    imageUri: fileUri,
    created_at: new Date().toISOString(),
  };
  
  // Save metadata
  const existingPuzzles = await getLocalPuzzles();
  existingPuzzles.push(puzzle);
  await AsyncStorage.setItem(USER_PUZZLES_KEY, JSON.stringify(existingPuzzles));
  
  return puzzle;
};

// Get all local puzzles
export const getLocalPuzzles = async (): Promise<LocalPuzzle[]> => {
  try {
    const puzzlesJson = await AsyncStorage.getItem(USER_PUZZLES_KEY);
    return puzzlesJson ? JSON.parse(puzzlesJson) : [];
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
    // Delete file
    await FileSystem.deleteAsync(puzzle.imageUri, { idempotent: true });
    
    // Update metadata
    const updatedPuzzles = puzzles.filter(p => p.id !== puzzleId);
    await AsyncStorage.setItem(USER_PUZZLES_KEY, JSON.stringify(updatedPuzzles));
  }
};

// Get image as base64
export const getImageAsBase64 = async (imageUri: string): Promise<string> => {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return `data:image/jpeg;base64,${base64}`;
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
