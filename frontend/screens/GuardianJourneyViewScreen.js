import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUserJourneyDetails, getLiveLocation } from '../services/api';

export default function GuardianJourneyViewScreen({ route, navigation }) {
  const { userId, userName, token } = route.params;

  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'completed' | 'live'
  const [activeJourneys, setActiveJourneys] = useState([]);
  const [completedJourneys, setCompletedJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Live location state
  const [isUserSharing, setIsUserSharing] = useState(false);
  const [liveLocation, setLiveLocation] = useState(null);
  const [liveLocationLoading, setLiveLocationLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const liveLocationIntervalRef = useRef(null);

  useEffect(() => {
    loadJourneys();
    checkLiveLocation();
    return () => {
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
      }
    };
  }, []);

  // When live tab is selected, start polling every 10 seconds
  useEffect(() => {
    if (activeTab === 'live') {
      fetchLiveLocation();
      liveLocationIntervalRef.current = setInterval(() => {
        fetchLiveLocation();
      }, 10000);
    } else {
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
      }
    }

    return () => {
      if (liveLocationIntervalRef.current) {
        clearInterval(liveLocationIntervalRef.current);
        liveLocationIntervalRef.current = null;
      }
    };
  }, [activeTab]);

  const loadJourneys = async () => {
    try {
      setLoading(true);
      const response = await getUserJourneyDetails(userId, token);

      if (response.success) {
        setActiveJourneys(response.activeJourneys);
        setCompletedJourneys(response.completedJourneys);

        // Also check live location from the journey details response
        if (response.liveLocation) {
          setIsUserSharing(true);
          setLiveLocation(response.liveLocation);
        } else {
          setIsUserSharing(false);
          setLiveLocation(null);
        }
      }
    } catch (error) {
      console.error('Error loading journeys:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLiveLocation = async () => {
    try {
      const response = await getLiveLocation(userId, token);
      if (response.success) {
        setIsUserSharing(response.isSharing);
        setLiveLocation(response.isSharing ? response.location : null);
      }
    } catch (error) {
      console.error('Error checking live location:', error);
    }
  };

  const fetchLiveLocation = async () => {
    try {
      setLiveLocationLoading(true);
      const response = await getLiveLocation(userId, token);
      if (response.success) {
        setIsUserSharing(response.isSharing);
        if (response.isSharing && response.location) {
          setLiveLocation(response.location);
          setLastUpdated(new Date());
        } else {
          setLiveLocation(null);
        }
      }
    } catch (error) {
      console.error('Error fetching live location:', error);
    } finally {
      setLiveLocationLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJourneys();
    if (activeTab === 'live') {
      await fetchLiveLocation();
    }
    setRefreshing(false);
  };

  // Open Google Maps with the user's live location
  const openInGoogleMaps = () => {
    if (!liveLocation) {
      Alert.alert('No Location', 'Live location is not available right now.');
      return;
    }

    const { latitude, longitude } = liveLocation;
    // Opens Google Maps centered on user's location with a pin
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback to geo URI (works on Android natively)
        const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(userName)})`;
        Linking.openURL(geoUrl);
      }
    });
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

  const formatLastUpdated = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffSeconds = Math.floor((now - date) / 1000);
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    return `${Math.floor(diffSeconds / 60)}m ago`;
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

        {/* Live Location Tab — always visible, badge if sharing */}
        <TouchableOpacity
          style={[styles.tab, activeTab === 'live' && styles.liveActiveTab]}
          onPress={() => setActiveTab('live')}
        >
          <View style={styles.liveTabContent}>
            <Text style={[styles.tabText, activeTab === 'live' && styles.liveActiveTabText]}>
              Live
            </Text>
            {isUserSharing && (
              <View style={styles.liveBadge}>
                <View style={styles.liveBadgeDot} />
              </View>
            )}
          </View>
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
        {/* ======================== */}
        {/* ACTIVE JOURNEYS TAB      */}
        {/* ======================== */}
        {activeTab === 'active' && (
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
        )}

        {/* ======================== */}
        {/* COMPLETED JOURNEYS TAB   */}
        {/* ======================== */}
        {activeTab === 'completed' && (
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

        {/* ======================== */}
        {/* LIVE LOCATION TAB        */}
        {/* ======================== */}
        {activeTab === 'live' && (
          <View>
            {liveLocationLoading && !liveLocation ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#FF6B9D" />
                <Text style={styles.loadingText}>Checking live location...</Text>
              </View>
            ) : isUserSharing && liveLocation ? (
              // USER IS ACTIVELY SHARING
              <View>
                {/* Live Status Card */}
                <View style={styles.liveStatusCard}>
                  <View style={styles.liveStatusHeader}>
                    <View style={styles.liveStatusBadge}>
                      <View style={styles.liveStatusDot} />
                      <Text style={styles.liveStatusBadgeText}>LIVE</Text>
                    </View>
                    <Text style={styles.liveStatusTitle}>{userName} is sharing location</Text>
                  </View>

                  <View style={styles.coordsRow}>
                    <Ionicons name="location" size={18} color="#FF6B9D" />
                    <Text style={styles.coordsText}>
                      {parseFloat(liveLocation.latitude).toFixed(6)}, {parseFloat(liveLocation.longitude).toFixed(6)}
                    </Text>
                  </View>

                  {lastUpdated && (
                    <View style={styles.updatedRow}>
                      <Ionicons name="refresh-outline" size={16} color="#999" />
                      <Text style={styles.updatedText}>
                        Updated {formatLastUpdated(lastUpdated)} • Auto-refreshes every 10s
                      </Text>
                    </View>
                  )}

                  <View style={styles.liveStartedRow}>
                    <Ionicons name="time-outline" size={16} color="#999" />
                    <Text style={styles.liveStartedText}>
                      Sharing since {formatDateTime(liveLocation.started_at)}
                    </Text>
                  </View>
                </View>

                {/* Open in Google Maps Button */}
                <TouchableOpacity
                  style={styles.openMapsButton}
                  onPress={openInGoogleMaps}
                  activeOpacity={0.85}
                >
                  <Ionicons name="map" size={24} color="#fff" />
                  <Text style={styles.openMapsText}>Open in Google Maps</Text>
                  <Ionicons name="open-outline" size={18} color="rgba(255,255,255,0.8)" />
                </TouchableOpacity>

                <Text style={styles.mapsHint}>
                  Google Maps will open showing {userName}'s current location. Re-tap this button anytime to see the latest position.
                </Text>

                {/* Manual Refresh */}
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={fetchLiveLocation}
                >
                  <Ionicons name="refresh" size={18} color="#007AFF" />
                  <Text style={styles.refreshButtonText}>Refresh Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              // USER IS NOT SHARING
              <View style={styles.emptyState}>
                <Ionicons name="location-outline" size={70} color="#ccc" />
                <Text style={styles.emptyText}>No live location</Text>
                <Text style={styles.emptySubtext}>
                  {userName} is not currently sharing their live location.{'\n'}
                  They can start sharing from their Home screen.
                </Text>
                <TouchableOpacity
                  style={styles.checkAgainButton}
                  onPress={fetchLiveLocation}
                >
                  <Ionicons name="refresh" size={18} color="#007AFF" />
                  <Text style={styles.checkAgainText}>Check Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
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

  // Tabs
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
  liveActiveTab: {
    borderBottomColor: '#FF4D4D',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  liveActiveTabText: {
    color: '#FF4D4D',
    fontWeight: 'bold',
  },
  liveTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4D4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },

  // Empty State
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
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  // Journey Cards
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

  // Live Location Tab Styles
  liveStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4D4D',
  },
  liveStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  liveStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 5,
  },
  liveStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4D4D',
  },
  liveStatusBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF4D4D',
  },
  liveStatusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    backgroundColor: '#FFF5F8',
    padding: 10,
    borderRadius: 8,
  },
  coordsText: {
    fontSize: 13,
    color: '#FF6B9D',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
  },
  liveStartedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  liveStartedText: {
    fontSize: 12,
    color: '#999',
  },

  openMapsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4285F4',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 10,
    elevation: 4,
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 12,
  },
  openMapsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  mapsHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EBF4FF',
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },

  checkAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#EBF4FF',
  },
  checkAgainText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
});