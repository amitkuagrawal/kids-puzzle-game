import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Analytics } from '../utils/analytics';
import { getUserProfile } from '../services/firebase-service';
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../constants/theme';

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
        // No profile exists, go to welcome screen first
        router.push('/child/welcome');
      } else {
        // Profile exists, go directly to play/join choice
        router.push('/child/join-group');
      }
    } catch {
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
        <Ionicons name="star" size={30} color={Colors.gold500} style={styles.star1} />
        <Ionicons name="star" size={25} color={Colors.pink400} style={styles.star2} />
        <Ionicons name="star" size={35} color={Colors.sky300} style={styles.star3} />
      </View>

      {/* Title */}
      <View style={styles.titleContainer}>
        <Ionicons name="extension-puzzle" size={60} color={Colors.coral600} />
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
            <Ionicons name="image" size={32} color={Colors.green500} />
          </Animated.View>
          <Animated.View style={[styles.puzzlePiece, styles.piece2, piece2Style]}>
            <Ionicons name="image" size={32} color={Colors.blue500} />
          </Animated.View>
          <Animated.View style={[styles.puzzlePiece, styles.piece3, piece3Style]}>
            <Ionicons name="image" size={32} color={Colors.orange500} />
          </Animated.View>
          <Animated.View style={[styles.puzzlePiece, styles.piece4, piece4Style]}>
            <Ionicons name="image" size={32} color={Colors.purple500} />
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
          <Ionicons name="game-controller" size={40} color={Colors.onCoral} />
          <Text style={styles.buttonText}>
            {isLoading ? 'Loading...' : 'Play Puzzle!'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.parentButton]}
          onPress={() => router.push('/parent/dashboard')}
          activeOpacity={0.8}
        >
          <Ionicons name="people" size={32} color={Colors.onCoral} />
          <Text style={styles.buttonTextSmall}>Parent Dashboard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.coral200,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.s5,
    paddingHorizontal: Spacing.s5,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.s5,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 42,
    fontWeight: 'bold',
    color: Colors.coral600,
    marginTop: Spacing.s3,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontFamily: Fonts.body,
    fontSize: FontSizes.body,
    color: Colors.coral600,
    marginTop: Spacing.s1,
    fontWeight: '600',
  },
  puzzleDemo: {
    alignItems: 'center',
    marginBottom: Spacing.s5,
    paddingHorizontal: Spacing.s5,
  },
  demoText: {
    fontFamily: Fonts.bodyBold,
    fontSize: FontSizes.caption,
    color: Colors.coral600,
    fontWeight: 'bold',
    marginVertical: 6,
  },
  tapHint: {
    fontFamily: Fonts.body,
    fontSize: 12,
    color: Colors.coral600,
    fontWeight: '600',
    marginTop: 3,
    opacity: 0.8,
  },
  puzzleContainer: {
    width: 120,
    height: 120,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  puzzlePiece: {
    position: 'absolute',
    width: 50,
    height: 50,
    backgroundColor: Colors.cream300,
    borderRadius: Radii.chip,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.s2,
  },
  piece1: {
    top: Spacing.s3,
    left: Spacing.s3,
  },
  piece2: {
    top: Spacing.s3,
    right: Spacing.s3,
  },
  piece3: {
    bottom: Spacing.s3,
    left: Spacing.s3,
  },
  piece4: {
    bottom: Spacing.s3,
    right: Spacing.s3,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.s3,
  },
  button: {
    width: width * 0.8,
    height: 100,
    borderRadius: Radii.tile,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.s3,
  },
  childButton: {
    backgroundColor: Colors.coral600,
  },
  parentButton: {
    backgroundColor: '#6A1B9A',
    height: 80,
  },
  adminButton: {
    backgroundColor: Colors.coral400,
    height: 80,
  },
  buttonText: {
    fontFamily: Fonts.display,
    fontSize: FontSizes.h2,
    fontWeight: 'bold',
    color: Colors.onCoral,
    marginTop: Spacing.s2,
  },
  buttonTextSmall: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.body,
    fontWeight: 'bold',
    color: Colors.onCoral,
    marginTop: Spacing.s1,
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
    right: Spacing.s7,
  },
  star3: {
    position: 'absolute',
    bottom: 150,
    left: 50,
  },
});
