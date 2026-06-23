import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Fonts } from '../constants/theme';

export default function CoinChip({ value, big = false }: { value: number; big?: boolean }) {
  const coinSize = big ? 32 : 26;
  const fontSize = big ? 16 : 13;
  const valueSize = big ? 22 : 18;

  return (
    <View style={[styles.chip, big && styles.chipBig]}>
      <View style={[styles.coin, { width: coinSize, height: coinSize }]}>
        <Text style={[styles.coinText, { fontSize }]}>¢</Text>
      </View>
      <Text style={[styles.value, { fontSize: valueSize }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#fff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 4,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  chipBig: {
    paddingVertical: 8,
    paddingRight: 16,
  },
  coin: {
    borderRadius: 999,
    backgroundColor: '#FFC93C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinText: {
    fontFamily: Fonts.display,
    color: '#8A5A00',
  },
  value: {
    fontFamily: Fonts.display,
    color: '#333',
  },
});
