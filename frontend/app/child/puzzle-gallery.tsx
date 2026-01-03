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
  TextInput,
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
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('My Pictures');
  const [pendingBase64, setPendingBase64] = useState<string | null>(null);
  const [selectedServerCategory, setSelectedServerCategory] = useState<CategoryData | null>(null);

  useEffect(() => {
    loadAllPuzzles();
  }, []);

  const loadAllPuzzles = async () => {
    try {
      setLoading(true);
      console.log('Loading puzzles from:', `${BACKEND_URL}/api/puzzles/preloaded`);
      
      // Fetch preloaded puzzles from server (organized by category)
      const response = await fetch(`${BACKEND_URL}/api/puzzles/preloaded`);
      const serverCategories = await response.json();
      console.log('Server categories received:', serverCategories.length, 'categories');
      
      // Filter out "Uncategorized" category
      const filteredCategories = serverCategories.filter(
        (cat: CategoryData) => cat.category !== 'Uncategorized'
      );
      console.log('Filtered categories:', filteredCategories.length);
      filteredCategories.forEach((cat: CategoryData) => {
        console.log(`Category: ${cat.category}, puzzles: ${cat.puzzles.length}`);
      });
      
      setCategories(filteredCategories);
      
      // Load local puzzles
      const local = await getLocalPuzzles();
      setLocalPuzzles(local);
      console.log('Local puzzles loaded:', local.length);
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

  const selectPuzzle = async (puzzle: Puzzle | LocalPuzzle, isLocal: boolean = false) => {
    try {
      let imageBase64 = '';
      
      if (isLocal) {
        // Get base64 from local file
        imageBase64 = await getImageAsBase64((puzzle as LocalPuzzle).imageUri);
      } else {
        imageBase64 = (puzzle as Puzzle).image_base64;
      }
      
      router.push({
        pathname: '/child/difficulty-select',
        params: {
          puzzleId: puzzle.id,
          puzzleName: puzzle.name,
          imageBase64: imageBase64,
        },
      });
    } catch (error) {
      console.error('Error selecting puzzle:', error);
      Alert.alert('Oops!', 'Could not load this puzzle. Please try again!');
    }
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

      setProcessing(false);
      
      if (manipulatedImage.base64) {
        // Show category selection modal
        setPendingBase64(manipulatedImage.base64);
        setShowCategoryModal(true);
      } else {
        Alert.alert('Oops!', 'Could not process image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setProcessing(false);
      Alert.alert('Oops!', 'Could not process image');
    }
  };

  const saveImageWithCategory = async () => {
    if (!pendingBase64) return;
    
    try {
      setProcessing(true);
      setShowCategoryModal(false);
      
      const puzzleName = `My Puzzle ${new Date().toLocaleDateString()}`;
      
      // Save locally
      await saveImageLocally(pendingBase64, puzzleName, selectedCategory);
      
      // Track upload
      Analytics.puzzleUploaded(pendingBase64.length);
      
      Alert.alert('Success!', 'Your picture has been saved! Tap on it to play.');
      
      // Reload local puzzles
      const local = await getLocalPuzzles();
      setLocalPuzzles(local);
      
      // Reset state
      setPendingBase64(null);
      setSelectedCategory('My Pictures');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Oops!', 'Could not save your picture');
    } finally {
      setProcessing(false);
    }
  };

  // Group local puzzles by category
  const localCategories = localPuzzles.reduce((acc, puzzle) => {
    const cat = puzzle.category || 'My Pictures';
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(puzzle);
    return acc;
  }, {} as Record<string, LocalPuzzle[]>);

  const availableLocalCategories = ['My Pictures', ...Object.keys(localCategories).filter(c => c !== 'My Pictures')];

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

  // Render a category card in grid view
  const renderCategoryCard = (categoryData: CategoryData) => {
    const previewImage = categoryData.puzzles.length > 0 
      ? getImageUri(categoryData.puzzles[0].image_base64) 
      : null;
    
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
        <View style={[styles.categoryCardFooter, { backgroundColor: categoryData.color }]}>
          <Text style={styles.categoryCardIcon}>{categoryData.icon}</Text>
          <Text style={styles.categoryCardTitle}>{categoryData.category}</Text>
          <Text style={styles.categoryCardCount}>{categoryData.puzzles.length}</Text>
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
          // Show local puzzles in a simple view
          setSelectedServerCategory({
            category: 'My Pictures',
            icon: '📱',
            color: '#FDACAC',
            puzzles: localPuzzles.map(lp => ({
              id: lp.id,
              name: lp.name,
              image_base64: lp.imageUri, // Will be handled specially
              created_at: lp.created_at,
            }))
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
            </View>
            <View style={styles.placeholder} />
          </View>
          
          {/* Puzzles Grid */}
          <ScrollView style={styles.puzzlesScrollView} contentContainerStyle={styles.puzzlesGridContainer}>
            {selectedServerCategory.puzzles.map((puzzle) => (
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
              </TouchableOpacity>
            ))}
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
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.uploadText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="camera" size={50} color="white" />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>Upload Your Picture</Text>
                    <Text style={styles.uploadSubtitle}>Create your own puzzle!</Text>
                    <Text style={styles.uploadHint}>Saved on your device</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Bottom padding */}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Category Puzzles Modal */}
      {renderCategoryPuzzles()}

      {/* Category Selection Modal for Upload */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.categoryModalOverlay}>
          <View style={styles.categoryModalContent}>
            <Text style={styles.categoryModalTitle}>Choose a Category</Text>
            <Text style={styles.categoryModalSubtitle}>Where do you want to save this picture?</Text>
            
            <ScrollView style={styles.categoryList}>
              {availableLocalCategories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat && styles.categoryOptionSelected
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[
                    styles.categoryOptionText,
                    selectedCategory === cat && styles.categoryOptionTextSelected
                  ]}>
                    {cat === 'My Pictures' ? '📱 ' : '📁 '}{cat}
                  </Text>
                  {selectedCategory === cat && (
                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.categoryModalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCategoryModal(false);
                  setPendingBase64(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={saveImageWithCategory}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  puzzleGridImage: {
    width: '100%',
    height: '100%',
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
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FD7979',
    marginBottom: 15,
  },
  uploadCard: {
    backgroundColor: '#FD7979',
    borderRadius: 20,
    padding: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
  uploadSubtitle: {
    fontSize: 16,
    color: 'white',
    marginTop: 4,
    opacity: 0.9,
  },
  uploadHint: {
    fontSize: 13,
    color: 'white',
    marginTop: 8,
    opacity: 0.7,
  },
  uploadText: {
    fontSize: 18,
    color: 'white',
    marginTop: 15,
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
    maxHeight: '60%',
  },
  categoryModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  categoryModalSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  categoryList: {
    maxHeight: 250,
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
