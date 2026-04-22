import React, { useState, useEffect } from 'react';
import { getUserJourneyDetails, markAlertAsSeen } from '../services/api';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../styles/colors';
import {
  getPendingGuardianRequests,
  respondToGuardianRequest,
  getPeopleImGuarding,
  getAlertsForGuardian,
  getLiveLocation
} from '../services/api';

const { width, height } = Dimensions.get('window');

export default function GuardianScreen({ route, navigation }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [peopleImGuarding, setPeopleImGuarding] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState('');
  const [liveSharingMap, setLiveSharingMap] = useState({});
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [deletingAlertId, setDeletingAlertId] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (authToken) {
        setToken(authToken);
        await loadAllData(authToken);
      } else if (route?.params?.token) {
        setToken(route.params.token);
        await loadAllData(route.params.token);
      } else {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error initializing screen:', error);
      setLoading(false);
    }
  };

  const loadAllData = async (authToken) => {
    try {
      setLoading(true);
      const [requestsRes, peopleRes, alertsRes] = await Promise.all([
        getPendingGuardianRequests(authToken),
        getPeopleImGuarding(authToken),
        getAlertsForGuardian(authToken)
      ]);

      if (requestsRes.success) setPendingRequests(requestsRes.requests);
      if (peopleRes.success) {
        setPeopleImGuarding(peopleRes.people);
        // Check live location status for each person
        checkLiveStatuses(peopleRes.people, authToken);
      }
      if (alertsRes.success) setAlerts(alertsRes.alerts);
    } catch (error) {
      console.error('Error loading guardian data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Check which people are currently sharing live location
  const checkLiveStatuses = async (people, authToken) => {
    const statusMap = {};
    await Promise.all(
      people.map(async (person) => {
        try {
          const res = await getLiveLocation(person.id, authToken);
          statusMap[person.id] = res.success && res.isSharing;
        } catch {
          statusMap[person.id] = false;
        }
      })
    );
    setLiveSharingMap(statusMap);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData(token);
    setRefreshing(false);
  };

  const handleRespond = async (requestId, action) => {
    try {
      const response = await respondToGuardianRequest(requestId, action, token);
      if (response.success) {
        Alert.alert('Success', response.message);
        await loadAllData(token);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to respond');
    }
  };

  const handlePersonClick = (person) => {
    navigation.navigate('GuardianJourneyView', {
      userId: person.id,
      userName: person.name,
      token
    });
  };

  const handleLiveLocationClick = (person) => {
    navigation.navigate('LiveLocation', {
      userId: person.id,
      userName: person.name,
      token
    });
  };

  const handleAlertPress = (alert) => {
    setSelectedAlert(alert);
    setAlertModalVisible(true);
  };

  const handleDeleteAlert = async () => {
    if (!selectedAlert) return;
    
    Alert.alert(
      'Delete Alert',
      'Are you sure you want to delete this alert?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAlertId(selectedAlert.alert_id);
              // Remove from local state
              setAlerts(alerts.filter(a => a.alert_id !== selectedAlert.alert_id));
              setAlertModalVisible(false);
              setSelectedAlert(null);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete alert');
            } finally {
              setDeletingAlertId(null);
            }
          }
        }
      ]
    );
  };

  const closeAlertModal = () => {
    setAlertModalVisible(false);
    setSelectedAlert(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Guardian</Text>

      {/* PENDING REQUESTS */}
      {pendingRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Pending Requests ({pendingRequests.length})
          </Text>

          {pendingRequests.map((request) => (
            <View key={request.request_id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Ionicons name="person-add" size={32} color="#FF9800" />
                <View style={styles.requestDetails}>
                  <Text style={styles.requestName}>{request.name}</Text>
                  <Text style={styles.requestUsername}>@{request.username}</Text>
                  <Text style={styles.requestText}>wants you as their guardian</Text>
                </View>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleRespond(request.request_id, 'accept')}
                >
                  <Ionicons name="checkmark" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => handleRespond(request.request_id, 'reject')}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* PEOPLE I'M GUARDING */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          People You're Guarding ({peopleImGuarding.length})
        </Text>

        {peopleImGuarding.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="shield-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>You're not guarding anyone yet</Text>
            <Text style={styles.emptySubtext}>
              When someone adds you as their guardian and you accept, they'll appear here
            </Text>
          </View>
        ) : (
          peopleImGuarding.map((person) => {
            const isLive = liveSharingMap[person.id] || false;
            return (
              <View key={person.id} style={styles.personCard}>
                {/* Person info row */}
                <TouchableOpacity
                  style={styles.personInfoRow}
                  onPress={() => handlePersonClick(person)}
                >
                  <View style={styles.avatarWrapper}>
                    <Ionicons name="person-circle" size={48} color="#007AFF" />
                    {isLive && <View style={styles.liveIndicatorDot} />}
                  </View>
                  <View style={styles.personDetails}>
                    <View style={styles.personNameRow}>
                      <Text style={styles.personName}>{person.name}</Text>
                      {isLive && (
                        <View style={styles.livePill}>
                          <View style={styles.livePillDot} />
                          <Text style={styles.livePillText}>LIVE</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.personUsername}>@{person.username}</Text>
                    <Text style={styles.personSince}>
                      Since {new Date(person.guarding_since).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color="#999" />
                </TouchableOpacity>

                {/* Action buttons */}
                <View style={styles.personActions}>
                  <TouchableOpacity
                    style={styles.journeyBtn}
                    onPress={() => handlePersonClick(person)}
                  >
                    <Ionicons name="car-outline" size={16} color="#007AFF" />
                    <Text style={styles.journeyBtnText}>Journeys</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.liveBtn, isLive && styles.liveBtnActive]}
                    onPress={() => handleLiveLocationClick(person)}
                  >
                    <Ionicons
                      name="location"
                      size={16}
                      color={isLive ? '#fff' : '#FF6B9D'}
                    />
                    <Text style={[styles.liveBtnText, isLive && styles.liveBtnTextActive]}>
                      {isLive ? 'Track Live' : 'Live Location'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* RECENT ALERTS */}
      {alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Recent Alerts ({alerts.filter(a => !a.seen).length} unread)
          </Text>

          {alerts.slice(0, 5).map((alert) => (
            <TouchableOpacity
              key={alert.alert_id}
              onPress={() => handleAlertPress(alert)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.alertCard,
                !alert.seen && styles.alertCardUnread
              ]}>
                <View style={styles.alertIconContainer}>
                  <Ionicons 
                    name="warning" 
                    size={28} 
                    color={!alert.seen ? colors.error : colors.textLight} 
                  />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertName}>{alert.user_name}</Text>
                  <Text style={styles.alertMessage} numberOfLines={2}>{alert.message}</Text>
                  <Text style={styles.alertTime}>
                    {new Date(alert.created_at).toLocaleString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textLight} />
                {!alert.seen && <View style={styles.unreadBadge} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Alert Modal */}
      <Modal
        visible={alertModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeAlertModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.alertModalContainer}>
            {/* Header */}
            <View style={styles.alertModalHeader}>
              <View style={styles.alertModalIconContainer}>
                <Ionicons name="warning" size={40} color={colors.error} />
              </View>
              <TouchableOpacity
                onPress={closeAlertModal}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={28} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            {selectedAlert && (
              <>
                <Text style={styles.alertModalName}>{selectedAlert.user_name}</Text>
                
                <View style={styles.alertDetailRow}>
                  <Text style={styles.alertDetailLabel}>Time:</Text>
                  <Text style={styles.alertDetailValue}>
                    {new Date(selectedAlert.created_at).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.alertDetailRow}>
                  <Text style={styles.alertDetailLabel}>Location:</Text>
                  <Text style={styles.alertDetailValue}>
                    {selectedAlert.latitude}, {selectedAlert.longitude}
                  </Text>
                </View>

                <View style={styles.alertMessageSection}>
                  <Text style={styles.alertDetailLabel}>Alert Message:</Text>
                  <Text style={styles.alertDetailMessage}>{selectedAlert.message}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.alertModalActions}>
                  <TouchableOpacity
                    style={styles.alertActionButton}
                    onPress={closeAlertModal}
                  >
                    <Text style={styles.alertActionButtonText}>Got It</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.alertActionButton, styles.alertDeleteButton]}
                    onPress={handleDeleteAlert}
                    disabled={deletingAlertId === selectedAlert.alert_id}
                  >
                    <Ionicons name="trash-outline" size={18} color="#fff" />
                    <Text style={styles.alertDeleteButtonText}>
                      {deletingAlertId === selectedAlert.alert_id ? 'Deleting...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  contentContainer: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { marginTop: 10, fontSize: 16, color: colors.textSecondary },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 20, color: colors.text },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 12 },

  // Request card
  requestCard: {
    backgroundColor: colors.card, borderRadius: 12, padding: 15,
    marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: colors.primary,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4,
  },
  requestInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  requestDetails: { marginLeft: 12, flex: 1 },
  requestName: { fontSize: 18, fontWeight: '600', color: colors.text },
  requestUsername: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  requestText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  requestActions: { flexDirection: 'row', gap: 10 },
  acceptButton: {
    flex: 1, backgroundColor: colors.success, padding: 12, borderRadius: 8,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  rejectButton: {
    flex: 1, backgroundColor: colors.error, padding: 12, borderRadius: 8,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  actionButtonText: { color: colors.textWhite, fontSize: 14, fontWeight: '600' },

  // Person card
  personCard: {
    backgroundColor: colors.card, borderRadius: 12,
    marginBottom: 12, elevation: 2, overflow: 'hidden',
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4,
  },
  personInfoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 15, gap: 4,
  },
  avatarWrapper: { position: 'relative', marginRight: 8 },
  liveIndicatorDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.error, borderWidth: 2, borderColor: colors.card,
  },
  personDetails: { flex: 1, marginLeft: 4 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personName: { fontSize: 18, fontWeight: '600', color: colors.text },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.errorLight, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8,
  },
  livePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.error },
  livePillText: { fontSize: 10, fontWeight: 'bold', color: colors.error },
  personUsername: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  personSince: { fontSize: 12, color: colors.textLight, marginTop: 4 },

  // Action buttons row
  personActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  journeyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: colors.border,
  },
  journeyBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  liveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  liveBtnActive: { backgroundColor: colors.primary },
  liveBtnText: { fontSize: 14, color: colors.primary, fontWeight: '600' },
  liveBtnTextActive: { color: colors.textWhite },

  // Alert card
  alertCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card,
    borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2,
    shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4,
  },
  alertCardUnread: { borderLeftWidth: 4, borderLeftColor: colors.error },
  alertIconContainer: {
    width: 48, height: 48, borderRadius: 12,
    backgroundColor: colors.errorLight,
    justifyContent: 'center', alignItems: 'center',
  },
  alertInfo: { marginLeft: 12, flex: 1 },
  alertName: { fontSize: 16, fontWeight: '600', color: colors.text },
  alertMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  alertTime: { fontSize: 12, color: colors.textLight, marginTop: 4 },
  unreadBadge: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.error },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  alertModalContainer: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: width - 40,
    shadowColor: colors.shadowDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 10,
  },
  alertModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  alertModalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.errorLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertModalName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  alertDetailRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  alertDetailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    width: 80,
  },
  alertDetailValue: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  alertMessageSection: {
    marginBottom: 20,
  },
  alertDetailMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: 8,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
  },
  alertModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  alertActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  alertActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },
  alertDeleteButton: {
    backgroundColor: colors.error,
  },
  alertDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textWhite,
  },

  // Empty state
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: colors.card, borderRadius: 12 },
  emptyText: { fontSize: 16, color: colors.textSecondary, marginTop: 15, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: colors.textLight, marginTop: 8, textAlign: 'center', lineHeight: 20 },
});