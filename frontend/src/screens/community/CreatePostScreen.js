import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Image, StyleSheet, Platform,
  StatusBar, Dimensions, KeyboardAvoidingView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../styles/colors';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

const SAFETY_LABELS = ['Very Unsafe', 'Unsafe', 'Moderate', 'Safe', 'Very Safe'];
const SAFETY_COLORS = [
  colors.safetyDangerous,
  colors.safetyUnsafe,
  colors.safetyModerate,
  colors.safetySafe,
  colors.safetyVerySafe,
];

export default function CreatePostScreen({ navigation }) {
  const { user } = useAuth();
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [harasserDetails, setHarasserDetails] = useState('');
  const [safetyRating, setSafetyRating] = useState(3);
  const [imageUri, setImageUri] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [latitude, setLatitude] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const detectLocation = async () => {
    setLocating(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setLatitude(latitude);
      setLongitude(longitude);
      
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (reverseGeocode && reverseGeocode.length > 0) {
        const place = reverseGeocode[0];
        const formattedAddress = [
          place.name,
          place.street,
          place.city,
          place.region
        ].filter(Boolean).join(', ');
        
        setAddress(formattedAddress);
      }
    } catch (error) {
      console.log('Location error:', error);
      Alert.alert('Location Error', 'Could not detect your current location.');
    } finally {
      setLocating(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!address || !description) {
      Alert.alert('Required Fields', 'Please fill in the location and description.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('authorId', user?.id || 'anon_user');
      formData.append('authorName', user?.name || 'Anonymous');
      formData.append('address', address);
      formData.append('description', description);
      if (harasserDetails) formData.append('harasserDetails', harasserDetails);
      if (safetyRating) formData.append('safetyRating', safetyRating);
      if (longitude) formData.append('longitude', longitude);
      if (latitude) formData.append('latitude', latitude);

      if (imageUri) {
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image';
        formData.append('media', { uri: imageUri, name: filename, type });
      }

      await api.post('/community/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert('Report Submitted', 'Thank you for keeping the community safe.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Failed to post:', error);
      Alert.alert('Error', 'Failed to submit report. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner */}
          <View style={styles.infoBanner}>
            <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
            <Text style={styles.infoText}>
              Your report is anonymous and helps others stay safe.
            </Text>
          </View>

          {/* Location */}
          <Text style={styles.label}>LOCATION *</Text>
          <View style={[styles.inputWrapper, focusedField === 'address' && styles.inputFocused]}>
            <Ionicons name="location-outline" size={20} color={focusedField === 'address' ? colors.primary : colors.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Where did this happen?"
              placeholderTextColor={colors.textLight}
              value={address}
              onChangeText={setAddress}
              onFocus={() => setFocusedField('address')}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity 
              onPress={detectLocation} 
              disabled={locating}
              style={styles.locationBtn}
            >
              {locating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="locate" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.label}>DESCRIPTION *</Text>
          <View style={[styles.textAreaWrapper, focusedField === 'desc' && styles.inputFocused]}>
            <TextInput
              style={styles.textArea}
              placeholder="Describe what happened in detail..."
              placeholderTextColor={colors.textLight}
              multiline
              textAlignVertical="top"
              value={description}
              onChangeText={setDescription}
              onFocus={() => setFocusedField('desc')}
              onBlur={() => setFocusedField(null)}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Harasser Details */}
          <Text style={styles.label}>SUSPECT DETAILS (OPTIONAL)</Text>
          <View style={[styles.inputWrapper, focusedField === 'harasser' && styles.inputFocused]}>
            <Ionicons name="person-outline" size={20} color={focusedField === 'harasser' ? colors.primary : colors.textLight} />
            <TextInput
              style={styles.input}
              placeholder="Height, clothing, distinguishing features"
              placeholderTextColor={colors.textLight}
              value={harasserDetails}
              onChangeText={setHarasserDetails}
              onFocus={() => setFocusedField('harasser')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Safety Rating */}
          <Text style={styles.label}>SAFETY RATING</Text>
          <View style={styles.ratingCard}>
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map(i => (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSafetyRating(i)}
                  style={styles.starBtn}
                >
                  <Ionicons
                    name={i <= safetyRating ? 'star' : 'star-outline'}
                    size={32}
                    color={SAFETY_COLORS[safetyRating - 1]}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.ratingLabel, { backgroundColor: SAFETY_COLORS[safetyRating - 1] + '18' }]}>
              <Text style={[styles.ratingLabelText, { color: SAFETY_COLORS[safetyRating - 1] }]}>
                {SAFETY_LABELS[safetyRating - 1]}
              </Text>
            </View>
          </View>

          {/* Photo Upload */}
          <Text style={styles.label}>EVIDENCE (OPTIONAL)</Text>
          {imageUri ? (
            <View style={styles.imagePreview}>
              <Image source={{ uri: imageUri }} style={styles.previewImg} />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => setImageUri(null)}
              >
                <Ionicons name="close-circle" size={28} color={colors.error} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.uploadRow}>
              <TouchableOpacity style={styles.uploadBtn} onPress={takePhoto}>
                <Ionicons name="camera-outline" size={28} color={colors.primary} />
                <Text style={styles.uploadLabel}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
                <Ionicons name="images-outline" size={28} color={colors.primary} />
                <Text style={styles.uploadLabel}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading || !address || !description}
            activeOpacity={0.85}
            style={{ marginTop: 24 }}
          >
            <LinearGradient
              colors={(!address || !description) ? ['#ccc', '#bbb'] : gradients.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButton}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#fff" />
                  <Text style={styles.submitText}>Submit Report</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: colors.background,
  },
  backBtn: {
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
  headerTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 20,
    color: colors.text,
  },

  // Info Banner
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginBottom: 24,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryDark,
    lineHeight: 18,
  },

  // Labels
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    height: 54,
    gap: 10,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  locationBtn: {
    padding: 4,
  },

  textAreaWrapper: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: 120,
  },
  textArea: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
    minHeight: 80,
  },
  charCount: {
    fontSize: 11,
    color: colors.textLight,
    textAlign: 'right',
    marginTop: 4,
  },

  // Rating
  ratingCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  starBtn: { padding: 2 },
  ratingLabel: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  ratingLabelText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // Upload
  uploadRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
  },
  uploadBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: 6,
  },
  uploadLabel: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },

  // Image Preview
  imagePreview: {
    marginBottom: 8,
  },
  previewImg: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  removeImage: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
  },

  // Submit
  submitButton: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitText: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
    fontSize: 17,
  },
});
