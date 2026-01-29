import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createGroup, Group } from '../../services/firebase-service';

export default function ParentDashboard() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Missing Information', 'Please enter a group name.');
      return;
    }

    if (!parentEmail.trim() || !parentEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      const group = await createGroup(groupName.trim(), parentEmail.trim());
      setCreatedGroup(group);

      Alert.alert(
        '🎉 Group Created!',
        `Your group code is: ${group.groupId}\n\nShare this code with your kids or other parents so they can join!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert(
        'Error',
        'Could not create group. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!createdGroup) return;

    try {
      await Share.share({
        message: `Join our puzzle group "${createdGroup.groupName}"!\n\nGroup Code: ${createdGroup.groupId}\n\nDownload Kids Puzzle Game and enter this code to join the leaderboard!`,
        title: 'Join My Puzzle Group',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCreateAnother = () => {
    setCreatedGroup(null);
    setGroupName('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parent Dashboard</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={40} color="#2196F3" />
          <Text style={styles.infoTitle}>Create a Group for Your Kids</Text>
          <Text style={styles.infoText}>
            Create a group and get a unique code. Share this code with your kids or other parents
            so children can compete on the leaderboard together!
          </Text>
        </View>

        {!createdGroup ? (
          // Create Group Form
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create New Group</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Group Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Smith Family, Mrs. Johnson's Class"
                value={groupName}
                onChangeText={setGroupName}
                maxLength={50}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Your Email (Parent)</Text>
              <TextInput
                style={styles.input}
                placeholder="parent@example.com"
                value={parentEmail}
                onChangeText={setParentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.helperText}>
                We'll only use this to contact you if needed. Not visible to children.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.createButton, loading && styles.createButtonDisabled]}
              onPress={handleCreateGroup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="add-circle" size={24} color="white" />
                  <Text style={styles.createButtonText}>Create Group</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          // Group Created - Show Code
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
            <Text style={styles.successTitle}>Group Created!</Text>

            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>Your Group Code:</Text>
              <Text style={styles.codeText}>{createdGroup.groupId}</Text>
            </View>

            <View style={styles.groupInfoCard}>
              <View style={styles.groupInfoRow}>
                <Ionicons name="people" size={20} color="#666" />
                <Text style={styles.groupInfoText}>Group Name: {createdGroup.groupName}</Text>
              </View>
              <View style={styles.groupInfoRow}>
                <Ionicons name="calendar" size={20} color="#666" />
                <Text style={styles.groupInfoText}>
                  Created: {new Date(createdGroup.createdAt).toLocaleDateString()}
                </Text>
              </View>
            </View>

            <Text style={styles.instructionsTitle}>📝 Next Steps:</Text>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionStep}>
                1. Have your child open the Kids Puzzle Game
              </Text>
              <Text style={styles.instructionStep}>
                2. When prompted for a name, enter their first name
              </Text>
              <Text style={styles.instructionStep}>
                3. Tap "Join a Group" and enter the code: {createdGroup.groupId}
              </Text>
              <Text style={styles.instructionStep}>
                4. They can now see their friends on the leaderboard!
              </Text>
            </View>

            <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
              <Ionicons name="share-social" size={24} color="white" />
              <Text style={styles.shareButtonText}>Share Group Code</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.anotherButton} onPress={handleCreateAnother}>
              <Text style={styles.anotherButtonText}>Create Another Group</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Safety Notice */}
        <View style={styles.safetyCard}>
          <Ionicons name="shield-checkmark" size={30} color="#4CAF50" />
          <Text style={styles.safetyTitle}>Child Safety</Text>
          <Text style={styles.safetyText}>
            • No personal information is collected from children{'\n'}
            • Only first names are displayed{'\n'}
            • No direct messaging between users{'\n'}
            • You control group membership via the code{'\n'}
            • All data is encrypted and secure
          </Text>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6A1B9A',
    paddingVertical: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 42,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  helperText: {
    fontSize: 12,
    color: '#888',
    marginTop: 5,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  successCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
    marginBottom: 20,
  },
  codeContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2E7D32',
    letterSpacing: 4,
  },
  groupInfoCard: {
    width: '100%',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  groupInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  groupInfoText: {
    fontSize: 14,
    color: '#666',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  instructionsCard: {
    width: '100%',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  instructionStep: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    lineHeight: 20,
  },
  shareButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  anotherButton: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: '#6A1B9A',
    width: '100%',
    alignItems: 'center',
  },
  anotherButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6A1B9A',
  },
  safetyCard: {
    backgroundColor: '#F1F8E9',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#33691E',
    marginTop: 10,
    marginBottom: 10,
  },
  safetyText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 22,
  },
});
