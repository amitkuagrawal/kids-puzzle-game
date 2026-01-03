import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface AnalyticsMetrics {
  total_sessions: number;
  total_events: number;
  puzzles_completed: number;
  puzzles_abandoned: number;
  uploads: number;
  hint_usage: number;
  event_breakdown: Record<string, number>;
  difficulty_breakdown: Record<string, number>;
  avg_completion_time: Record<string, number>;
}

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    fetchMetrics();
  }, [days]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/analytics/metrics?days=${days}`);
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const calculateCompletionRate = () => {
    if (!metrics) return 0;
    const total = metrics.puzzles_completed + metrics.puzzles_abandoned;
    if (total === 0) return 0;
    return ((metrics.puzzles_completed / total) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ECDC4" />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!metrics) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics Dashboard</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>No data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Time Period Selector */}
      <View style={styles.periodSelector}>
        {[7, 14, 30].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              days === period && styles.periodButtonActive,
            ]}
            onPress={() => setDays(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                days === period && styles.periodButtonTextActive,
              ]}
            >
              {period} Days
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Key Metrics Cards */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, styles.metricCard1]}>
            <Ionicons name="people" size={40} color="#4CAF50" />
            <Text style={styles.metricValue}>{metrics.total_sessions}</Text>
            <Text style={styles.metricLabel}>Total Sessions</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCard2]}>
            <Ionicons name="checkmark-circle" size={40} color="#2196F3" />
            <Text style={styles.metricValue}>{metrics.puzzles_completed}</Text>
            <Text style={styles.metricLabel}>Completed</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCard3]}>
            <Ionicons name="trending-up" size={40} color="#FF9800" />
            <Text style={styles.metricValue}>{calculateCompletionRate()}%</Text>
            <Text style={styles.metricLabel}>Completion Rate</Text>
          </View>

          <View style={[styles.metricCard, styles.metricCard4]}>
            <Ionicons name="cloud-upload" size={40} color="#9C27B0" />
            <Text style={styles.metricValue}>{metrics.uploads}</Text>
            <Text style={styles.metricLabel}>Uploads</Text>
          </View>
        </View>

        {/* Difficulty Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Difficulty Preferences</Text>
          <View style={styles.card}>
            {Object.entries(metrics.difficulty_breakdown).map(([difficulty, count]) => (
              <View key={difficulty} style={styles.difficultyRow}>
                <View style={styles.difficultyInfo}>
                  <View
                    style={[
                      styles.difficultyDot,
                      {
                        backgroundColor:
                          difficulty === 'easy'
                            ? '#4CAF50'
                            : difficulty === 'medium'
                            ? '#FF9800'
                            : '#F44336',
                      },
                    ]}
                  />
                  <Text style={styles.difficultyName}>
                    {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </Text>
                </View>
                <Text style={styles.difficultyCount}>{count} plays</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Average Completion Time */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Avg Completion Time</Text>
          <View style={styles.card}>
            {Object.entries(metrics.avg_completion_time).map(([difficulty, time]) => (
              <View key={difficulty} style={styles.timeRow}>
                <Text style={styles.timeDifficulty}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
                <Text style={styles.timeValue}>{formatTime(time)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Event Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Activity Breakdown</Text>
          <View style={styles.card}>
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>💡 Hints Used</Text>
              <Text style={styles.eventValue}>{metrics.hint_usage}</Text>
            </View>
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>❌ Abandoned</Text>
              <Text style={styles.eventValue}>{metrics.puzzles_abandoned}</Text>
            </View>
            <View style={styles.eventRow}>
              <Text style={styles.eventLabel}>📊 Total Events</Text>
              <Text style={styles.eventValue}>{metrics.total_events}</Text>
            </View>
          </View>
        </View>

        {/* Engagement Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Insights</Text>
          <View style={styles.card}>
            <Text style={styles.insightText}>
              • {calculateCompletionRate()}% of started puzzles are completed
            </Text>
            <Text style={styles.insightText}>
              • Hints used in {((metrics.hint_usage / metrics.puzzles_completed) * 100).toFixed(0)}% of completions
            </Text>
            <Text style={styles.insightText}>
              • {metrics.uploads} new puzzles uploaded in last {days} days
            </Text>
            <Text style={styles.insightText}>
              • Average {(metrics.total_events / metrics.total_sessions).toFixed(1)} events per session
            </Text>
          </View>
        </View>
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
    backgroundColor: '#4ECDC4',
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
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
    width: 38,
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: 'white',
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 20,
    color: '#999',
    marginTop: 15,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 15,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 20,
  },
  metricCard: {
    width: (width - 45) / 2,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  metricCard1: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  metricCard2: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  metricCard3: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  metricCard4: {
    borderLeftWidth: 4,
    borderLeftColor: '#9C27B0',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  difficultyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  difficultyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  difficultyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  difficultyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  difficultyCount: {
    fontSize: 16,
    color: '#666',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  timeDifficulty: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeValue: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  eventRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  eventLabel: {
    fontSize: 16,
    color: '#333',
  },
  eventValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4ECDC4',
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 24,
    marginBottom: 8,
  },
});
