import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { triggerDangerAlert, startLiveLocation, updateLiveLocation, stopLiveLocation } from '../services/api';

const HomeScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  // Live location state
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationSessionId, setLocationSessionId] = useState(null);
  const [guardiansCount, setGuardiansCount] = useState(0);
  const locationIntervalRef = useRef(null);
  const sessionIdRef = useRef(null); // keep latest sessionId accessible inside interval

  useEffect(() => {
    loadUserData();
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  const loadUserData = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      if (authToken && userData) {
        setToken(authToken);
        setUser(JSON.parse(userData));
      } else if (route?.params?.user && route?.params?.token) {
        setUser(route.params.user);
        setToken(route.params.token);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  // ============================================
  // DANGER BUTTON
  // ============================================
  const handleDangerButton = () => {
    Alert.alert(
      '🚨 EMERGENCY ALERT',
      'Send danger alert to all your guardians?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'SEND ALERT',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await triggerDangerAlert(null, null, 'Emergency! I need help!', token);
              if (response.success) {
                Alert.alert('Alert Sent!', `Emergency alert sent to ${response.guardiansNotified} guardian(s)`);
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Failed to send alert');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // ============================================
  // LIVE LOCATION — START
  // ============================================
  const handleSendLocation = async () => {
    if (isSharingLocation) {
      handleStopSharing();
      return;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to share your location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const response = await startLiveLocation(latitude, longitude, token);

      if (response.success) {
        setLocationSessionId(response.sessionId);
        sessionIdRef.current = response.sessionId;
        setGuardiansCount(response.guardiansCount);
        setIsSharingLocation(true);

        // Push updates every 5 seconds
        locationIntervalRef.current = setInterval(async () => {
          try {
            const updated = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
            await updateLiveLocation(
              sessionIdRef.current,
              updated.coords.latitude,
              updated.coords.longitude,
              token
            );
            console.log('📍 Location updated:', updated.coords.latitude, updated.coords.longitude);
          } catch (err) {
            console.error('❌ Location update failed:', err);
          }
        }, 5000);

        Alert.alert(
          '📍 Live Location Active',
          `Your location is being shared with ${response.guardiansCount} guardian(s) and updates every 5 seconds.\n\nTap "Send Location" again to stop.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to share location');
    }
  };

  // ============================================
  // LIVE LOCATION — STOP
  // ============================================
  const handleStopSharing = () => {
    Alert.alert(
      'Stop Sharing',
      'Stop sharing your live location with guardians?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            try {
              if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = null;
              }
              if (sessionIdRef.current) {
                await stopLiveLocation(sessionIdRef.current, token);
              }
              setIsSharingLocation(false);
              setLocationSessionId(null);
              sessionIdRef.current = null;
              setGuardiansCount(0);
              Alert.alert('Stopped', 'Live location sharing has been stopped.');
            } catch (error) {
              console.error('Error stopping location share:', error);
              // Still stop locally
              setIsSharingLocation(false);
              setLocationSessionId(null);
              sessionIdRef.current = null;
              if (locationIntervalRef.current) {
                clearInterval(locationIntervalRef.current);
                locationIntervalRef.current = null;
              }
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* HERO BANNER */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerTitleBig}>Help is one tap away</Text>
        <Text style={styles.bannerTitleSmall}>Strong. Aware. Protected</Text>
        {user && <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>}
      </View>

      {/* EMERGENCY SECTION */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Emergency</Text>
      </View>

      <View style={styles.cardRow}>
        <View style={[styles.bigCard, { backgroundColor: '#FF6B6B' }]}>
          <Text style={styles.cardMainTitle}>Active Emergency</Text>
          <Text style={styles.cardSubtitle}>Call 0-1-5 for emergencies.</Text>
          <View style={styles.callButton}>
            <Text style={styles.callButtonText}>0-1-5</Text>
          </View>
        </View>
        <View style={[styles.bigCard, { backgroundColor: '#6BCB77' }]}>
          <Text style={styles.cardMainTitle}>Ambulance</Text>
          <Text style={styles.cardSubtitle}>In case of medical help.</Text>
          <View style={styles.callButton}>
            <Text style={styles.callButtonText}>1-1-2</Text>
          </View>
        </View>
      </View>

      {/* EXPLORE LIVESAFE */}
      <Text style={styles.sectionTitle}>Explore LiveSafe</Text>
      <View style={styles.iconRow}>
        {[
          { name: 'shield-outline', label: 'Police Stations' },
          { name: 'medkit-outline', label: 'Hospitals' },
          { name: 'bandage-outline', label: 'Pharmacies' },
          { name: 'bus-outline', label: 'Bus Stations' },
        ].map((item, index) => (
          <View key={index} style={styles.iconContainer}>
            <Ionicons name={item.name} size={28} color="#FF6B9D" />
            <Text style={styles.iconLabel}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* SEND LOCATION BUTTON */}
      <TouchableOpacity
        style={[styles.locationCard, isSharingLocation && styles.locationCardActive]}
        onPress={handleSendLocation}
        activeOpacity={0.8}
      >
        <View style={styles.locationIconWrapper}>
          <Ionicons
            name={isSharingLocation ? 'location' : 'location-outline'}
            size={36}
            color={isSharingLocation ? '#fff' : '#FF6B9D'}
          />
          {isSharingLocation && <View style={styles.pulsingDot} />}
        </View>

        <View style={styles.locationTextWrapper}>
          <Text style={[styles.locationTitle, isSharingLocation && styles.locationTitleActive]}>
            {isSharingLocation ? 'Sharing Live Location' : 'Send Location'}
          </Text>
          <Text style={[styles.locationSub, isSharingLocation && styles.locationSubActive]}>
            {isSharingLocation
              ? `Live • ${guardiansCount} guardian(s) tracking • updates every 5s`
              : 'Share your live location with all guardians'}
          </Text>
        </View>

        {isSharingLocation && (
          <View style={styles.stopPill}>
            <Text style={styles.stopPillText}>STOP</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* DANGER BUTTON */}
      <TouchableOpacity
        style={[styles.largeDangerButton, loading && styles.buttonDisabled]}
        onPress={handleDangerButton}
        disabled={loading}
      >
        <Text style={styles.largeDangerText}>{loading ? 'SENDING...' : 'DANGER'}</Text>
      </TouchableOpacity>

      {/* START JOURNEY BUTTON */}
      <TouchableOpacity
        style={styles.routesButton}
        onPress={() => navigation.navigate('StartJourney')}
      >
        <Ionicons name="navigate" size={24} color="#fff" />
        <Text style={styles.routesButtonText}>Start Journey</Text>
      </TouchableOpacity>

    </ScrollView>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  contentContainer: { padding: 20, paddingTop: 60, paddingBottom: 100 },

  bannerCard: {
    height: 120, borderRadius: 18, marginVertical: 10,
    backgroundColor: '#FAD0C4', justifyContent: 'center',
    alignItems: 'center', paddingHorizontal: 20, elevation: 5,
  },
  bannerTitleBig: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center' },
  bannerTitleSmall: { fontSize: 16, fontWeight: '600', color: '#000', marginTop: 4, textAlign: 'center' },
  welcomeText: { fontSize: 14, color: '#333', marginTop: 8, fontWeight: '500' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#000' },

  cardRow: { flexDirection: 'row', marginVertical: 10, gap: 10 },
  bigCard: { flex: 1, padding: 16, borderRadius: 16, minHeight: 130 },
  cardMainTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardSubtitle: { color: '#fff', fontSize: 12, marginTop: 5 },
  callButton: { backgroundColor: '#fff', paddingVertical: 8, borderRadius: 10, marginTop: 15, alignItems: 'center' },
  callButtonText: { color: '#000', fontSize: 16, fontWeight: 'bold' },

  iconRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  iconContainer: { alignItems: 'center', width: 70 },
  iconLabel: { marginTop: 5, fontSize: 11, color: '#444', textAlign: 'center' },

  // Location Card
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 5,
    marginTop: 10,
    gap: 12,
  },
  locationCardActive: {
    backgroundColor: '#FF6B9D',
    elevation: 8,
  },
  locationIconWrapper: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  pulsingDot: {
    position: 'absolute', top: 2, right: 2,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#FF6B9D',
  },
  locationTextWrapper: { flex: 1 },
  locationTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  locationTitleActive: { color: '#fff' },
  locationSub: { fontSize: 12, color: '#777', marginTop: 3 },
  locationSubActive: { color: 'rgba(255,255,255,0.85)' },
  stopPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
  },
  stopPillText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  largeDangerButton: {
    backgroundColor: '#FF4D4D', marginTop: 25, paddingVertical: 30,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    width: '100%', elevation: 8,
  },
  largeDangerText: { color: '#fff', fontSize: 28, fontWeight: 'bold', letterSpacing: 2 },
  buttonDisabled: { backgroundColor: '#ccc', opacity: 0.7 },

  routesButton: {
    backgroundColor: '#007AFF', marginTop: 15, paddingVertical: 20,
    borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', width: '100%', elevation: 5, gap: 10,
  },
  routesButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});