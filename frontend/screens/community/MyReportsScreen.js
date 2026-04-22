import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Animated, RefreshControl, StatusBar,
  Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../styles/colors';
import { communityApi as api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const SAFETY_COLORS = [
  colors.safetyDangerous,
  colors.safetyUnsafe,
  colors.safetyModerate,
  colors.safetySafe,
  colors.safetyVerySafe,
];

const getTimeAgo = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
};

const StarRating = ({ rating }) => (
  <View style={styles.starRow}>
    {[1, 2, 3, 4, 5].map(i => (
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={14}
        color={SAFETY_COLORS[Math.min(rating - 1, 4)] || colors.textLight}
      />
    ))}
  </View>
);

export default function MyReportsScreen({ navigation }) {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchMyReports = useCallback(async () => {
    try {
      const response = await api.get(`/community/posts?authorId=${user?.id || 'anon_user'}`);
      setPosts(response.data.data || []);
    } catch (error) {
      console.log('My Reports fetch error:', error.message);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMyReports();
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true
    }).start();
  }, [fetchMyReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyReports();
  };

  const renderPost = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
      >
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <LinearGradient colors={gradients.primary} style={styles.avatar}>
              <Text style={styles.avatarText}>M</Text>
            </LinearGradient>
            <View>
              <Text style={styles.authorName}>{item.authorName || 'My Report'}</Text>
              <Text style={styles.postTime}>{getTimeAgo(item.createdAt)}</Text>
            </View>
          </View>
          {item.safetyRating && (
            <View style={[styles.ratingBadge, {
              backgroundColor: (SAFETY_COLORS[Math.min(item.safetyRating - 1, 4)] || colors.textLight) + '18'
            }]}>
              <StarRating rating={item.safetyRating} />
            </View>
          )}
        </View>

        {item.address && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{item.address}</Text>
          </View>
        )}

        <Text style={styles.postBody} numberOfLines={3}>{item.description}</Text>

        {item.mediaUrl && (
          <Image source={{ uri: item.mediaUrl }} style={styles.postImage} resizeMode="cover" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>My Reports</Text>
          <Text style={styles.headerSubtitle}>{posts.length} entries recorded</Text>
        </View>
      </View>

      <FlatList
        data={posts}
        keyExtractor={item => item._id}
        renderItem={renderPost}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={60} color={colors.textLight} />
            <Text style={styles.emptyTitle}>No reports found</Text>
            <Text style={styles.emptySubtitle}>You haven't posted any safety reports yet.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary },
  listContent: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginRight: 12,
  },
  headerTitleContainer: { flex: 1 },
  headerTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 24,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 16,
    color: '#fff',
  },
  authorName: { fontSize: 14, fontWeight: '600', color: colors.text },
  postTime: { fontSize: 11, color: colors.textLight, marginTop: 1 },
  ratingBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  starRow: { flexDirection: 'row', gap: 2 },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    backgroundColor: colors.primaryFaded,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  locationText: { fontSize: 12, color: colors.primaryDark, fontWeight: '500' },
  postBody: { fontSize: 14, color: colors.text, lineHeight: 21, marginBottom: 10 },
  postImage: { width: '100%', height: 180, borderRadius: 14, marginTop: 4 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyTitle: { 
    fontFamily: 'DonegalOne_400Regular', 
    fontSize: 18, color: colors.text, 
    marginTop: 16 
  },
  emptySubtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
});
