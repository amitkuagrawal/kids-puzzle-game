import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();

  return (
    <View style={styles.container}>
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

        <TouchableOpacity 
          style={[styles.button, styles.adminButton]}
          onPress={() => router.push('/admin/manage')}
          activeOpacity={0.8}
        >
          <Ionicons name="settings" size={40} color="white" />
          <Text style={styles.buttonTextSmall}>Admin Panel</Text>
        </TouchableOpacity>
      </View>

      {/* Decorative elements */}
      <View style={styles.decoration}>
        <Ionicons name="star" size={30} color="#FFD700" style={styles.star1} />
        <Ionicons name="star" size={25} color="#FF69B4" style={styles.star2} />
        <Ionicons name="star" size={35} color="#87CEEB" style={styles.star3} />
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
    paddingVertical: 30,
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
    paddingVertical: 20,
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
