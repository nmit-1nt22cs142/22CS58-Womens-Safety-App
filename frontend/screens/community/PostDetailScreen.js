import React from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, StatusBar, Platform, Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../styles/colors';

const { width } = Dimensions.get('window');

const SAFETY_COLORS = [
  colors.safetyDangerous,
  colors.safetyUnsafe,
  colors.safetyModerate,
  colors.safetySafe,
  colors.safetyVerySafe,
];
const SAFETY_LABELS = ['Very Unsafe', 'Unsafe', 'Moderate', 'Safe', 'Very Safe'];

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

export default function PostDetailScreen({ route, navigation }) {
  const { post } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Details</Text>
        <TouchableOpacity style={styles.menuBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Author Card */}
        <View style={styles.authorCard}>
          <LinearGradient colors={gradients.primary} style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(post.authorId || 'U').substring(0, 1).toUpperCase()}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.authorName}>User {(post.authorId || 'anon').substring(0, 5)}</Text>
            <Text style={styles.postTime}>{getTimeAgo(post.createdAt)}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.success} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>
        </View>

        {/* Safety Rating */}
        {post.safetyRating && (
          <View style={[styles.ratingCard, {
            backgroundColor: SAFETY_COLORS[Math.min(post.safetyRating - 1, 4)] + '12',
            borderColor: SAFETY_COLORS[Math.min(post.safetyRating - 1, 4)] + '30',
          }]}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map(i => (
                <Ionicons
                  key={i}
                  name={i <= post.safetyRating ? 'star' : 'star-outline'}
                  size={22}
                  color={SAFETY_COLORS[Math.min(post.safetyRating - 1, 4)]}
                />
              ))}
            </View>
            <Text style={[styles.ratingLabel, {
              color: SAFETY_COLORS[Math.min(post.safetyRating - 1, 4)]
            }]}>
              {SAFETY_LABELS[Math.min(post.safetyRating - 1, 4)]}
            </Text>
          </View>
        )}

        {/* Location */}
        {post.location?.address && (
          <View style={styles.locationCard}>
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.locationLabel}>Reported Location</Text>
              <Text style={styles.locationAddress}>{post.location.address}</Text>
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{post.description}</Text>
        </View>

        {/* Harasser Details */}
        {post.harasserDetails && (
          <View style={styles.harasserCard}>
            <View style={styles.harasserHeader}>
              <Ionicons name="warning" size={18} color="#92400E" />
              <Text style={styles.harasserTitle}>Suspect Description</Text>
            </View>
            <Text style={styles.harasserText}>{post.harasserDetails}</Text>
          </View>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Evidence</Text>
            <Image
              source={{ uri: post.mediaUrl }}
              style={styles.mediaImage}
              resizeMode="cover"
            />
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="heart-outline" size={22} color={colors.primary} />
            <Text style={styles.actionText}>Support</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={22} color={colors.primary} />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.reportBtn]}>
            <Ionicons name="flag-outline" size={22} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.error }]}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Comments</Text>
          <View style={styles.commentPlaceholder}>
            <Ionicons name="chatbubbles-outline" size={36} color={colors.border} />
            <Text style={styles.commentText}>No comments yet</Text>
            <Text style={styles.commentSubtext}>Be the first to show support</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  headerTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 18, color: colors.text,
  },
  menuBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.card,
    justifyContent: 'center', alignItems: 'center',
  },

  // Author
  authorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16, padding: 16,
    marginBottom: 14, gap: 12,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 18, color: '#fff',
  },
  authorName: { fontSize: 16, fontWeight: '600', color: colors.text },
  postTime: { fontSize: 12, color: colors.textLight, marginTop: 2 },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 10, gap: 4,
  },
  verifiedText: { fontSize: 11, color: colors.success, fontWeight: '600' },

  // Rating
  ratingCard: {
    borderRadius: 16, padding: 18,
    marginBottom: 14, alignItems: 'center',
    borderWidth: 1,
  },
  ratingStars: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ratingLabel: { fontSize: 14, fontWeight: '700' },

  // Location
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    borderRadius: 14, padding: 16,
    marginBottom: 14, gap: 14,
  },
  locationIcon: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,155,105,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  locationLabel: { fontSize: 11, color: colors.textLight, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  locationAddress: { fontSize: 15, color: colors.primaryDark, fontWeight: '600' },

  // Sections
  section: { marginBottom: 18 },
  sectionTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 16, color: colors.text, marginBottom: 10,
  },
  description: {
    fontSize: 15, color: colors.text,
    lineHeight: 24, backgroundColor: colors.card,
    borderRadius: 14, padding: 18,
  },

  // Harasser
  harasserCard: {
    backgroundColor: colors.warningLight,
    borderRadius: 14, padding: 16, marginBottom: 18,
  },
  harasserHeader: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 8,
  },
  harasserTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  harasserText: { fontSize: 14, color: '#92400E', lineHeight: 21, fontStyle: 'italic' },

  // Media
  mediaImage: { width: '100%', height: 250, borderRadius: 16 },

  // Actions
  actionRow: {
    flexDirection: 'row', gap: 10, marginBottom: 20,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderRadius: 14,
    paddingVertical: 14, gap: 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1, shadowRadius: 4, elevation: 2,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  reportBtn: { backgroundColor: colors.errorLight },

  // Comments
  commentPlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16, paddingVertical: 36,
  },
  commentText: {
    fontSize: 15, fontWeight: '600',
    color: colors.textSecondary, marginTop: 10,
  },
  commentSubtext: {
    fontSize: 13, color: colors.textLight, marginTop: 4,
  },
});
