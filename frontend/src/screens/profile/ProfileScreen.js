import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  StatusBar, Platform, Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
  };

  const stats = [
    { label: 'Reports', value: '3', icon: 'document-text-outline' },
    { label: 'Helped', value: '12', icon: 'heart-outline' },
    { label: 'Trust', value: '95%', icon: 'shield-checkmark-outline' },
  ];

  const menuSections = [
    {
      title: 'SAFETY',
      items: [
        { icon: 'people-outline', label: 'Emergency Contacts', color: '#3B82F6', bg: '#DBEAFE', chevron: true },
        { icon: 'notifications-outline', label: 'Alert Preferences', color: '#8B5CF6', bg: '#EDE9FE', chevron: true },
        { icon: 'location-outline', label: 'Safe Zones', color: '#10B981', bg: '#D1FAE5', chevron: true },
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', color: colors.primary, bg: colors.primaryFaded, chevron: true },
        { icon: 'lock-closed-outline', label: 'Privacy & Security', color: '#6366F1', bg: '#E0E7FF', chevron: true },
        { icon: 'language-outline', label: 'Language', color: '#F59E0B', bg: '#FEF3C7', subtitle: 'English', chevron: true },
      ]
    },
    {
      title: 'SUPPORT',
      items: [
        { icon: 'help-circle-outline', label: 'Help & FAQ', color: '#06B6D4', bg: '#CFFAFE', chevron: true },
        { icon: 'star-outline', label: 'Rate the App', color: '#F59E0B', bg: '#FEF3C7', chevron: true },
        { icon: 'information-circle-outline', label: 'About Aabha', color: colors.textSecondary, bg: '#F3F4F6', chevron: true },
      ]
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Profile Header */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <TouchableOpacity style={styles.editAvatar}>
              <Ionicons name="camera" size={14} color="#fff" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user?.name || 'Aabha User'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@aabha.com'}</Text>

          {/* Verified Badge */}
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#fff" />
            <Text style={styles.verifiedText}>Identity Verified</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        {/* Stats Row */}
        <View style={styles.statsCard}>
          {stats.map((stat, i) => (
            <React.Fragment key={i}>
              <View style={styles.statItem}>
                <Ionicons name={stat.icon} size={20} color={colors.primary} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Menu Sections */}
        {menuSections.map((section, si) => (
          <View key={si} style={styles.menuSection}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuCard}>
              {section.items.map((item, ii) => (
                <TouchableOpacity
                  key={ii}
                  style={[
                    styles.menuItem,
                    ii < section.items.length - 1 && styles.menuItemBorder
                  ]}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{item.label}</Text>
                    {item.subtitle && (
                      <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                    )}
                  </View>
                  {item.chevron && (
                    <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Aabha</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>Your safety companion</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    marginBottom: 14,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 36,
    color: '#fff',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 24,
    color: '#fff',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  verifiedText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  // Scroll
  scrollView: {
    marginTop: -16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 22,
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.divider,
  },

  // Menu
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textLight,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.errorLight,
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  appName: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 18,
    color: colors.textLight,
  },
  appVersion: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 2,
  },
  appTagline: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
});
