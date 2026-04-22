import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserTripHistory, getActiveTrip, endTrip } from '../services/api';

export default function JourneyHistoryScreen({ navigation }) {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState(null);
  const [tripHistory, setTripHistory] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stoppingTrip, setStoppingTrip] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      if (authToken && userData) {
        const parsed = JSON.parse(userData);
        setToken(authToken);
        setUserId(parsed.id);
        await loadData(authToken);
      }
    } catch (err) {
      console.error('Init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async (authToken) => {
    try {
      // Get trip history
      const historyResponse = await getUserTripHistory(authToken);
      if (historyResponse.success) {
        setTripHistory(historyResponse.trips || []);
      }

      // Get active trip
      const activeTripResponse = await getActiveTrip(authToken);
      if (activeTripResponse.success && activeTripResponse.hasActiveTrip) {
        setActiveTrip(activeTripResponse.trip);
      } else {
        setActiveTrip(null);
      }
    } catch (err) {
      console.error('Load data error:', err);
      Alert.alert('Error', 'Failed to load journey history');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData(token);
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleStartJourney = (trip) => {
    // Navigate to StartJourneyScreen with pre-filled data
    navigation.navigate('StartJourney', {
      prefilledData: {
        fromAddress: trip.from_address,
        toAddress: trip.to_address,
        fromLatitude: trip.from_latitude,
        fromLongitude: trip.from_longitude,
        toLatitude: trip.to_latitude,
        toLongitude: trip.to_longitude,
        polyline: trip.polyline_json ? JSON.parse(trip.polyline_json) : null,
      }
    });
  };

  const handleStopJourney = async () => {
    Alert.alert(
      'Stop Journey',
      'Are you sure you want to stop your current journey?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Stop', 
          onPress: async () => {
            try {
              setStoppingTrip(true);
              const response = await endTrip(activeTrip.trip_id, token);
              if (response.success) {
                Alert.alert('Success', 'Journey stopped');
                setActiveTrip(null);
                await loadData(token);
              }
            } catch (err) {
              Alert.alert('Error', 'Failed to stop journey');
            } finally {
              setStoppingTrip(false);
            }
          },
          style: 'destructive'
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF6B9D" style={{ marginTop: 50 }} />
        <Text style={styles.loadingText}>Loading journey history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Journey History</Text>
          <Text style={styles.headerSub}>Your past and current trips</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Active Journey Alert */}
        {activeTrip && (
          <View style={styles.activeJourneyCard}>
            <View style={styles.activeJourneyHeader}>
              <View style={styles.activeBadge}>
                <View style={styles.activeDot} />
                <Text style={styles.activeBadgeText}>ACTIVE NOW</Text>
              </View>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStopJourney}
                disabled={stoppingTrip}
              >
                <Ionicons name="stop-circle" size={20} color="#fff" />
                <Text style={styles.stopButtonText}>{stoppingTrip ? 'Stopping...' : 'Stop'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.journeyInfo}>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#FF6B9D" />
                <Text style={styles.journeyLocation} numberOfLines={1}>
                  {activeTrip.from_address}
                </Text>
              </View>
              <View style={styles.arrow}>
                <Ionicons name="arrow-down" size={16} color="#999" />
              </View>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={16} color="#FF6B9D" />
                <Text style={styles.journeyLocation} numberOfLines={1}>
                  {activeTrip.to_address}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Journey History Tabs */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>
            {tripHistory.length === 0 ? 'No Journey History' : `${tripHistory.length} Journeys`}
          </Text>

          {tripHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="compass-outline" size={48} color="#DDD" />
              <Text style={styles.emptyText}>No journeys yet</Text>
              <Text style={styles.emptySubText}>Start your first journey to see history here</Text>
            </View>
          ) : (
            tripHistory.map((trip, index) => (
              <View key={trip.trip_id} style={styles.journeyTab}>
                <View style={styles.tabHeader}>
                  <View style={styles.dateSection}>
                    <Text style={styles.tabDate}>{formatDate(trip.started_at)}</Text>
                    <Text style={styles.tabTime}>{formatTime(trip.started_at)}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {trip.status === 'completed' ? '✓ Completed' : trip.status === 'cancelled' ? '✗ Cancelled' : 'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.tabContent}>
                  <View style={styles.locationSection}>
                    <View style={styles.locationItem}>
                      <View style={styles.locationDot}>
                        <Ionicons name="location" size={14} color="#fff" />
                      </View>
                      <Text style={styles.locationLabel}>From:</Text>
                      <Text style={styles.locationAddress} numberOfLines={1}>
                        {trip.from_address}
                      </Text>
                    </View>

                    <View style={styles.connectionLine} />

                    <View style={styles.locationItem}>
                      <View style={[styles.locationDot, styles.destinationDot]}>
                        <Ionicons name="location" size={14} color="#fff" />
                      </View>
                      <Text style={styles.locationLabel}>To:</Text>
                      <Text style={styles.locationAddress} numberOfLines={1}>
                        {trip.to_address}
                      </Text>
                    </View>
                  </View>

                  {trip.status === 'completed' && trip.duration && (
                    <View style={styles.stats}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{trip.duration}</Text>
                      </View>
                      {trip.total_gps_points && (
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Points</Text>
                          <Text style={styles.statValue}>{trip.total_gps_points}</Text>
                        </View>
                      )}
                      {trip.deviation_count > 0 && (
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Deviations</Text>
                          <Text style={[styles.statValue, styles.deviationValue]}>{trip.deviation_count}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStartJourney(trip)}
                >
                  <Ionicons name="play-circle" size={18} color="#fff" />
                  <Text style={styles.startButtonText}>Start</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom "Start New Route" Button */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.newRouteButton}
          onPress={() => navigation.navigate('StartJourney')}
        >
          <Ionicons name="add-circle" size={24} color="#fff" />
          <Text style={styles.newRouteButtonText}>Start New Route</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    backgroundColor: '#FF6B9D',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 12,
    color: '#999',
  },

  // Active Journey Card
  activeJourneyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B9D',
    elevation: 3,
  },
  activeJourneyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B9D',
    marginRight: 6,
    animation: 'pulse',
  },
  activeBadgeText: {
    color: '#FF6B9D',
    fontSize: 12,
    fontWeight: '600',
  },
  stopButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  journeyInfo: {
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journeyLocation: {
    flex: 1,
    color: '#333',
    fontSize: 13,
    fontWeight: '500',
  },
  arrow: {
    alignItems: 'center',
    paddingVertical: 4,
  },

  // History Section
  historySection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 13,
    color: '#CCC',
    marginTop: 4,
  },

  // Journey Tab
  journeyTab: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dateSection: {
    flex: 1,
  },
  tabDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  tabTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },

  // Tab Content
  tabContent: {
    padding: 16,
  },
  locationSection: {
    gap: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationDot: {
    backgroundColor: '#6B9DFF',
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    width: 35,
  },
  locationAddress: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
  connectionLine: {
    height: 16,
    width: 2,
    backgroundColor: '#DDD',
    marginLeft: 11,
  },

  // Stats
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  deviationValue: {
    color: '#FF9800',
  },

  // Start Button
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B9D',
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom Button
  bottomButtonContainer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  newRouteButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B9D',
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 3,
  },
  newRouteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
