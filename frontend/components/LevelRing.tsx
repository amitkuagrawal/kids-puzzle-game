import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Fonts } from '../constants/theme';

export default function LevelRing({ level = 1, fill = 0.65, size = 50 }: { level?: number; fill?: number; size?: number }) {
  const r = size / 2 - 4;
  const circumference = 2 * Math.PI * r;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg viewBox={`0 0 ${size} ${size}`} style={StyleSheet.absoluteFillObject}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#EEE9FF" strokeWidth={5} fill="#fff" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke="#6E5BFF" strokeWidth={5} fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fill)}
          strokeLinecap="round"
          rotation={-90} originX={size / 2} originY={size / 2}
        />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontFamily: Fonts.display, fontSize: 17, color: '#6E5BFF' }}>{level}</Text>
      </View>
    </View>
  );
}
