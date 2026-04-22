import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';
import { getLiveLocation } from '../services/api';

// ⚠️ Must match YOUR_COMPUTER_IP in api.js
const SOCKET_URL = 'http://192.168.0.105:3000';

export default function LiveLocationScreen({ route, navigation }) {
  const { userId, userName, token } = route.params;

  const [isSharing, setIsSharing] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]); // trail of points
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const socketRef = useRef(null);
  const mapRef = useRef(null);
  const tickRef = useRef(null);

  useEffect(() => {
    initScreen();
    // Tick every second for "X seconds ago" display
    tickRef.current = setInterval(() => setSecondsAgo(s => s + 1), 1000);

    return () => {
      clearInterval(tickRef.current);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // ── 1. Check if user is already sharing (REST call) ───────
  const initScreen = async () => {
    try {
      const response = await getLiveLocation(userId, token);
      if (response.success && response.isSharing && response.location) {
        const { latitude, longitude } = response.location;
        const loc = {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        };
        setUserLocation(loc);
        setLocationHistory([loc]);
        setIsSharing(true);
      } else {
        setIsSharing(false);
      }
    } catch (err) {
      console.error('Init live location error:', err);
    } finally {
      setLoading(false);
      // Connect socket regardless — will receive updates if user starts sharing
      connectSocket();
    }
  };

  // ── 2. Connect to Socket.io and join user's room ──────────
  const connectSocket = () => {
    try {
      const socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 15,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        forceNew: false,
      });

      socket.on('connect', () => {
        console.log('✅ Guardian socket connected:', socket.id);
        setConnected(true);
        // Join the sharing user's room to receive their location updates
        socket.emit('join_as_guardian', { userId });
        console.log('📍 Emitted join_as_guardian for user:', userId);
      });

      socket.on('reconnect', () => {
        console.log('🔄 Guardian socket reconnected');
        setConnected(true);
        // Rejoin room after reconnection
        socket.emit('join_as_guardian', { userId });
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Guardian socket disconnected:', reason);
        setConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 Socket connect error:', error.message || error);
        setConnected(false);
      });

      socket.on('error', (error) => {
        console.error('🔴 Socket error event:', error);
      });

      // ── Receive real-time location update ──────────────────
      socket.on('location_update', (data) => {
        try {
          const { latitude, longitude, accuracy, timestamp, userId: senderId } = data;
          
          if (!latitude || !longitude) {
            console.warn('⚠️ Invalid location data received:', data);
            return;
          }

          const newLoc = {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          };

          console.log('📍 Location update from user:', senderId, '→', newLoc);

          setUserLocation(newLoc);
          setLocationHistory(prev => {
            const updated = [...prev, newLoc];
            return updated.slice(-50); // Keep last 50 points as trail
          });
          setIsSharing(true);
          setLastUpdated(new Date());
          setSecondsAgo(0);

          // Smoothly pan map to new location
          if (mapRef.current && newLoc.latitude && newLoc.longitude) {
            mapRef.current.animateToRegion({
              latitude: newLoc.latitude,
              longitude: newLoc.longitude,
              latitudeDelta: 0.008,
              longitudeDelta: 0.008,
            }, 600);
          }
        } catch (err) {
          console.error('❌ Error processing location update:', err);
        }
      });

      // ── User started sharing ───────────────────────────────
      socket.on('sharing_started', (data) => {
        console.log('✅ User started sharing location');
        setIsSharing(true);
      });

      // ── User stopped sharing ───────────────────────────────
      socket.on('sharing_stopped', (data) => {
        console.log('🛑 User stopped sharing location');
        setIsSharing(false);
      });

      socketRef.current = socket;
    } catch (err) {
      console.error('❌ Failed to initialize socket:', err);
      setConnected(false);
    }
  };

  const formatSecondsAgo = () => {
    if (!lastUpdated) return 'Waiting…';
    if (secondsAgo < 5) return 'Just now';
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    return `${Math.floor(secondsAgo / 60)}m ${secondsAgo % 60}s ago`;
  };

  const initialRegion = userLocation
    ? { ...userLocation, latitudeDelta: 0.01, longitudeDelta: 0.01 }
    : { latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.05, longitudeDelta: 0.05 };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{userName}</Text>
          <Text style={styles.headerSub}>Live Tracking</Text>
        </View>
        {/* Connection status dot */}
        <View style={styles.connStatus}>
          <View style={[styles.connDot, connected ? styles.connDotGreen : styles.connDotRed]} />
          <Text style={styles.connText}>{connected ? 'Connected' : 'Reconnecting…'}</Text>
        </View>
      </View>

      {/* Status bar below header */}
      <View style={[styles.statusBar, isSharing ? styles.statusBarLive : styles.statusBarOff]}>
        {isSharing ? (
          <>
            <View style={styles.liveDot} />
            <Text style={styles.statusText}>
              LIVE · Updated {formatSecondsAgo()}
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="location-outline" size={14} color="#999" />
            <Text style={styles.statusTextOff}>
              {loading ? 'Connecting…' : 'Waiting for location sharing to start…'}
            </Text>
          </>
        )}
      </View>

      {/* Map — full screen */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FF6B9D" />
          <Text style={styles.loadingText}>Connecting to live tracking…</Text>
        </View>
      ) : (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsCompass
          showsScale
        >
          {/* User's current position marker */}
          {userLocation && (
            <Marker
              coordinate={userLocation}
              title={userName}
              description="Live location"
              anchor={{ x: 0.5, y: 0.5 }}
            >
              {/* Custom pulsing marker */}
              <View style={styles.markerOuter}>
                <View style={styles.markerInner}>
                  <Ionicons name="person" size={16} color="#fff" />
                </View>
              </View>
            </Marker>
          )}

          {/* Location trail (breadcrumb path) */}
          {locationHistory.length > 1 && (
            <Polyline
              coordinates={locationHistory}
              strokeColor="#FF6B9D"
              strokeWidth={3}
              lineDashPattern={[1]}
            />
          )}
        </MapView>
      )}

      {/* Bottom info card */}
      {!loading && (
        <View style={styles.bottomCard}>
          {isSharing && userLocation ? (
            <View style={styles.coordsRow}>
              <Ionicons name="location" size={16} color="#FF6B9D" />
              <Text style={styles.coordsText}>
                {userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)}
              </Text>
              <Text style={styles.trailText}>{locationHistory.length} pts tracked</Text>
            </View>
          ) : (
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color="#FF6B9D" style={{ marginRight: 8 }} />
              <Text style={styles.waitingText}>
                {userName} hasn't started sharing yet.{'\n'}
                This screen will update automatically when they do.
              </Text>
            </View>
          )}
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#FF6B9D',
  },
  backBtn: { padding: 4 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  connStatus: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  connDot: { width: 8, height: 8, borderRadius: 4 },
  connDotGreen: { backgroundColor: '#4ADE80' },
  connDotRed: { backgroundColor: '#FCA5A5' },
  connText: { fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },

  statusBar: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingVertical: 8, paddingHorizontal: 16,
  },
  statusBarLive: { backgroundColor: '#1a1a2e' },
  statusBarOff: { backgroundColor: '#2a2a2a' },
  liveDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4D4D',
  },
  statusText: { fontSize: 12, color: '#FF4D4D', fontWeight: '700', letterSpacing: 0.5 },
  statusTextOff: { fontSize: 12, color: '#999' },

  map: { flex: 1 },

  loadingBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F7F7F7',
  },
  loadingText: { marginTop: 14, fontSize: 15, color: '#666' },

  // Custom map marker
  markerOuter: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,107,157,0.25)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,107,157,0.5)',
  },
  markerInner: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#FF6B9D',
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5, shadowRadius: 4,
  },

  // Bottom card
  bottomCard: {
    backgroundColor: '#fff',
    paddingVertical: 14, paddingHorizontal: 20,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    elevation: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1, shadowRadius: 6,
  },
  coordsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  coordsText: {
    fontSize: 13, color: '#FF6B9D', fontWeight: '600',
    fontFamily: 'monospace', flex: 1,
  },
  trailText: { fontSize: 11, color: '#999' },
  waitingRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  waitingText: { fontSize: 13, color: '#666', lineHeight: 18, flex: 1 },
});