import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLiveLocation } from '../services/api';

export default function LiveLocationScreen({ route, navigation }) {
  const { userId, userName, token } = route.params;

  const [isSharing, setIsSharing] = useState(false);
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const pollIntervalRef = useRef(null);
  const tickIntervalRef = useRef(null);

  useEffect(() => {
    // Initial fetch
    fetchLocation();

    // Poll backend every 5 seconds
    pollIntervalRef.current = setInterval(() => {
      fetchLocation();
    }, 5000);

    // Tick every second to update "X seconds ago" display
    tickIntervalRef.current = setInterval(() => {
      setSecondsAgo((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollIntervalRef.current);
      clearInterval(tickIntervalRef.current);
    };
  }, []);

  const fetchLocation = async () => {
    try {
      const response = await getLiveLocation(userId, token);
      if (response.success) {
        setIsSharing(response.isSharing);
        if (response.isSharing && response.location) {
          setLocation(response.location);
          setLastUpdated(new Date());
          setSecondsAgo(0);
        } else {
          setLocation(null);
        }
      }
    } catch (error) {
      console.error('Error fetching live location:', error);
    } finally {
      setLoading(false);
    }
  };

  const openInGoogleMaps = () => {
    if (!location) {
      Alert.alert('No Location', 'Live location is not available right now.');
      return;
    }
    const { latitude, longitude } = location;
    // Opens Google Maps with a pin and label — user can navigate/track
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(userName)})`;
        Linking.openURL(geoUrl);
      }
    });
  };

  const formatSecondsAgo = () => {
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    return `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;
  };

  const formatSince = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{userName}</Text>
          <Text style={styles.headerSub}>Live Location</Text>
        </View>
        <TouchableOpacity onPress={fetchLocation} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {loading ? (
          <View style={styles.centeredBox}>
            <ActivityIndicator size="large" color="#FF6B9D" />
            <Text style={styles.loadingText}>Checking live location…</Text>
          </View>

        ) : isSharing && location ? (
          // ── SHARING ACTIVE ──────────────────────────
          <>
            {/* Status card */}
            <View style={styles.statusCard}>
              <View style={styles.statusTopRow}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
                <Text style={styles.statusName}>{userName} is sharing location</Text>
              </View>

              {/* Coordinates */}
              <View style={styles.coordBox}>
                <Ionicons name="location" size={18} color="#FF6B9D" />
                <Text style={styles.coordText}>
                  {parseFloat(location.latitude).toFixed(6)},{'  '}
                  {parseFloat(location.longitude).toFixed(6)}
                </Text>
              </View>

              {/* Timing info */}
              <View style={styles.timingRow}>
                <Ionicons name="refresh-circle-outline" size={16} color="#999" />
                <Text style={styles.timingText}>
                  Updated {formatSecondsAgo()} · auto-refreshes every 5s
                </Text>
              </View>

              {location.started_at && (
                <View style={styles.timingRow}>
                  <Ionicons name="time-outline" size={16} color="#999" />
                  <Text style={styles.timingText}>
                    Sharing since {formatSince(location.started_at)}
                  </Text>
                </View>
              )}

              {location.trip_id && (
                <View style={styles.journeyBadge}>
                  <Ionicons name="navigate" size={14} color="#007AFF" />
                  <Text style={styles.journeyBadgeText}>During an active journey</Text>
                </View>
              )}
            </View>

            {/* Open in Google Maps */}
            <TouchableOpacity style={styles.mapsButton} onPress={openInGoogleMaps} activeOpacity={0.85}>
              <View style={styles.mapsButtonLeft}>
                <Ionicons name="map" size={26} color="#fff" />
                <View>
                  <Text style={styles.mapsButtonTitle}>Open in Google Maps</Text>
                  <Text style={styles.mapsButtonSub}>Track {userName}'s live position</Text>
                </View>
              </View>
              <Ionicons name="open-outline" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            <Text style={styles.mapsHint}>
              Tap the button above to open Google Maps with {userName}'s current location.
              Come back here and tap again to get the latest position.
            </Text>

            {/* Manual refresh */}
            <TouchableOpacity style={styles.manualRefresh} onPress={fetchLocation}>
              <Ionicons name="refresh" size={18} color="#007AFF" />
              <Text style={styles.manualRefreshText}>Refresh Now</Text>
            </TouchableOpacity>
          </>

        ) : (
          // ── NOT SHARING ──────────────────────────────
          <View style={styles.centeredBox}>
            <View style={styles.offlineIcon}>
              <Ionicons name="location-outline" size={60} color="#ccc" />
            </View>
            <Text style={styles.offlineTitle}>No live location</Text>
            <Text style={styles.offlineSubtext}>
              {userName} is not currently sharing their live location.
              {'\n\n'}
              They can start sharing from the{' '}
              <Text style={styles.offlineHighlight}>Home screen → Send Location</Text>
              {' '}button, or it activates automatically when they start a journey.
            </Text>
            <TouchableOpacity style={styles.checkAgainBtn} onPress={fetchLocation}>
              <Ionicons name="refresh" size={18} color="#007AFF" />
              <Text style={styles.checkAgainText}>Check Again</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20,
    backgroundColor: '#FF6B9D',
  },
  backButton: { padding: 4 },
  refreshBtn: { padding: 4 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  content: { padding: 20, paddingBottom: 60 },

  centeredBox: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 60, backgroundColor: '#fff',
    borderRadius: 16, marginTop: 10,
  },
  loadingText: { marginTop: 14, fontSize: 15, color: '#666' },

  // Status card
  statusCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20,
    marginBottom: 16, elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6,
    borderLeftWidth: 4, borderLeftColor: '#FF4D4D',
  },
  statusTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFEBEE', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 10, gap: 5,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4D' },
  liveBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#FF4D4D' },
  statusName: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },

  coordBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF5F8', padding: 12,
    borderRadius: 10, marginBottom: 10,
  },
  coordText: { fontSize: 13, color: '#FF6B9D', fontWeight: '600', fontFamily: 'monospace' },

  timingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  timingText: { fontSize: 12, color: '#999' },

  journeyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EBF4FF', paddingVertical: 6,
    paddingHorizontal: 12, borderRadius: 8, marginTop: 12, alignSelf: 'flex-start',
  },
  journeyBadgeText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  // Google Maps button
  mapsButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#4285F4', borderRadius: 16,
    paddingVertical: 18, paddingHorizontal: 20,
    elevation: 4, shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
    marginBottom: 14,
  },
  mapsButtonLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  mapsButtonTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  mapsButtonSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 },

  mapsHint: {
    fontSize: 12, color: '#999', textAlign: 'center',
    lineHeight: 18, marginBottom: 20, paddingHorizontal: 10,
  },

  manualRefresh: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#EBF4FF',
  },
  manualRefreshText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },

  // Offline state
  offlineIcon: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: '#F5F5F5', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  offlineTitle: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 12 },
  offlineSubtext: {
    fontSize: 14, color: '#666', textAlign: 'center',
    lineHeight: 22, paddingHorizontal: 20,
  },
  offlineHighlight: { color: '#FF6B9D', fontWeight: '600' },
  checkAgainBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, paddingVertical: 12, paddingHorizontal: 24,
    borderRadius: 12, backgroundColor: '#EBF4FF',
  },
  checkAgainText: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
});