import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface Puzzle {
  id: string;
  name: string;
  image_base64: string;
  created_at: string;
}

export default function AdminManage() {
  const router = useRouter();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(false);
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
      Alert.alert('Error', 'Failed to load puzzles');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        await uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadImage = async (base64: string) => {
    try {
      setUploading(true);
      const puzzleName = `Puzzle ${puzzles.length + 1}`;
      
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
        Alert.alert('Success', 'Puzzle uploaded successfully!');
        await fetchPuzzles();
      } else {
        Alert.alert('Error', 'Failed to upload puzzle');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload puzzle');
    } finally {
      setUploading(false);
    }
  };

  const deletePuzzle = async (id: string) => {
    Alert.alert(
      'Delete Puzzle',
      'Are you sure you want to delete this puzzle?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/puzzles/${id}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                Alert.alert('Success', 'Puzzle deleted successfully');
                await fetchPuzzles();
              } else {
                Alert.alert('Error', 'Failed to delete puzzle');
              }
            } catch (error) {
              console.error('Error deleting puzzle:', error);
              Alert.alert('Error', 'Failed to delete puzzle');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Panel</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Upload Button */}
      <TouchableOpacity
        style={styles.uploadButton}
        onPress={pickImage}
        disabled={uploading}
        activeOpacity={0.8}
      >
        {uploading ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <>
            <Ionicons name="cloud-upload" size={30} color="white" />
            <Text style={styles.uploadButtonText}>Upload New Puzzle</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Puzzles List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : puzzles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="images-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No puzzles yet</Text>
          <Text style={styles.emptySubText}>Upload your first puzzle!</Text>
        </View>
      ) : (
        <ScrollView style={styles.puzzlesList} contentContainerStyle={styles.puzzlesContent}>
          {puzzles.map((puzzle) => (
            <View key={puzzle.id} style={styles.puzzleCard}>
              <Image
                source={{ uri: puzzle.image_base64 }}
                style={styles.puzzleImage}
                resizeMode="cover"
              />
              <View style={styles.puzzleInfo}>
                <Text style={styles.puzzleName}>{puzzle.name}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deletePuzzle(puzzle.id)}
                >
                  <Ionicons name="trash" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 38,
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    margin: 20,
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 20,
  },
  emptySubText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
  },
  puzzlesList: {
    flex: 1,
  },
  puzzlesContent: {
    padding: 20,
    paddingTop: 0,
  },
  puzzleCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  puzzleImage: {
    width: '100%',
    height: 200,
  },
  puzzleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  puzzleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  deleteButton: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    borderRadius: 10,
  },
});
