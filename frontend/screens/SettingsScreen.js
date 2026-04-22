import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, gradients } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
  getMyGuardians,
  sendGuardianRequest,
  removeGuardian,
} from '../services/api';


export default function SettingsScreen({ route }) {
  const { user } = useAuth();
  const navigation = useNavigation();

  // Guardian state
  const [guardians, setGuardians] = useState([]);
  const [loadingGuardians, setLoadingGuardians] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [guardianUsername, setGuardianUsername] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        setToken(authToken);
        await loadMyGuardians(authToken);
      } else if (route?.params?.token) {
        setToken(route.params.token);
        await loadMyGuardians(route.params.token);
      }
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
  };

  const loadMyGuardians = async (authToken) => {
    try {
      setLoadingGuardians(true);
      const response = await getMyGuardians(authToken);
      if (response.success) {
        setGuardians(response.guardians);
      }
    } catch (error) {
      console.error('Error loading guardians:', error);
    } finally {
      setLoadingGuardians(false);
    }
  };

  const handleAddGuardian = async () => {
    if (!guardianUsername.trim()) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    try {
      setSubmitting(true);
      const response = await sendGuardianRequest(guardianUsername, token);
      if (response.success) {
        Alert.alert('Success', 'Guardian request sent successfully!');
        setShowAddModal(false);
        setGuardianUsername('');
        await loadMyGuardians(token);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveGuardian = (guardian) => {
    Alert.alert(
      'Remove Guardian',
      `Remove ${guardian.name} as your guardian?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoadingGuardians(true);
              await removeGuardian(guardian.id, token);
              Alert.alert('Success', 'Guardian removed');
              await loadMyGuardians(token);
            } catch (error) {
              Alert.alert('Error', 'Failed to remove guardian');
            } finally {
              setLoadingGuardians(false);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('user');
              navigation.replace('Login');
            } catch (error) {
              console.error('Error during logout:', error);
              navigation.replace('Login');
            }
          },
        },
      ]
    );
  };

  const stats = [
    { label: 'Reports', value: '3', icon: 'document-text-outline', screen: 'MyReports' },
    { label: 'Guardians', value: String(guardians.length), icon: 'shield-outline' },
    { label: 'Trust', value: '95%', icon: 'shield-checkmark-outline' },
  ];

  const menuSections = [
    {
      title: 'SAFETY',
      items: [
        {
          icon: 'shield-half-outline',
          label: 'My Guardians',
          color: '#10B981',
          bg: '#D1FAE5',
          chevron: false,
          action: () => setShowAddModal(true),
          badge: guardians.length > 0 ? String(guardians.length) : null,
        },
        {
          icon: 'document-text-outline',
          label: 'My Reports',
          color: colors.primary,
          bg: colors.primaryFaded,
          chevron: true,
          screen: 'MyReports',
        },
        {
          icon: 'notifications-outline',
          label: 'Alert Preferences',
          color: '#8B5CF6',
          bg: '#EDE9FE',
          chevron: true,
        },
        {
          icon: 'location-outline',
          label: 'Safe Zones',
          color: '#10B981',
          bg: '#D1FAE5',
          chevron: true,
        },
      ],
    },
    {
      title: 'ACCOUNT',
      items: [
        {
          icon: 'person-outline',
          label: 'Edit Profile',
          color: colors.primary,
          bg: colors.primaryFaded,
          chevron: true,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Privacy & Security',
          color: '#6366F1',
          bg: '#E0E7FF',
          chevron: true,
        },
        {
          icon: 'language-outline',
          label: 'Language',
          color: '#F59E0B',
          bg: '#FEF3C7',
          subtitle: 'English',
          chevron: true,
        },
      ],
    },
    {
      title: 'SUPPORT',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help & FAQ',
          color: '#06B6D4',
          bg: '#CFFAFE',
          chevron: true,
        },
        {
          icon: 'star-outline',
          label: 'Rate the App',
          color: '#F59E0B',
          bg: '#FEF3C7',
          chevron: true,
        },
        {
          icon: 'information-circle-outline',
          label: 'About Aabha',
          color: colors.textSecondary,
          bg: '#F3F4F6',
          chevron: true,
        },
      ],
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
              <TouchableOpacity
                style={styles.statItem}
                onPress={() => stat.screen ? navigation.navigate(stat.screen) : null}
              >
                <Ionicons name={stat.icon} size={20} color={colors.primary} />
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </TouchableOpacity>
              {i < stats.length - 1 && <View style={styles.statDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Guardians Section */}
        <View style={styles.menuSection}>
          <View style={styles.guardianSectionHeader}>
            <Text style={styles.sectionTitle}>MY GUARDIANS</Text>
            <TouchableOpacity
              style={styles.addGuardianBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Ionicons name="add-circle" size={18} color={colors.primary} />
              <Text style={styles.addGuardianText}>Add</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.menuCard}>
            {loadingGuardians ? (
              <View style={styles.guardianLoading}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : guardians.length === 0 ? (
              <View style={styles.emptyGuardians}>
                <Ionicons name="shield-outline" size={36} color={colors.textLight} />
                <Text style={styles.emptyGuardianText}>No guardians added yet</Text>
                <Text style={styles.emptyGuardianSub}>
                  Add guardians who can receive your emergency alerts
                </Text>
                <TouchableOpacity
                  style={styles.addGuardianInlineBtn}
                  onPress={() => setShowAddModal(true)}
                >
                  <Text style={styles.addGuardianInlineText}>+ Add Guardian</Text>
                </TouchableOpacity>
              </View>
            ) : (
              guardians.map((guardian, idx) => (
                <View
                  key={guardian.id}
                  style={[
                    styles.guardianRow,
                    idx < guardians.length - 1 && styles.menuItemBorder,
                  ]}
                >
                  <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={styles.guardianInitial}>
                      {(guardian.name || 'G').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuLabel}>{guardian.name}</Text>
                    <Text style={styles.menuSubtitle}>@{guardian.username}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveGuardian(guardian)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
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
                    ii < section.items.length - 1 && styles.menuItemBorder,
                  ]}
                  activeOpacity={0.6}
                  onPress={() => {
                    if (item.action) item.action();
                    else if (item.screen) navigation.navigate(item.screen);
                  }}
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
                  {item.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
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
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Aabha</Text>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appTagline}>Your safety companion</Text>
        </View>
      </ScrollView>

      {/* Add Guardian Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header with gradient accent */}
            <LinearGradient
              colors={gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalHeaderGradient}
            >
              <Ionicons name="shield-half-outline" size={28} color="#fff" />
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.modalTitle}>Add Guardian</Text>
              <Text style={styles.modalDescription}>
                Enter the username of the person you want to add as your guardian.
                They will receive a request to accept.
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={colors.textLight}
                value={guardianUsername}
                onChangeText={setGuardianUsername}
                autoCapitalize="none"
              />

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.buttonDisabled]}
                onPress={handleAddGuardian}
                disabled={submitting}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={submitting ? ['#ccc', '#ccc'] : gradients.primary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Send Request</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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

  // Section
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
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '700',
  },

  // Guardians
  guardianSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 4,
    marginRight: 4,
  },
  addGuardianBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addGuardianText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  guardianRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  guardianInitial: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 18,
    color: '#10B981',
  },
  removeBtn: {
    padding: 6,
    backgroundColor: colors.errorLight,
    borderRadius: 10,
  },
  guardianLoading: {
    padding: 30,
    alignItems: 'center',
  },
  emptyGuardians: {
    alignItems: 'center',
    padding: 28,
    gap: 6,
  },
  emptyGuardianText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  emptyGuardianSub: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    lineHeight: 18,
  },
  addGuardianInlineBtn: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
  },
  addGuardianInlineText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 24,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 24,
  },
  modalTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 22,
    color: colors.text,
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  submitButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
