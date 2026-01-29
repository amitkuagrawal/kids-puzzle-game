import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getUserProfile,
  getGroupLeaderboard,
  LeaderboardEntry,
  ACHIEVEMENTS,
} from '../../services/firebase-service';

export default function Leaderboard() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const profile = await getUserProfile();

      if (!profile) {
        Alert.alert('No Profile', 'Please create your profile first!');
        router.back();
        return;
      }

      setCurrentUserId(profile.userId);

      if (!profile.groupId) {
        Alert.alert(
          'No Group',
          'You haven\'t joined a group yet!\n\nJoin a group to compete with friends on the leaderboard.',
          [
            {
              text: 'Join Group',
              onPress: () => router.push('/child/join-group'),
            },
            {
              text: 'Cancel',
              onPress: () => router.back(),
            },
          ]
        );
        return;
      }

      const data = await getGroupLeaderboard(profile.groupId);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
      Alert.alert('Error', 'Could not load leaderboard. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getLastPlayedText = (dateString: string): string => {
    const now = new Date();
    const lastPlayed = new Date(dateString);
    const diffMs = now.getTime() - lastPlayed.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return lastPlayed.toLocaleDateString();
  };

  const getLevelIcon = (level: number): string => {
    const icons = ['⭐', '🌟', '✨', '💫', '🏆'];
    return icons[Math.min(level - 1, 4)] || '⭐';
  };

  const getRankColor = (rank: number): string => {
    if (rank === 1) return '#FFD700'; // Gold
    if (rank === 2) return '#C0C0C0'; // Silver
    if (rank === 3) return '#CD7F32'; // Bronze
    return '#2196F3';
  };

  const getRankIcon = (rank: number): string => {
    if (rank === 1) return 'trophy';
    if (rank === 2) return 'medal';
    if (rank === 3) return 'medal-outline';
    return 'ribbon';
  };

  const getStreakColor = (streak: number): string => {
    if (streak >= 30) return '#FF5722';
    if (streak >= 7) return '#FF9800';
    if (streak >= 3) return '#FFC107';
    return '#9E9E9E';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={32} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Leaderboard</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={32} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Info Banner */}
      <View style={styles.infoBanner}>
        <Ionicons name="trophy" size={24} color="#FFD700" />
        <Text style={styles.infoText}>
          {leaderboard.length} {leaderboard.length === 1 ? 'player' : 'players'} in your group
        </Text>
      </View>

      {/* Leaderboard */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {leaderboard.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#ccc" />
            <Text style={styles.emptyTitle}>No Players Yet</Text>
            <Text style={styles.emptyText}>
              Share your group code with friends so they can join!
            </Text>
          </View>
        ) : (
          leaderboard.map((entry) => {
            const isCurrentUser = entry.userId === currentUserId;

            return (
              <View
                key={entry.userId}
                style={[styles.playerCard, isCurrentUser && styles.currentUserCard]}
              >
                {/* Rank Badge */}
                <View style={[styles.rankBadge, { backgroundColor: getRankColor(entry.rank) }]}>
                  <Ionicons name={getRankIcon(entry.rank)} size={20} color="white" />
                  <Text style={styles.rankText}>{entry.rank}</Text>
                </View>

                {/* Player Info */}
                <View style={styles.playerInfo}>
                  {/* Name and Level */}
                  <View style={styles.nameRow}>
                    <Text style={[styles.playerName, isCurrentUser && styles.currentUserText]}>
                      {entry.displayName}
                      {isCurrentUser && ' (You)'}
                    </Text>
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelIcon}>{getLevelIcon(entry.currentLevel)}</Text>
                      <Text style={styles.levelText}>Level {entry.currentLevel}</Text>
                    </View>
                  </View>

                  {/* Stats Grid */}
                  <View style={styles.statsGrid}>
                    {/* Puzzles Completed */}
                    <View style={styles.statItem}>
                      <Ionicons name="extension-puzzle" size={16} color="#2196F3" />
                      <Text style={styles.statValue}>{entry.totalPuzzlesCompleted}</Text>
                      <Text style={styles.statLabel}>Puzzles</Text>
                    </View>

                    {/* Completion % */}
                    <View style={styles.statItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={styles.statValue}>{entry.levelCompletionPercentage}%</Text>
                      <Text style={styles.statLabel}>Complete</Text>
                    </View>

                    {/* Streak */}
                    <View style={styles.statItem}>
                      <Ionicons
                        name="flame"
                        size={16}
                        color={getStreakColor(entry.currentStreak)}
                      />
                      <Text style={styles.statValue}>{entry.currentStreak}</Text>
                      <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                  </View>

                  {/* Achievements */}
                  {entry.achievements.length > 0 && (
                    <View style={styles.achievementsRow}>
                      <Text style={styles.achievementsLabel}>Achievements:</Text>
                      <View style={styles.achievementsList}>
                        {entry.achievements.slice(0, 5).map((achievementId) => {
                          const achievement = Object.values(ACHIEVEMENTS).find(
                            (a) => a.id === achievementId
                          );
                          return achievement ? (
                            <Text key={achievementId} style={styles.achievementIcon}>
                              {achievement.icon}
                            </Text>
                          ) : null;
                        })}
                        {entry.achievements.length > 5 && (
                          <Text style={styles.achievementsMore}>
                            +{entry.achievements.length - 5}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Last Played */}
                  <View style={styles.lastPlayedRow}>
                    <Ionicons name="time-outline" size={14} color="#999" />
                    <Text style={styles.lastPlayedText}>
                      Last played: {getLastPlayedText(entry.lastPlayedDate)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Bottom Padding */}
        <View style={{ height: 30 }} />
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
    backgroundColor: '#2196F3',
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
  refreshButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 42,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976D2',
    paddingVertical: 12,
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#999',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  playerCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  rankBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  rankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },
  playerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  currentUserText: {
    color: '#2196F3',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  levelIcon: {
    fontSize: 16,
  },
  levelText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 10,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
  },
  achievementsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  achievementsLabel: {
    fontSize: 12,
    color: '#666',
  },
  achievementsList: {
    flexDirection: 'row',
    gap: 4,
  },
  achievementIcon: {
    fontSize: 18,
  },
  achievementsMore: {
    fontSize: 12,
    color: '#999',
    fontWeight: 'bold',
  },
  lastPlayedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  lastPlayedText: {
    fontSize: 12,
    color: '#999',
  },
});
