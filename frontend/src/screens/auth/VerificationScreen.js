import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Animated, StatusBar, Dimensions, Platform, Alert, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients } from '../../styles/colors';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');

export default function VerificationScreen({ navigation }) {
  const { completeVerification, user } = useAuth();
  const [idImage, setIdImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = ID, 2 = Selfie, 3 = Review

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.33)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 600, useNativeDriver: true
    }).start();
  }, []);

  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / 3, duration: 400, useNativeDriver: false
    }).start();
  }, [step]);

  const pickImage = async (setter) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setter(result.assets[0].uri);
    }
  };

  const takeSelfie = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access for verification.');
      return;
    }
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelfieImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate verification processing
      await new Promise(r => setTimeout(r, 1500));
      await completeVerification();
    } catch (e) {
      Alert.alert('Error', 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <Animated.View style={[styles.stepCard, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { backgroundColor: colors.primaryFaded }]}>
          <Ionicons name="card-outline" size={24} color={colors.primary} />
        </View>
        <Text style={styles.stepTitle}>Government ID</Text>
        <Text style={styles.stepDesc}>
          Upload a clear photo of your government-issued ID (Aadhaar, PAN, Voter ID, or Passport)
        </Text>
      </View>

      {idImage ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: idImage }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => setIdImage(null)}
          >
            <Ionicons name="close-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadArea}
          onPress={() => pickImage(setIdImage)}
        >
          <Ionicons name="cloud-upload-outline" size={40} color={colors.primary} />
          <Text style={styles.uploadText}>Tap to upload ID</Text>
          <Text style={styles.uploadHint}>JPG, PNG • Max 5MB</Text>
        </TouchableOpacity>
      )}

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={18} color={colors.info} />
        <Text style={styles.infoText}>
          Your ID is only used for gender verification and is encrypted securely. We do not store your ID number.
        </Text>
      </View>

      <TouchableOpacity
        disabled={!idImage}
        onPress={() => setStep(2)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={!idImage ? ['#ccc', '#bbb'] : gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.nextButton}
        >
          <Text style={styles.nextButtonText}>Continue</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={[styles.stepCard, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { backgroundColor: colors.primaryFaded }]}>
          <Ionicons name="camera-outline" size={24} color={colors.primary} />
        </View>
        <Text style={styles.stepTitle}>Selfie Verification</Text>
        <Text style={styles.stepDesc}>
          Take a selfie to verify your identity matches your ID. This ensures only verified women can access safety features.
        </Text>
      </View>

      {selfieImage ? (
        <View style={styles.imagePreview}>
          <Image source={{ uri: selfieImage }} style={[styles.previewImage, { borderRadius: 80 }]} />
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => setSelfieImage(null)}
          >
            <Ionicons name="close-circle" size={28} color={colors.error} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selfieActions}>
          <TouchableOpacity
            style={styles.selfieButton}
            onPress={takeSelfie}
          >
            <LinearGradient
              colors={gradients.primary}
              style={styles.selfieButtonGradient}
            >
              <Ionicons name="camera" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.selfieLabel}>Take Selfie</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.selfieButton}
            onPress={() => pickImage(setSelfieImage)}
          >
            <View style={styles.selfieButtonOutline}>
              <Ionicons name="images-outline" size={32} color={colors.primary} />
            </View>
            <Text style={styles.selfieLabel}>Upload Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setStep(1)}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backStepText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          disabled={!selfieImage}
          onPress={() => setStep(3)}
          activeOpacity={0.85}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={!selfieImage ? ['#ccc', '#bbb'] : gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            <Text style={styles.nextButtonText}>Review</Text>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={[styles.stepCard, { opacity: fadeAnim }]}>
      <View style={styles.stepHeader}>
        <View style={[styles.stepBadge, { backgroundColor: colors.successLight }]}>
          <Ionicons name="shield-checkmark" size={24} color={colors.success} />
        </View>
        <Text style={styles.stepTitle}>Review & Submit</Text>
        <Text style={styles.stepDesc}>
          Please confirm your uploaded documents look correct before submitting.
        </Text>
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Government ID</Text>
        {idImage && <Image source={{ uri: idImage }} style={styles.reviewImage} />}
      </View>

      <View style={styles.reviewSection}>
        <Text style={styles.reviewLabel}>Selfie</Text>
        {selfieImage && <Image source={{ uri: selfieImage }} style={[styles.reviewImage, { borderRadius: 12 }]} />}
      </View>

      <View style={styles.verifyNotice}>
        <Ionicons name="time-outline" size={18} color={colors.warning} />
        <Text style={styles.verifyNoticeText}>
          Verification is typically instant for presentation purposes. In production, it takes 24-48 hours.
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.backStepButton}
          onPress={() => setStep(2)}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <Text style={styles.backStepText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
          style={{ flex: 1 }}
        >
          <LinearGradient
            colors={gradients.primary}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextButton}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={[styles.nextButtonText, { marginLeft: 8 }]}>Verify & Enter</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.topGradient}
      />

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%']
            })
          }]} />
        </View>
        <View style={styles.stepIndicators}>
          {['ID Upload', 'Selfie', 'Review'].map((label, i) => (
            <View key={i} style={styles.stepDot}>
              <View style={[
                styles.dot,
                step > i && styles.dotCompleted,
                step === i + 1 && styles.dotActive
              ]}>
                {step > i + 1 ? (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                ) : (
                  <Text style={[styles.dotNumber, step >= i + 1 && { color: '#fff' }]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[styles.stepLabel, step === i + 1 && styles.stepLabelActive]}>{label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 180,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  // Progress
  progressContainer: {
    paddingTop: Platform.OS === 'ios' ? 60 : 44,
    paddingHorizontal: 28,
    paddingBottom: 20,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  stepDot: { alignItems: 'center' },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  dotActive: { backgroundColor: '#fff' },
  dotCompleted: { backgroundColor: colors.success },
  dotNumber: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  stepLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  stepLabelActive: { color: '#fff', fontWeight: '600' },

  // Content
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    shadowColor: 'rgba(0,0,0,0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  stepHeader: { marginBottom: 20 },
  stepBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 22,
    color: colors.text,
    marginBottom: 6,
  },
  stepDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // Upload Area
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 36,
    alignItems: 'center',
    backgroundColor: colors.primaryFaded,
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 12,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 4,
  },

  // Image Preview
  imagePreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  previewImage: {
    width: width - 96,
    height: 180,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 14,
  },

  // Selfie
  selfieActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  selfieButton: { alignItems: 'center' },
  selfieButtonGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  selfieButtonOutline: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  selfieLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    fontWeight: '500',
  },

  // Info boxes
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.infoLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },
  verifyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.warningLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  verifyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },

  // Review
  reviewSection: { marginBottom: 16 },
  reviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  reviewImage: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    resizeMode: 'cover',
  },

  // Buttons
  nextButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nextButtonText: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 4,
  },
  backStepText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '600',
  },
});
