import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const COLORS = ['#FF5BA8', '#FFC93C', '#6FC8FF', '#4CD964', '#B66BFF', '#FF7A45'];

function ConfettiPiece({ color, left, delay, duration, rotate, size }: any) {
  const y = useRef(new Animated.Value(-20)).current;
  const op = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(y,  { toValue: height + 40, duration, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0, duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={{
      position: 'absolute',
      left: left * width / 100,
      top: 0,
      width: size,
      height: size * 1.5,
      backgroundColor: color,
      transform: [{ translateY: y }, { rotate: `${rotate}deg` }],
      opacity: op,
    }} />
  );
}

export default function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: COLORS[i % 6],
    left: Math.random() * 100,
    delay: Math.random() * 500,
    duration: 2000 + Math.random() * 2000,
    rotate: Math.random() * 360,
    size: 6 + Math.random() * 8,
  }));

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {pieces.map(p => <ConfettiPiece key={p.id} {...p} />)}
    </View>
  );
}
