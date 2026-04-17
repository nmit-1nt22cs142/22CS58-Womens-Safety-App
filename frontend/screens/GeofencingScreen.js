import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserRoutes, deleteRoute } from '../services/api';

export default function GeofencingScreen({ navigation }) {
  const [routes, setRoutes] = useState([]);
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
        await loadRoutes(authToken);
      } else {
        Alert.alert('Error', 'Please login again');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Error initializing screen:', error);
      setLoading(false);
    }
  };

  const loadRoutes = async (authToken) => {
    try {
      setLoading(true);
      const response = await getUserRoutes(authToken);
      
      if (response.success) {
        setRoutes(response.routes);
      }
    } catch (error) {
      console.error('Error loading routes:', error);
      Alert.alert('Error', 'Failed to load routes');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRoutes(token);
    setRefreshing(false);
  };

  const handleDeleteRoute = (routeId, fromAddress, toAddress) => {
    Alert.alert(
      'Delete Route',
      `Delete route from ${fromAddress} to ${toAddress}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoute(routeId, token);
              Alert.alert('Success', 'Route deleted');
              await loadRoutes(token);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete route');
            }
          }
        }
      ]
    );
  };

  const formatLastVisit = (lastVisit) => {
    if (!lastVisit) return 'Never';
    
    const now = new Date();
    const visitDate = new Date(lastVisit);
    const diffTime = Math.abs(now - visitDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return visitDate.toLocaleDateString();
  };

  const formatEstimatedTime = (milliseconds) => {
    if (!milliseconds) return 'N/A';
    
    const minutes = Math.floor(milliseconds / 60000);
    if (minutes < 60) return `${minutes} min`;
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading routes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Routes</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {routes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="map-outline" size={80} color="#ccc" />
            <Text style={styles.emptyText}>No routes saved yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first route to start tracking your journeys
            </Text>
          </View>
        ) : (
          routes.map((route) => (
            <TouchableOpacity
              key={route.id}
              style={styles.routeCard}
              onPress={() => navigation.navigate('TrackRoute', { 
                route: route,
                token: token 
              })}
            >
              <View style={styles.routeHeader}>
                <View style={styles.routeAddresses}>
                  <View style={styles.addressRow}>
                    <Ionicons name="location" size={20} color="#4CAF50" />
                    <Text style={styles.fromAddress}>{route.from_address}</Text>
                  </View>
                  
                  <Ionicons name="arrow-forward" size={20} color="#666" style={styles.arrow} />
                  
                  <View style={styles.addressRow}>
                    <Ionicons name="location" size={20} color="#FF4D4D" />
                    <Text style={styles.toAddress}>{route.to_address}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteRoute(route.id, route.from_address, route.to_address);
                  }}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={22} color="#d32f2f" />
                </TouchableOpacity>
              </View>

              <View style={styles.routeStats}>
                <View style={styles.statItem}>
                  <Ionicons name="time-outline" size={18} color="#666" />
                  <Text style={styles.statText}>{formatEstimatedTime(route.estimated_time)}</Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="calendar-outline" size={18} color="#666" />
                  <Text style={styles.statText}>{formatLastVisit(route.last_visit)}</Text>
                </View>

                <View style={styles.statItem}>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#666" />
                  <Text style={styles.statText}>{route.trips_completed} / 3 trips</Text>
                </View>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${route.learned_percentage}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>{route.learned_percentage}% learned</Text>
              </View>

              {route.learned_percentage === 100 && (
                <View style={styles.learnedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                  <Text style={styles.learnedText}>Fully Learned ✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddRoute', { token })}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  routeAddresses: {
    flex: 1,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  fromAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  toAddress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  arrow: {
    marginLeft: 28,
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  routeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  learnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  learnedText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});