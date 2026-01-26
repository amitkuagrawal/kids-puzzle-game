import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Analytics } from '../../utils/analytics';
import { saveImageLocally, getLocalPuzzles, LocalPuzzle, getImageAsBase64 } from '../../utils/localStorage';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CARD_SIZE = (width - 48) / 2; // 2 columns with padding (15px on each side + 8px gap)
const CARD_HEIGHT = CARD_SIZE * 1.2; // Make cards slightly taller than wide

interface Puzzle {
  id: string;
  name: string;
  image_base64: string;
  created_at: string;
}

interface CategoryData {
  category: string;
  icon: string;
  color: string;
  puzzles: Puzzle[];
}

export default function PuzzleGallery() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [localPuzzles, setLocalPuzzles] = useState<LocalPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedServerCategory, setSelectedServerCategory] = useState<CategoryData | null>(null);
  const [solvedPuzzles, setSolvedPuzzles] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAllPuzzles();
    loadSolvedPuzzles();
  }, []);

  const loadSolvedPuzzles = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scores/solved`);
      const data = await response.json();
      setSolvedPuzzles(new Set(data.solved_puzzles || []));
    } catch (error) {
      console.error('Error fetching solved puzzles:', error);
    }
  };

  const loadAllPuzzles = async () => {
    try {
      setLoading(true);
      
      // Fetch preloaded puzzles from server (organized by category)
      const response = await fetch(`${BACKEND_URL}/api/puzzles/preloaded`);
      const serverCategories = await response.json();
      
      // Filter out "Uncategorized" category
      const filteredCategories = serverCategories.filter(
        (cat: CategoryData) => cat.category !== 'Uncategorized'
      );
      setCategories(filteredCategories);
      
      // Load local puzzles
      const local = await getLocalPuzzles();
      setLocalPuzzles(local);
    } catch (error) {
      console.error('Error fetching puzzles:', error);
      // Still try to load local puzzles even if server fails
      try {
        const local = await getLocalPuzzles();
        setLocalPuzzles(local);
      } catch (e) {
        console.error('Error loading local puzzles:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const selectPuzzle = async (puzzle: Puzzle | LocalPuzzle | any, isLocal: boolean = false) => {
    // Navigate to level selection screen instead of directly to difficulty
    router.push({
      pathname: '/child/level-select',
      params: {
        categoryName: isLocal ? 'My Pictures' : 'Preloaded',
      },
    });
  };

  const openCategoryView = (category: CategoryData) => {
    setSelectedServerCategory(category);
  };

  const closeCategoryView = () => {
    setSelectedServerCategory(null);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to your photos to upload a picture');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      if (!result.canceled && result.assets[0].uri) {
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Oops!', 'Could not pick image. Please try again!');
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      setProcessing(true);
      
      // Compress and resize image
      const MAX_DIMENSION = 800;
      
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: MAX_DIMENSION } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );

      if (manipulatedImage.base64) {
        // Save directly to "My Pictures" category
        const puzzleName = `My Puzzle ${new Date().toLocaleDateString()}`;
        await saveImageLocally(manipulatedImage.base64, puzzleName, 'My Pictures');
        
        // Track upload
        Analytics.puzzleUploaded(manipulatedImage.base64.length);
        
        Alert.alert('Success!', 'Your picture has been saved! Tap "My Pictures" to play.');
        
        // Reload local puzzles
        const local = await getLocalPuzzles();
        setLocalPuzzles(local);
      } else {
        Alert.alert('Oops!', 'Could not process image');
      }
      
      setProcessing(false);
    } catch (error) {
      console.error('Error processing image:', error);
      setProcessing(false);
      Alert.alert('Oops!', 'Could not process image');
    }
  };

  // Group local puzzles by category (all go to "My Pictures")
  const localCategories = localPuzzles.reduce((acc, puzzle) => {
    const cat = puzzle.category || 'My Pictures';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(puzzle);
    return acc;
  }, {} as Record<string, LocalPuzzle[]>);

  // Helper function to ensure image URI is properly formatted
  const getImageUri = (imageData: string): string => {
    if (!imageData) return '';
    // If already has data URI prefix, return as-is
    if (imageData.startsWith('data:') || imageData.startsWith('file:')) {
      return imageData;
    }
    // Otherwise, add the prefix
    return `data:image/jpeg;base64,${imageData}`;
  };

  // Check if a category is fully completed (all puzzles solved)
  const isCategoryComplete = (categoryData: CategoryData): boolean => {
    if (categoryData.puzzles.length === 0) return false;
    return categoryData.puzzles.every(puzzle => solvedPuzzles.has(puzzle.id));
  };

  // Count solved puzzles in a category
  const getSolvedCount = (categoryData: CategoryData): number => {
    return categoryData.puzzles.filter(puzzle => solvedPuzzles.has(puzzle.id)).length;
  };

  // Render a category card in grid view
  const renderCategoryCard = (categoryData: CategoryData) => {
    const previewImage = categoryData.puzzles.length > 0 
      ? getImageUri(categoryData.puzzles[0].image_base64) 
      : null;
    const isComplete = isCategoryComplete(categoryData);
    const solvedCount = getSolvedCount(categoryData);
    
    return (
      <TouchableOpacity
        key={categoryData.category}
        style={[styles.categoryCard, { borderColor: categoryData.color }]}
        onPress={() => openCategoryView(categoryData)}
        activeOpacity={0.8}
      >
        {previewImage ? (
          <Image
            source={{ uri: previewImage }}
            style={styles.categoryPreviewImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.categoryPlaceholder, { backgroundColor: categoryData.color }]}>
            <Text style={styles.categoryPlaceholderIcon}>{categoryData.icon}</Text>
          </View>
        )}
        {/* Category complete badge */}
        {isComplete && (
          <View style={styles.categoryCompleteBadge}>
            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
          </View>
        )}
        <View style={[styles.categoryCardFooter, { backgroundColor: categoryData.color }]}>
          <Text style={styles.categoryCardIcon}>{categoryData.icon}</Text>
          <Text style={styles.categoryCardTitle}>{categoryData.category}</Text>
          <Text style={styles.categoryCardCount}>
            {solvedCount}/{categoryData.puzzles.length}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render local pictures card
  const renderLocalPicturesCard = () => {
    if (localPuzzles.length === 0) return null;
    
    const previewImage = localPuzzles.length > 0 ? localPuzzles[0].imageUri : null;
    
    return (
      <TouchableOpacity
        key="local_pictures"
        style={[styles.categoryCard, { borderColor: '#FDACAC' }]}
        onPress={() => {
          // Show local puzzles - we need to convert them to CategoryData format
          // But we'll handle the selection specially
          setSelectedServerCategory({
            category: 'My Pictures',
            icon: '📱',
            color: '#FDACAC',
            puzzles: localPuzzles.map(lp => ({
              id: lp.id,
              name: lp.name,
              image_base64: lp.imageUri, // Store imageUri here for display
              created_at: lp.created_at,
              _localImageUri: lp.imageUri, // Keep reference to original URI
            })) as any
          });
        }}
        activeOpacity={0.8}
      >
        {previewImage ? (
          <Image
            source={{ uri: previewImage }}
            style={styles.categoryPreviewImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.categoryPlaceholder, { backgroundColor: '#FDACAC' }]}>
            <Text style={styles.categoryPlaceholderIcon}>📱</Text>
          </View>
        )}
        <View style={[styles.categoryCardFooter, { backgroundColor: '#FDACAC' }]}>
          <Text style={styles.categoryCardIcon}>📱</Text>
          <Text style={styles.categoryCardTitle}>My Pictures</Text>
          <Text style={styles.categoryCardCount}>{localPuzzles.length}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render puzzle images inside a category (when category is selected)
  const renderCategoryPuzzles = () => {
    if (!selectedServerCategory) return null;
    
    const isLocalCategory = selectedServerCategory.category === 'My Pictures';
    const isComplete = isCategoryComplete(selectedServerCategory);
    const solvedCount = getSolvedCount(selectedServerCategory);
    
    return (
      <Modal
        visible={true}
        animationType="slide"
        onRequestClose={closeCategoryView}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          {/* Header */}
          <View style={[styles.modalHeader, { backgroundColor: selectedServerCategory.color }]}>
            <TouchableOpacity onPress={closeCategoryView} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color="white" />
            </TouchableOpacity>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalHeaderIcon}>{selectedServerCategory.icon}</Text>
              <Text style={styles.modalHeaderText}>{selectedServerCategory.category}</Text>
              {isComplete && (
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" style={{ marginLeft: 8 }} />
              )}
            </View>
            <Text style={styles.modalHeaderCount}>{solvedCount}/{selectedServerCategory.puzzles.length}</Text>
          </View>
          
          {/* Puzzles Grid */}
          <ScrollView style={styles.puzzlesScrollView} contentContainerStyle={styles.puzzlesGridContainer}>
            {selectedServerCategory.puzzles.map((puzzle) => {
              const isSolved = solvedPuzzles.has(puzzle.id);
              return (
                <TouchableOpacity
                  key={puzzle.id}
                  style={styles.puzzleGridCard}
                  onPress={() => {
                    closeCategoryView();
                    selectPuzzle(puzzle, isLocalCategory);
                  }}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: getImageUri(puzzle.image_base64) }}
                    style={styles.puzzleGridImage}
                    resizeMode="cover"
                  />
                  {/* Solved checkmark badge */}
                  {isSolved && (
                    <View style={styles.puzzleSolvedBadge}>
                      <Ionicons name="checkmark-circle" size={28} color="#4CAF50" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Puzzle!</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FD7979" />
          <Text style={styles.loadingText}>Loading puzzles...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Categories Grid */}
          {(categories.length > 0 || localPuzzles.length > 0) && (
            <View style={styles.categoriesGrid}>
              {categories.map(renderCategoryCard)}
              {renderLocalPicturesCard()}
            </View>
          )}

          {/* Empty State */}
          {categories.length === 0 && localPuzzles.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={80} color="#FFD700" />
              <Text style={styles.emptyText}>No puzzles yet!</Text>
              <Text style={styles.emptySubText}>Upload your first picture below</Text>
            </View>
          )}

          {/* Upload Section - At Bottom */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>📸 Add Your Own Picture</Text>
            <TouchableOpacity
              style={styles.uploadCard}
              onPress={pickImage}
              disabled={processing}
              activeOpacity={0.8}
            >
              {processing ? (
                <View style={styles.uploadContent}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.uploadText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="camera" size={28} color="white" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>Upload Picture</Text>
                    <Text style={styles.uploadSubtitle}>Create your own puzzle!</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* Category Puzzles Modal */}
      {renderCategoryPuzzles()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEEAC9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FD7979',
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
    color: '#FD7979',
    marginTop: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  // Categories Grid
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  categoryCard: {
    width: CARD_SIZE,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 3,
  },
  categoryPreviewImage: {
    width: '100%',
    height: CARD_HEIGHT - 50,
  },
  categoryPlaceholder: {
    width: '100%',
    height: CARD_HEIGHT - 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPlaceholderIcon: {
    fontSize: 60,
  },
  categoryCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    gap: 8,
  },
  categoryCardIcon: {
    fontSize: 20,
  },
  categoryCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  categoryCardCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryCompleteBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  // Modal for viewing puzzles in a category
  modalContainer: {
    flex: 1,
    backgroundColor: '#FEEAC9',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalHeaderIcon: {
    fontSize: 28,
  },
  modalHeaderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  modalHeaderCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  puzzlesScrollView: {
    flex: 1,
  },
  puzzlesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    justifyContent: 'space-between',
  },
  puzzleGridCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    position: 'relative',
  },
  puzzleGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 15,
  },
  puzzleSolvedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  // Empty state
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FD7979',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 16,
    color: '#FDACAC',
    marginTop: 10,
    textAlign: 'center',
  },
  // Upload section
  uploadSection: {
    padding: 15,
    paddingTop: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FD7979',
    marginBottom: 10,
  },
  uploadCard: {
    backgroundColor: '#FD7979',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  uploadIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadSubtitle: {
    fontSize: 14,
    color: 'white',
    marginTop: 2,
    opacity: 0.9,
  },
  uploadHint: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
    opacity: 0.7,
  },
  uploadText: {
    fontSize: 16,
    color: 'white',
    marginTop: 10,
    fontWeight: '600',
  },
  // Category Selection Modal for Upload
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '70%',
  },
  categoryModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  categoryModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 15,
  },
  customCategoryContainer: {
    marginBottom: 10,
  },
  customCategoryInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginVertical: 10,
  },
  categoryList: {
    maxHeight: 180,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#f5f5f5',
  },
  categoryOptionSelected: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  categoryOptionText: {
    fontSize: 18,
    color: '#333',
  },
  categoryOptionTextSelected: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  categoryModalButtons: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
