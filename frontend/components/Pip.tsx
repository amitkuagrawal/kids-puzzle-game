import React from 'react';
import Svg, { Path, Circle, Ellipse, G, Rect, Defs, Filter, FeDropShadow } from 'react-native-svg';

type Mood = 'happy' | 'wow' | 'wink' | 'party';
type Hat  = 'none' | 'top' | 'crown' | 'party';

interface PipProps {
  size?: number;
  mood?: Mood;
  hat?:  Hat;
}

export default function Pip({ size = 120, mood = 'happy', hat = 'none' }: PipProps) {
  const blink = mood === 'wink';
  const wow   = mood === 'wow' || mood === 'party';
  const h = size * (160 / 140);

  return (
    <Svg viewBox="0 0 140 160" width={size} height={h}>
      <Defs>
        <Filter id="pipShadow" x="-20%" y="-20%" width="140%" height="140%">
          <FeDropShadow dx="0" dy="4" stdDeviation="3" floodOpacity={0.25} />
        </Filter>
      </Defs>

      {/* Body */}
      <G filter="url(#pipShadow)">
        <Path
          fill="#6FC8FF"
          stroke="#2A8AD9"
          strokeWidth={4}
          strokeLinejoin="round"
          d="M30 38 h32 a8 8 0 0 1 8 -8 a12 12 0 0 1 12 12 a8 8 0 0 1 -8 8 h28 v32 a8 8 0 0 1 8 8 a12 12 0 0 1 -12 12 a8 8 0 0 1 -8 -8 v28 h-32 a8 8 0 0 1 -8 8 a12 12 0 0 1 -12 -12 a8 8 0 0 1 8 -8 h-16 z"
        />

        {/* Eyes */}
        {blink ? (
          <>
            <Path d="M50 70 q8 -6 16 0" stroke="#1A1A2E" strokeWidth={4} fill="none" strokeLinecap="round" />
            <Circle cx={92} cy={70} r={9} fill="#fff" />
            <Circle cx={92} cy={72} r={5} fill="#1A1A2E" />
          </>
        ) : (
          <>
            <Ellipse cx={58} cy={70} rx={9} ry={wow ? 11 : 9} fill="#fff" />
            <Ellipse cx={58} cy={wow ? 73 : 72} rx={5} ry={wow ? 7 : 5} fill="#1A1A2E" />
            <Circle cx={60} cy={69} r={2} fill="#fff" />
            <Ellipse cx={92} cy={70} rx={9} ry={wow ? 11 : 9} fill="#fff" />
            <Ellipse cx={92} cy={wow ? 73 : 72} rx={5} ry={wow ? 7 : 5} fill="#1A1A2E" />
            <Circle cx={94} cy={69} r={2} fill="#fff" />
          </>
        )}

        {/* Mouth */}
        {wow
          ? <Ellipse cx={75} cy={92} rx={8} ry={9} fill="#1A1A2E" />
          : <Path d="M62 88 Q75 102 88 88" stroke="#1A1A2E" strokeWidth={4} fill="none" strokeLinecap="round" />
        }

        {/* Blush */}
        <Ellipse cx={48} cy={90} rx={6} ry={3} fill="#FF8FB1" fillOpacity={0.75} />
        <Ellipse cx={102} cy={90} rx={6} ry={3} fill="#FF8FB1" fillOpacity={0.75} />
      </G>

      {/* Hats */}
      {hat === 'top' && (
        <G transform="translate(50 -8)">
          <Rect x={2} y={20} width={40} height={6} fill="#1A1A2E" rx={2} />
          <Rect x={8} y={-8} width={28} height={30} fill="#1A1A2E" rx={2} />
          <Rect x={6} y={14} width={32} height={6} fill="#FF5BA8" />
        </G>
      )}
      {hat === 'crown' && (
        <G transform="translate(42 -2)">
          <Path d="M0 22 L8 4 L18 18 L28 2 L38 16 L48 4 L56 22 Z" fill="#FFC93C" stroke="#E59E00" strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={8}  cy={4} r={3} fill="#FF5BA8" />
          <Circle cx={28} cy={2} r={3} fill="#6FC8FF" />
          <Circle cx={48} cy={4} r={3} fill="#4CD964" />
        </G>
      )}
      {hat === 'party' && (
        <G transform="translate(48 -10)">
          <Path d="M0 30 L22 -10 L44 30 Z" fill="#FF5BA8" stroke="#C7378E" strokeWidth={2} strokeLinejoin="round" />
          <Circle cx={22} cy={-10} r={5} fill="#FFD700" />
          <Circle cx={10} cy={15} r={3} fill="#fff" />
          <Circle cx={34} cy={15} r={3} fill="#fff" />
        </G>
      )}
    </Svg>
  );
}
