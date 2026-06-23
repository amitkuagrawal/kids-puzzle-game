import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Analytics } from '../utils/analytics';
import { getUserProfile } from '../services/firebase-service';
import { Colors, Fonts, FontSizes, Spacing } from '../constants/theme';
import Pip from '../components/Pip';
import CoinChip from '../components/CoinChip';
import LevelRing from '../components/LevelRing';

const { width } = Dimensions.get('window');

const FLOATERS = ['⭐', '✨', '💫', '🌟'];

export default function Index() {
  const router = useRouter();
  const [coins] = useState(120);
  const [level] = useState(3);
  const [pressed, setPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Bobbing animation for Pip
  const bob = useRef(new Animated.Value(0)).current;
  // Float animations for decorative stars
  const floatAnims = useRef(FLOATERS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Analytics.appOpened();
    Analytics.sessionStart();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -10, duration: 1200, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0,   duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    floatAnims.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1,  duration: 1400 + i * 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: -1, duration: 1400 + i * 300, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const goPlay = async () => {
    try {
      setIsLoading(true);
      const userProfile = await getUserProfile();
      if (!userProfile) {
        router.push('/child/welcome');
      } else {
        router.push('/child/join-group');
      }
    } catch {
      router.push('/child/welcome');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFB3D9', '#FFD86F', '#A8E6FF']}
      locations={[0, 0.6, 1]}
      style={styles.container}
    >
      {/* Floating decorative emojis */}
      {FLOATERS.map((emoji, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.floater,
            floaterPositions[i],
            { transform: [{ translateX: floatAnims[i].interpolate({ inputRange: [-1, 1], outputRange: [-6, 6] }) }] },
          ]}
        >
          {emoji}
        </Animated.Text>
      ))}

      {/* Top row: level + coins */}
      <View style={styles.topRow}>
        <LevelRing level={level} fill={0.65} size={50} />
        <CoinChip value={coins} big />
      </View>

      {/* Pip mascot */}
      <Animated.View style={[styles.pipWrap, { transform: [{ translateY: bob }] }]}>
        <Pip size={150} mood="happy" hat="none" />
      </Animated.View>

      {/* Speech bubble */}
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>Hi! I'm Pip 👋</Text>
        <View style={styles.bubbleTip} />
      </View>

      {/* Title */}
      <View style={styles.titleWrap}>
        <Text style={styles.title}>Puzzle Fun!</Text>
        <Text style={styles.tagline}>Pick a land and play 🌟</Text>
      </View>

      {/* 3D Play button */}
      <Pressable
        onPressIn={() => setPressed(true)}
        onPressOut={() => { setPressed(false); goPlay(); }}
        style={[styles.playBtn, pressed && styles.playBtnPressed]}
        disabled={isLoading}
      >
        <Text style={styles.playBtnText}>
          {isLoading ? '⏳ Loading...' : '🎮 Play Puzzle!'}
        </Text>
      </Pressable>

      {/* Mini card row */}
      <View style={styles.miniRow}>
        <Pressable style={styles.miniCard} onPress={goPlay}>
          <Text style={styles.miniCardText}>🛍️ Shop</Text>
        </Pressable>
        <Pressable style={styles.miniCard} onPress={() => router.push('/parent/dashboard')}>
          <Text style={styles.miniCardText}>👨‍👩‍👧 Parents</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const floaterPositions: any[] = [
  { position: 'absolute', top: 80,  left: 24,  fontSize: 22 },
  { position: 'absolute', top: 130, right: 30, fontSize: 18 },
  { position: 'absolute', top: 200, left: 50,  fontSize: 16 },
  { position: 'absolute', top: 60,  right: 60, fontSize: 20 },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  floater: {
    pointerEvents: 'none',
  },

  topRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.s5,
  },

  pipWrap: {
    marginTop: Spacing.s5,
  },

  bubble: {
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginTop: -12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 3,
  },
  bubbleTip: {
    position: 'absolute',
    top: -8,
    left: 24,
    width: 16,
    height: 16,
    backgroundColor: '#fff',
    transform: [{ rotate: '45deg' }],
    zIndex: -1,
  },
  bubbleText: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.body,
    color: '#2A8AD9',
  },

  titleWrap: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 22,
  },
  title: {
    fontFamily: Fonts.display,
    fontSize: 38,
    color: Colors.coral600,
    textShadowColor: 'rgba(0,0,0,0.12)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
    letterSpacing: -0.5,
  },
  tagline: {
    fontFamily: Fonts.heading,
    fontSize: FontSizes.small,
    color: '#A14040',
    marginTop: 2,
  },

  playBtn: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 26,
    backgroundColor: '#FD7979',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C24747',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
    transform: [{ translateY: 0 }],
  },
  playBtnPressed: {
    transform: [{ translateY: 3 }],
    shadowOffset: { width: 0, height: 3 },
  },
  playBtnText: {
    fontFamily: Fonts.display,
    fontSize: 26,
    color: '#fff',
  },

  miniRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 0,
    elevation: 4,
  },
  miniCardText: {
    fontFamily: Fonts.display,
    fontSize: 16,
    color: '#6E5BFF',
  },
});
