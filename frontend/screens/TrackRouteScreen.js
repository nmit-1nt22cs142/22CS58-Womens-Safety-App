import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker, Circle, Polyline } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { startTrip, saveGPSPoint, logDeviationAlert, endTrip } from '../services/api';

export default function TrackRouteScreen({ route, navigation }) {
  const { route: routeData, token } = route.params;

  const [tracking, setTracking] = useState(false);
  const [tripId, setTripId] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsPointCount, setGpsPointCount] = useState(0);
  const [deviationPercentage, setDeviationPercentage] = useState(0);
  const [isOnRoute, setIsOnRoute] = useState(true);
  const [showDeviationAlert, setShowDeviationAlert] = useState(false);
  const [canDismissAlert, setCanDismissAlert] = useState(false);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerInterval = useRef(null);
  const startTime = useRef(null);
  const deviationAlertShown = useRef(false);

  const region = {
    latitude: routeData.from_latitude,
    longitude: routeData.from_longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    requestLocationPermission();

    return () => {
      stopTracking();
    };
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for tracking');
      navigation.goBack();
    }
  };

  const handleStartTracking = async () => {
    try {
      setLoading(true);

      const response = await startTrip(routeData.id, token);

      if (response.success) {
        setTripId(response.tripId);
        setTracking(true);
        startTime.current = Date.now();
        deviationAlertShown.current = false;

        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 10000,
            distanceInterval: 10,
          },
          handleLocationUpdate
        );

        timerInterval.current = setInterval(() => {
          const elapsed = Date.now() - startTime.current;
          setElapsedTime(elapsed);
        }, 1000);

        Alert.alert('Tracking Started', `${response.guardiansNotified} guardian(s) notified`);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to start tracking');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationUpdate = async (location) => {
    const { latitude, longitude, accuracy } = location.coords;

    if (accuracy > 50) {
      console.log('Low accuracy, ignoring point:', accuracy);
      return;
    }

    setCurrentLocation({ latitude, longitude });

    const newPoint = { latitude, longitude };
    setGpsPoints(prev => [...prev, newPoint]);
    setGpsPointCount(prev => prev + 1);

    try {
      await saveGPSPoint(tripId, latitude, longitude, accuracy, token);

      if (routeData.trips_completed >= 1) {
        calculateDeviation(latitude, longitude);
      }
    } catch (error) {
      console.error('Error saving GPS point:', error);
    }

    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  const calculateDeviation = (latitude, longitude) => {
    const fromLat = routeData.from_latitude;
    const fromLng = routeData.from_longitude;
    const toLat = routeData.to_latitude;
    const toLng = routeData.to_longitude;

    const distance = getDistanceFromLine(
      latitude,
      longitude,
      fromLat,
      fromLng,
      toLat,
      toLng
    );

    const routeDistance = getDistance(fromLat, fromLng, toLat, toLng);

    const deviation = (distance / routeDistance) * 100;
    setDeviationPercentage(Math.min(deviation, 100));

    if (deviation > 20) {
      setIsOnRoute(false);
      
      if (!deviationAlertShown.current) {
        deviationAlertShown.current = true;
        setShowDeviationAlert(true);
        
        setTimeout(() => {
          setCanDismissAlert(true);
        }, 3000);

        setTimeout(() => {
          if (showDeviationAlert) {
            handleDeviationResponse('no_response');
          }
        }, 30000);
      }
    } else {
      setIsOnRoute(true);
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const getDistanceFromLine = (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;

    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return getDistance(px, py, xx, yy);
  };

  const handleDeviationResponse = async (response) => {
    try {
      await logDeviationAlert(
        tripId,
        deviationPercentage,
        currentLocation.latitude,
        currentLocation.longitude,
        response,
        token
      );

      setShowDeviationAlert(false);
      setCanDismissAlert(false);

      if (response === 'emergency') {
        Alert.alert('Emergency Alert Sent', 'All your guardians have been notified!');
      } else if (response === 'safe') {
        Alert.alert('Good to know', 'Your guardians have been informed you are safe.');
      }
    } catch (error) {
      console.error('Error logging deviation:', error);
    }
  };

  const handleStopTracking = () => {
    Alert.alert(
      'Stop Tracking',
      'Are you sure you want to stop tracking this journey?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: stopTracking,
        },
      ]
    );
  };

  const stopTracking = async () => {
    try {
      setLoading(true);

      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }

      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }

      if (tripId) {
        const response = await endTrip(tripId, token);

        if (response.success) {
          const minutes = Math.floor(response.duration / 60000);
          Alert.alert(
            'Trip Completed!',
            `Duration: ${minutes} minutes\n` +
            `Route is ${routeData.learned_percentage + 33}% learned.\n` +
            `${3 - (routeData.trips_completed + 1)} more trips to fully learn.`,
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]
          );
        }
      }

      setTracking(false);
      setTripId(null);
      setElapsedTime(0);
      setGpsPoints([]);
      setGpsPointCount(0);
      setDeviationPercentage(0);
      setIsOnRoute(true);
    } catch (error) {
      console.error('Error stopping tracking:', error);
      Alert.alert('Error', 'Failed to stop tracking properly');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatEstimatedTime = (milliseconds) => {
    if (!milliseconds) return 'Calculating...';
    
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Track Route</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={region}
          showsUserLocation
        >
          <Marker
            coordinate={{
              latitude: routeData.from_latitude,
              longitude: routeData.from_longitude,
            }}
            pinColor="green"
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={40} color="#4CAF50" />
            </View>
          </Marker>
          <Circle
            center={{
              latitude: routeData.from_latitude,
              longitude: routeData.from_longitude,
            }}
            radius={25}
            strokeColor="rgba(76, 175, 80, 0.5)"
            fillColor="rgba(76, 175, 80, 0.2)"
          />

          <Marker
            coordinate={{
              latitude: routeData.to_latitude,
              longitude: routeData.to_longitude,
            }}
            pinColor="red"
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={40} color="#FF4D4D" />
            </View>
          </Marker>
          <Circle
            center={{
              latitude: routeData.to_latitude,
              longitude: routeData.to_longitude,
            }}
            radius={25}
            strokeColor="rgba(255, 77, 77, 0.5)"
            fillColor="rgba(255, 77, 77, 0.2)"
          />

          {gpsPoints.length > 1 && (
            <Polyline
              coordinates={gpsPoints}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
        </MapView>

        {tracking && (
          <View style={[
            styles.statusOverlay,
            { backgroundColor: isOnRoute ? '#4CAF50' : '#FF4D4D' }
          ]}>
            <Ionicons 
              name={isOnRoute ? "checkmark-circle" : "warning"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.statusText}>
              {isOnRoute ? '✓ ON ROUTE' : `⚠ OFF ROUTE (${deviationPercentage.toFixed(0)}%)`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.routeTitle}>
          <View style={styles.routeTitleRow}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.routeAddress}>{routeData.from_address}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#666" />
          <View style={styles.routeTitleRow}>
            <Ionicons name="location" size={20} color="#FF4D4D" />
            <Text style={styles.routeAddress}>{routeData.to_address}</Text>
          </View>
        </View>

        {!tracking ? (
          <View style={styles.notTrackingContainer}>
            <Text style={styles.instructionText}>
              Press START to begin tracking. The algorithm will learn your pattern after 3 trips.
            </Text>
            
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Trips Completed</Text>
                <Text style={styles.statValue}>{routeData.trips_completed} / 3</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Learning Progress</Text>
                <Text style={styles.statValue}>{routeData.learned_percentage}%</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.trackButton, loading && styles.buttonDisabled]}
              onPress={handleStartTracking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={24} color="#fff" />
                  <Text style={styles.trackButtonText}>Start Tracking</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.trackingContainer}>
            <View style={styles.trackingStats}>
              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>Elapsed Time</Text>
                <Text style={styles.timeValue}>{formatTime(elapsedTime)}</Text>
              </View>

              <View style={styles.timeCard}>
                <Text style={styles.timeLabel}>Estimated Time</Text>
                <Text style={styles.timeValue}>{formatEstimatedTime(routeData.estimated_time)}</Text>
              </View>
            </View>

            <View style={styles.gpsInfo}>
              <Ionicons name="navigate" size={16} color="#666" />
              <Text style={styles.gpsText}>{gpsPointCount} GPS points recorded</Text>
            </View>

            <TouchableOpacity
              style={[styles.stopButton, loading && styles.buttonDisabled]}
              onPress={handleStopTracking}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="stop" size={24} color="#fff" />
                  <Text style={styles.stopButtonText}>Stop Tracking</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal
        visible={showDeviationAlert}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (canDismissAlert) {
            setShowDeviationAlert(false);
          }
        }}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertModal}>
            <View style={styles.alertHeader}>
              <Ionicons name="warning" size={60} color="#FF9800" />
              <Text style={styles.alertTitle}>⚠️ Route Deviation Detected!</Text>
            </View>

            <Text style={styles.alertMessage}>
              You've deviated {deviationPercentage.toFixed(1)}% from your usual route.
            </Text>

            <Text style={styles.alertQuestion}>Are you safe?</Text>

            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={styles.safeButton}
                onPress={() => handleDeviationResponse('safe')}
                disabled={!canDismissAlert}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.buttonText}>Yes, I'm Safe</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.emergencyButton}
                onPress={() => handleDeviationResponse('emergency')}
                disabled={!canDismissAlert}
              >
                <Ionicons name="alert-circle" size={24} color="#fff" />
                <Text style={styles.buttonText}>No, Send Alert</Text>
              </TouchableOpacity>
            </View>

            {!canDismissAlert && (
              <Text style={styles.waitText}>Please wait 3 seconds...</Text>
            )}
          </View>
        </View>
      </Modal>
    </View>
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
  statusOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  routeTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  routeAddress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  notTrackingContainer: {
    flex: 1,
  },
  instructionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  trackButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackingContainer: {
    flex: 1,
  },
  trackingStats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  timeCard: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
  },
  timeValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  gpsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  gpsText: {
    fontSize: 13,
    color: '#666',
  },
  stopButton: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 12,
    gap: 10,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 25,
    width: '100%',
    maxWidth: 400,
  },
  alertHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  alertQuestion: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  alertButtons: {
    gap: 12,
  },
  safeButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  emergencyButton: {
    backgroundColor: '#d32f2f',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
    gap: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  waitText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 15,
    fontStyle: 'italic',
  },
});