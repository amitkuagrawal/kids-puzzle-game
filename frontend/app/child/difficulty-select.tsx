import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Analytics } from '../../utils/analytics';
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');

const DIFFICULTIES = [
  { level: 'baby_easy', pieces: 4,  color: Colors.coral400, icon: 'heart',  label: 'Baby Easy', description: '2 × 2 pieces' },
  { level: 'easy',      pieces: 9,  color: Colors.green500, icon: 'happy',  label: 'Easy',      description: '3 × 3 pieces' },
  { level: 'medium',    pieces: 12, color: Colors.orange500,icon: 'star',   label: 'Medium',    description: '3 × 4 pieces' },
  { level: 'hard',      pieces: 16, color: Colors.red500,   icon: 'flash',  label: 'Hard',      description: '4 × 4 pieces' },
] as const;

export default function DifficultySelect() {
  const router = useRouter();
  const { puzzleId, puzzleName, imageBase64 } = useLocalSearchParams();

  const startGame = (difficulty: string, pieces: number) => {
    Analytics.difficultySelected(difficulty, pieces);
    router.push({
      pathname: '/child/puzzle-game',
      params: { puzzleId, puzzleName, imageBase64: imageBase64 as string, difficulty, pieces: pieces.toString() },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color={Colors.onCoral} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Your Challenge!</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionsContainer}>
          {DIFFICULTIES.map((diff) => (
            <TouchableOpacity
              key={diff.level}
              style={[styles.difficultyCard, { backgroundColor: diff.color }]}
              onPress={() => startGame(diff.level, diff.pieces)}
              activeOpacity={0.8}
            >
              <Ionicons name={diff.icon as any} size={50} color={Colors.onCoral} />
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
    backgroundColor: Colors.green50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.green500,
    paddingVertical: Spacing.s5,
    paddingHorizontal: Spacing.s5,
    ...Shadows.s2,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: FontSizes.h2,
    fontFamily: Fonts.heading,
    color: Colors.onCoral,
  },
  placeholder: {
    width: 42,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: Spacing.s5,
  },
  optionsContainer: {
    paddingHorizontal: Spacing.s5,
    gap: Spacing.s4,
  },
  difficultyCard: {
    width: '100%',
    height: 140,
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s5,
    borderRadius: Radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.s3,
  },
  difficultyLabel: {
    fontSize: FontSizes.h2,
    fontFamily: Fonts.heading,
    color: Colors.onCoral,
    marginTop: Spacing.s2,
  },
  difficultyDescription: {
    fontSize: FontSizes.caption,
    fontFamily: Fonts.body,
    color: Colors.onCoral,
    marginTop: Spacing.s1,
  },
});
