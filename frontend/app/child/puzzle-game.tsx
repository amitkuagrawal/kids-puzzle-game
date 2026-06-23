import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Alert,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Analytics } from '../../utils/analytics';
import { markPuzzleCompleted } from '../../utils/localStorage';
import { recordPuzzleCompletion, updateStreak } from '../../services/firebase-service';
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const PUZZLE_SIZE = width - 40;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PuzzlePiece {
  id: number;
  correctPosition: number;
  currentPosition: number;
  imageUri: string;
}

interface ScoreEntry {
  id: string;
  score: number;
  time_seconds: number;
  moves: number;
  created_at: string;
}

export default function PuzzleGame() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { puzzleId, puzzleName, imageBase64, difficulty, pieces, level, puzzleIndex, totalPuzzles } = params;

  const numPieces = parseInt(pieces as string);
  const cols = difficulty === 'baby_easy' ? 2 : difficulty === 'easy' ? 3 : difficulty === 'medium' ? 3 : difficulty === 'expert' ? 4 : 4;
  const rows = difficulty === 'baby_easy' ? 2 : difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : difficulty === 'expert' ? 5 : 4;

  const [puzzlePieces, setPuzzlePieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [topScores, setTopScores] = useState<ScoreEntry[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [levelUnlocked, setLevelUnlocked] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const timerRef = useRef<any>(null);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializePuzzle();
    startTimer();

    // Track puzzle started
    Analytics.puzzleStarted(puzzleId as string, difficulty as string, numPieces);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Track abandonment if puzzle wasn't completed
      if (!isComplete && timer > 0) {
        Analytics.puzzleAbandoned(puzzleId as string, difficulty as string, timer);
      }
    };
  }, []);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const initializePuzzle = () => {
    const pieces: PuzzlePiece[] = [];

    for (let i = 0; i < numPieces; i++) {
      pieces.push({
        id: i,
        correctPosition: i,
        currentPosition: i,
        imageUri: imageBase64 as string,
      });
    }

    // Shuffle pieces
    const shuffled = [...pieces];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i].currentPosition, shuffled[j].currentPosition] =
        [shuffled[j].currentPosition, shuffled[i].currentPosition];
    }

    setPuzzlePieces(shuffled);
  };

  const swapPieces = (index1: number, index2: number) => {
    const newPieces = [...puzzlePieces];
    const temp = newPieces[index1].currentPosition;
    newPieces[index1].currentPosition = newPieces[index2].currentPosition;
    newPieces[index2].currentPosition = temp;

    setPuzzlePieces(newPieces);
    setMoves(prev => prev + 1);

    // Check if puzzle is complete
    checkCompletion(newPieces);
  };

  const checkCompletion = async (pieces: PuzzlePiece[]) => {
    const isComplete = pieces.every(piece => piece.correctPosition === piece.currentPosition);

    if (isComplete) {
      setIsComplete(true);
      if (timerRef.current) clearInterval(timerRef.current);

      // Calculate score
      const finalScore = calculateScore();

      // Track puzzle completion analytics (non-blocking)
      Analytics.puzzleCompleted(
        puzzleId as string,
        difficulty as string,
        timer,
        moves,
        finalScore
      );

      // Save score in background (don't wait)
      saveScore(finalScore).catch(() => {});

      // Track level progress if level parameter is present
      if (level) {
        try {
          // Update local storage
          const unlocked = await markPuzzleCompleted(parseInt(level as string));
          setLevelUnlocked(unlocked);

          // Update Firebase (non-blocking, catches errors internally)
          recordPuzzleCompletion(parseInt(level as string))
            .then((result) => {
              if (result.levelUnlocked) {
                setLevelUnlocked(true);
              }
              if (result.newAchievements.length > 0) {
                setNewAchievements(result.newAchievements);
              }
            })
            .catch(() => {});
        } catch {
          // level progress tracking failed silently
        }
      }

      // Show celebration immediately
      playCelebration();
    }
  };

  const handleViewScoreboard = async () => {
    await fetchTopScores();
    setShowScoreboard(true);
  };

  const saveScore = async (score: number) => {
    try {
      await fetch(`${BACKEND_URL}/api/scores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          puzzle_id: puzzleId,
          difficulty: difficulty,
          time_seconds: timer,
          moves: moves,
          score: score,
        }),
      });
    } catch {
      // backend may not be running
    }
  };

  const fetchTopScores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scores/${puzzleId}/${difficulty}`);
      const data = await response.json();
      setTopScores(data);
    } catch {
      // backend may not be running
    }
  };

  const playCelebration = () => {
    Animated.timing(confettiAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPieceAtPosition = (position: number) => {
    return puzzlePieces.find(p => p.currentPosition === position);
  };

  const calculateScore = () => {
    const baseScore = 1000;
    const timeBonus = Math.max(0, 500 - timer);
    const moveBonus = Math.max(0, 500 - moves * 10);
    return baseScore + timeBonus + moveBonus;
  };

  const handlePiecePress = (position: number) => {
    if (selectedPiece === null) {
      // First piece selected
      setSelectedPiece(position);
    } else if (selectedPiece === position) {
      // Deselect if same piece clicked
      setSelectedPiece(null);
    } else {
      // Swap with selected piece
      const index1 = puzzlePieces.findIndex(p => p.currentPosition === selectedPiece);
      const index2 = puzzlePieces.findIndex(p => p.currentPosition === position);
      swapPieces(index1, index2);
      setSelectedPiece(null);
    }
  };

  const renderPuzzlePiece = (position: number) => {
    const piece = getPieceAtPosition(position);
    if (!piece) return null;

    const pieceWidth = PUZZLE_SIZE / cols;
    const pieceHeight = PUZZLE_SIZE / rows;
    const row = Math.floor(piece.correctPosition / cols);
    const col = piece.correctPosition % cols;
    const isSelected = selectedPiece === position;
    const isCorrect = piece.correctPosition === piece.currentPosition;

    return (
      <TouchableOpacity
        key={position}
        style={[
          styles.puzzlePiece,
          {
            width: pieceWidth - 4,
            height: pieceHeight - 4,
          },
          isSelected && styles.selectedPiece,
        ]}
        onPress={() => handlePiecePress(position)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: piece.imageUri }}
          style={[
            styles.pieceImage,
            {
              width: PUZZLE_SIZE,
              height: PUZZLE_SIZE,
              transform: [
                { translateX: -col * pieceWidth },
                { translateY: -row * pieceHeight },
              ],
            },
          ]}
          resizeMode="cover"
        />
        <View style={[styles.pieceBorder, isSelected && styles.selectedBorder]} />
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Ionicons name="hand-left" size={30} color={Colors.starOn} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with stats */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={Colors.onCoral} />
        </TouchableOpacity>

        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color={Colors.onCoral} />
            <Text style={styles.statText}>{formatTime(timer)}</Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="swap-horizontal" size={24} color={Colors.onCoral} />
            <Text style={styles.statText}>{moves}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setShowPreview(!showPreview)}
          style={styles.hintButton}
        >
          <Ionicons name={showPreview ? "eye-off" : "eye"} size={28} color={Colors.onCoral} />
        </TouchableOpacity>
      </View>

      {/* Preview Image */}
      {showPreview && (
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: imageBase64 as string }}
            style={styles.previewImage}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {selectedPiece === null
            ? "👆 Tap a piece to select it"
            : "👉 Tap another piece to swap!"}
        </Text>
      </View>

      {/* Puzzle Board */}
      <View style={styles.puzzleContainer}>
        <View
          style={[
            styles.puzzleBoard,
            {
              width: PUZZLE_SIZE,
              height: PUZZLE_SIZE,
            },
          ]}
        >
          <View style={styles.piecesGrid}>
            {Array.from({ length: numPieces }).map((_, index) => (
              <View key={index}>{renderPuzzlePiece(index)}</View>
            ))}
          </View>
        </View>
      </View>

      {/* Completion Modal */}
      {isComplete && (
        <Animated.View
          style={[
            styles.completionOverlay,
            {
              opacity: confettiAnim,
              transform: [
                {
                  scale: confettiAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.5, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.completionScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.completionCard}>
              {/* Show the complete assembled image */}
              <View style={styles.completedImageContainer}>
                <Image
                  source={{ uri: imageBase64 as string }}
                  style={styles.completedImage}
                  resizeMode="contain"
                />
                <View style={styles.completedImageBadge}>
                  <Ionicons name="checkmark-circle" size={30} color={Colors.green500} />
                </View>
              </View>

              <Ionicons name="trophy" size={40} color={Colors.starOn} />
              <Text style={styles.congratsText}>Amazing!</Text>
              <Text style={styles.completionMessage}>You completed the puzzle!</Text>

              {/* Level unlock notification */}
              {levelUnlocked && (
                <View style={styles.levelUnlockBanner}>
                  <Ionicons name="lock-open" size={30} color={Colors.green500} />
                  <Text style={styles.levelUnlockText}>New Level Unlocked! 🎉</Text>
                </View>
              )}

              {/* Puzzle progress in level */}
              {level && puzzleIndex && totalPuzzles && (
                <View style={styles.progressBanner}>
                  <Text style={styles.progressText}>
                    Puzzle {puzzleIndex} of {totalPuzzles} completed
                  </Text>
                </View>
              )}

              {/* New Achievements */}
              {newAchievements.length > 0 && (
                <View style={styles.achievementsBanner}>
                  <Text style={styles.achievementsTitle}>🎉 New Achievements!</Text>
                  <View style={styles.achievementsContainer}>
                    {newAchievements.map((achId) => (
                      <View key={achId} style={styles.achievementBadge}>
                        <Text style={styles.achievementText}>{achId.replace(/_/g, ' ')}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <View style={styles.scoreContainer}>
                <View style={styles.scoreItem}>
                  <Ionicons name="time" size={24} color={Colors.green500} />
                  <Text style={styles.scoreLabel}>Time</Text>
                  <Text style={styles.scoreValue}>{formatTime(timer)}</Text>
                </View>

                <View style={styles.scoreItem}>
                  <Ionicons name="swap-horizontal" size={24} color={Colors.blue500} />
                  <Text style={styles.scoreLabel}>Moves</Text>
                  <Text style={styles.scoreValue}>{moves}</Text>
                </View>

                <View style={styles.scoreItem}>
                  <Ionicons name="star" size={24} color={Colors.starOn} />
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{calculateScore()}</Text>
                </View>
              </View>

              <View style={styles.completionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.scoreboardButton]}
                  onPress={handleViewScoreboard}
                >
                  <Ionicons name="trophy" size={22} color={Colors.onCoral} />
                  <Text style={styles.buttonText}>View Scores</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.playAgainButton]}
                  onPress={() => {
                    setIsComplete(false);
                    setTimer(0);
                    setMoves(0);
                    setLevelUnlocked(false);
                    initializePuzzle();
                    startTimer();
                    confettiAnim.setValue(0);
                  }}
                >
                  <Ionicons name="refresh" size={22} color={Colors.onCoral} />
                  <Text style={styles.buttonText}>Play Again</Text>
                </TouchableOpacity>

                {level && (
                  <TouchableOpacity
                    style={[styles.button, styles.levelsButton]}
                    onPress={() => router.push('/child/level-select')}
                  >
                    <Ionicons name="layers" size={22} color={Colors.onCoral} />
                    <Text style={styles.buttonText}>Back to Levels</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.button, styles.homeButton]}
                  onPress={() => router.push('/')}
                >
                  <Ionicons name="home" size={22} color={Colors.onCoral} />
                  <Text style={styles.buttonText}>Home</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      )}

      {/* Scoreboard Modal */}
      <Modal
        visible={showScoreboard}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowScoreboard(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowScoreboard(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🏆 Top 10 Scores</Text>
                  <TouchableOpacity
                    onPress={() => setShowScoreboard(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close-circle" size={32} color={Colors.ink2} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalScoreboardList}>
                  {topScores.map((entry, index) => (
                    <View key={entry.id} style={styles.modalScoreboardEntry}>
                      <Text style={styles.modalScoreboardRank}>#{index + 1}</Text>
                      <View style={styles.modalScoreboardDetails}>
                        <Text style={styles.modalScoreboardScore}>{entry.score} pts</Text>
                        <Text style={styles.modalScoreboardInfo}>
                          {formatTime(entry.time_seconds)} • {entry.moves} moves
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream200,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.purple500,
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s5,
    ...Shadows.s1,
  },
  backButton: {
    padding: Spacing.s1,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.s5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s1,
  },
  statText: {
    color: Colors.onCoral,
    fontSize: FontSizes.label,
    fontFamily: Fonts.bodyBold,
  },
  hintButton: {
    padding: Spacing.s1,
  },
  previewContainer: {
    alignItems: 'center',
    padding: Spacing.s3,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: Spacing.s5,
    marginTop: Spacing.s3,
    borderRadius: Radii.card,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: Radii.chip,
  },
  instructionContainer: {
    backgroundColor: Colors.starOn,
    paddingVertical: Spacing.s4,
    paddingHorizontal: Spacing.s5,
    marginHorizontal: Spacing.s5,
    marginTop: Spacing.s3,
    borderRadius: Radii.card,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: FontSizes.label,
    fontFamily: Fonts.bodyBold,
    color: Colors.ink,
    textAlign: 'center',
  },
  puzzleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.s5,
  },
  puzzleBoard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.tile,
    ...Shadows.s3,
    overflow: 'hidden',
  },
  piecesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  puzzlePiece: {
    margin: 2,
    backgroundColor: Colors.slate,
    borderRadius: Radii.piece,
    overflow: 'hidden',
  },
  pieceImage: {
    position: 'absolute',
  },
  pieceBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: Radii.piece,
  },
  selectedPiece: {
    backgroundColor: Colors.starOn,
    transform: [{ scale: 1.05 }],
  },
  selectedBorder: {
    borderWidth: 4,
    borderColor: Colors.starOn,
  },
  selectionIndicator: {
    position: 'absolute',
    top: Spacing.s1,
    right: Spacing.s1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: Radii.tile,
    padding: Spacing.s1,
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.s4,
    paddingVertical: 30,
  },
  completionCard: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.hero,
    padding: Spacing.s5,
    alignItems: 'center',
    width: '95%',
    maxWidth: 350,
  },
  completedImageContainer: {
    position: 'relative',
    marginBottom: Spacing.s3,
    borderRadius: Radii.card,
    overflow: 'hidden',
    ...Shadows.s2,
  },
  completedImage: {
    width: 150,
    height: 150,
    borderRadius: Radii.input,
  },
  completedImageBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: Colors.paper,
    borderRadius: Radii.tile,
    padding: 3,
  },
  congratsText: {
    fontSize: FontSizes.h1,
    fontFamily: Fonts.display,
    color: Colors.coral600,
    marginTop: Spacing.s2,
  },
  completionMessage: {
    fontSize: FontSizes.body,
    fontFamily: Fonts.body,
    color: Colors.ink2,
    marginTop: Spacing.s1,
  },
  levelUnlockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.green50,
    paddingHorizontal: Spacing.s5,
    paddingVertical: Spacing.s3,
    borderRadius: Radii.input,
    marginTop: Spacing.s4,
    gap: Spacing.s3,
  },
  levelUnlockText: {
    fontSize: FontSizes.caption,
    fontFamily: Fonts.bodyBold,
    color: Colors.green500,
  },
  progressBanner: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s2,
    borderRadius: Radii.input,
    marginTop: Spacing.s3,
  },
  progressText: {
    fontSize: FontSizes.small,
    fontFamily: Fonts.body,
    color: Colors.blue500,
    textAlign: 'center',
  },
  achievementsBanner: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: Spacing.s4,
    paddingVertical: Spacing.s3,
    borderRadius: Radii.input,
    marginTop: Spacing.s3,
    alignItems: 'center',
  },
  achievementsTitle: {
    fontSize: FontSizes.caption,
    fontFamily: Fonts.bodyBold,
    color: '#F57C00',
    marginBottom: Spacing.s2,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s2,
    justifyContent: 'center',
  },
  achievementBadge: {
    backgroundColor: Colors.orange500,
    paddingHorizontal: Spacing.s3,
    paddingVertical: 6,
    borderRadius: Radii.card,
  },
  achievementText: {
    fontSize: 12,
    fontFamily: Fonts.bodyBold,
    color: Colors.onCoral,
    textTransform: 'capitalize',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: Spacing.s4,
    marginBottom: Spacing.s4,
  },
  scoreItem: {
    alignItems: 'center',
    gap: 3,
  },
  scoreLabel: {
    fontSize: FontSizes.small,
    fontFamily: Fonts.body,
    color: Colors.ink2,
  },
  scoreValue: {
    fontSize: FontSizes.label,
    fontFamily: Fonts.bodyBold,
    color: Colors.ink,
  },
  completionButtons: {
    width: '100%',
    gap: Spacing.s3,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.s3,
    borderRadius: Radii.card,
    gap: Spacing.s2,
  },
  scoreboardButton: {
    backgroundColor: Colors.starOn,
  },
  playAgainButton: {
    backgroundColor: Colors.green500,
  },
  newPuzzleButton: {
    backgroundColor: Colors.orange500,
  },
  levelsButton: {
    backgroundColor: Colors.purple500,
  },
  homeButton: {
    backgroundColor: Colors.blue500,
  },
  buttonText: {
    color: Colors.onCoral,
    fontSize: FontSizes.caption,
    fontFamily: Fonts.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.s5,
  },
  modalContent: {
    backgroundColor: Colors.paper,
    borderRadius: Radii.hero,
    padding: Spacing.s5,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s5,
  },
  modalTitle: {
    fontSize: FontSizes.h3,
    fontFamily: Fonts.heading,
    color: Colors.ink,
  },
  closeButton: {
    padding: Spacing.s1,
  },
  modalScoreboardList: {
    maxHeight: 400,
  },
  modalScoreboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate,
    padding: Spacing.s4,
    borderRadius: Radii.input,
    marginBottom: Spacing.s3,
  },
  modalScoreboardRank: {
    fontSize: FontSizes.label,
    fontFamily: Fonts.bodyBold,
    color: Colors.coral600,
    width: 45,
  },
  modalScoreboardDetails: {
    flex: 1,
  },
  modalScoreboardScore: {
    fontSize: FontSizes.body,
    fontFamily: Fonts.bodyBold,
    color: Colors.ink,
  },
  modalScoreboardInfo: {
    fontSize: FontSizes.small,
    fontFamily: Fonts.body,
    color: Colors.ink2,
    marginTop: 3,
  },
});
