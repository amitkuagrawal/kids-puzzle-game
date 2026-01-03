import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Analytics } from '../utils/analytics';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  
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
        <Ionicons name="game-controller" size={80} color="#FFD700" />
        <Text style={styles.title}>Puzzle Fun!</Text>
        <Text style={styles.subtitle}>For Kids 5-8 Years</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.childButton]}
          onPress={() => router.push('/child/puzzle-gallery')}
          activeOpacity={0.8}
        >
          <Ionicons name="game-controller" size={50} color="white" />
          <Text style={styles.buttonText}>Play Puzzle!</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A4C93',
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
    color: '#FFD700',
    marginTop: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
  },
  subtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    marginTop: 10,
    fontWeight: '600',
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
    backgroundColor: '#FF6B6B',
  },
  adminButton: {
    backgroundColor: '#4ECDC4',
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
