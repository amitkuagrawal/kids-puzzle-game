import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createGroup, Group } from '../../services/firebase-service';

const { height } = Dimensions.get('window');

export default function ParentDashboard() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<Group | null>(null);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Missing Info', 'Please enter a group name.');
      return;
    }

    if (!parentEmail.trim() || !parentEmail.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email.');
      return;
    }

    setLoading(true);

    try {
      const group = await createGroup(groupName.trim(), parentEmail.trim());
      setCreatedGroup(group);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Could not create group.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareCode = async () => {
    if (!createdGroup) return;

    try {
      await Share.share({
        message: `Join "${createdGroup.groupName}"! Code: ${createdGroup.groupId}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCreateAnother = () => {
    setCreatedGroup(null);
    setGroupName('');
    setParentEmail('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Parent Dashboard</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!createdGroup ? (
          // Create Group Form
          <>
            {/* Title */}
            <View style={styles.titleSection}>
              <Ionicons name="people-circle" size={50} color="#6A1B9A" />
              <Text style={styles.title}>Create a Group</Text>
              <Text style={styles.subtitle}>Get a code to share with kids</Text>
            </View>

            {/* Form */}
            <View style={styles.formCard}>
              <View style={styles.inputRow}>
                <Text style={styles.label}>Group Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Smith Family"
                  value={groupName}
                  onChangeText={setGroupName}
                  maxLength={30}
                />
              </View>

              <View style={styles.inputRow}>
                <Text style={styles.label}>Your Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="parent@example.com"
                  value={parentEmail}
                  onChangeText={setParentEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={[styles.createButton, loading && styles.buttonDisabled]}
                onPress={handleCreateGroup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={22} color="white" />
                    <Text style={styles.buttonText}>Create Group</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          // Group Created - Show Code
          <>
            <View style={styles.successSection}>
              <Ionicons name="checkmark-circle" size={50} color="#4CAF50" />
              <Text style={styles.successTitle}>Group Created!</Text>
            </View>

            {/* Code Display */}
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>Your Group Code</Text>
              <Text style={styles.codeText}>{createdGroup.groupId}</Text>
              <Text style={styles.groupNameText}>{createdGroup.groupName}</Text>
              <Text style={styles.dateText}>
                Created: {new Date(createdGroup.createdAt).toLocaleDateString()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareCode}>
                <Ionicons name="share-social" size={20} color="white" />
                <Text style={styles.shareButtonText}>Share Code</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.newButton} onPress={handleCreateAnother}>
                <Ionicons name="add" size={20} color="#6A1B9A" />
                <Text style={styles.newButtonText}>New Group</Text>
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsTitle}>📝 Next Steps</Text>
              <Text style={styles.instructionText}>1. Open the app on your child's device</Text>
              <Text style={styles.instructionText}>2. Enter child's first name</Text>
              <Text style={styles.instructionText}>3. Choose "Join a Group" and enter code</Text>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3E5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 38,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6A1B9A',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  inputRow: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  createButton: {
    backgroundColor: '#6A1B9A',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 5,
  },
  buttonDisabled: {
    backgroundColor: '#CE93D8',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
  },
  codeCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  codeLabel: {
    fontSize: 14,
    color: '#666',
  },
  codeText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#6A1B9A',
    letterSpacing: 4,
    marginVertical: 8,
  },
  groupNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 15,
  },
  shareButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: 'white',
  },
  newButton: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 2,
    borderColor: '#6A1B9A',
  },
  newButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#6A1B9A',
  },
  instructionsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 15,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
  },
});
