import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createUserProfile, updateStreak } from '../../services/firebase-service';

export default function Welcome() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      Alert.alert('Oops!', 'Please enter your name!');
      return;
    }

    if (trimmedName.length < 2) {
      Alert.alert('Oops!', 'Please enter at least 2 letters!');
      return;
    }

    // Only allow first name (no spaces)
    if (trimmedName.includes(' ')) {
      Alert.alert('First Name Only', 'Please enter just your first name (no spaces)!');
      return;
    }

    setLoading(true);

    try {
      // Create user profile
      await createUserProfile(trimmedName);

      // Initialize streak
      await updateStreak();

      // Navigate to group join screen
      router.replace('/child/join-group');
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert(
        'Error',
        'Could not create your profile. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Welcome Animation */}
        <View style={styles.welcomeContainer}>
          <Ionicons name="hand-right" size={80} color="#FFD700" />
          <Text style={styles.welcomeTitle}>Welcome!</Text>
          <Text style={styles.welcomeText}>Let's get started with puzzles!</Text>
        </View>

        {/* Name Input Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>What's your first name?</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name..."
            value={name}
            onChangeText={setName}
            maxLength={20}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus={true}
          />

          <TouchableOpacity
            style={[styles.continueButton, loading && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.continueButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={24} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Fun Facts */}
        <View style={styles.factsCard}>
          <Text style={styles.factsTitle}>🎮 Fun Fact!</Text>
          <Text style={styles.factsText}>
            You'll compete with your friends on the leaderboard! Complete puzzles to climb higher
            and unlock new levels!
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFCDC9',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FD7979',
    marginTop: 20,
  },
  welcomeText: {
    fontSize: 20,
    color: '#FD7979',
    marginTop: 10,
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  inputLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 18,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#FD7979',
    marginBottom: 20,
  },
  continueButton: {
    backgroundColor: '#FD7979',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  continueButtonDisabled: {
    backgroundColor: '#FDACAC',
  },
  continueButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  factsCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  factsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 10,
  },
  factsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
