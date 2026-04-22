import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { startTrip } from '../services/api';
import SearchableInput from '../components/SearchableInput';
import { reverseGeocode } from '../services/googlePlacesService';

// ⚠️ Must match YOUR_COMPUTER_IP in api.js
const SOCKET_URL = 'http://192.168.0.105:3000';

export default function StartJourneyScreen({ navigation, route }) {
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [fromAddress, setFromAddress] = useState('My Location');
  const [toAddress, setToAddress] = useState('');
  const [selectingTo, setSelectingTo] = useState(false);
  const [isGeocodingFrom, setIsGeocodingFrom] = useState(false);
  const [region, setRegion] = useState({
    latitude: 12.9716, longitude: 77.5946,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });

  const mapRef = useRef(null);
  const socketRef = useRef(null);
  const locationIntervalRef = useRef(null);

  useEffect(() => {
    initialize();
    return () => {
      // Cleanup on unmount
      stopLocationSharing();
    };
  }, []);

  const initialize = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      if (authToken) setToken(authToken);
      if (userData) {
        const parsed = JSON.parse(userData);
        setUserId(parsed.id);
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to start a journey');
        return;
      }

      // Check if pre-filled data from journey history
      if (route?.params?.prefilledData) {
        const { fromAddress: pfFromAddress, toAddress: pfToAddress, 
                fromLatitude: pfFromLat, fromLongitude: pfFromLng,
                toLatitude: pfToLat, toLongitude: pfToLng } = route.params.prefilledData;
        
        setFromAddress(pfFromAddress);
        setToAddress(pfToAddress);
        setFromLocation({ latitude: pfFromLat, longitude: pfFromLng });
        setToLocation({ latitude: pfToLat, longitude: pfToLng });
        setRegion({ 
          latitude: pfFromLat, 
          longitude: pfFromLng, 
          latitudeDelta: 0.05, 
          longitudeDelta: 0.05 
        });
      } else {
        // Get current location
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = location.coords;
        setFromLocation({ latitude, longitude });
        setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });

        setIsGeocodingFrom(true);
        try {
          const address = await reverseGeocode(latitude, longitude);
          setFromAddress(address);
        } catch {
          setFromAddress('My Location');
        } finally {
          setIsGeocodingFrom(false);
        }
      }
    } catch (err) {
      console.error('Init error:', err);
    }
  };

  // ── Connect socket and start pushing location ──────────────
  const startSocketSharing = (uid) => {
    // Connect to socket server
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: false,
    });

    socket.on('connect', () => {
      console.log('✅ User socket connected:', socket.id);
      // Join the user's own room so guardians can listen
      socket.emit('join_as_user', { userId: uid });
      console.log('📍 Joined room as user:', uid);
    });

    socket.on('reconnect', () => {
      console.log('🔄 User socket reconnected');
      socket.emit('join_as_user', { userId: uid });
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ User socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔴 Socket connect error:', error.message || error);
    });

    socket.on('error', (error) => {
      console.error('🔴 Socket error:', error);
    });

    socketRef.current = socket;

    // Push location every 5 seconds with better error handling
    locationIntervalRef.current = setInterval(async () => {
      try {
        if (!socketRef.current?.connected) {
          console.warn('⚠️ Socket not connected, skipping location update');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        const { latitude, longitude, accuracy } = loc.coords;

        if (latitude && longitude) {
          socketRef.current.emit('location_update', {
            userId: uid,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            accuracy: parseFloat(accuracy),
            timestamp: new Date().toISOString(),
          });
          console.log('📍 Location pushed:', latitude.toFixed(5), longitude.toFixed(5));
        }
      } catch (err) {
        console.error('❌ Location push error:', err.message);
      }
    }, 5000);
  };

  const stopLocationSharing = () => {
    console.log('🛑 Stopping location sharing...');
    
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
      console.log('✓ Location interval stopped');
    }
    
    if (socketRef.current) {
      try {
        if (socketRef.current.connected) {
          socketRef.current.emit('stop_sharing', { userId });
          console.log('✓ Stop sharing signal sent');
        }
        socketRef.current.disconnect();
        socketRef.current = null;
        console.log('✓ Socket disconnected');
      } catch (err) {
        console.error('Error during socket cleanup:', err);
      }
    }
  };

  // ── Map interaction ────────────────────────────────────────
  const handleMapPress = (e) => {
    if (!selectingTo) return;
    setToLocation(e.nativeEvent.coordinate);
    setSelectingTo(false);
  };

  const handlePlaceSelected = (placeData) => {
    setToLocation({ latitude: placeData.latitude, longitude: placeData.longitude });
    setToAddress(placeData.address);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: placeData.latitude, longitude: placeData.longitude,
        latitudeDelta: 0.05, longitudeDelta: 0.05,
      }, 500);
    }
  };

  // ── Start journey ──────────────────────────────────────────
  const handleStartJourney = async () => {
    if (!fromLocation) {
      Alert.alert('Error', 'Waiting for your current location. Please try again.');
      return;
    }
    if (!toLocation) {
      Alert.alert('Error', 'Search or tap the map to set your destination first.');
      return;
    }
    if (!toAddress.trim()) {
      Alert.alert('Error', 'Please enter a name for your destination.');
      return;
    }

    try {
      setLoading(true);
      const response = await startTrip(
        fromAddress.trim() || 'My Location',
        toAddress.trim(),
        fromLocation.latitude,
        fromLocation.longitude,
        toLocation.latitude,
        toLocation.longitude,
        token
      );

      if (response.success) {
        // Connect socket and start pushing location BEFORE navigating
        startSocketSharing(userId);

        navigation.replace('TrackRoute', {
          tripId: response.tripId,
          liveSessionId: response.liveSessionId,
          polyline: response.polyline,
          fromAddress: fromAddress.trim() || 'My Location',
          toAddress: toAddress.trim(),
          fromLatitude: fromLocation.latitude,
          fromLongitude: fromLocation.longitude,
          toLatitude: toLocation.latitude,
          toLongitude: toLocation.longitude,
          token,
          userId,
          guardiansNotified: response.guardiansNotified,
          // Pass socket ref so TrackRoute can stop it on trip end
          stopSocketSharing: stopLocationSharing,
        });
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to start journey. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const canStart = fromLocation && toLocation && toAddress.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Start Journey</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Map — plain View, NOT ScrollView */}
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          region={region}
          onPress={handleMapPress}
          showsUserLocation
          zoomEnabled
          scrollEnabled
        >
          {fromLocation && (
            <Marker coordinate={fromLocation} pinColor="green" title="You are here" />
          )}
          {toLocation && (
            <Marker
              coordinate={toLocation}
              pinColor="red"
              title={toAddress || 'Destination'}
              draggable
              onDragEnd={(e) => setToLocation(e.nativeEvent.coordinate)}
            />
          )}
        </MapView>

        {selectingTo && (
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>📍 Tap map to set destination</Text>
          </View>
        )}
      </View>

      {/* Form — plain View, not ScrollView (fixes FlatList nesting warning) */}
      <View style={styles.formContainer}>

        {/* FROM */}
        <View style={styles.inputRow}>
          <Ionicons name="location" size={22} color="#4CAF50" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            value={fromAddress}
            editable={false}
            placeholder="Getting your location..."
            placeholderTextColor="#B0B0B0"
          />
          {isGeocodingFrom ? (
            <ActivityIndicator size="small" color="#4CAF50" />
          ) : fromLocation ? (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          ) : (
            <ActivityIndicator size="small" color="#999" />
          )}
        </View>

        {/* TO — SearchableInput with FlatList dropdown */}
        <SearchableInput
          value={toAddress}
          onChangeText={setToAddress}
          onPlaceSelected={handlePlaceSelected}
          placeholder="Search destination (e.g. College, Hospital)"
          icon="location"
          iconColor="#FF4D4D"
          userLocation={fromLocation}
          showLoadingWhen={loading}
        />

        {!toLocation && (
          <TouchableOpacity style={styles.pinHint} onPress={() => setSelectingTo(true)}>
            <Ionicons name="pin" size={18} color="#007AFF" />
            <Text style={styles.pinHintText}>Or tap map to pin destination</Text>
          </TouchableOpacity>
        )}

        {/* Live notice */}
        <View style={styles.liveNotice}>
          <Ionicons name="location" size={15} color="#FF6B9D" />
          <Text style={styles.liveNoticeText}>
            Your live location will be streamed to guardians in real time during this journey.
          </Text>
        </View>

        {/* Start button */}
        <TouchableOpacity
          style={[styles.startButton, (!canStart || loading) && styles.buttonDisabled]}
          onPress={handleStartJourney}
          disabled={!canStart || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="large" />
          ) : (
            <>
              <Ionicons name="navigate" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Start Journey</Text>
            </>
          )}
        </TouchableOpacity>

        {loading && (
          <Text style={styles.loadingNote}>Getting road route & connecting live tracking…</Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    backgroundColor: '#FF6B9D',
  },
  backButton: { padding: 8 },
  title: { fontSize: 22, fontWeight: '700', color: '#fff' },
  mapContainer: { height: '42%', position: 'relative' },
  map: { flex: 1 },
  tapHint: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
  },
  tapHintText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  formContainer: {
    flex: 1, paddingHorizontal: 20, paddingTop: 18,
    paddingBottom: 12, backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 14, backgroundColor: '#FAFAFA',
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#1a1a1a', fontWeight: '500' },
  pinHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, paddingHorizontal: 4, marginBottom: 10, marginTop: -6,
  },
  pinHintText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
  liveNotice: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF0F5', padding: 10, borderRadius: 10,
    marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#FF6B9D',
  },
  liveNoticeText: { fontSize: 12, color: '#FF6B9D', fontWeight: '500', flex: 1, lineHeight: 17 },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, backgroundColor: '#FF6B9D', borderRadius: 14, paddingVertical: 15,
    elevation: 3, shadowColor: '#FF6B9D', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  buttonDisabled: { backgroundColor: '#D0D0D0', elevation: 0, shadowOpacity: 0 },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  loadingNote: { textAlign: 'center', color: '#666', fontSize: 12, marginTop: 10, fontWeight: '500' },
});