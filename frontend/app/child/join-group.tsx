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
import { joinGroup, getGroup } from '../../services/firebase-service';

export default function JoinGroup() {
  const router = useRouter();
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = async () => {
    const code = groupCode.trim().toUpperCase();

    if (!code) {
      Alert.alert('Oops!', 'Please enter a group code!');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Group code must be 6 characters!');
      return;
    }

    setLoading(true);

    try {
      // Check if group exists
      const group = await getGroup(code);

      if (!group) {
        Alert.alert(
          'Group Not Found',
          `No group found with code "${code}". Please check the code and try again.`
        );
        setLoading(false);
        return;
      }

      // Join the group
      const success = await joinGroup(code);

      if (success) {
        Alert.alert(
          '🎉 Success!',
          `You joined "${group.groupName}"!\n\nNow you can compete with your friends on the leaderboard!`,
          [
            {
              text: 'Start Playing!',
              onPress: () => router.replace('/child/level-select'),
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Could not join group. Please try again.');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Could not join group. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Joining Group?',
      'You can still play puzzles, but you won\'t be able to compete with friends on the leaderboard.\n\nYou can join a group later from settings.',
      [
        {
          text: 'Join Later',
          onPress: () => router.replace('/child/level-select'),
        },
        {
          text: 'Enter Code',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.headerContainer}>
          <Ionicons name="people-circle" size={80} color="#2196F3" />
          <Text style={styles.headerTitle}>Join a Group!</Text>
          <Text style={styles.headerText}>
            Enter the 6-character code your parent or teacher gave you
          </Text>
        </View>

        {/* Code Input Card */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Group Code</Text>
          <TextInput
            style={styles.input}
            placeholder="ABC123"
            value={groupCode}
            onChangeText={(text) => setGroupCode(text.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
            autoFocus={true}
          />

          <TouchableOpacity
            style={[styles.joinButton, loading && styles.joinButtonDisabled]}
            onPress={handleJoinGroup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="enter" size={24} color="white" />
                <Text style={styles.joinButtonText}>Join Group</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>💡 What's a Group?</Text>
          <Text style={styles.infoText}>
            A group lets you see how your friends are doing! You'll see a leaderboard showing:{'\n'}
            {'\n'}• Who's at which level
            {'\n'}• How many puzzles everyone completed
            {'\n'}• Who has the longest streak
            {'\n'}{'\n'}
            It's fun to compete with friends! 🏆
          </Text>
        </View>

        {/* Parent Info */}
        <View style={styles.parentCard}>
          <Text style={styles.parentText}>
            👨‍👩‍👧‍👦 Parents: Tap "Parent Dashboard" on the home screen to create a group code
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E3F2FD',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 15,
  },
  headerText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 18,
    fontSize: 24,
    letterSpacing: 4,
    textAlign: 'center',
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#2196F3',
    marginBottom: 20,
  },
  joinButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  joinButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#666',
    textDecorationLine: 'underline',
  },
  infoCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  parentCard: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 15,
  },
  parentText: {
    fontSize: 12,
    color: '#6A1B9A',
    textAlign: 'center',
    lineHeight: 18,
  },
});
