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
      ) : puzzles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="sad-outline" size={100} color="#FFD700" />
          <Text style={styles.emptyText}>No puzzles yet!</Text>
          <Text style={styles.emptySubText}>Ask an adult to add some puzzles</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.puzzlesGrid}>
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
