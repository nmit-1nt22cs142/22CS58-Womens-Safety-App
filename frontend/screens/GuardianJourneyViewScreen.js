import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserJourneyDetails } from '../services/api';

export default function GuardianJourneyViewScreen({ route, navigation }) {
  const { userId, userName, token } = route.params;

  const [activeTab, setActiveTab] = useState('active'); // 'active' or 'completed'
  const [activeJourneys, setActiveJourneys] = useState([]);
  const [completedJourneys, setCompletedJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJourneys();
  }, []);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      const response = await getUserJourneyDetails(userId, token);

      if (response.success) {
        setActiveJourneys(response.activeJourneys);
        setCompletedJourneys(response.completedJourneys);
      }
    } catch (error) {
      console.error('Error loading journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJourneys();
    setRefreshing(false);
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading journeys...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>{userName}'s Journeys</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active ({activeJourneys.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed ({completedJourneys.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'active' ? (
          // Active Journeys
          activeJourneys.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No active journeys</Text>
            </View>
          ) : (
            activeJourneys.map((journey) => (
              <View key={journey.trip_id} style={styles.journeyCard}>
                <View style={styles.journeyHeader}>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.journeyId}>Trip #{journey.trip_id}</Text>
                </View>

                <View style={styles.routeInfo}>
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={20} color="#4CAF50" />
                    <Text style={styles.routeText}>{journey.from_address}</Text>
                  </View>
                  <Ionicons name="arrow-down" size={20} color="#666" />
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={20} color="#FF4D4D" />
                    <Text style={styles.routeText}>{journey.to_address}</Text>
                  </View>
                </View>

                <View style={styles.journeyStats}>
                  <View style={styles.statRow}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                    <Text style={styles.statText}>
                      Started: {formatDateTime(journey.started_at)}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Ionicons name="navigate-outline" size={18} color="#666" />
                    <Text style={styles.statText}>
                      GPS Points: {journey.total_gps_points}
                    </Text>
                  </View>

                  {journey.deviation_count > 0 && (
                    <View style={styles.statRow}>
                      <Ionicons name="warning-outline" size={18} color="#FF9800" />
                      <Text style={[styles.statText, { color: '#FF9800' }]}>
                        Deviations: {journey.deviation_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )
        ) : (
          // Completed Journeys
          completedJourneys.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-done-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No completed journeys</Text>
            </View>
          ) : (
            completedJourneys.map((journey) => (
              <View key={journey.trip_id} style={styles.journeyCard}>
                <View style={styles.journeyHeader}>
                  <View style={styles.completedIndicator}>
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                    <Text style={styles.completedText}>COMPLETED</Text>
                  </View>
                  <Text style={styles.journeyId}>Trip #{journey.trip_id}</Text>
                </View>

                <View style={styles.routeInfo}>
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={20} color="#4CAF50" />
                    <Text style={styles.routeText}>{journey.from_address}</Text>
                  </View>
                  <Ionicons name="arrow-down" size={20} color="#666" />
                  <View style={styles.routeRow}>
                    <Ionicons name="location" size={20} color="#FF4D4D" />
                    <Text style={styles.routeText}>{journey.to_address}</Text>
                  </View>
                </View>

                <View style={styles.journeyStats}>
                  <View style={styles.statRow}>
                    <Ionicons name="calendar-outline" size={18} color="#666" />
                    <Text style={styles.statText}>
                      {formatDateTime(journey.started_at)}
                    </Text>
                  </View>

                  <View style={styles.statRow}>
                    <Ionicons name="time-outline" size={18} color="#666" />
                    <Text style={styles.statText}>
                      Duration: {formatDuration(journey.duration)}
                    </Text>
                  </View>

                  {journey.deviation_count > 0 && (
                    <View style={styles.statRow}>
                      <Ionicons name="warning-outline" size={18} color="#FF9800" />
                      <Text style={[styles.statText, { color: '#FF9800' }]}>
                        Deviations: {journey.deviation_count}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
  },
  journeyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
  },
  liveText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF4D4D',
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  journeyId: {
    fontSize: 12,
    color: '#999',
  },
  routeInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    gap: 8,
  },
  routeText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  journeyStats: {
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statText: {
    fontSize: 14,
    color: '#666',
  },
});