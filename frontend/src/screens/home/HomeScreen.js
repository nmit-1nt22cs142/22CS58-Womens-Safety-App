import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Animated, Dimensions, StatusBar, Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { user } = useAuth();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // Pulse animation for SOS button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.3,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const quickActions = [
    { icon: 'location-outline', label: 'Share\nLocation', color: '#3B82F6', bg: '#DBEAFE' },
    { icon: 'call-outline', label: 'Call\nHelpline', color: '#10B981', bg: '#D1FAE5' },
    { icon: 'chatbubble-outline', label: 'Fake\nCall', color: '#8B5CF6', bg: '#EDE9FE' },
    { icon: 'alert-circle-outline', label: 'Alert\nGuardians', color: '#F59E0B', bg: '#FEF3C7' },
  ];

  const emergencyContacts = [
    { name: 'Mom', initials: 'M', color: '#FF6B6B' },
    { name: 'Dad', initials: 'D', color: '#3B82F6' },
    { name: 'Friend', initials: 'A', color: '#10B981' },
    { name: 'Add', initials: '+', color: colors.border },
  ];

  const safetyTips = [
    { icon: 'walk-outline', title: 'Walking Alone?', desc: 'Share your live location with a trusted contact' },
    { icon: 'moon-outline', title: 'Late Night?', desc: 'Enable auto-alert if you don\'t reach home by set time' },
    { icon: 'car-outline', title: 'Taking a Ride?', desc: 'Share the vehicle details with your emergency contacts' },
  ];

  const showComingSoon = () => {
    // Visual feedback without Alert for cleaner UX
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
          <View>
            <Text style={styles.greeting}>{getGreeting()} 👋</Text>
            <Text style={styles.userName}>{user?.name || 'Aabha User'}</Text>
          </View>
          <TouchableOpacity style={styles.notifButton}>
            <Ionicons name="notifications-outline" size={24} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        </Animated.View>

        {/* Safety Status Card */}
        <Animated.View style={[styles.statusCard, { opacity: fadeAnim }]}>
          <LinearGradient
            colors={['#D1FAE5', '#ECFDF5']}
            style={styles.statusGradient}
          >
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>You are in a safe zone</Text>
            </View>
            <Text style={styles.statusLocation}>
              <Ionicons name="location" size={13} color={colors.textSecondary} /> Near Nitte Meenakshi Institute
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* SOS Button */}
        <View style={styles.sosSection}>
          <Animated.View style={[styles.sosGlowRing, {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }]
          }]} />
          <Animated.View style={[styles.sosGlowRing2, {
            opacity: Animated.multiply(glowAnim, 0.5),
            transform: [{ scale: Animated.multiply(pulseAnim, 1.15) }]
          }]} />
          <TouchableOpacity
            onPress={showComingSoon}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={gradients.sos}
              style={styles.sosButton}
            >
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSubtext}>Tap for Emergency</Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.sosHint}>Press and hold for 3 sec to send alert</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity
              key={i}
              style={styles.actionCard}
              onPress={showComingSoon}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Contacts */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Emergency Contacts</Text>
          <TouchableOpacity>
            <Text style={styles.seeAll}>Manage</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsRow}>
          {emergencyContacts.map((contact, i) => (
            <TouchableOpacity key={i} style={styles.contactItem} activeOpacity={0.7}>
              <View style={[styles.contactAvatar, { backgroundColor: contact.color }]}>
                <Text style={styles.contactInitials}>{contact.initials}</Text>
              </View>
              <Text style={styles.contactName}>{contact.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
        <TouchableOpacity style={styles.helplineCard} activeOpacity={0.7}>
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.helplineGradient}
          >
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    marginBottom: 16,
  },
  greeting: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  userName: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 22,
    color: colors.text,
    marginTop: 2,
  },
  notifButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  notifDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },

  // Status Card
  statusCard: { marginBottom: 20 },
  statusGradient: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#065F46',
  },
  statusLocation: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 18,
  },

  // SOS
  sosSection: {
    alignItems: 'center',
    marginVertical: 20,
  },
  sosGlowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.sosRedGlow,
  },
  sosGlowRing2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(220,38,38,0.1)',
  },
  sosButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.sosRed,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  sosText: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 36,
    color: '#fff',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  sosHint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 16,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 18,
    color: colors.text,
  },
  seeAll: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Quick Actions
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 72) / 4,
    alignItems: 'center',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
    fontWeight: '500',
  },

  // Contacts
  contactsRow: {
    paddingVertical: 4,
  },
  contactItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  contactAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactInitials: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  contactName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Safety Tips
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  tipContent: { flex: 1 },
  tipTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  tipDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },

  // Helpline
  helplineCard: { marginTop: 16 },
  helplineGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 20,
    padding: 24,
  },
  helplineTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  helplineNumber: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 32,
    color: '#fff',
    marginTop: 2,
  },
  helplineButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
