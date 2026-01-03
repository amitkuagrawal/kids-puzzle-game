import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Analytics } from '../../utils/analytics';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Puzzle {
  id: string;
  name: string;
  image_base64: string;
  created_at: string;
}

export default function PuzzleGallery() {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchPuzzles();
  }, []);

  const fetchPuzzles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/puzzles`);
      const data = await response.json();
      setPuzzles(data);
    } catch (error) {
      console.error('Error fetching puzzles:', error);
      Alert.alert('Oops!', 'Could not load puzzles. Please try again!');
    } finally {
      setLoading(false);
    }
  };

  const selectPuzzle = (puzzle: Puzzle) => {
    router.push({
      pathname: '/child/difficulty-select',
      params: {
        puzzleId: puzzle.id,
        puzzleName: puzzle.name,
        imageBase64: puzzle.image_base64,
      },
    });
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
        await processAndUploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Oops!', 'Could not pick image. Please try again!');
    }
  };

  const processAndUploadImage = async (imageUri: string) => {
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
        await uploadImage(manipulatedImage.base64);
      } else {
        Alert.alert('Oops!', 'Could not process image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      setProcessing(false);
      Alert.alert('Oops!', 'Could not process image');
    }
  };

  const uploadImage = async (base64: string) => {
    try {
      setUploading(true);
      const puzzleName = `My Puzzle ${Date.now()}`;
      
      const response = await fetch(`${BACKEND_URL}/api/puzzles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: puzzleName,
          image_base64: `data:image/jpeg;base64,${base64}`,
        }),
      });

      if (response.ok) {
        // Track upload
        Analytics.puzzleUploaded(base64.length);
        
        Alert.alert('Success!', 'Your picture has been added to the library! Tap on it to play.');
        
        // Reload puzzles to show the new one
        await fetchPuzzles();
      } else {
        Alert.alert('Oops!', 'Could not upload your picture');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Oops!', 'Could not upload your picture');
    } finally {
      setUploading(false);
    }
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
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Loading puzzles...</Text>
        </View>
      ) : (
        <>
          {/* Upload Your Own Picture Button */}
          <View style={styles.uploadSection}>
            <TouchableOpacity
              style={styles.uploadCard}
              onPress={pickImage}
              disabled={processing || uploading}
              activeOpacity={0.8}
            >
              {processing ? (
                <>
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.uploadText}>Processing your picture...</Text>
                </>
              ) : uploading ? (
                <>
                  <ActivityIndicator size="large" color="white" />
                  <Text style={styles.uploadText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={60} color="white" />
                  <Text style={styles.uploadTitle}>Upload Your Own Picture!</Text>
                  <Text style={styles.uploadSubtitle}>Make a puzzle from your photos</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Existing Puzzles */}
          {puzzles.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="images-outline" size={80} color="#FFD700" />
              <Text style={styles.emptyText}>No puzzles yet!</Text>
              <Text style={styles.emptySubText}>Upload your first picture above</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.puzzlesGrid}>
              <Text style={styles.sectionTitle}>Or Choose from Library:</Text>
              {puzzles.map((puzzle) => (
                <TouchableOpacity
                  key={puzzle.id}
                  style={styles.puzzleCard}
                  onPress={() => selectPuzzle(puzzle)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={{ uri: puzzle.image_base64 }}
                    style={styles.puzzleImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFE5E5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF6B6B',
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
    color: '#FF6B6B',
    marginTop: 20,
    fontWeight: '600',
  },
  uploadSection: {
    padding: 20,
    paddingBottom: 10,
  },
  uploadCard: {
    backgroundColor: '#FF6B6B',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
    flexDirection: 'row',
    gap: 12,
    minHeight: 80,
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
  },
  uploadText: {
    fontSize: 18,
    color: 'white',
    marginTop: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 15,
    width: '100%',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 18,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  puzzlesGrid: {
    padding: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  puzzleCard: {
    width: (width - 60) / 2,
    height: (width - 60) / 2,
    backgroundColor: 'white',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  puzzleImage: {
    width: '100%',
    height: '100%',
  },
});
