import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startTrip } from '../services/api';

export default function StartJourneyScreen({ navigation }) {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [fromAddress, setFromAddress] = useState('My Location');
  const [toAddress, setToAddress] = useState('');
  const [selectingTo, setSelectingTo] = useState(false);
  const [region, setRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const mapRef = useRef(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) setToken(authToken);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to start a journey');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      setFromLocation({ latitude, longitude });
      setRegion({ latitude, longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
    } catch (err) {
      console.error('Init error:', err);
    }
  };

  const handleMapPress = (e) => {
    if (!selectingTo) return;
    const coord = e.nativeEvent.coordinate;
    setToLocation(coord);
    setSelectingTo(false);
  };

  const handleStartJourney = async () => {
    if (!fromLocation) {
      Alert.alert('Error', 'Waiting for your current location. Please try again.');
      return;
    }
    if (!toLocation) {
      Alert.alert('Error', 'Tap on the map to set your destination first.');
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
        navigation.replace('TrackRoute', {
          tripId: response.tripId,
          polyline: response.polyline,
          fromAddress: fromAddress.trim() || 'My Location',
          toAddress: toAddress.trim(),
          fromLatitude: fromLocation.latitude,
          fromLongitude: fromLocation.longitude,
          toLatitude: toLocation.latitude,
          toLongitude: toLocation.longitude,
          token,
          guardiansNotified: response.guardiansNotified,
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
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>Start Journey</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
            onPress={handleMapPress}
            showsUserLocation
          >
            {fromLocation && (
              <Marker
                coordinate={fromLocation}
                pinColor="green"
                title="You are here"
              />
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

        {/* Form */}
        <View style={styles.formContainer}>

          {/* From */}
          <View style={styles.inputRow}>
            <Ionicons name="location" size={22} color="#4CAF50" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={fromAddress}
              onChangeText={setFromAddress}
              placeholder="From (your current location)"
            />
            {fromLocation
              ? <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              : <ActivityIndicator size="small" color="#999" />
            }
          </View>

          {/* To */}
          <View style={styles.inputRow}>
            <Ionicons name="location" size={22} color="#FF4D4D" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={toAddress}
              onChangeText={setToAddress}
              placeholder="Destination name (e.g. College)"
              onFocus={() => setSelectingTo(true)}
            />
            {toLocation && <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />}
          </View>

          {/* Tap-to-set hint button */}
          {!toLocation && (
            <TouchableOpacity style={styles.pinHint} onPress={() => setSelectingTo(true)}>
              <Ionicons name="pin" size={18} color="#007AFF" />
              <Text style={styles.pinHintText}>Tap map to pin destination</Text>
            </TouchableOpacity>
          )}

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.startButton, (!canStart || loading) && styles.buttonDisabled]}
            onPress={handleStartJourney}
            disabled={!canStart || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Ionicons name="navigate" size={26} color="#fff" />
                <Text style={styles.startButtonText}>Start Journey</Text>
              </>
            )}
          </TouchableOpacity>

          {loading && (
            <Text style={styles.loadingNote}>Getting road route from Google Maps…</Text>
          )}

        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: { padding: 5 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  mapContainer: { height: '42%', position: 'relative' },
  map: { flex: 1 },
  tapHint: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tapHintText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  formContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  pinHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  pinHintText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#FF6B9D',
    borderRadius: 16,
    paddingVertical: 18,
    marginTop: 8,
    elevation: 3,
  },
  buttonDisabled: { backgroundColor: '#ccc', elevation: 0 },
  startButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  loadingNote: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    marginTop: 10,
  },
});
