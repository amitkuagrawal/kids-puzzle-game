import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function DifficultySelect() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { puzzleId, puzzleName, imageBase64 } = params;

  const difficulties = [
    {
      level: 'easy',
      pieces: 9,
      color: '#4CAF50',
      icon: 'happy',
      label: 'Easy',
      description: '3 × 3 pieces',
    },
    {
      level: 'medium',
      pieces: 12,
      color: '#FF9800',
      icon: 'star',
      label: 'Medium',
      description: '3 × 4 pieces',
    },
    {
      level: 'hard',
      pieces: 16,
      color: '#F44336',
      icon: 'flash',
      label: 'Hard',
      description: '4 × 4 pieces',
    },
  ];

  const startGame = (difficulty: string, pieces: number) => {
    router.push({
      pathname: '/child/puzzle-game',
      params: {
        puzzleId,
        puzzleName,
        imageBase64: imageBase64 as string,
        difficulty,
        pieces: pieces.toString(),
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
        <Text style={styles.headerTitle}>Choose Level!</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.titleContainer}>
          <Ionicons name="trophy" size={60} color="#FFD700" />
          <Text style={styles.title}>Pick Your Challenge!</Text>
        </View>

        {/* Difficulty Options */}
        <View style={styles.optionsContainer}>
          {difficulties.map((diff, index) => (
            <TouchableOpacity
              key={diff.level}
              style={[styles.difficultyCard, { backgroundColor: diff.color }]}
              onPress={() => startGame(diff.level, diff.pieces)}
              activeOpacity={0.8}
            >
              <Ionicons name={diff.icon as any} size={70} color="white" />
              <Text style={styles.difficultyLabel}>{diff.label}</Text>
              <Text style={styles.difficultyDescription}>{diff.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  titleContainer: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 20,
  },
  difficultyCard: {
    width: '100%',
    height: 180,
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  difficultyLabel: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  difficultyDescription: {
    fontSize: 20,
    color: 'white',
    marginTop: 5,
    fontWeight: '600',
  },
  playButton: {
    marginTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 30,
    padding: 10,
  },
});
