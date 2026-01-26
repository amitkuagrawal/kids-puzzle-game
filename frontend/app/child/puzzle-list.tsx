import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 2;

interface Puzzle {
  id: string;
  name: string;
  image_base64: string;
  created_at: string;
}

export default function PuzzleList() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { level, levelName, difficulty, pieces, puzzles: puzzlesJson } = params;

  const puzzles: Puzzle[] = JSON.parse(puzzlesJson as string);

  const getImageUri = (imageData: string): string => {
    if (!imageData) return '';
    if (imageData.startsWith('data:') || imageData.startsWith('file:')) {
      return imageData;
    }
    return `data:image/jpeg;base64,${imageData}`;
  };

  const selectPuzzle = (puzzle: Puzzle, puzzleIndex: number) => {
    const imageUri = getImageUri(puzzle.image_base64);

    router.push({
      pathname: '/child/puzzle-game',
      params: {
        puzzleId: puzzle.id,
        puzzleName: puzzle.name,
        imageBase64: imageUri,
        difficulty: difficulty as string,
        pieces: pieces as string,
        level: level as string,
        puzzleIndex: puzzleIndex.toString(),
        totalPuzzles: puzzles.length.toString(),
      },
    });
  };

  const getLevelColor = (levelNum: string): string => {
    const colors: { [key: string]: string } = {
      '1': '#4CAF50',
      '2': '#2196F3',
      '3': '#FF9800',
      '4': '#9C27B0',
      '5': '#F44336',
    };
    return colors[levelNum] || '#4CAF50';
  };

  const levelColor = getLevelColor(level as string);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: levelColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{levelName}</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Info Banner */}
      <View style={[styles.infoBanner, { backgroundColor: levelColor }]}>
        <Ionicons name="information-circle" size={24} color="white" />
        <Text style={styles.infoText}>
          Complete all 5 puzzles to unlock the next level!
        </Text>
      </View>

      {/* Puzzle Grid */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.puzzlesGrid}>
          {puzzles.map((puzzle, index) => (
            <TouchableOpacity
              key={puzzle.id}
              style={[styles.puzzleCard, { borderColor: levelColor }]}
              onPress={() => selectPuzzle(puzzle, index + 1)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: getImageUri(puzzle.image_base64) }}
                style={styles.puzzleImage}
                resizeMode="cover"
              />
              <View style={[styles.puzzleFooter, { backgroundColor: levelColor }]}>
                <Text style={styles.puzzleNumber}>Puzzle {index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
  },
  puzzlesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    gap: 20,
  },
  puzzleCard: {
    width: CARD_SIZE,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'white',
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  puzzleImage: {
    width: '100%',
    height: CARD_SIZE,
  },
  puzzleFooter: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  puzzleNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});
