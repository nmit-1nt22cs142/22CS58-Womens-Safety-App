import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createRoute } from '../services/api';

export default function AddRouteScreen({ navigation, route }) {
  const { token: routeToken } = route.params || {};
  
  const [token, setToken] = useState(routeToken || '');
  const [loading, setLoading] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Form state
  const [fromAddress, setFromAddress] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  
  // Map state
  const [region, setRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [selectingMode, setSelectingMode] = useState(null); // 'from' or 'to'
  
  const mapRef = useRef(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      if (!token) {
        const authToken = await AsyncStorage.getItem('authToken');
        if (authToken) {
          setToken(authToken);
        }
      }

      // Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to use this feature');
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } catch (error) {
      console.error('Error initializing:', error);
    }
  };

  const handleMapPress = (event) => {
    const coordinate = event.nativeEvent.coordinate;

    if (selectingMode === 'from') {
      setFromLocation(coordinate);
      setSelectingMode(null);
      
      // Animate to selected location
      mapRef.current?.animateToRegion({
        ...coordinate,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    } else if (selectingMode === 'to') {
      setToLocation(coordinate);
      setSelectingMode(null);
      
      // Animate to selected location
      mapRef.current?.animateToRegion({
        ...coordinate,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  const handleSaveRoute = async () => {
    // Validation
    if (!fromAddress.trim()) {
      Alert.alert('Error', 'Please enter FROM address name');
      return;
    }

    if (!toAddress.trim()) {
      Alert.alert('Error', 'Please enter TO address name');
      return;
    }

    if (!fromLocation) {
      Alert.alert('Error', 'Please tap on the map to set FROM location');
      return;
    }

    if (!toLocation) {
      Alert.alert('Error', 'Please tap on the map to set TO location');
      return;
    }

    try {
      setLoading(true);

      const routeData = {
        fromAddress: fromAddress.trim(),
        toAddress: toAddress.trim(),
        fromLatitude: fromLocation.latitude,
        fromLongitude: fromLocation.longitude,
        toLatitude: toLocation.latitude,
        toLongitude: toLocation.longitude
      };

      const response = await createRoute(routeData, token);

      if (response.success) {
        Alert.alert(
          'Success',
          'Route saved! Your route has been mapped using Google Directions.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack()
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to save route');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.title}>Add New Route</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={region}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            {fromLocation && (
              <>
                <Marker
                  coordinate={fromLocation}
                  pinColor="green"
                  draggable
                  onDragEnd={(e) => setFromLocation(e.nativeEvent.coordinate)}
                >
                  <View style={styles.markerContainer}>
                    <Ionicons name="location" size={40} color="#4CAF50" />
                  </View>
                </Marker>
                <Circle
                  center={fromLocation}
                  radius={25}
                  strokeColor="rgba(76, 175, 80, 0.5)"
                  fillColor="rgba(76, 175, 80, 0.2)"
                />
              </>
            )}

            {toLocation && (
              <>
                <Marker
                  coordinate={toLocation}
                  pinColor="red"
                  draggable
                  onDragEnd={(e) => setToLocation(e.nativeEvent.coordinate)}
                >
                  <View style={styles.markerContainer}>
                    <Ionicons name="location" size={40} color="#FF4D4D" />
                  </View>
                </Marker>
                <Circle
                  center={toLocation}
                  radius={25}
                  strokeColor="rgba(255, 77, 77, 0.5)"
                  fillColor="rgba(255, 77, 77, 0.2)"
                />
              </>
            )}
          </MapView>

          {/* Map Instruction Overlay */}
          {selectingMode && (
            <View style={styles.instructionOverlay}>
              <Text style={styles.instructionText}>
                📍 Tap map to set {selectingMode === 'from' ? 'FROM' : 'TO'} location
              </Text>
            </View>
          )}
        </View>

        {/* Form Section */}
        <ScrollView style={styles.formContainer}>
          <View style={styles.formHeader}>
            <Text style={styles.formTitle}>Route Details</Text>
            <TouchableOpacity onPress={() => setShowInfoModal(true)}>
              <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* FROM Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FROM Address</Text>
            <TextInput
              style={styles.input}
              value={fromAddress}
              onChangeText={setFromAddress}
              placeholder="e.g., Home"
              onFocus={() => setSelectingMode('from')}
            />
            <View style={styles.statusRow}>
              {fromLocation ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.statusTextSuccess}>From: Set</Text>
                </>
              ) : (
                <>
                  <Ionicons name="radio-button-off" size={18} color="#999" />
                  <Text style={styles.statusTextPending}>From: Not set</Text>
                </>
              )}
            </View>
          </View>

          {/* TO Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>TO Address</Text>
            <TextInput
              style={styles.input}
              value={toAddress}
              onChangeText={setToAddress}
              placeholder="e.g., College"
              onFocus={() => setSelectingMode('to')}
            />
            <View style={styles.statusRow}>
              {toLocation ? (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.statusTextSuccess}>To: Set</Text>
                </>
              ) : (
                <>
                  <Ionicons name="radio-button-off" size={18} color="#999" />
                  <Text style={styles.statusTextPending}>To: Not set</Text>
                </>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!fromAddress || !toAddress || !fromLocation || !toLocation || loading) && styles.saveButtonDisabled
            ]}
            onPress={handleSaveRoute}
            disabled={!fromAddress || !toAddress || !fromLocation || !toLocation || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save Route</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Info Modal */}
        <Modal
          visible={showInfoModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowInfoModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>How Geofencing Works</Text>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                  <Ionicons name="close" size={28} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.modalText}>
                  <Text style={styles.modalBold}>Geofence Radius:</Text> 25 meters
                </Text>
                
                <Text style={styles.modalText}>
                  Tracking will automatically start when you leave the FROM location and stop when you reach the TO location.
                </Text>

                <Text style={styles.modalText}>
                  The 25-meter radius ensures accurate detection while avoiding false triggers.
                </Text>

                <Text style={styles.modalText}>
                  <Text style={styles.modalBold}>Learning:</Text> After completing 3 trips on this route, the app will learn your usual path and can detect deviations for safety.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
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
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  mapContainer: {
    height: '55%',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  statusTextSuccess: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  statusTextPending: {
    fontSize: 14,
    color: '#999',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalBody: {
    padding: 20,
  },
  modalText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 24,
    marginBottom: 15,
  },
  modalBold: {
    fontWeight: 'bold',
    color: '#333',
  },
});