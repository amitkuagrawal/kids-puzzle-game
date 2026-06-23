import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView,
  Image, ActivityIndicator, Dimensions, Alert, Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Analytics } from '../../utils/analytics';
import { saveImageLocally, getLocalPuzzles, LocalPuzzle, getImageAsBase64 } from '../../utils/localStorage';
import { Colors, Fonts, FontSizes, Radii, Spacing, Shadows } from '../../constants/theme';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const TILE_SIZE   = (width - 48) / 2;

const LAND_THEME: Record<string, { bg: string; fg: string; icon: string; dark?: boolean }> = {
  'Animals':   { bg: '#C7F0CF', fg: '#2E8B57', icon: '🦒' },
  'Vehicles':  { bg: '#FFE3A8', fg: '#D77900', icon: '🚗' },
  'Space':     { bg: '#1B1742', fg: '#B66BFF', icon: '🚀', dark: true },
  'Letters':   { bg: '#FFD8B0', fg: '#C7541C', icon: '🔤' },
  'Numbers':   { bg: '#C9E2FF', fg: '#1F6FE0', icon: '🔢' },
  'Shapes':    { bg: '#FFD0E2', fg: '#C7378E', icon: '🔷' },
  'My Pictures':{ bg: '#FEEAC9', fg: '#C7541C', icon: '📱' },
};

const DEFAULT_THEME = { bg: '#FEEAC9', fg: '#C7541C', icon: '🧩' };

interface Puzzle { id: string; name: string; image_base64: string; created_at: string; }
interface CategoryData { category: string; icon: string; color: string; puzzles: Puzzle[]; }

export default function PuzzleGallery() {
  const router = useRouter();
  const [categories, setCategories]     = useState<CategoryData[]>([]);
  const [localPuzzles, setLocalPuzzles] = useState<LocalPuzzle[]>([]);
  const [loading, setLoading]           = useState(true);
  const [processing, setProcessing]     = useState(false);
  const [selectedCat, setSelectedCat]   = useState<CategoryData | null>(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/puzzles/preloaded`);
      const serverCats: CategoryData[] = await res.json();
      setCategories(serverCats.filter(c => c.category !== 'Uncategorized'));
      setLocalPuzzles(await getLocalPuzzles());
    } catch {
      try { setLocalPuzzles(await getLocalPuzzles()); } catch {}
    } finally { setLoading(false); }
  };

  const getImageUri = (d: string) => {
    if (!d) return '';
    if (d.startsWith('data:') || d.startsWith('file:')) return d;
    return `data:image/jpeg;base64,${d}`;
  };

  const selectPuzzle = async (puzzle: any, isLocal = false) => {
    try {
      let imageBase64 = '';
      if (isLocal) {
        imageBase64 = await getImageAsBase64(puzzle.imageUri || puzzle._localImageUri || puzzle.image_base64);
      } else {
        const raw = puzzle.image_base64;
        imageBase64 = raw.startsWith('data:') ? raw : `data:image/jpeg;base64,${raw}`;
      }
      if (!imageBase64) throw new Error();
      router.push({ pathname: '/child/difficulty-select', params: { puzzleId: puzzle.id, puzzleName: puzzle.name, imageBase64 } });
    } catch {
      Alert.alert('Oops!', 'Could not load this puzzle. Please try again!');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Please allow access to your photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 1 });
    if (!result.canceled && result.assets[0].uri) {
      try {
        setProcessing(true);
        const m = await ImageManipulator.manipulateAsync(result.assets[0].uri, [{ resize: { width: 800 } }], { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true });
        if (m.base64) {
          await saveImageLocally(m.base64, `My Puzzle ${new Date().toLocaleDateString()}`, 'My Pictures');
          Analytics.puzzleUploaded(m.base64.length);
          Alert.alert('Success!', 'Saved! Tap "My Pictures" to play.');
          setLocalPuzzles(await getLocalPuzzles());
        }
      } catch { Alert.alert('Oops!', 'Could not process image'); }
      finally { setProcessing(false); }
    }
  };

  const openMyPictures = () => setSelectedCat({
    category: 'My Pictures', icon: '📱', color: Colors.coral400,
    puzzles: localPuzzles.map(lp => ({ id: lp.id, name: lp.name, image_base64: lp.imageUri, created_at: lp.created_at, _localImageUri: lp.imageUri })) as any,
  });

  const theme = (cat: string) => LAND_THEME[cat] ?? DEFAULT_THEME;

  const renderLandTile = (cat: CategoryData) => {
    const t = theme(cat.category);
    return (
      <Pressable
        key={cat.category}
        onPress={() => setSelectedCat(cat)}
        style={({ pressed }) => [styles.tile, { backgroundColor: t.bg, transform: [{ translateY: pressed ? 2 : 0 }] }]}
      >
        <Text style={styles.tileIcon}>{t.icon}</Text>
        <Text style={[styles.tileName, { color: t.dark ? '#fff' : t.fg }]}>{cat.category}</Text>
        <Text style={[styles.tileCount, { color: t.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }]}>{cat.puzzles.length} puzzles</Text>
      </Pressable>
    );
  };

  const renderMyPicturesTile = () => {
    if (localPuzzles.length === 0) return null;
    const t = theme('My Pictures');
    return (
      <Pressable
        key="my-pictures"
        onPress={openMyPictures}
        style={({ pressed }) => [styles.tile, { backgroundColor: t.bg, transform: [{ translateY: pressed ? 2 : 0 }] }]}
      >
        <Text style={styles.tileIcon}>{t.icon}</Text>
        <Text style={[styles.tileName, { color: t.fg }]}>My Pictures</Text>
        <Text style={[styles.tileCount, { color: 'rgba(0,0,0,0.5)' }]}>{localPuzzles.length} puzzles</Text>
      </Pressable>
    );
  };

  const isLocal = selectedCat?.category === 'My Pictures';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={32} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Choose a Land</Text>
        <View style={{ width: 42 }} />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.coral600} />
          <Text style={styles.loadingText}>Loading puzzles...</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          {/* Land grid */}
          <View style={styles.grid}>
            {categories.map(renderLandTile)}
            {renderMyPicturesTile()}
          </View>

          {/* Empty state */}
          {categories.length === 0 && localPuzzles.length === 0 && (
            <View style={styles.empty}>
              <Text style={{ fontSize: 60 }}>🧩</Text>
              <Text style={styles.emptyText}>No puzzles yet!</Text>
              <Text style={styles.emptySubText}>Upload your first picture below</Text>
            </View>
          )}

          {/* Upload */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionLabel}>📸 Add Your Own Picture</Text>
            <Pressable
              style={({ pressed }) => [styles.uploadBtn, pressed && { opacity: 0.85 }]}
              onPress={pickImage}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="camera" size={28} color="#fff" />
                  <View>
                    <Text style={styles.uploadTitle}>Upload Picture</Text>
                    <Text style={styles.uploadSub}>Create your own puzzle!</Text>
                  </View>
                </>
              )}
            </Pressable>
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Category puzzle picker modal */}
      {selectedCat && (
        <Modal visible animationType="slide" onRequestClose={() => setSelectedCat(null)}>
          <SafeAreaView style={[styles.container, { backgroundColor: theme(selectedCat.category).bg }]} edges={['top']}>
            <View style={[styles.header, { backgroundColor: theme(selectedCat.category).fg }]}>
              <Pressable onPress={() => setSelectedCat(null)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={28} color="#fff" />
              </Pressable>
              <Text style={styles.headerTitle}>{selectedCat.category}</Text>
              <View style={{ width: 42 }} />
            </View>
            <ScrollView contentContainerStyle={styles.puzzleGrid}>
              {selectedCat.puzzles.map(p => (
                <Pressable
                  key={p.id}
                  style={({ pressed }) => [styles.puzzleCard, pressed && { opacity: 0.85 }]}
                  onPress={() => { setSelectedCat(null); selectPuzzle(p, isLocal); }}
                >
                  <Image source={{ uri: getImageUri(p.image_base64) }} style={styles.puzzleImage} resizeMode="cover" />
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FEEAC9' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.coral600, paddingVertical: Spacing.s5, paddingHorizontal: Spacing.s5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, elevation: 6,
  },
  backBtn: { padding: 5 },
  headerTitle: { fontFamily: Fonts.heading, fontSize: FontSizes.h2, color: '#fff' },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: Fonts.body, fontSize: FontSizes.label, color: Colors.coral600, marginTop: 16 },

  scroll: { padding: 16, paddingTop: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  tile: {
    width: TILE_SIZE,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 22,
    alignItems: 'center',
    gap: 6,
    shadowColor: 'rgba(0,0,0,0.12)',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
  },
  tileIcon: { fontSize: 44 },
  tileName: { fontFamily: Fonts.display, fontSize: 17, textAlign: 'center' },
  tileCount: { fontFamily: Fonts.body, fontSize: 12 },

  empty: { alignItems: 'center', padding: 50 },
  emptyText: { fontFamily: Fonts.heading, fontSize: FontSizes.h2, color: Colors.coral600, marginTop: 16 },
  emptySubText: { fontFamily: Fonts.body, fontSize: FontSizes.caption, color: Colors.coral400, marginTop: 8, textAlign: 'center' },

  uploadSection: { marginTop: 24 },
  sectionLabel: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.body, color: Colors.coral600, marginBottom: 10 },
  uploadBtn: {
    backgroundColor: Colors.coral600, borderRadius: Radii.card, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#C24747', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5,
  },
  uploadTitle: { fontFamily: Fonts.bodyBold, fontSize: FontSizes.body, color: '#fff' },
  uploadSub:   { fontFamily: Fonts.body, fontSize: FontSizes.small, color: '#fff', opacity: 0.9, marginTop: 2 },

  puzzleGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 16, justifyContent: 'space-between' },
  puzzleCard: {
    width: TILE_SIZE, height: TILE_SIZE, borderRadius: Radii.card, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 0, elevation: 4,
    backgroundColor: '#fff',
  },
  puzzleImage: { width: '100%', height: '100%' },
});
