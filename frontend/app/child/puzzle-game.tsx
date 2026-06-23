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
import { LinearGradient } from 'expo-linear-gradient';
import Pip from '../../components/Pip';
import Stars from '../../components/Stars';
import Confetti from '../../components/Confetti';

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
  const cols = difficulty === 'baby_easy' ? 2 : difficulty === 'easy' ? 3 : difficulty === 'medium' ? 3 : 4;
  const rows = difficulty === 'baby_easy' ? 2 : difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 4;

  const [puzzlePieces, setPuzzlePieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [topScores, setTopScores] = useState<ScoreEntry[]>([]);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [levelUnlocked, setLevelUnlocked] = useState(false);
  const [hasLearn, setHasLearn] = useState(false);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const timerRef = useRef<any>(null);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializePuzzle();
    startTimer();
    Analytics.puzzleStarted(puzzleId as string, difficulty as string, numPieces);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isComplete && timer > 0) {
        Analytics.puzzleAbandoned(puzzleId as string, difficulty as string, timer);
      }
    };
  }, []);

  useEffect(() => {
    const id = puzzleId as string;
    if (!id || id.startsWith('local_')) return;
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/items/${id}`);
        if (r.ok) {
          const data = await r.json();
          setHasLearn(!!data.learn);
        }
      } catch {}
    })();
  }, [puzzleId]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const initializePuzzle = () => {
    const pieces: PuzzlePiece[] = [];
    for (let i = 0; i < numPieces; i++) {
      pieces.push({ id: i, correctPosition: i, currentPosition: i, imageUri: imageBase64 as string });
    }
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
    checkCompletion(newPieces);
  };

  const checkCompletion = async (pieces: PuzzlePiece[]) => {
    const complete = pieces.every(piece => piece.correctPosition === piece.currentPosition);
    if (complete) {
      setIsComplete(true);
      if (timerRef.current) clearInterval(timerRef.current);
      const finalScore = calculateScore();

      Analytics.puzzleCompleted(puzzleId as string, difficulty as string, timer, moves, finalScore);
      saveScore(finalScore).catch(() => {});

      if (level) {
        try {
          const unlocked = await markPuzzleCompleted(parseInt(level as string));
          setLevelUnlocked(unlocked);
          recordPuzzleCompletion(parseInt(level as string))
            .then((result) => {
              if (result.levelUnlocked) setLevelUnlocked(true);
              if (result.newAchievements.length > 0) setNewAchievements(result.newAchievements);
            })
            .catch(() => {});
          updateStreak().catch(() => {});
        } catch {}
      }

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ puzzle_id: puzzleId, difficulty, time_seconds: timer, moves, score }),
      });
    } catch {}
  };

  const fetchTopScores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scores/${puzzleId}/${difficulty}`);
      const data = await response.json();
      setTopScores(data);
    } catch {}
  };

  const playCelebration = () => {
    Animated.timing(confettiAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPieceAtPosition = (position: number) => puzzlePieces.find(p => p.currentPosition === position);

  const calculateScore = () => {
    const baseScore = 1000;
    const timeBonus = Math.max(0, 500 - timer);
    const moveBonus = Math.max(0, 500 - moves * 10);
    return baseScore + timeBonus + moveBonus;
  };

  const handlePiecePress = (position: number) => {
    if (selectedPiece === null) {
      setSelectedPiece(position);
    } else if (selectedPiece === position) {
      setSelectedPiece(null);
    } else {
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

    return (
      <TouchableOpacity
        key={position}
        style={[
          styles.puzzlePiece,
          { width: pieceWidth - 4, height: pieceHeight - 4 },
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
              width: PUZZLE_SIZE, height: PUZZLE_SIZE,
              transform: [{ translateX: -col * pieceWidth }, { translateY: -row * pieceHeight }],
            },
          ]}
          resizeMode="cover"
        />
        <View style={[styles.pieceBorder, isSelected && styles.selectedBorder]} />
        {isSelected && (
          <View style={styles.selectionIndicator}>
            <Ionicons name="hand-left" size={30} color={Colors.gold500} />
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
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Ionicons name="time" size={24} color="white" />
            <Text style={styles.statText}>{formatTime(timer)}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="swap-horizontal" size={24} color="white" />
            <Text style={styles.statText}>{moves}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setShowPreview(!showPreview)} style={styles.hintButton}>
          <Ionicons name={showPreview ? "eye-off" : "eye"} size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Preview Image */}
      {showPreview && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageBase64 as string }} style={styles.previewImage} resizeMode="contain" />
        </View>
      )}

      {/* Instructions */}
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>
          {selectedPiece === null ? "👆 Tap a piece to select it" : "👉 Tap another piece to swap!"}
        </Text>
      </View>

      {/* Puzzle Board */}
      <View style={styles.puzzleArea}>
        <View style={[styles.puzzleBoard, { width: PUZZLE_SIZE, height: PUZZLE_SIZE }]}>
          <View style={styles.piecesGrid}>
            {Array.from({ length: numPieces }).map((_, index) => (
              <View key={index}>{renderPuzzlePiece(index)}</View>
            ))}
          </View>
        </View>
      </View>

      {/* Win screen */}
      {isComplete && (
        <LinearGradient colors={['#FFD86F', '#FF8AB8']} style={styles.completionOverlay}>
          <Confetti active={isComplete} />
          <ScrollView contentContainerStyle={styles.completionScrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.completionCard, {
              opacity: confettiAnim,
              transform: [{ scale: confettiAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
            }]}>
              <Pip size={120} mood="party" hat="party" />
              <Text style={styles.congratsText}>WOW!</Text>
              <Text style={styles.completionMessage}>You did it! 🎉</Text>

              <View style={{ marginTop: 10 }}>
                <Stars count={moves <= 10 ? 3 : moves <= 20 ? 2 : 1} size={38} />
              </View>

              {/* Level unlock notification */}
              {levelUnlocked && (
                <View style={styles.levelUnlockBanner}>
                  <Ionicons name="lock-open" size={24} color={Colors.gold500} />
                  <Text style={styles.levelUnlockText}>New Level Unlocked! 🎉</Text>
                </View>
              )}

              {/* Puzzle progress in level */}
              {level && puzzleIndex && totalPuzzles && (
                <Text style={styles.progressText}>
                  Puzzle {puzzleIndex} of {totalPuzzles} completed
                </Text>
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

              {/* Score row */}
              <View style={styles.scoreContainer}>
                <View style={styles.scoreItem}>
                  <Ionicons name="time" size={22} color={Colors.green500} />
                  <Text style={styles.scoreLabel}>Time</Text>
                  <Text style={styles.scoreValue}>{formatTime(timer)}</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Ionicons name="swap-horizontal" size={22} color={Colors.blue500} />
                  <Text style={styles.scoreLabel}>Moves</Text>
                  <Text style={styles.scoreValue}>{moves}</Text>
                </View>
                <View style={styles.scoreItem}>
                  <Ionicons name="star" size={22} color={Colors.gold500} />
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{calculateScore()}</Text>
                </View>
              </View>

              {/* Buttons */}
              <View style={styles.completionButtons}>
                {hasLearn && (
                  <TouchableOpacity
                    style={[styles.button, styles.learnButton]}
                    onPress={() => router.push({
                      pathname: '/child/learn',
                      params: { puzzleId, puzzleName, imageBase64 },
                    })}
                  >
                    <Ionicons name="book" size={22} color="#fff" />
                    <Text style={styles.buttonText}>Learn about {puzzleName} 📖</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.button, styles.scoreboardButton]} onPress={handleViewScoreboard}>
                  <Ionicons name="trophy" size={22} color="#fff" />
                  <Text style={styles.buttonText}>View Scores</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.playAgainButton]} onPress={() => {
                  setIsComplete(false); setTimer(0); setMoves(0); setLevelUnlocked(false);
                  initializePuzzle(); startTimer(); confettiAnim.setValue(0);
                }}>
                  <Ionicons name="refresh" size={22} color="#fff" />
                  <Text style={styles.buttonText}>Play Again</Text>
                </TouchableOpacity>
                {level && (
                  <TouchableOpacity style={[styles.button, styles.levelsButton]} onPress={() => router.push('/child/level-select')}>
                    <Ionicons name="layers" size={22} color="#fff" />
                    <Text style={styles.buttonText}>Back to Levels</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.button, styles.newPuzzleButton]} onPress={() => router.push('/child/puzzle-gallery')}>
                  <Ionicons name="grid" size={22} color="#fff" />
                  <Text style={styles.buttonText}>New Puzzle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.homeButton]} onPress={() => router.push('/')}>
                  <Ionicons name="home" size={22} color="#fff" />
                  <Text style={styles.buttonText}>Home</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      )}

      {/* Scoreboard Modal */}
      <Modal visible={showScoreboard} transparent animationType="fade" onRequestClose={() => setShowScoreboard(false)}>
        <TouchableWithoutFeedback onPress={() => setShowScoreboard(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>🏆 Top 10 Scores</Text>
                  <TouchableOpacity onPress={() => setShowScoreboard(false)} style={styles.closeButton}>
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
  container: { flex: 1, backgroundColor: Colors.cream200 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.purple500, paddingVertical: Spacing.s4, paddingHorizontal: Spacing.s5,
    ...Shadows.s1,
  },
  backButton: { padding: 5 },
  stats: { flexDirection: 'row', gap: Spacing.s5 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statText: { color: Colors.onCoral, fontSize: FontSizes.label, fontFamily: Fonts.bodyBold },
  hintButton: { padding: 5 },

  previewContainer: {
    alignItems: 'center', padding: Spacing.s3, backgroundColor: 'rgba(255,255,255,0.9)',
    marginHorizontal: Spacing.s5, marginTop: Spacing.s3, borderRadius: Radii.card,
  },
  previewImage: { width: 150, height: 150, borderRadius: Radii.chip },

  instructionContainer: {
    backgroundColor: Colors.gold500, paddingVertical: Spacing.s4, paddingHorizontal: Spacing.s5,
    marginHorizontal: Spacing.s5, marginTop: Spacing.s3, borderRadius: Radii.card, alignItems: 'center',
  },
  instructionText: { fontSize: FontSizes.label, fontFamily: Fonts.bodyBold, color: Colors.ink, textAlign: 'center' },

  puzzleArea: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.s5 },
  puzzleBoard: { backgroundColor: Colors.paper, borderRadius: Radii.tile, ...Shadows.s3, overflow: 'hidden' },
  piecesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  puzzlePiece: { margin: 2, backgroundColor: Colors.slate, borderRadius: Radii.piece, overflow: 'hidden' },
  pieceImage: { position: 'absolute' },
  pieceBorder: { ...StyleSheet.absoluteFillObject, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)', borderRadius: Radii.piece },
  selectedPiece: { backgroundColor: Colors.gold500, transform: [{ scale: 1.05 }] },
  selectedBorder: { borderWidth: 4, borderColor: Colors.gold500 },
  selectionIndicator: { position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20, padding: 5 },

  completionOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  completionScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.s4, paddingVertical: 30 },
  completionCard: {
    backgroundColor: Colors.paper, borderRadius: Radii.hero, padding: Spacing.s5, alignItems: 'center',
    width: '95%', maxWidth: 350,
    shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
  },
  congratsText: {
    fontSize: 44, fontFamily: Fonts.display, color: Colors.coral600,
    textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0, marginTop: 4,
  },
  completionMessage: { fontSize: FontSizes.body, fontFamily: Fonts.heading, color: Colors.ink2, marginTop: Spacing.s1 },

  levelUnlockBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF8E1', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: Radii.card, marginTop: Spacing.s3,
  },
  levelUnlockText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.ink },
  progressText: { fontFamily: Fonts.body, fontSize: FontSizes.small, color: Colors.ink2, marginTop: Spacing.s2 },

  achievementsBanner: { marginTop: Spacing.s3, alignItems: 'center' },
  achievementsTitle: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.ink },
  achievementsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6, justifyContent: 'center' },
  achievementBadge: { backgroundColor: Colors.gold500, paddingVertical: 4, paddingHorizontal: 10, borderRadius: Radii.chip },
  achievementText: { fontFamily: Fonts.body, fontSize: FontSizes.small, color: Colors.paper, textTransform: 'capitalize' },

  scoreContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: Spacing.s4, marginBottom: Spacing.s4 },
  scoreItem: { alignItems: 'center', gap: 3 },
  scoreLabel: { fontSize: FontSizes.small, fontFamily: Fonts.body, color: Colors.ink2 },
  scoreValue: { fontSize: FontSizes.label, fontFamily: Fonts.bodyBold, color: Colors.ink },

  completionButtons: { width: '100%', gap: Spacing.s3 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: Radii.card, gap: Spacing.s2 },
  learnButton:      { backgroundColor: Colors.purple500 },
  scoreboardButton: { backgroundColor: Colors.gold500 },
  playAgainButton:  { backgroundColor: Colors.green500 },
  levelsButton:     { backgroundColor: Colors.purple500 },
  newPuzzleButton:  { backgroundColor: Colors.orange500 },
  homeButton:       { backgroundColor: Colors.blue500 },
  buttonText: { color: Colors.onCoral, fontSize: FontSizes.caption, fontFamily: Fonts.bodyBold },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: Spacing.s5 },
  modalContent: { backgroundColor: Colors.paper, borderRadius: Radii.hero, padding: Spacing.s5, width: '100%', maxWidth: 400, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.s5 },
  modalTitle: { fontSize: FontSizes.h3, fontFamily: Fonts.heading, color: Colors.ink },
  closeButton: { padding: 5 },
  modalScoreboardList: { maxHeight: 400 },
  modalScoreboardEntry: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.slate,
    padding: Spacing.s4, borderRadius: Radii.input, marginBottom: Spacing.s3,
  },
  modalScoreboardRank: { fontSize: FontSizes.label, fontFamily: Fonts.bodyBold, color: Colors.coral600, width: 45 },
  modalScoreboardDetails: { flex: 1 },
  modalScoreboardScore: { fontSize: FontSizes.body, fontFamily: Fonts.bodyBold, color: Colors.ink },
  modalScoreboardInfo: { fontSize: FontSizes.small, fontFamily: Fonts.body, color: Colors.ink2, marginTop: 3 },
});
