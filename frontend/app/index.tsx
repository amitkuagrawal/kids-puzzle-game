import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Analytics } from '../utils/analytics';
import { getUserProfile } from '../services/firebase-service';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Animation refs for puzzle pieces
  const piece1Anim = useRef(new Animated.Value(0)).current;
  const piece2Anim = useRef(new Animated.Value(0)).current;
  const piece3Anim = useRef(new Animated.Value(0)).current;
  const piece4Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Track app opened
    Analytics.appOpened();
    Analytics.sessionStart();

    // Start puzzle assembly animation
    startPuzzleAnimation();
  }, []);

  const handlePlayPuzzle = async () => {
    try {
      setIsLoading(true);

      // Check if user profile exists
      const userProfile = await getUserProfile();

      if (!userProfile) {
        // No profile exists, go to welcome screen
        router.push('/child/welcome');
      } else {
        // Profile exists, go directly to level select
        router.push('/child/level-select');
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      // On error, go to welcome screen to be safe
      router.push('/child/welcome');
    } finally {
      setIsLoading(false);
    }
  };

  const startPuzzleAnimation = () => {
    // Animate puzzle pieces coming together
    Animated.loop(
      Animated.sequence([
        // Pieces fly in from corners
        Animated.parallel([
          Animated.timing(piece1Anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(piece2Anim, {
            toValue: 1,
            duration: 800,
            delay: 100,
            useNativeDriver: true,
          }),
          Animated.timing(piece3Anim, {
            toValue: 1,
            duration: 800,
            delay: 200,
            useNativeDriver: true,
          }),
          Animated.timing(piece4Anim, {
            toValue: 1,
            duration: 800,
            delay: 300,
            useNativeDriver: true,
          }),
        ]),
        // Pulse when complete
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Wait before resetting
        Animated.delay(1500),
        // Reset pieces
        Animated.parallel([
          Animated.timing(piece1Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(piece2Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(piece3Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(piece4Anim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.delay(500),
      ])
    ).start();
  };

  // Calculate puzzle piece positions
  const piece1Style = {
    transform: [
      {
        translateX: piece1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 0],
        }),
      },
      {
        translateY: piece1Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 0],
        }),
      },
      { scale: pulseAnim },
    ],
    opacity: piece1Anim,
  };

  const piece2Style = {
    transform: [
      {
        translateX: piece2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        }),
      },
      {
        translateY: piece2Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 0],
        }),
      },
      { scale: pulseAnim },
    ],
    opacity: piece2Anim,
  };

  const piece3Style = {
    transform: [
      {
        translateX: piece3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-60, 0],
        }),
      },
      {
        translateY: piece3Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        }),
      },
      { scale: pulseAnim },
    ],
    opacity: piece3Anim,
  };

  const piece4Style = {
    transform: [
      {
        translateX: piece4Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        }),
      },
      {
        translateY: piece4Anim.interpolate({
          inputRange: [0, 1],
          outputRange: [60, 0],
        }),
      },
      { scale: pulseAnim },
    ],
    opacity: piece4Anim,
  };

  return (
    <View style={styles.container}>
      {/* Decorative elements - moved to background with pointerEvents in styles */}
      <View style={styles.decoration}>
        <Ionicons name="star" size={30} color="#FFD700" style={styles.star1} />
        <Ionicons name="star" size={25} color="#FF69B4" style={styles.star2} />
        <Ionicons name="star" size={35} color="#87CEEB" style={styles.star3} />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Ionicons name="extension-puzzle" size={80} color="#FD7979" />
        <Text style={styles.title}>Puzzle Fun!</Text>
        <Text style={styles.subtitle}>For Kids 5-8 Years</Text>
      </View>

      {/* Animated Puzzle Demo - Clickable */}
      <TouchableOpacity
        style={styles.puzzleDemo}
        onPress={handlePlayPuzzle}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        <Text style={styles.demoText}>📸 Upload Your Fav Picture!</Text>
        <View style={styles.puzzleContainer}>
          <Animated.View style={[styles.puzzlePiece, styles.piece1, piece1Style]}>
            <Ionicons name="image" size={40} color="#4CAF50" />
          </Animated.View>
          <Animated.View style={[styles.puzzlePiece, styles.piece2, piece2Style]}>
            <Ionicons name="image" size={40} color="#2196F3" />
          </Animated.View>
          <Animated.View style={[styles.puzzlePiece, styles.piece3, piece3Style]}>
            <Ionicons name="image" size={40} color="#FF9800" />
          </Animated.View>
          <Animated.View style={[styles.puzzlePiece, styles.piece4, piece4Style]}>
            <Ionicons name="image" size={40} color="#9C27B0" />
          </Animated.View>
        </View>
        <Text style={styles.demoText}>🧩 Solve the Puzzle!</Text>
        <Text style={styles.tapHint}>Tap to start!</Text>
      </TouchableOpacity>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.childButton]}
          onPress={handlePlayPuzzle}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          <Ionicons name="game-controller" size={50} color="white" />
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Play Puzzle!'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.parentButton]}
          onPress={() => router.push('/parent/dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={40} color="white" />
          <Text style={styles.buttonTextSmall}>Parent Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFCDC9',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  title: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#FD7979',
    marginTop: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 20,
    color: '#FD7979',
    marginTop: 10,
    fontWeight: '600',
  },
  puzzleDemo: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  demoText: {
    fontSize: 18,
    color: '#FD7979',
    fontWeight: 'bold',
    marginVertical: 10,
  },
  tapHint: {
    fontSize: 14,
    color: '#FD7979',
    fontWeight: '600',
    marginTop: 5,
    opacity: 0.8,
  },
  puzzleContainer: {
    width: 140,
    height: 140,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  puzzlePiece: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: '#FEEAC9',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  piece1: {
    top: 10,
    left: 10,
  },
  piece2: {
    top: 10,
    right: 10,
  },
  piece3: {
    bottom: 10,
    left: 10,
  },
  piece4: {
    bottom: 10,
    right: 10,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: 20,
  },
  button: {
    width: width * 0.8,
    height: 130,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  childButton: {
    backgroundColor: '#FD7979',
  },
  parentButton: {
    backgroundColor: '#6A1B9A',
    height: 100,
  },
  adminButton: {
    backgroundColor: '#FDACAC',
    height: 100,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  buttonTextSmall: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 5,
  },
  decoration: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  star1: {
    position: 'absolute',
    top: 100,
    left: 30,
  },
  star2: {
    position: 'absolute',
    top: 150,
    right: 40,
  },
  star3: {
    position: 'absolute',
    bottom: 150,
    left: 50,
  },
});
