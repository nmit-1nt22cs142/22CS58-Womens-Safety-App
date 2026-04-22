import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
  Animated, Dimensions, StatusBar, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { getUserTripHistory, getActiveTrip, endTrip } from '../services/api';

const { width } = Dimensions.get('window');

// ── c file colour tokens ──────────────────────────────────────────────────
const colors = {
  primary: '#FF9B69',
  primaryDark: '#E87D4A',
  primaryFaded: 'rgba(255, 155, 105, 0.12)',
  background: '#F5F1EB',
  card: '#FFFFFF',
  text: '#2D2D3A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E8E0D8',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  shadowColor: 'rgba(45, 45, 58, 0.08)',
};
const gradients = {
  primary: ['#FF9B69', '#FF6B6B'],
};

export default function JourneyHistoryScreen({ navigation }) {
  // ── w file state & logic ──────────────────────────────────────────────────
  const [token, setToken] = useState('');
  const [tripHistory, setTripHistory] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stoppingTrip, setStoppingTrip] = useState(false);

  // ── c file MapsScreen state ───────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pinAnim = useRef(new Animated.Value(0)).current;
  const [currentAddress, setCurrentAddress] = useState('Detecting current location...');

  useEffect(() => {
    initialize();
    startAnimations();
    detectLocation();
  }, []);

  const startAnimations = () => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pinAnim, { toValue: -10, duration: 800, useNativeDriver: true }),
        Animated.timing(pinAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

  const detectLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setCurrentAddress('Location permission denied'); return; }
      let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc) {
        let geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (geo.length > 0) {
          const p = geo[0];
          setCurrentAddress(`${p.name || ''}, ${p.street || ''}, ${p.city || ''}`.replace(/^,\s*|,\s*,/g, '').trim());
        }
      }
    } catch { setCurrentAddress('Using estimated location'); }
  };

  // ── w file logic ──────────────────────────────────────────────────────────
  const initialize = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      if (authToken && userData) {
        setToken(authToken);
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
      const historyResponse = await getUserTripHistory(authToken);
      if (historyResponse.success) {
        setTripHistory(historyResponse.trips || []);
      }
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
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
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
        },
      ]
    );
  };

  // ── Safety zones (c file static data) ────────────────────────────────────
  const safetyZones = [
    { name: 'Police Station Nearby', safety: 'safe', color: colors.success },
    { name: 'Hospital Zone', safety: 'safe', color: colors.success },
    { name: 'Isolated Area', safety: 'low', color: colors.error },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading journey history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* ── Fake Map Background (c file structure) ── */}
      <View style={styles.mapPlaceholder}>
        <LinearGradient colors={['#E8F4FD', '#D1E8F0', '#C5DDE8']} style={StyleSheet.absoluteFill} />
        {/* Horizontal grid lines */}
        {[...Array(8)].map((_, i) => (
          <View key={`h${i}`} style={[styles.mapLine, { top: i * 60, left: 0, right: 0, height: 1 }]} />
        ))}
        {/* Vertical grid lines */}
        {[...Array(6)].map((_, i) => (
          <View key={`v${i}`} style={[styles.mapLine, { left: i * 80, top: 0, bottom: 0, width: 1 }]} />
        ))}

        {/* Animated location pin */}
        <Animated.View style={[styles.pinContainer, { transform: [{ translateY: pinAnim }] }]}>
          <Ionicons name="location" size={48} color={colors.primary} />
          <View style={styles.pinShadow} />
        </Animated.View>

        {/* Safety markers */}
        <View style={[styles.marker, { top: 80, left: 60 }]}>
          <View style={[styles.markerDot, { backgroundColor: colors.success }]} />
        </View>
        <View style={[styles.marker, { top: 150, right: 80 }]}>
          <View style={[styles.markerDot, { backgroundColor: colors.warning }]} />
        </View>
        <View style={[styles.marker, { bottom: 60, left: 100 }]}>
          <View style={[styles.markerDot, { backgroundColor: colors.error }]} />
        </View>
      </View>

      {/* ── Bottom Sheet (c file structure, w file logic inside) ── */}
      <Animated.View style={[styles.bottomSheet, { opacity: fadeAnim }]}>
        <View style={styles.handle} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.sheetContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Start Journey Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('StartJourney')}
          >
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.trackButton}
            >
              <Ionicons name="navigate" size={22} color="#fff" />
              <Text style={styles.trackButtonText}>Start Journey</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Current location address */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{currentAddress}</Text>
          </View>

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
                  <Ionicons name="stop-circle" size={18} color="#fff" />
                  <Text style={styles.stopButtonText}>{stoppingTrip ? 'Stopping...' : 'Stop'}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.activeRouteRow}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.activeRouteText} numberOfLines={1}>{activeTrip.from_address}</Text>
              </View>
              <View style={styles.arrowRow}>
                <Ionicons name="arrow-down" size={14} color={colors.textLight} />
              </View>
              <View style={styles.activeRouteRow}>
                <Ionicons name="location" size={14} color={colors.primaryDark} />
                <Text style={styles.activeRouteText} numberOfLines={1}>{activeTrip.to_address}</Text>
              </View>
            </View>
          )}

          {/* Nearby Safety Zones */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Safety Zones</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {safetyZones.map((zone, i) => (
              <View key={i} style={styles.zoneChip}>
                <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                <Text style={styles.zoneText}>{zone.name}</Text>
                <Text style={[styles.zoneSafety, { color: zone.color }]}>{zone.safety}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Recent Routes — w file journey history logic */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {tripHistory.length === 0 ? 'No Journey History' : `Recent Routes (${tripHistory.length})`}
            </Text>
          </View>

          {tripHistory.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="compass-outline" size={48} color={colors.border} />
              <Text style={styles.emptyText}>No journeys yet</Text>
              <Text style={styles.emptySubText}>Start your first journey to see history here</Text>
            </View>
          ) : (
            tripHistory.map((trip) => (
              <View key={trip.trip_id} style={styles.routeCard}>
                {/* Card header — date + status */}
                <View style={styles.routeCardHeader}>
                  <View>
                    <Text style={styles.tabDate}>{formatDate(trip.started_at)}</Text>
                    <Text style={styles.tabTime}>{formatTime(trip.started_at)}</Text>
                  </View>
                  <View style={[styles.statusBadge,
                    trip.status === 'completed' && { backgroundColor: colors.successLight },
                    trip.status === 'cancelled' && { backgroundColor: colors.errorLight },
                  ]}>
                    <Text style={[styles.statusText,
                      trip.status === 'completed' && { color: colors.success },
                      trip.status === 'cancelled' && { color: colors.error },
                    ]}>
                      {trip.status === 'completed' ? '✓ Completed' : trip.status === 'cancelled' ? '✗ Cancelled' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {/* From / To */}
                <View style={styles.routeBody}>
                  <View style={styles.routeIconCol}>
                    <Ionicons name="trail-sign-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.routeContent}>
                    <Text style={styles.routeFrom}>{trip.from_address}</Text>
                    <View style={styles.routeArrow}>
                      <View style={styles.routeLine} />
                      <Ionicons name="arrow-forward" size={12} color={colors.textLight} />
                    </View>
                    <Text style={styles.routeTo}>{trip.to_address}</Text>

                    {/* Stats row if completed */}
                    {trip.status === 'completed' && trip.duration && (
                      <View style={styles.stats}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>Duration</Text>
                          <Text style={styles.statValue}>{trip.duration}</Text>
                        </View>
                        {trip.total_gps_points > 0 && (
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Points</Text>
                            <Text style={styles.statValue}>{trip.total_gps_points}</Text>
                          </View>
                        )}
                        {trip.deviation_count > 0 && (
                          <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Deviations</Text>
                            <Text style={[styles.statValue, { color: colors.warning }]}>{trip.deviation_count}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Safe / Alert tag */}
                  <View style={[styles.safeTag, {
                    backgroundColor: trip.status === 'completed' ? colors.successLight : colors.errorLight,
                  }]}>
                    <Text style={[styles.safeTagText, {
                      color: trip.status === 'completed' ? colors.success : colors.error,
                    }]}>
                      {trip.status === 'completed' ? 'Safe' : 'Alert'}
                    </Text>
                  </View>
                </View>

                {/* Start Again button */}
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStartJourney(trip)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.startButtonGradient}
                  >
                    <Ionicons name="play-circle" size={16} color="#fff" />
                    <Text style={styles.startButtonText}>Start Again</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingText: { textAlign: 'center', marginTop: 12, color: colors.textSecondary },

  // ── Map ──────────────────────────────────────────────────────────────────
  mapPlaceholder: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapLine: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.05)' },
  pinContainer: { alignItems: 'center' },
  pinShadow: { width: 20, height: 6, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.15)', marginTop: -4 },
  marker: { position: 'absolute' },
  markerDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },

  // ── Bottom Sheet ─────────────────────────────────────────────────────────
  bottomSheet: {
    flex: 1,
    backgroundColor: colors.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 12,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetContent: { marginTop: 4 },

  // Start Journey button
  trackButton: {
    flexDirection: 'row', height: 54, borderRadius: 27,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  trackButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Location address row
  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 10, marginBottom: 8, justifyContent: 'center',
  },
  locationText: { fontSize: 12, color: colors.primary, fontWeight: '500', flex: 1 },

  // Active Journey card
  activeJourneyCard: {
    backgroundColor: colors.background,
    borderRadius: 14, padding: 14,
    borderLeftWidth: 3, borderLeftColor: colors.primary,
    marginBottom: 16, marginTop: 8,
  },
  activeJourneyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  activeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,155,105,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 6 },
  activeBadgeText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  stopButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.error, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  stopButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  activeRouteRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeRouteText: { flex: 1, fontSize: 13, color: colors.text, fontWeight: '500' },
  arrowRow: { paddingLeft: 4, paddingVertical: 4 },

  // Section headers
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text },

  // Safety Zones
  zoneChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginRight: 10, gap: 8,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  zoneSafety: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  // Empty state
  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, backgroundColor: colors.background, borderRadius: 16,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: colors.textSecondary, marginTop: 12 },
  emptySubText: { fontSize: 13, color: colors.textLight, marginTop: 4, textAlign: 'center' },

  // Route Card (blends c file route card with w file journey tab)
  routeCard: {
    backgroundColor: colors.background, borderRadius: 14,
    marginBottom: 10, overflow: 'hidden',
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  routeCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    backgroundColor: colors.card,
  },
  tabDate: { fontSize: 14, fontWeight: '600', color: colors.text },
  tabTime: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  statusBadge: {
    backgroundColor: '#F3F4F6', paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },

  routeBody: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, backgroundColor: colors.card, gap: 10 },
  routeIconCol: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center', alignItems: 'center',
  },
  routeContent: { flex: 1 },
  routeFrom: { fontSize: 14, fontWeight: '600', color: colors.text },
  routeArrow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  routeLine: { width: 16, height: 1, backgroundColor: colors.textLight, marginRight: 4 },
  routeTo: { fontSize: 14, fontWeight: '600', color: colors.text },
  safeTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  safeTagText: { fontSize: 11, fontWeight: '700' },

  // Stats
  stats: {
    flexDirection: 'row', gap: 16,
    marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 11, color: colors.textLight, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '600', color: colors.text },

  // Start Again button
  startButton: { overflow: 'hidden' },
  startButtonGradient: {
    flexDirection: 'row', paddingVertical: 10,
    justifyContent: 'center', alignItems: 'center', gap: 6,
  },
  startButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});