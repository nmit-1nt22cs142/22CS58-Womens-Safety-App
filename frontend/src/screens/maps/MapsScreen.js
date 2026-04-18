import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Dimensions, StatusBar, Platform
} from 'react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../styles/colors';

const { width } = Dimensions.get('window');

export default function MapsScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pinAnim = useRef(new Animated.Value(0)).current;
  const [currentAddress, setCurrentAddress] = useState('Detecting current location...');
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    // 1. Fetch Location
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentAddress('Location permission denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (location) {
          setCoords(location.coords);
          let reverseGeocode = await Location.reverseGeocodeAsync({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          if (reverseGeocode.length > 0) {
            const place = reverseGeocode[0];
            setCurrentAddress(`${place.name || ''}, ${place.street || ''}, ${place.city || ''}`);
          }
        }
      } catch (error) {
        console.log('Maps Location Error:', error);
        setCurrentAddress('Using estimated location');
      }
    })();

    // 2. Animations
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pinAnim, {
          toValue: -10, duration: 800, useNativeDriver: true
        }),
        Animated.timing(pinAnim, {
          toValue: 0, duration: 800, useNativeDriver: true
        }),
      ])
    ).start();
  }, []);

  const recentRoutes = [
    { from: 'NMIT College', to: 'Home (Yelahanka)', time: '25 min', date: 'Today', safe: true },
    { from: 'Rajajinagar', to: 'NMIT College', time: '40 min', date: 'Yesterday', safe: true },
    { from: 'MG Road', to: 'Home (Yelahanka)', time: '55 min', date: '2 days ago', safe: false },
  ];

  const safetyZones = [
    { name: 'NMIT Campus', safety: 'high', color: colors.success },
    { name: 'Yelahanka New Town', safety: 'medium', color: colors.warning },
    { name: 'Hebbal Flyover Area', safety: 'low', color: colors.error },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Fake Map Background */}
      <View style={styles.mapPlaceholder}>
        <LinearGradient
          colors={['#E8F4FD', '#D1E8F0', '#C5DDE8']}
          style={StyleSheet.absoluteFill}
        />
        {/* Grid pattern to simulate map */}
        {[...Array(8)].map((_, i) => (
          <View key={`h${i}`} style={[styles.mapLine, { top: i * 60, left: 0, right: 0, height: 1 }]} />
        ))}
        {[...Array(6)].map((_, i) => (
          <View key={`v${i}`} style={[styles.mapLine, { left: i * 80, top: 0, bottom: 0, width: 1 }]} />
        ))}

        {/* Location Pin */}
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
        <View style={[styles.marker, { bottom: 120, left: 100 }]}>
          <View style={[styles.markerDot, { backgroundColor: colors.error }]} />
        </View>
      </View>

      {/* Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { opacity: fadeAnim }]}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetContent}>
          {/* Start Tracking Button */}
          <TouchableOpacity activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.trackButton}
            >
              <Ionicons name="navigate" size={22} color="#fff" />
              <Text style={styles.trackButtonText}>Start Live Tracking</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Coming Soon Badge */}
          <View style={styles.comingSoon}>
            <Ionicons name="location-outline" size={14} color={colors.primary} />
            <Text style={styles.comingSoonText} numberOfLines={1}>{currentAddress}</Text>
          </View>

          {/* Safety Zones */}
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

          {/* Recent Routes */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Routes</Text>
          </View>
          {recentRoutes.map((route, i) => (
            <TouchableOpacity key={i} style={styles.routeCard} activeOpacity={0.7}>
              <View style={styles.routeIcon}>
                <Ionicons name="trail-sign-outline" size={20} color={colors.primary} />
              </View>
              <View style={styles.routeContent}>
                <Text style={styles.routeFrom}>{route.from}</Text>
                <View style={styles.routeArrow}>
                  <View style={styles.routeLine} />
                  <Ionicons name="arrow-forward" size={12} color={colors.textLight} />
                </View>
                <Text style={styles.routeTo}>{route.to}</Text>
                <Text style={styles.routeMeta}>{route.time} • {route.date}</Text>
              </View>
              <View style={[styles.safeTag, { backgroundColor: route.safe ? colors.successLight : colors.errorLight }]}>
                <Text style={[styles.safeTagText, { color: route.safe ? colors.success : colors.error }]}>
                  {route.safe ? 'Safe' : 'Alert'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Map
  mapPlaceholder: {
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  mapLine: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinShadow: {
    width: 20,
    height: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginTop: -4,
  },
  marker: {
    position: 'absolute',
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  // Bottom Sheet
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
  sheetContent: {
    marginTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 16,
  },

  // Track Button
  trackButton: {
    flexDirection: 'row',
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  trackButtonText: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
    fontSize: 16,
  },

  // Coming Soon
  comingSoon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },

  // Section
  sectionHeader: { marginBottom: 12, marginTop: 8 },
  sectionTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 16,
    color: colors.text,
  },

  // Safety Zones
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    gap: 8,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zoneText: { fontSize: 13, color: colors.text, fontWeight: '500' },
  zoneSafety: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },

  // Routes
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
  },
  routeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  routeContent: { flex: 1 },
  routeFrom: { fontSize: 14, fontWeight: '600', color: colors.text },
  routeArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  routeLine: {
    width: 16,
    height: 1,
    backgroundColor: colors.textLight,
    marginRight: 4,
  },
  routeTo: { fontSize: 14, fontWeight: '600', color: colors.text },
  routeMeta: { fontSize: 11, color: colors.textLight, marginTop: 3 },
  safeTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  safeTagText: { fontSize: 11, fontWeight: '700' },
});
