import React from 'react';
import { View, Text } from 'react-native';

export default function Stars({ count = 3, total = 3, size = 22 }: { count?: number; total?: number; size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {Array.from({ length: total }).map((_, i) => (
        <Text key={i} style={{ color: i < count ? '#FFD700' : '#E6DCC8', fontSize: size, lineHeight: size * 1.2 }}>★</Text>
      ))}
    </View>
  );
}
