import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../../constants/theme';
import Pip from '../../components/Pip';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface StructuredFact { label: string; value: string; }
interface Learn { structured: StructuredFact[]; shortText: string; detailText: string; emoji?: string | null; }
interface Item { id: string; name: string; image_base64: string; learn: Learn | null; }

export default function LearnScreen() {
  const router = useRouter();
  const { puzzleId, puzzleName, imageBase64 } = useLocalSearchParams();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailed, setDetailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BACKEND_URL}/api/items/${puzzleId}`);
        if (r.ok) setItem(await r.json());
      } catch {}
      finally { setLoading(false); }
    })();
  }, [puzzleId]);

  const img = (imageBase64 as string) || item?.image_base64 || '';
  const name = (puzzleName as string) || item?.name || '';
  const learn = item?.learn;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={Colors.coral600} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Did you know?</Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {!!img && <Image source={{ uri: img }} style={styles.hero} resizeMode="cover" />}
          <Text style={styles.name}>{learn?.emoji ? `${learn.emoji} ` : ''}{name}</Text>
        </View>

        {learn ? (
          <>
            <View style={styles.toggleRow}>
              <Pressable onPress={() => setDetailed(false)} style={[styles.pill, !detailed && styles.pillOn]}>
                <Text style={[styles.pillText, !detailed && styles.pillTextOn]}>Quick</Text>
              </Pressable>
              <Pressable onPress={() => setDetailed(true)} style={[styles.pill, detailed && styles.pillOn]}>
                <Text style={[styles.pillText, detailed && styles.pillTextOn]}>Tell me more</Text>
              </Pressable>
            </View>

            <View style={styles.card}>
              <Text style={styles.body}>{detailed ? learn.detailText : learn.shortText}</Text>
            </View>

            {learn.structured.length > 0 && (
              <View style={styles.facts}>
                {learn.structured.map((f, i) => (
                  <View key={i} style={styles.factChip}>
                    <Text style={styles.factLabel}>{f.label}</Text>
                    <Text style={styles.factValue}>{f.value}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.pipRow}>
              <Pip size={70} mood="happy" hat="none" />
              <View style={styles.pipBubble}>
                <Text style={styles.pipText}>You learned about {name}! 🎉</Text>
              </View>
            </View>
          </>
        ) : (
          <Text style={styles.noLearn}>Great solving! 🎉</Text>
        )}

        <Pressable style={styles.nextBtn} onPress={() => router.back()}>
          <Text style={styles.nextText}>Back to puzzles</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream300 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.coral600, paddingVertical: Spacing.s4, paddingHorizontal: Spacing.s5, ...Shadows.s1,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.h3, color: '#fff' },
  scroll: { padding: Spacing.s5, alignItems: 'center' },
  heroWrap: { alignItems: 'center', marginBottom: Spacing.s4 },
  hero: { width: 160, height: 160, borderRadius: Radii.card, ...Shadows.s2 },
  name: { fontFamily: Fonts.display, fontSize: FontSizes.h1, color: Colors.coral600, marginTop: Spacing.s3 },
  toggleRow: { flexDirection: 'row', gap: Spacing.s2, marginBottom: Spacing.s4 },
  pill: { paddingVertical: Spacing.s2, paddingHorizontal: Spacing.s5, borderRadius: Radii.hero, backgroundColor: Colors.paper, ...Shadows.s1 },
  pillOn: { backgroundColor: Colors.coral600 },
  pillText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.ink2 },
  pillTextOn: { color: '#fff' },
  card: { backgroundColor: Colors.paper, borderRadius: Radii.card, padding: Spacing.s5, width: '100%', ...Shadows.s1 },
  body: { fontFamily: Fonts.body, fontSize: FontSizes.body, color: Colors.ink, lineHeight: 26 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.s2, marginTop: Spacing.s4, width: '100%' },
  factChip: { backgroundColor: Colors.cream200, borderRadius: Radii.chip, paddingVertical: Spacing.s2, paddingHorizontal: Spacing.s3 },
  factLabel: { fontFamily: Fonts.body, fontSize: FontSizes.small, color: Colors.ink2 },
  factValue: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.ink },
  pipRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.s3, marginTop: Spacing.s5, width: '100%' },
  pipBubble: { flex: 1, backgroundColor: Colors.paper, borderRadius: Radii.card, padding: Spacing.s4, ...Shadows.s1 },
  pipText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.caption, color: Colors.coral600 },
  noLearn: { fontFamily: Fonts.heading, fontSize: FontSizes.h2, color: Colors.coral600, marginVertical: Spacing.s7 },
  nextBtn: { backgroundColor: Colors.green500, borderRadius: Radii.card, paddingVertical: Spacing.s4, paddingHorizontal: Spacing.s7, marginTop: Spacing.s6, ...Shadows.s2 },
  nextText: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.body, color: '#fff' },
});
