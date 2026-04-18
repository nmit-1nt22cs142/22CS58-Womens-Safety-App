import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { triggerDangerAlert } from '../services/api';

const HomeScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      
      if (authToken && userData) {
        setToken(authToken);
        setUser(JSON.parse(userData));
      } else if (route?.params?.user && route?.params?.token) {
        // Fallback to route params
        setUser(route.params.user);
        setToken(route.params.token);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleDangerButton = () => {
    Alert.alert(
      '🚨 EMERGENCY ALERT',
      'Send danger alert to all your guardians?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'SEND ALERT',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await triggerDangerAlert(
                null, // latitude (can add later with GPS)
                null, // longitude
                'Emergency! I need help!',
                token
              );
              
              if (response.success) {
                Alert.alert(
                  'Alert Sent!',
                  `Emergency alert sent to ${response.guardiansNotified} guardian(s)`,
                  [{ text: 'OK' }]
                );
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

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
    >
      {/* HERO BANNER */}
      <View style={styles.bannerCard}>
        <Text style={styles.bannerTitleBig}>Help is one tap away</Text>
        <Text style={styles.bannerTitleSmall}>Strong. Aware. Protected</Text>
        {user && (
          <Text style={styles.welcomeText}>Welcome, {user.name}!</Text>
        )}
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

      {/* LIVE SAFE SECTION */}
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

      {/* SEND LOCATION */}
      <View style={styles.locationCard}>
        <Ionicons name="location-outline" size={40} color="#FF6B9D" />
        <View style={{ marginLeft: 10 }}>
          <Text style={styles.locationTitle}>Send Location</Text>
          <Text style={styles.locationSub}>Share Location</Text>
        </View>
      </View>

      {/* DANGER BUTTON */}
      <TouchableOpacity 
        style={[styles.largeDangerButton, loading && styles.buttonDisabled]}
        onPress={handleDangerButton}
        disabled={loading}
      >
        <Text style={styles.largeDangerText}>
          {loading ? 'SENDING...' : 'DANGER'}
        </Text>
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
  container: { 
    flex: 1, 
    backgroundColor: '#F7F7F7' 
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  bannerCard: {
    height: 120,
    borderRadius: 18,
    marginVertical: 10,
    backgroundColor: '#FAD0C4',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    elevation: 5,
  },
  bannerTitleBig: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  bannerTitleSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 4,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    fontWeight: '500',
  },
  sectionHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20,
    marginBottom: 10 
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#000' 
  },
  cardRow: { 
    flexDirection: 'row', 
    marginVertical: 10,
    gap: 10,
  },
  bigCard: { 
    flex: 1, 
    padding: 16, 
    borderRadius: 16, 
    minHeight: 130 
  },
  cardMainTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700' 
  },
  cardSubtitle: { 
    color: '#fff', 
    fontSize: 12, 
    marginTop: 5 
  },
  callButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 15,
    alignItems: 'center',
  },
  callButtonText: { 
    color: '#000', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  iconRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginVertical: 15 
  },
  iconContainer: { 
    alignItems: 'center', 
    width: 70 
  },
  iconLabel: { 
    marginTop: 5, 
    fontSize: 11, 
    color: '#444', 
    textAlign: 'center' 
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
    elevation: 5,
    marginTop: 10,
  },
  locationTitle: { 
    fontSize: 16, 
    fontWeight: '700' 
  },
  locationSub: { 
    fontSize: 12, 
    color: '#777' 
  },
  largeDangerButton: {
    backgroundColor: '#FF4D4D',
    marginTop: 25,
    paddingVertical: 30,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 8,
  },
  largeDangerText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  routesButton: {
    backgroundColor: '#007AFF',
    marginTop: 15,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    width: '100%',
    elevation: 5,
    gap: 10,
  },
  routesButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});