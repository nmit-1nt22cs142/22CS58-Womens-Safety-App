import React, { useState, useEffect } from 'react';
import { getUserJourneyDetails } from '../services/api';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  getPendingGuardianRequests, 
  respondToGuardianRequest,
  getPeopleImGuarding,
  getAlertsForGuardian
} from '../services/api';

export default function GuardianScreen({ route, navigation }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [peopleImGuarding, setPeopleImGuarding] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState('');

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
      
      // Load all data in parallel
      const [requestsRes, peopleRes, alertsRes] = await Promise.all([
        getPendingGuardianRequests(authToken),
        getPeopleImGuarding(authToken),
        getAlertsForGuardian(authToken)
      ]);

      if (requestsRes.success) {
        setPendingRequests(requestsRes.requests);
      }
      
      if (peopleRes.success) {
        setPeopleImGuarding(peopleRes.people);
      }

      if (alertsRes.success) {
        setAlerts(alertsRes.alerts);
      }
    } catch (error) {
      console.error('Error loading guardian data:', error);
      Alert.alert('Error', 'Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
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
          peopleImGuarding.map((person) => (
            <TouchableOpacity 
              key={person.id} 
              style={styles.personCard}
              onPress={() => handlePersonClick(person)}
            >
              <View style={styles.personInfo}>
                <Ionicons name="person-circle" size={48} color="#007AFF" />
                <View style={styles.personDetails}>
                  <Text style={styles.personName}>{person.name}</Text>
                  <Text style={styles.personUsername}>@{person.username}</Text>
                  <Text style={styles.personSince}>
                    Since {new Date(person.guarding_since).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#999" />
            </TouchableOpacity>
          ))
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
              <Ionicons 
                name="warning" 
                size={32} 
                color={!alert.seen ? "#FF4D4D" : "#999"} 
              />
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
  container: { 
    flex: 1, 
    backgroundColor: '#F7F7F7' 
  },
  contentContainer: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F7F7',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 20,
    color: '#333',
  },
  
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  
  // Request Card
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestDetails: {
    marginLeft: 12,
    flex: 1,
  },
  requestName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  requestUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  requestText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#d32f2f',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Person Card
  personCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personDetails: {
    marginLeft: 12,
    flex: 1,
  },
  personName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  personUsername: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  personSince: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  
  // Alert Card
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
  },
  alertCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF4D4D',
  },
  alertInfo: {
    marginLeft: 12,
    flex: 1,
  },
  alertName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  alertTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF4D4D',
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});