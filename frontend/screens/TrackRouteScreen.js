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
import { saveGPSPoint, logDeviationAlert, endTrip } from '../services/api';

// Hybrid deviation constants
const CORRIDOR_RADIUS_METERS = 75;   // max distance from road before flagging
const DEVIATION_TIME_MS = 60000;     // must be off-route for 60s continuously
const DEVIATION_DIST_METERS = 150;   // must have moved 150m while off-route
const PROGRESS_SAMPLE_SIZE = 4;      // number of recent GPS points used to judge destination progress

export default function TrackRouteScreen({ route, navigation }) {
  const {
    tripId: initialTripId,
    polyline,
    fromAddress, toAddress,
    fromLatitude, fromLongitude,
    toLatitude, toLongitude,
    token,
  } = route.params;

  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [gpsPointCount, setGpsPointCount] = useState(0);
  const [deviationMeters, setDeviationMeters] = useState(0);
  const [isOnRoute, setIsOnRoute] = useState(true);
  const [showDeviationAlert, setShowDeviationAlert] = useState(false);
  const [canDismissAlert, setCanDismissAlert] = useState(false);
  const [loading, setLoading] = useState(false);

  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const timerInterval = useRef(null);
  const startTime = useRef(Date.now());
  const deviationAlertShown = useRef(false);
  const showAlertRef = useRef(false);
  const tripIdRef = useRef(initialTripId);
  const fullRouteRef = useRef({
    learnedRoute: { path: polyline || [] },
    to_latitude: toLatitude,
    to_longitude: toLongitude,
  });
  const outsideCorridorSince = useRef(null);
  const outsideCorridorStartLoc = useRef(null);
  const recentDestDistances = useRef([]);

  const region = {
    latitude: fromLatitude,
    longitude: fromLongitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  useEffect(() => {
    startTracking();
    return () => { cleanup(); };
  }, []);

  const cleanup = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    showAlertRef.current = false;
  };

  const startTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required for tracking');
      navigation.goBack();
      return;
    }

    locationSubscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 10 },
      handleLocationUpdate
    );

    timerInterval.current = setInterval(() => {
      setElapsedTime(Date.now() - startTime.current);
    }, 1000);
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
      await saveGPSPoint(tripIdRef.current, latitude, longitude, accuracy, token);
      calculateDeviation(latitude, longitude);
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

  // Haversine distance in metres between two lat/lng points
  const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // Distance in metres from point (px,py) to closest point on segment (x1,y1)→(x2,y2)
  const getDistanceFromSegment = (px, py, x1, y1, x2, y2) => {
    const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
    const lenSq = C * C + D * D;
    const param = lenSq !== 0 ? (A * C + B * D) / lenSq : -1;
    const closestLat = param < 0 ? x1 : param > 1 ? x2 : x1 + param * C;
    const closestLng = param < 0 ? y1 : param > 1 ? y2 : y1 + param * D;
    return getHaversineDistance(px, py, closestLat, closestLng);
  };

  // Minimum distance in metres from a point to any segment of the Google polyline
  const getMinDistanceToPolyline = (lat, lng, polyline) => {
    let minDist = Infinity;
    for (let i = 0; i < polyline.length - 1; i++) {
      const dist = getDistanceFromSegment(
        lat, lng,
        polyline[i].latitude, polyline[i].longitude,
        polyline[i + 1].latitude, polyline[i + 1].longitude
      );
      if (dist < minDist) minDist = dist;
    }
    return minDist;
  };

  // Returns true if the last PROGRESS_SAMPLE_SIZE readings show the user is
  // consistently getting closer to the destination (valid reroute scenario).
  // A genuine threat (abduction / forced detour) moves the user AWAY from destination.
  const isProgressingToDestination = () => {
    const samples = recentDestDistances.current;
    if (samples.length < PROGRESS_SAMPLE_SIZE) return false; // not enough data yet
    // Count how many consecutive steps showed a decrease
    let decreasingSteps = 0;
    for (let i = 1; i < samples.length; i++) {
      if (samples[i] < samples[i - 1]) decreasingSteps++;
    }
    // If majority of recent steps moved closer → user is on a valid reroute
    return decreasingSteps >= Math.ceil((samples.length - 1) * 0.6);
  };

  // Hybrid deviation check: polyline corridor + 60s/150m time-distance buffer
  // + destination-progress guard (absorbs Google reroutes)
  const calculateDeviation = (latitude, longitude) => {
    const polyline = fullRouteRef.current?.learnedRoute?.path;
    if (!polyline || polyline.length < 2) return; // polyline not loaded yet

    // Track distance to destination for reroute detection
    const destLat = fullRouteRef.current.to_latitude;
    const destLng = fullRouteRef.current.to_longitude;
    const distToDest = getHaversineDistance(latitude, longitude, destLat, destLng);
    recentDestDistances.current = [
      ...recentDestDistances.current.slice(-(PROGRESS_SAMPLE_SIZE - 1)),
      distToDest
    ];

    const minDist = getMinDistanceToPolyline(latitude, longitude, polyline);
    setDeviationMeters(Math.round(minDist));
    const onRoute = minDist <= CORRIDOR_RADIUS_METERS;
    setIsOnRoute(onRoute);

    if (!onRoute) {
      const now = Date.now();
      if (!outsideCorridorSince.current) {
        // First point outside corridor — start timer and record position
        outsideCorridorSince.current = now;
        outsideCorridorStartLoc.current = { latitude, longitude };
      }

      const timeOutside = now - outsideCorridorSince.current;
      const distMoved = getHaversineDistance(
        outsideCorridorStartLoc.current.latitude,
        outsideCorridorStartLoc.current.longitude,
        latitude, longitude
      );

      // Suppress alert if user is progressing toward destination —
      // this means they are on a valid Google reroute, not a genuine threat.
      if (isProgressingToDestination()) {
        console.log('📍 Off stored corridor but progressing to destination — reroute, not a threat');
        return;
      }

      // Only alert after 60s off-route AND moved 150m AND moving away from destination
      if (
        timeOutside >= DEVIATION_TIME_MS &&
        distMoved >= DEVIATION_DIST_METERS &&
        !deviationAlertShown.current
      ) {
        deviationAlertShown.current = true;
        showAlertRef.current = true;
        setShowDeviationAlert(true);
        setTimeout(() => setCanDismissAlert(true), 3000);
        setTimeout(() => {
          if (showAlertRef.current) handleDeviationResponse('no_response');
        }, 30000);
      }
    } else {
      // Back inside corridor — reset timer so future deviation can re-trigger
      outsideCorridorSince.current = null;
      outsideCorridorStartLoc.current = null;
    }
  };

  const handleDeviationResponse = async (response) => {
    try {
      await logDeviationAlert(
        tripIdRef.current,
        deviationMeters,
        currentLocation.latitude,
        currentLocation.longitude,
        response,
        token
      );

      showAlertRef.current = false;
      setShowDeviationAlert(false);
      setCanDismissAlert(false);
      // Reset so a later deviation in the same trip can trigger again
      deviationAlertShown.current = false;
      outsideCorridorSince.current = null;
      outsideCorridorStartLoc.current = null;
      recentDestDistances.current = [];

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
      cleanup();

      const response = await endTrip(tripIdRef.current, token);
      if (response.success) {
        const minutes = Math.floor(response.duration / 60000);
        Alert.alert(
          'Journey Completed!',
          `Duration: ${minutes} minutes\nYou have safely arrived.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
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
            coordinate={{ latitude: fromLatitude, longitude: fromLongitude }}
            pinColor="green"
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={40} color="#4CAF50" />
            </View>
          </Marker>
          <Circle
            center={{ latitude: fromLatitude, longitude: fromLongitude }}
            radius={25}
            strokeColor="rgba(76, 175, 80, 0.5)"
            fillColor="rgba(76, 175, 80, 0.2)"
          />

          <Marker
            coordinate={{ latitude: toLatitude, longitude: toLongitude }}
            pinColor="red"
          >
            <View style={styles.markerContainer}>
              <Ionicons name="location" size={40} color="#FF4D4D" />
            </View>
          </Marker>
          <Circle
            center={{ latitude: toLatitude, longitude: toLongitude }}
            radius={25}
            strokeColor="rgba(255, 77, 77, 0.5)"
            fillColor="rgba(255, 77, 77, 0.2)"
          />

          {/* Google road polyline — reference route in green dashed line */}
          {polyline && polyline.length > 1 && (
            <Polyline
              coordinates={polyline}
              strokeColor="#4CAF50"
              strokeWidth={3}
              lineDashPattern={[8, 6]}
            />
          )}

          {/* User's actual GPS trail — solid blue line */}
          {gpsPoints.length > 1 && (
            <Polyline
              coordinates={gpsPoints}
              strokeColor="#007AFF"
              strokeWidth={4}
            />
          )}
        </MapView>

        <View style={[
            styles.statusOverlay,
            { backgroundColor: isOnRoute ? '#4CAF50' : '#FF4D4D' }
          ]}>
            <Ionicons
              name={isOnRoute ? 'checkmark-circle' : 'warning'}
              size={20}
              color="#fff"
            />
            <Text style={styles.statusText}>
              {isOnRoute ? '✓ ON ROUTE' : `⚠ OFF ROUTE (${deviationMeters}m off)`}
            </Text>
          </View>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.routeTitle}>
          <View style={styles.routeTitleRow}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.routeAddress}>{fromAddress}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#666" />
          <View style={styles.routeTitleRow}>
            <Ionicons name="location" size={20} color="#FF4D4D" />
            <Text style={styles.routeAddress}>{toAddress}</Text>
          </View>
        </View>

        <View style={styles.trackingContainer}>
          <View style={styles.trackingStats}>
            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>Elapsed Time</Text>
              <Text style={styles.timeValue}>{formatTime(elapsedTime)}</Text>
            </View>

            <View style={styles.timeCard}>
              <Text style={styles.timeLabel}>GPS Points</Text>
              <Text style={styles.timeValue}>{gpsPointCount}</Text>
            </View>
          </View>

          <View style={styles.gpsInfo}>
            <Ionicons name="navigate" size={16} color="#666" />
            <Text style={styles.gpsText}>Tracking active — guardians notified</Text>
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
              You've been {deviationMeters}m off your route for over 1 minute.
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