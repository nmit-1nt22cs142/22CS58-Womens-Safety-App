import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Dimensions, StatusBar, Platform, Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import { triggerDangerAlert, startLiveLocation, stopLiveLocation } from '../services/api';

// ⚠️ Must match YOUR_COMPUTER_IP in api.js
const SOCKET_URL = 'http://192.168.0.105:3000';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#FF9B69',
  primaryDark: '#E87D4A',
  primaryLight: '#FFD6C2',
  primaryFaded: 'rgba(255, 155, 105, 0.12)',
  background: '#F5F1EB',
  card: '#FFFFFF',
  text: '#2D2D3A',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  border: '#E8E0D8',
  error: '#EF4444',
  success: '#10B981',
  sosRed: '#DC2626',
  sosRedGlow: 'rgba(220, 38, 38, 0.3)',
  shadowColor: 'rgba(45, 45, 58, 0.08)',
};

const gradients = {
  primary: ['#FF9B69', '#FF6B6B'],
  sos: ['#EF4444', '#DC2626'],
};

const AVATAR_COLORS = ['#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444'];

const HomeScreen = ({ navigation, route }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [guardiansCount, setGuardiansCount] = useState(0);

  const socketRef = useRef(null);
  const locationIntervalRef = useRef(null);
  const sessionIdRef = useRef(null);
  const userIdRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  const [currentLocation, setCurrentLocation] = useState('Detecting location...');
  const [isSafe] = useState(true);
  const [contacts, setContacts] = useState([]);
  const [contactsPermission, setContactsPermission] = useState(null);

  useEffect(() => {
    loadUserData();
    startAnimations();
    initializeAppData();
    checkContactsPermission();
    return () => { stopSharingCleanup(); };
  }, []);

  const startAnimations = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.8, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
      ])
    ).start();
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  const loadUserData = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('user');
      if (authToken && userData) {
        setToken(authToken);
        const parsed = JSON.parse(userData);
        setUser(parsed);
        userIdRef.current = parsed.id;
      } else if (route?.params?.user && route?.params?.token) {
        setUser(route.params.user);
        setToken(route.params.token);
        userIdRef.current = route.params.user.id;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const initializeAppData = async () => {
    // Load saved emergency contacts from AsyncStorage
    try {
      const saved = await AsyncStorage.getItem('aabha_contacts');
      if (saved) {
        setContacts(JSON.parse(saved));
      }
    } catch (e) {
      console.log('Contacts load error:', e);
    }

    // Get current location
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setCurrentLocation('Location permission denied'); return; }
      let loc = await Location.getLastKnownPositionAsync({});
      if (!loc) loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const geo = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      if (geo.length > 0) {
        const p = geo[0];
        const parts = [p.street, p.name, p.city].filter(Boolean);
        setCurrentLocation(parts.join(', ') || 'Location detected');
      }
    } catch {
      setCurrentLocation('Could not detect location');
    }
  };

  // ── Contacts permission ───────────────────────────────────────────────────
  const checkContactsPermission = async () => {
    const { status } = await Contacts.getPermissionsAsync();
    setContactsPermission(status);
  };

  const requestContactsPermission = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    setContactsPermission(status);
    return status;
  };

  // ── Open device contacts picker ───────────────────────────────────────────
  const handleAddContact = async () => {
    let permission = contactsPermission;

    if (permission !== 'granted') {
      permission = await requestContactsPermission();
    }

    if (permission !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Aabha needs access to your contacts to add emergency contacts. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }

    // Fetch all contacts with phone numbers
    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
    });

    const withPhones = data.filter(
      (c) => c.name && c.phoneNumbers && c.phoneNumbers.length > 0
    );

    if (withPhones.length === 0) {
      Alert.alert('No Contacts', 'No contacts with phone numbers found on your device.');
      return;
    }

    // Build alert options (show up to 20 contacts in a scrollable picker via alert buttons)
    // For a proper picker, we show a custom modal — handled below
    showContactPicker(withPhones);
  };

  // ── Contact picker modal state ────────────────────────────────────────────
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerContacts, setPickerContacts] = useState([]);
  const [pickerSearch, setPickerSearch] = useState('');

  const showContactPicker = (deviceContacts) => {
    setPickerContacts(deviceContacts);
    setPickerSearch('');
    setPickerVisible(true);
  };

  const filteredPickerContacts = pickerContacts.filter((c) =>
    c.name.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  const selectContact = async (contact) => {
    // Check if already added
    const phone = contact.phoneNumbers[0].number.replace(/\s+/g, '');
    const alreadyExists = contacts.some((c) => c.phone === phone);
    if (alreadyExists) {
      Alert.alert('Already Added', `${contact.name} is already in your emergency contacts.`);
      setPickerVisible(false);
      return;
    }

    const colorIndex = contacts.length % AVATAR_COLORS.length;
    const newContact = {
      id: `${contact.id || Date.now()}`,
      name: contact.name,
      phone,
      initials: contact.name.charAt(0).toUpperCase(),
      color: AVATAR_COLORS[colorIndex],
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    await saveContacts(updated);
    setPickerVisible(false);

    // Also save to DB if user is logged in
    if (token && userIdRef.current) {
      saveContactToDB(newContact);
    }
  };

  const saveContactToDB = async (contact) => {
    try {
      await fetch(`${SOCKET_URL}/api/emergency-contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: contact.name,
          phone: contact.phone,
        }),
      });
    } catch (err) {
      console.log('DB save contact error:', err);
    }
  };

  const saveContacts = async (newContacts) => {
    try {
      await AsyncStorage.setItem('aabha_contacts', JSON.stringify(newContacts));
    } catch (e) {
      console.log('Save contacts error:', e);
    }
  };

  // ── Call a contact ────────────────────────────────────────────────────────
  const handleContactPress = (contact) => {
    if (!contact.phone) {
      Alert.alert('No Phone Number', `No phone number saved for ${contact.name}.`);
      return;
    }
    const phoneUrl = `tel:${contact.phone}`;
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone calls are not supported on this device.');
        }
      })
      .catch(() => Alert.alert('Error', 'Could not open the phone app.'));
  };

  // ── Long press to remove ──────────────────────────────────────────────────
  const removeContact = async (index) => {
    const contact = contacts[index];
    const updated = contacts.filter((_, i) => i !== index);
    setContacts(updated);
    await saveContacts(updated);

    // Remove from DB
    if (token && contact.id) {
      try {
        await fetch(`${SOCKET_URL}/api/emergency-contacts/${contact.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.log('DB remove contact error:', err);
      }
    }
  };

  // ── DANGER / SOS ──────────────────────────────────────────────────────────
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
          },
        },
      ]
    );
  };

  // ── LIVE LOCATION ─────────────────────────────────────────────────────────
  const handleSendLocation = async () => {
    if (isSharingLocation) { handleStopSharing(); return; }
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      const response = await startLiveLocation(latitude, longitude, token);
      if (!response.success) return;

      sessionIdRef.current = response.sessionId;
      setGuardiansCount(response.guardiansCount);
      setIsSharingLocation(true);

      const socket = io(SOCKET_URL, { transports: ['websocket'], reconnection: true });
      socket.on('connect', () => {
        socket.emit('join_as_user', { userId: userIdRef.current });
      });
      socketRef.current = socket;

      locationIntervalRef.current = setInterval(async () => {
        try {
          const updated = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          if (socketRef.current?.connected) {
            socketRef.current.emit('location_update', {
              userId: userIdRef.current,
              latitude: updated.coords.latitude,
              longitude: updated.coords.longitude,
              accuracy: updated.coords.accuracy,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) { console.error('Location push error:', err); }
      }, 5000);

      Alert.alert(
        '📍 Live Location Active',
        `Sharing with ${response.guardiansCount} guardian(s) in real time.\n\nTap "Share Location" again to stop.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to share location');
    }
  };

  const handleStopSharing = () => {
    Alert.alert('Stop Sharing', 'Stop sharing your live location with guardians?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop', style: 'destructive',
        onPress: async () => {
          await stopSharingCleanup();
          Alert.alert('Stopped', 'Live location sharing has been stopped.');
        },
      },
    ]);
  };

  const stopSharingCleanup = async () => {
    if (locationIntervalRef.current) { clearInterval(locationIntervalRef.current); locationIntervalRef.current = null; }
    if (socketRef.current) {
      socketRef.current.emit('stop_sharing', { userId: userIdRef.current });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (sessionIdRef.current) {
      try { await stopLiveLocation(sessionIdRef.current, token); } catch (_) {}
      sessionIdRef.current = null;
    }
    setIsSharingLocation(false);
    setGuardiansCount(0);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickActions = [
    { icon: isSharingLocation ? 'location' : 'location-outline', label: isSharingLocation ? `Sharing\n(${guardiansCount})` : 'Share\nLocation', color: '#3B82F6', bg: '#DBEAFE', onPress: handleSendLocation },
    { icon: 'call-outline', label: 'Call\nHelpline', color: '#10B981', bg: '#D1FAE5', onPress: () => Linking.openURL('tel:181') },
    { icon: 'chatbubble-outline', label: 'Fake\nCall', color: '#8B5CF6', bg: '#EDE9FE', onPress: () => {} },
    { icon: 'alert-circle-outline', label: 'Alert\nGuardians', color: '#F59E0B', bg: '#FEF3C7', onPress: handleDangerButton },
  ];

  const safetyTips = [
    { icon: 'walk-outline', title: 'Walking Alone?', desc: 'Share your live location with a trusted contact' },
    { icon: 'moon-outline', title: 'Late Night?', desc: "Enable auto-alert if you don't reach home by set time" },
    { icon: 'car-outline', title: 'Taking a Ride?', desc: 'Share the vehicle details with your emergency contacts' },
  ];

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user?.name || 'Welcome'}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* Safety Status Card */}
        <Animated.View style={[styles.statusCard, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={isSafe ? ['#D1FAE5', '#ECFDF5'] : ['#FEE2E2', '#FEF2F2']}
            style={[styles.statusGradient, !isSafe && { borderColor: '#FECACA' }]}
          >
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, !isSafe && { backgroundColor: colors.error }]} />
              <Text style={[styles.statusText, !isSafe && { color: '#991B1B' }]}>
                {isSafe ? 'You are in a safe zone' : 'Risk detected in current area'}
              </Text>
            </View>
            <Text style={styles.statusLocation} numberOfLines={1}>
              <Ionicons name="location" size={13} color={colors.textSecondary} /> {currentLocation}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <Animated.View style={[styles.sosGlowRing, { opacity: glowAnim, transform: [{ scale: pulseAnim }] }]} />
          <Animated.View style={[styles.sosGlowRing2, {
            opacity: Animated.multiply(glowAnim, 0.5),
            transform: [{ scale: Animated.multiply(pulseAnim, 1.15) }],
          }]} />
          <TouchableOpacity onPress={handleDangerButton} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={gradients.sos} style={styles.sosButton}>
              <Text style={styles.sosText}>{loading ? '...' : 'SOS'}</Text>
              <Text style={styles.sosSubtext}>Tap for Emergency</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.sosHint}>Tap to send alert to all guardians</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} onPress={action.onPress} activeOpacity={0.7}>
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Emergency Contacts ─────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <Text style={styles.sectionHint}>Tap to call · Hold to remove</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsRow}>
          {contacts.map((contact, i) => (
            <TouchableOpacity
              key={contact.id || i}
              style={styles.contactItem}
              activeOpacity={0.7}
              onPress={() => handleContactPress(contact)}
              onLongPress={() =>
                Alert.alert(
                  'Remove Contact',
                  `Remove ${contact.name} from emergency contacts?`,
                  [
                    { text: 'Cancel' },
                    { text: 'Remove', onPress: () => removeContact(i), style: 'destructive' },
                  ]
                )
              }
            >
              <View style={[styles.contactAvatar, { backgroundColor: contact.color }]}>
                <Text style={styles.contactInitials}>{contact.initials}</Text>
              </View>
              {/* Call indicator */}
              <View style={styles.callBadge}>
                <Ionicons name="call" size={10} color="#fff" />
              </View>
              <Text style={styles.contactName} numberOfLines={1}>{contact.name}</Text>
            </TouchableOpacity>
          ))}

          {/* Add button — opens device contacts */}
          <TouchableOpacity style={styles.contactItem} activeOpacity={0.7} onPress={handleAddContact}>
            <View style={[styles.contactAvatar, styles.addContactAvatar]}>
              <Ionicons name="person-add-outline" size={22} color={colors.primary} />
            </View>
            <Text style={styles.contactName}>Add</Text>
          </TouchableOpacity>
        </ScrollView>

        {contacts.length === 0 && (
          <View style={styles.emptyContacts}>
            <Ionicons name="people-outline" size={32} color={colors.textLight} />
            <Text style={styles.emptyContactsText}>No emergency contacts yet</Text>
            <Text style={styles.emptyContactsSub}>Tap Add to pick from your phone contacts</Text>
          </View>
        )}

        {/* Start Journey */}
        <TouchableOpacity
          style={styles.journeyButton}
          onPress={() => navigation.navigate('JourneyHistory')}
        >
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.journeyGradient}>
            <Ionicons name="navigate" size={22} color="#fff" />
            <Text style={styles.journeyButtonText}>Start Journey</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Safety Tips */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Safety Tips</Text>
        </View>
        {safetyTips.map((tip, i) => (
          <TouchableOpacity key={i} style={styles.tipCard} activeOpacity={0.7}>
            <View style={styles.tipIcon}>
              <Ionicons name={tip.icon} size={22} color={colors.primary} />
            </View>
            <View style={styles.tipContent}>
              <Text style={styles.tipTitle}>{tip.title}</Text>
              <Text style={styles.tipDesc}>{tip.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
          </TouchableOpacity>
        ))}

        {/* Helpline */}
        <TouchableOpacity
          style={styles.helplineCard}
          activeOpacity={0.7}
          onPress={() => Linking.openURL('tel:181')}
        >
          <LinearGradient colors={gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.helplineGradient}>
            <View>
              <Text style={styles.helplineTitle}>Women Helpline</Text>
              <Text style={styles.helplineNumber}>181</Text>
            </View>
            <View style={styles.helplineButton}>
              <Ionicons name="call" size={24} color={colors.primary} />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* ── Contact Picker Modal ───────────────────────────────────────────── */}
      {pickerVisible && (
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerSheet}>
            {/* Handle */}
            <View style={styles.pickerHandle} />

            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Choose a Contact</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.pickerClose}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} style={{ marginRight: 8 }} />
              <SearchInput value={pickerSearch} onChangeText={setPickerSearch} />
            </View>

            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {filteredPickerContacts.length === 0 ? (
                <View style={styles.pickerEmpty}>
                  <Text style={styles.pickerEmptyText}>No contacts found</Text>
                </View>
              ) : (
                filteredPickerContacts.map((contact, i) => {
                  const phone = contact.phoneNumbers?.[0]?.number || '';
                  const initial = (contact.name || '?').charAt(0).toUpperCase();
                  const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
                  const alreadyAdded = contacts.some((c) => c.phone === phone.replace(/\s+/g, ''));
                  return (
                    <TouchableOpacity
                      key={contact.id || i}
                      style={[styles.pickerItem, alreadyAdded && styles.pickerItemAdded]}
                      onPress={() => selectContact(contact)}
                      activeOpacity={0.7}
                      disabled={alreadyAdded}
                    >
                      <View style={[styles.pickerAvatar, { backgroundColor: alreadyAdded ? '#E5E7EB' : color }]}>
                        <Text style={[styles.pickerAvatarText, alreadyAdded && { color: colors.textLight }]}>
                          {initial}
                        </Text>
                      </View>
                      <View style={styles.pickerInfo}>
                        <Text style={[styles.pickerName, alreadyAdded && { color: colors.textLight }]}>
                          {contact.name}
                        </Text>
                        <Text style={styles.pickerPhone}>{phone}</Text>
                      </View>
                      {alreadyAdded ? (
                        <View style={styles.addedBadge}>
                          <Ionicons name="checkmark" size={14} color={colors.success} />
                          <Text style={styles.addedText}>Added</Text>
                        </View>
                      ) : (
                        <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};

// ── Inline search input component ────────────────────────────────────────────
import { TextInput } from 'react-native';

const SearchInput = ({ value, onChangeText }) => (
  <TextInput
    style={styles.searchTextInput}
    placeholder="Search contacts..."
    placeholderTextColor={colors.textLight}
    value={value}
    onChangeText={onChangeText}
    autoCorrect={false}
  />
);

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44, marginBottom: 16,
  },
  greeting: { fontSize: 14, color: colors.textSecondary },
  userName: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 2 },
  notifButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  notifDot: { position: 'absolute', top: 10, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },

  statusCard: { marginBottom: 20 },
  statusGradient: { borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success },
  statusText: { fontSize: 15, fontWeight: '600', color: '#065F46' },
  statusLocation: { fontSize: 13, color: colors.textSecondary, marginLeft: 18 },

  sosSection: { alignItems: 'center', marginVertical: 20 },
  sosGlowRing: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: colors.sosRedGlow },
  sosGlowRing2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(220,38,38,0.1)' },
  sosButton: {
    width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.sosRed, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  sosText: { fontSize: 36, fontWeight: 'bold', color: '#fff', letterSpacing: 4 },
  sosSubtext: { fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  sosHint: { fontSize: 12, color: colors.textLight, marginTop: 16 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  sectionHint: { fontSize: 11, color: colors.textLight, fontStyle: 'italic' },

  actionsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  actionCard: { width: (width - 72) / 4, alignItems: 'center' },
  actionIcon: { width: 56, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontSize: 11, color: colors.textSecondary, textAlign: 'center', lineHeight: 15, fontWeight: '500' },

  // Contacts
  contactsRow: { paddingVertical: 4 },
  contactItem: { alignItems: 'center', marginRight: 20, position: 'relative' },
  contactAvatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center', marginBottom: 6,
  },
  addContactAvatar: {
    backgroundColor: 'rgba(255,155,105,0.12)',
    borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary,
  },
  contactInitials: { fontSize: 20, fontWeight: '700', color: '#fff' },
  contactName: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', maxWidth: 60, textAlign: 'center' },
  callBadge: {
    position: 'absolute', top: 0, right: -2,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.success,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.background,
  },
  emptyContacts: {
    alignItems: 'center', paddingVertical: 20,
    backgroundColor: colors.card, borderRadius: 16, marginBottom: 4,
    gap: 4,
  },
  emptyContactsText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginTop: 4 },
  emptyContactsSub: { fontSize: 12, color: colors.textLight },

  journeyButton: { marginTop: 24, borderRadius: 18, overflow: 'hidden', elevation: 5 },
  journeyGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, gap: 10 },
  journeyButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  tipCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 16, padding: 16, marginBottom: 10,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  tipIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,155,105,0.12)', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  tipContent: { flex: 1 },
  tipTitle: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  tipDesc: { fontSize: 12, color: colors.textSecondary, lineHeight: 17 },

  helplineCard: { marginTop: 16 },
  helplineGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 20, padding: 24 },
  helplineTitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  helplineNumber: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginTop: 2 },
  helplineButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },

  // ── Contact Picker Modal ─────────────────────────────────────────────────
  pickerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 14,
  },
  pickerTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  pickerClose: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center',
  },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F3F4F6', borderRadius: 14,
    marginHorizontal: 20, marginBottom: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchTextInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },

  pickerList: { paddingHorizontal: 20 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  pickerItemAdded: { opacity: 0.6 },
  pickerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  pickerAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  pickerInfo: { flex: 1 },
  pickerName: { fontSize: 15, fontWeight: '600', color: colors.text },
  pickerPhone: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  addedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#D1FAE5', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3, gap: 3,
  },
  addedText: { fontSize: 11, color: colors.success, fontWeight: '600' },
  pickerEmpty: { alignItems: 'center', paddingVertical: 40 },
  pickerEmptyText: { fontSize: 15, color: colors.textLight },

  searchInput: { display: 'none' }, // unused placeholder
});
