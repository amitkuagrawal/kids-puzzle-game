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
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const CARD_SIZE = (width - 48) / 2;
const CARD_HEIGHT = CARD_SIZE * 1.2;

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
    } catch { /* solved-status is non-critical */ }
  };

  const isCategoryComplete = (categoryData: CategoryData): boolean => {
    if (categoryData.puzzles.length === 0) return false;
    return categoryData.puzzles.every(puzzle => solvedPuzzles.has(puzzle.id));
  };

  const getSolvedCount = (categoryData: CategoryData): number => {
    return categoryData.puzzles.filter(puzzle => solvedPuzzles.has(puzzle.id)).length;
  };

  const loadAllPuzzles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/puzzles/preloaded`);
      const serverCategories = await response.json();
      const filteredCategories = serverCategories.filter(
        (cat: CategoryData) => cat.category !== 'Uncategorized'
      );
      setCategories(filteredCategories);
      const local = await getLocalPuzzles();
      setLocalPuzzles(local);
    } catch {
      try {
        const local = await getLocalPuzzles();
        setLocalPuzzles(local);
      } catch { /* local load failed silently */ }
    } finally {
      setLoading(false);
    }
  };

  const selectPuzzle = async (puzzle: Puzzle | LocalPuzzle | any, isLocal: boolean = false) => {
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
    } catch {
      Alert.alert('Oops!', 'Could not pick image. Please try again!');
    }
  };

  const processImage = async (imageUri: string) => {
    try {
      setProcessing(true);
      const MAX_DIMENSION = 800;
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: MAX_DIMENSION } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (manipulatedImage.base64) {
        const puzzleName = `My Puzzle ${new Date().toLocaleDateString()}`;
        await saveImageLocally(manipulatedImage.base64, puzzleName, 'My Pictures');
        Analytics.puzzleUploaded(manipulatedImage.base64.length);
        Alert.alert('Success!', 'Your picture has been saved! Tap "My Pictures" to play.');
        const local = await getLocalPuzzles();
        setLocalPuzzles(local);
      } else {
        Alert.alert('Oops!', 'Could not process image');
      }
      setProcessing(false);
    } catch {
      setProcessing(false);
      Alert.alert('Oops!', 'Could not process image');
    }
  };

  const localCategories = localPuzzles.reduce((acc, puzzle) => {
    const cat = puzzle.category || 'My Pictures';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(puzzle);
    return acc;
  }, {} as Record<string, LocalPuzzle[]>);

  const getImageUri = (imageData: string): string => {
    if (!imageData) return '';
    if (imageData.startsWith('data:') || imageData.startsWith('file:')) return imageData;
    return `data:image/jpeg;base64,${imageData}`;
  };

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
        {isComplete && (
          <View style={styles.categoryCompleteBadge}>
            <Ionicons name="checkmark-circle" size={32} color={Colors.green500} />
          </View>
        )}
        <View style={[styles.categoryCardFooter, { backgroundColor: categoryData.color }]}>
          <Text style={styles.categoryCardIcon}>{categoryData.icon}</Text>
          <Text style={styles.categoryCardTitle}>{categoryData.category}</Text>
          <Text style={styles.categoryCardCount}>{solvedCount}/{categoryData.puzzles.length}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderLocalPicturesCard = () => {
    if (localPuzzles.length === 0) return null;
    const previewImage = localPuzzles.length > 0 ? localPuzzles[0].imageUri : null;

    return (
      <TouchableOpacity
        key="local_pictures"
        style={[styles.categoryCard, { borderColor: Colors.coral400 }]}
        onPress={() => {
          setSelectedServerCategory({
            category: 'My Pictures',
            icon: '📱',
            color: Colors.coral400,
            puzzles: localPuzzles.map(lp => ({
              id: lp.id,
              name: lp.name,
              image_base64: lp.imageUri,
              created_at: lp.created_at,
              _localImageUri: lp.imageUri,
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
          <View style={[styles.categoryPlaceholder, { backgroundColor: Colors.coral400 }]}>
            <Text style={styles.categoryPlaceholderIcon}>📱</Text>
          </View>
        )}
        <View style={[styles.categoryCardFooter, { backgroundColor: Colors.coral400 }]}>
          <Text style={styles.categoryCardIcon}>📱</Text>
          <Text style={styles.categoryCardTitle}>My Pictures</Text>
          <Text style={styles.categoryCardCount}>{localPuzzles.length}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategoryPuzzles = () => {
    if (!selectedServerCategory) return null;
    const isLocalCategory = selectedServerCategory.category === 'My Pictures';
    const isComplete = isCategoryComplete(selectedServerCategory);
    const solvedCount = getSolvedCount(selectedServerCategory);

    return (
      <Modal visible={true} animationType="slide" onRequestClose={closeCategoryView}>
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={[styles.modalHeader, { backgroundColor: selectedServerCategory.color }]}>
            <TouchableOpacity onPress={closeCategoryView} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={Colors.onCoral} />
            </TouchableOpacity>
            <View style={styles.modalHeaderTitle}>
              <Text style={styles.modalHeaderIcon}>{selectedServerCategory.icon}</Text>
              <Text style={styles.modalHeaderText}>{selectedServerCategory.category}</Text>
              {isComplete && (
                <Ionicons name="checkmark-circle" size={24} color={Colors.green500} style={{ marginLeft: Spacing.s2 }} />
              )}
            </View>
            <Text style={styles.modalHeaderCount}>{solvedCount}/{selectedServerCategory.puzzles.length}</Text>
          </View>

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
                  {isSolved && (
                    <View style={styles.puzzleSolvedBadge}>
                      <Ionicons name="checkmark-circle" size={28} color={Colors.green500} />
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
          <Ionicons name="arrow-back" size={32} color={Colors.onCoral} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose a Puzzle!</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.coral600} />
          <Text style={styles.loadingText}>Loading puzzles...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {(categories.length > 0 || localPuzzles.length > 0) && (
            <View style={styles.categoriesGrid}>
              {categories.map(renderCategoryCard)}
              {renderLocalPicturesCard()}
            </View>
          )}

          {categories.length === 0 && localPuzzles.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={80} color={Colors.gold500} />
              <Text style={styles.emptyText}>No puzzles yet!</Text>
              <Text style={styles.emptySubText}>Upload your first picture below</Text>
            </View>
          )}

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
                  <ActivityIndicator size="small" color={Colors.onCoral} />
                  <Text style={styles.uploadText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <View style={styles.uploadIconContainer}>
                    <Ionicons name="camera" size={28} color={Colors.onCoral} />
                  </View>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTitle}>Upload Picture</Text>
                    <Text style={styles.uploadSubtitle}>Create your own puzzle!</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: Spacing.s5 }} />
        </ScrollView>
      )}

      {renderCategoryPuzzles()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream300,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.coral600,
    paddingVertical: Spacing.s5,
    paddingHorizontal: Spacing.s5,
    ...Shadows.s3,
  },
  backButton: {
    padding: Spacing.s1,
  },
  headerTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.h2,
    color: Colors.onCoral,
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
    fontFamily: Fonts.body,
    fontSize: FontSizes.label,
    color: Colors.coral600,
    marginTop: Spacing.s5,
  },
  scrollView: {
    flex: 1,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.s4,
    gap: Spacing.s4,
  },
  categoryCard: {
    width: CARD_SIZE,
    height: CARD_HEIGHT,
    borderRadius: Radii.tile,
    overflow: 'hidden',
    backgroundColor: Colors.paper,
    ...Shadows.s2,
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
    paddingHorizontal: Spacing.s3,
    gap: Spacing.s2,
  },
  categoryCardIcon: {
    fontSize: FontSizes.label,
  },
  categoryCardTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
    color: Colors.onCoral,
    flex: 1,
  },
  categoryCardCount: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.small,
    color: Colors.onCoral,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: Spacing.s2,
    paddingVertical: 2,
    borderRadius: Radii.chip,
  },
  categoryCompleteBadge: {
    position: 'absolute',
    top: Spacing.s3,
    right: Spacing.s3,
    backgroundColor: Colors.paper,
    borderRadius: Radii.tile,
    padding: 2,
    ...Shadows.s1,
    zIndex: 10,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.cream300,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s5,
  },
  modalHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  modalHeaderIcon: {
    fontSize: FontSizes.h2,
  },
  modalHeaderText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.h3,
    color: Colors.onCoral,
  },
  modalHeaderCount: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
    color: Colors.onCoral,
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: Spacing.s3,
    paddingVertical: Spacing.s1,
    borderRadius: Radii.input,
  },
  puzzlesScrollView: {
    flex: 1,
  },
  puzzlesGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.s4,
    justifyContent: 'space-between',
  },
  puzzleGridCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: Radii.card,
    marginBottom: Spacing.s4,
    ...Shadows.s1,
    position: 'relative',
  },
  puzzleGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radii.card,
  },
  puzzleSolvedBadge: {
    position: 'absolute',
    top: Spacing.s2,
    right: Spacing.s2,
    backgroundColor: Colors.paper,
    borderRadius: 16,
    padding: 2,
    ...Shadows.s1,
    zIndex: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.h2,
    color: Colors.coral600,
    marginTop: Spacing.s5,
  },
  emptySubText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.coral400,
    marginTop: Spacing.s3,
    textAlign: 'center',
  },
  uploadSection: {
    padding: Spacing.s4,
    paddingTop: Spacing.s1,
  },
  sectionTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.body,
    color: Colors.coral600,
    marginBottom: Spacing.s3,
  },
  uploadCard: {
    backgroundColor: Colors.coral600,
    borderRadius: Radii.card,
    padding: Spacing.s4,
    ...Shadows.s1,
  },
  uploadContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s4,
  },
  uploadIconContainer: {
    width: 50,
    height: 50,
    borderRadius: Radii.hero,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadTitle: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.body,
    color: Colors.onCoral,
  },
  uploadSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.small,
    color: Colors.onCoral,
    marginTop: 2,
    opacity: 0.9,
  },
  uploadHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.onCoral,
    marginTop: Spacing.s1,
    opacity: 0.7,
  },
  uploadText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.onCoral,
    marginTop: Spacing.s3,
  },
  categoryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  categoryModalContent: {
    backgroundColor: Colors.paper,
    borderTopLeftRadius: Radii.hero,
    borderTopRightRadius: Radii.hero,
    padding: Spacing.s6,
    maxHeight: '70%',
  },
  categoryModalTitle: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.h3,
    color: Colors.ink,
    textAlign: 'center',
  },
  categoryModalSubtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.small,
    color: Colors.ink2,
    textAlign: 'center',
    marginTop: Spacing.s1,
    marginBottom: Spacing.s4,
  },
  customCategoryContainer: {
    marginBottom: Spacing.s3,
  },
  customCategoryInput: {
    backgroundColor: Colors.slate,
    borderRadius: Radii.input,
    padding: Spacing.s4,
    fontSize: FontSizes.caption,
    borderWidth: 2,
    borderColor: Colors.line,
  },
  orText: {
    textAlign: 'center',
    color: Colors.ink3,
    fontSize: FontSizes.small,
    marginVertical: Spacing.s3,
  },
  categoryList: {
    maxHeight: 180,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.s4,
    borderRadius: Radii.input,
    marginBottom: Spacing.s3,
    backgroundColor: Colors.slate,
  },
  categoryOptionSelected: {
    backgroundColor: Colors.green50,
    borderWidth: 2,
    borderColor: Colors.green500,
  },
  categoryOptionText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.body,
    color: Colors.ink,
  },
  categoryOptionTextSelected: {
    fontFamily: Fonts.bodyBold,
    color: Colors.green500,
  },
  categoryModalButtons: {
    flexDirection: 'row',
    gap: Spacing.s4,
    marginTop: Spacing.s5,
  },
  cancelButton: {
    flex: 1,
    padding: Spacing.s4,
    borderRadius: Radii.input,
    backgroundColor: Colors.slate,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.caption,
    color: Colors.ink2,
  },
  saveButton: {
    flex: 1,
    padding: Spacing.s4,
    borderRadius: Radii.input,
    backgroundColor: Colors.green500,
    alignItems: 'center',
  },
  saveButtonText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
    color: Colors.onCoral,
  },
});
