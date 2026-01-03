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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const { puzzleId, puzzleName, imageBase64, difficulty, pieces } = params;
  
  const numPieces = parseInt(pieces as string);
  const cols = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 3 : 4;
  const rows = Math.ceil(numPieces / cols);
  
  const [puzzlePieces, setPuzzlePieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [moves, setMoves] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [topScores, setTopScores] = useState<ScoreEntry[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializePuzzle();
    startTimer();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
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
      
      // Save score and fetch top scores
      const finalScore = calculateScore();
      await saveScore(finalScore);
      await fetchTopScores();
      
      playCelebration();
    }
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
    } catch (error) {
      console.error('Error saving score:', error);
    }
  };

  const fetchTopScores = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/scores/${puzzleId}/${difficulty}`);
      const data = await response.json();
      setTopScores(data);
    } catch (error) {
      console.error('Error fetching scores:', error);
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
            <Ionicons name="hand-left" size={30} color="#FFD700" />
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
        
        <TouchableOpacity 
          onPress={() => setShowPreview(!showPreview)}
          style={styles.hintButton}
        >
          <Ionicons name={showPreview ? "eye-off" : "eye"} size={28} color="white" />
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
          <View style={styles.completionCard}>
            <Ionicons name="trophy" size={100} color="#FFD700" />
            <Text style={styles.congratsText}>Amazing!</Text>
            <Text style={styles.completionMessage}>You did it!</Text>
            
            <View style={styles.scoreContainer}>
              <View style={styles.scoreItem}>
                <Ionicons name="time" size={30} color="#4CAF50" />
                <Text style={styles.scoreLabel}>Time</Text>
                <Text style={styles.scoreValue}>{formatTime(timer)}</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="swap-horizontal" size={30} color="#2196F3" />
                <Text style={styles.scoreLabel}>Moves</Text>
                <Text style={styles.scoreValue}>{moves}</Text>
              </View>
              
              <View style={styles.scoreItem}>
                <Ionicons name="star" size={30} color="#FFD700" />
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreValue}>{calculateScore()}</Text>
              </View>
            </View>

            {/* Top 10 Scoreboard */}
            {topScores.length > 0 && (
              <View style={styles.scoreboardContainer}>
                <Text style={styles.scoreboardTitle}>🏆 Top 10 Scores</Text>
                <ScrollView style={styles.scoreboardList} nestedScrollEnabled={true}>
                  {topScores.map((entry, index) => (
                    <View key={entry.id} style={styles.scoreboardEntry}>
                      <Text style={styles.scoreboardRank}>#{index + 1}</Text>
                      <View style={styles.scoreboardDetails}>
                        <Text style={styles.scoreboardScore}>{entry.score} pts</Text>
                        <Text style={styles.scoreboardInfo}>
                          {formatTime(entry.time_seconds)} • {entry.moves} moves
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
            
            <View style={styles.completionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.playAgainButton]}
                onPress={() => {
                  setIsComplete(false);
                  setTimer(0);
                  setMoves(0);
                  initializePuzzle();
                  startTimer();
                  confettiAnim.setValue(0);
                }}
              >
                <Ionicons name="refresh" size={30} color="white" />
                <Text style={styles.buttonText}>Play Again</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.newPuzzleButton]}
                onPress={() => router.push('/child/puzzle-gallery')}
              >
                <Ionicons name="grid" size={30} color="white" />
                <Text style={styles.buttonText}>New Puzzle</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={() => router.push('/')}
              >
                <Ionicons name="home" size={30} color="white" />
                <Text style={styles.buttonText}>Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9C4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#9C27B0',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  backButton: {
    padding: 5,
  },
  stats: {
    flexDirection: 'row',
    gap: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  hintButton: {
    padding: 5,
  },
  previewContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
  },
  previewImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
  },
  instructionContainer: {
    backgroundColor: '#FFD700',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 15,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  puzzleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  puzzleBoard: {
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    overflow: 'hidden',
  },
  piecesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  puzzlePiece: {
    margin: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  pieceImage: {
    position: 'absolute',
  },
  pieceBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 5,
  },
  selectedPiece: {
    backgroundColor: '#FFD700',
    transform: [{ scale: 1.05 }],
  },
  selectedBorder: {
    borderWidth: 4,
    borderColor: '#FFD700',
  },
  selectionIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 5,
  },
  completionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  completionCard: {
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  congratsText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 20,
  },
  completionMessage: {
    fontSize: 28,
    color: '#666',
    marginTop: 10,
    fontWeight: '600',
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
    marginBottom: 20,
  },
  scoreItem: {
    alignItems: 'center',
    gap: 5,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreboardContainer: {
    width: '100%',
    marginTop: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 15,
    maxHeight: 250,
  },
  scoreboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  scoreboardList: {
    maxHeight: 200,
  },
  scoreboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  scoreboardRank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B6B',
    width: 40,
  },
  scoreboardDetails: {
    flex: 1,
  },
  scoreboardScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreboardInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  completionButtons: {
    width: '100%',
    gap: 15,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 10,
  },
  playAgainButton: {
    backgroundColor: '#4CAF50',
  },
  newPuzzleButton: {
    backgroundColor: '#FF9800',
  },
  homeButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
});
