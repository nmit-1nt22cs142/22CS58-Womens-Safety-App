import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, Image,
  StyleSheet, Animated, RefreshControl, StatusBar,
  Platform, Dimensions, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, gradients } from '../../styles/colors';
import { api } from '../../services/api';

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

export default function CommunityFeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const filters = ['All', 'Recent', 'Nearby', 'High Risk'];

  const fetchFeed = useCallback(async () => {
    try {
      const response = await api.get('/community/posts');
      setPosts(response.data.data || []);
    } catch (error) {
      console.log('Feed fetch error:', error.message);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchFeed);
    fetchFeed();
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 500, useNativeDriver: true
    }).start();
    return unsubscribe;
  }, [navigation, fetchFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const renderPost = ({ item, index }) => (
    <Animated.View style={{
      opacity: fadeAnim,
      transform: [{
        translateY: fadeAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0]
        })
      }]
    }}>
      <TouchableOpacity
        style={styles.postCard}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('PostDetail', { post: item })}
      >
        {/* Post Header */}
        <View style={styles.postHeader}>
          <View style={styles.authorRow}>
            <LinearGradient
              colors={gradients.primary}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>
                {(item.authorId || 'U').substring(0, 1).toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={styles.authorName}>User {(item.authorId || 'anon').substring(0, 5)}</Text>
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

        {/* Location */}
        {item.location?.address && (
          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.primary} />
            <Text style={styles.locationText} numberOfLines={1}>{item.location.address}</Text>
          </View>
        )}

        {/* Description */}
        <Text style={styles.postBody} numberOfLines={3}>{item.description}</Text>

        {/* Harasser Details */}
        {item.harasserDetails && (
          <View style={styles.detailsBanner}>
            <Ionicons name="warning-outline" size={14} color="#92400E" />
            <Text style={styles.detailsText} numberOfLines={2}>{item.harasserDetails}</Text>
          </View>
        )}

        {/* Image */}
        {item.mediaUrl && (
          <Image
            source={{ uri: item.mediaUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        )}

        {/* Interaction Row */}
        <View style={styles.interactionRow}>
          <TouchableOpacity style={styles.interactionBtn}>
            <Ionicons name="heart-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.interactionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.interactionBtn}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.interactionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.interactionBtn}>
            <Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.interactionText}>Share</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHeader = () => (
    <>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>Stay informed, stay safe</Text>
        </View>
        <TouchableOpacity style={styles.searchButton}>
          <Ionicons name="search-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {filters.map(f => (
          <TouchableOpacity
            key={f}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.7}
          >
            {activeFilter === f ? (
              <LinearGradient
                colors={gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.filterChipActive}
              >
                <Text style={styles.filterTextActive}>{f}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.filterChip}>
                <Text style={styles.filterText}>{f}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{posts.length}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{posts.filter(p => p.safetyRating && p.safetyRating <= 2).length}</Text>
          <Text style={styles.statLabel}>High Risk</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Areas</Text>
        </View>
      </View>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="chatbubbles-outline" size={56} color={colors.primaryLight} />
      </View>
      <Text style={styles.emptyTitle}>No reports yet</Text>
      <Text style={styles.emptySubtitle}>
        Be the first to share a safety report and help keep your community safe.
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.emptyButton}
        >
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.emptyButtonText}>Create First Report</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading reports...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <FlatList
        data={posts}
        keyExtractor={item => item._id}
        renderItem={renderPost}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreatePost')}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={gradients.primary}
          style={styles.fabGradient}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    marginBottom: 16,
  },
  headerTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 28,
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  searchButton: {
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

  // Filters
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { fontSize: 13, color: '#fff', fontWeight: '600' },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 22,
    color: colors.primary,
  },
  statLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.border },

  // Post Card
  postCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
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

  // Rating
  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  starRow: { flexDirection: 'row', gap: 2 },

  // Location
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
  locationText: {
    fontSize: 12,
    color: colors.primaryDark,
    fontWeight: '500',
    maxWidth: width - 120,
  },

  // Body
  postBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },

  // Harasser Details
  detailsBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    padding: 10,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  detailsText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
    fontStyle: 'italic',
  },

  // Image
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
    marginBottom: 10,
  },

  // Interactions
  interactionRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: 12,
    marginTop: 4,
  },
  interactionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  interactionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Empty
  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 20,
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
    fontSize: 15,
  },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    zIndex: 10,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
