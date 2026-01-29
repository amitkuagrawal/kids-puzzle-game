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
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { joinGroup, getGroup } from '../../services/firebase-service';

const { height } = Dimensions.get('window');

export default function JoinGroup() {
  const router = useRouter();
  const [groupCode, setGroupCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

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
      const group = await getGroup(code);

      if (!group) {
        Alert.alert('Group Not Found', `No group found with code "${code}".`);
        setLoading(false);
        return;
      }

      const success = await joinGroup(code);

      if (success) {
        // Navigate directly to level-select after successful join
        router.replace('/child/level-select');
      } else {
        Alert.alert('Error', 'Could not join group.');
      }
    } catch (error) {
      console.error('Error joining group:', error);
      Alert.alert('Error', 'Could not join group.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAlone = () => {
    router.replace('/child/level-select');
  };

  if (showCodeInput) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => setShowCodeInput(false)}>
            <Ionicons name="arrow-back" size={28} color="#2196F3" />
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSmall}>
            <Ionicons name="people-circle" size={60} color="#2196F3" />
            <Text style={styles.headerTitleSmall}>Enter Group Code</Text>
          </View>

          {/* Code Input */}
          <View style={styles.inputCard}>
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
              style={[styles.actionButton, styles.joinBtn, loading && styles.btnDisabled]}
              onPress={handleJoinGroup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="enter" size={24} color="white" />
                  <Text style={styles.actionButtonText}>Join Group</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Hint */}
          <Text style={styles.hintText}>
            Ask your parent or teacher for the 6-character code
          </Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.emoji}>🎮</Text>
          <Text style={styles.headerTitle}>How do you want to play?</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {/* Play Alone Option */}
          <TouchableOpacity style={styles.optionCard} onPress={handlePlayAlone}>
            <View style={[styles.optionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="person" size={40} color="#4CAF50" />
            </View>
            <Text style={styles.optionTitle}>Play Alone</Text>
            <Text style={styles.optionDesc}>Practice puzzles by yourself</Text>
            <View style={[styles.optionBtn, { backgroundColor: '#4CAF50' }]}>
              <Text style={styles.optionBtnText}>Start Playing</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </TouchableOpacity>

          {/* Join Group Option */}
          <TouchableOpacity style={styles.optionCard} onPress={() => setShowCodeInput(true)}>
            <View style={[styles.optionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="people" size={40} color="#2196F3" />
            </View>
            <Text style={styles.optionTitle}>Join a Group</Text>
            <Text style={styles.optionDesc}>Compete with friends & family</Text>
            <View style={[styles.optionBtn, { backgroundColor: '#2196F3' }]}>
              <Text style={styles.optionBtnText}>Enter Code</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footerText}>
          You can join a group later from settings
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FEEAC9',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 10,
    zIndex: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  emoji: {
    fontSize: 50,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  headerSmall: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 40,
  },
  headerTitleSmall: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2196F3',
    marginTop: 10,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  optionCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  optionIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  optionDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  optionBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  inputCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 15,
    fontSize: 28,
    letterSpacing: 6,
    textAlign: 'center',
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#2196F3',
    marginBottom: 15,
  },
  actionButton: {
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  joinBtn: {
    backgroundColor: '#4CAF50',
  },
  btnDisabled: {
    backgroundColor: '#A5D6A7',
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  hintText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 15,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 25,
  },
});
