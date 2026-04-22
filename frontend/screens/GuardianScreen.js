import React, { useState, useEffect } from 'react';
import { getUserJourneyDetails } from '../services/api';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getPendingGuardianRequests,
  respondToGuardianRequest,
  getPeopleImGuarding,
  getAlertsForGuardian,
  getLiveLocation
} from '../services/api';

export default function GuardianScreen({ route, navigation }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [peopleImGuarding, setPeopleImGuarding] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState('');
  // Map of userId -> isSharing (live location status)
  const [liveSharingMap, setLiveSharingMap] = useState({});

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
            <View key={alert.alert_id} style={[
              styles.alertCard,
              !alert.seen && styles.alertCardUnread
            ]}>
              <Ionicons name="warning" size={32} color={!alert.seen ? '#FF4D4D' : '#999'} />
              <View style={styles.alertInfo}>
                <Text style={styles.alertName}>{alert.user_name}</Text>
                <Text style={styles.alertMessage}>{alert.message}</Text>
                <Text style={styles.alertTime}>
                  {new Date(alert.created_at).toLocaleString()}
                </Text>
              </View>
              {!alert.seen && <View style={styles.unreadBadge} />}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  contentContainer: { padding: 20, paddingTop: 60, paddingBottom: 100 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, color: '#333' },

  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },

  // Request card
  requestCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15,
    marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#FF9800',
  },
  requestInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  requestDetails: { marginLeft: 12, flex: 1 },
  requestName: { fontSize: 18, fontWeight: '600', color: '#333' },
  requestUsername: { fontSize: 14, color: '#666', marginTop: 2 },
  requestText: { fontSize: 14, color: '#666', marginTop: 4 },
  requestActions: { flexDirection: 'row', gap: 10 },
  acceptButton: {
    flex: 1, backgroundColor: '#4CAF50', padding: 12, borderRadius: 8,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  rejectButton: {
    flex: 1, backgroundColor: '#d32f2f', padding: 12, borderRadius: 8,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 5,
  },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  // Person card
  personCard: {
    backgroundColor: '#fff', borderRadius: 12,
    marginBottom: 12, elevation: 2, overflow: 'hidden',
  },
  personInfoRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 15, gap: 4,
  },
  avatarWrapper: { position: 'relative', marginRight: 8 },
  liveIndicatorDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#FF4D4D', borderWidth: 2, borderColor: '#fff',
  },
  personDetails: { flex: 1, marginLeft: 4 },
  personNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  personName: { fontSize: 18, fontWeight: '600', color: '#333' },
  livePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFEBEE', paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 8,
  },
  livePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FF4D4D' },
  livePillText: { fontSize: 10, fontWeight: 'bold', color: '#FF4D4D' },
  personUsername: { fontSize: 14, color: '#666', marginTop: 2 },
  personSince: { fontSize: 12, color: '#999', marginTop: 4 },

  // Action buttons row
  personActions: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  journeyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12,
    borderRightWidth: 1, borderRightColor: '#f0f0f0',
  },
  journeyBtnText: { fontSize: 14, color: '#007AFF', fontWeight: '600' },
  liveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 12,
  },
  liveBtnActive: { backgroundColor: '#FF6B9D' },
  liveBtnText: { fontSize: 14, color: '#FF6B9D', fontWeight: '600' },
  liveBtnTextActive: { color: '#fff' },

  // Alert card
  alertCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2,
  },
  alertCardUnread: { borderLeftWidth: 4, borderLeftColor: '#FF4D4D' },
  alertInfo: { marginLeft: 12, flex: 1 },
  alertName: { fontSize: 16, fontWeight: '600', color: '#333' },
  alertMessage: { fontSize: 14, color: '#666', marginTop: 2 },
  alertTime: { fontSize: 12, color: '#999', marginTop: 4 },
  unreadBadge: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF4D4D' },

  // Empty state
  emptyState: { alignItems: 'center', padding: 40, backgroundColor: '#fff', borderRadius: 12 },
  emptyText: { fontSize: 16, color: '#666', marginTop: 15, fontWeight: '600', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#999', marginTop: 8, textAlign: 'center', lineHeight: 20 },
});