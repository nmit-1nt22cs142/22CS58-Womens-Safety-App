import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { verifyAadhaar, verifyOTP, registerUser } from '../services/api';
import { colors, gradients } from '../styles/colors';

const { width } = Dimensions.get('window');

export default function RegistrationScreen({ navigation }) {
  // ── Step 1 info ──
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // ── Step 2 ──
  const [otp, setOtp] = useState('');
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // ── Step 3 ──
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  // ── Entrance animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Handlers (unchanged logic) ──────────────────────────────────────────
  const handleVerifyAadhaar = async () => {
    console.log('🔍 Verify Aadhaar clicked');
    if (!aadhaarNumber || aadhaarNumber.length !== 12) {
      alert('Please enter a valid 12-digit Aadhaar number');
      return;
    }
    setLoading(true);
    try {
      console.log('📤 Sending Aadhaar verification request:', aadhaarNumber);
      const response = await verifyAadhaar(aadhaarNumber);
      console.log('📥 Aadhaar verification response:', response);
      if (response.success) {
        setShowOtpInput(true);
        alert(`OTP sent to ${response.mobileNumber}`);
      }
    } catch (error) {
      console.error('❌ Aadhaar verification error:', error);
      alert(error.message || 'Aadhaar not found');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    console.log('🔐 Verify OTP clicked');
    if (!otp || otp.length !== 6) {
      alert('Enter valid 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      console.log('📤 Sending OTP verification request');
      const response = await verifyOTP(aadhaarNumber, otp);
      console.log('📥 OTP verification response:', response);
      if (response.success) {
        setIsAadhaarVerified(true);
        setMobileNumber(response.mobileNumber);
        alert('Aadhaar verified successfully!');
      }
    } catch (error) {
      console.error('❌ OTP verification error:', error);
      alert(error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    console.log('📝 Register button clicked');
    if (!name || !gender || !dob || !email || !username || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }
    if (!email.endsWith('@gmail.com')) {
      alert('Email must end with @gmail.com');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
      alert('Date must be in YYYY-MM-DD format (e.g., 1990-01-01)');
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    if (!isAadhaarVerified) {
      alert('Please verify your Aadhaar first');
      return;
    }
    setLoading(true);
    try {
      const userData = { name, gender, dob, email, aadhaarNumber, username, password };
      console.log('📤 Sending registration data:', userData);
      const response = await registerUser(userData);
      console.log('📥 Registration response:', response);
      if (response.success) {
        alert('Registration successful! Please login.');
        setTimeout(() => navigation.replace('Login'), 100);
      } else {
        alert(response.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      alert(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };
  // ────────────────────────────────────────────────────────────────────────

  // ── Reusable styled input (same look as RegisterScreen) ─────────────────
  const renderInput = (icon, placeholder, value, setter, options = {}) => (
    <View
      style={[
        styles.inputWrapper,
        focusedField === placeholder && styles.inputFocused,
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={focusedField === placeholder ? colors.primary : colors.textLight}
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textLight}
        value={value}
        onChangeText={setter}
        onFocus={() => setFocusedField(placeholder)}
        onBlur={() => setFocusedField(null)}
        {...options}
        secureTextEntry={options.secureTextEntry ? !showPassword : false}
      />
      {options.secureTextEntry !== undefined && (
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={colors.textLight}
          />
        </TouchableOpacity>
      )}
    </View>
  );

  // ── Section heading ──────────────────────────────────────────────────────
  const SectionTitle = ({ title, icon }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Full-screen gradient background */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, { width: 200, height: 200, top: -60, right: -60 }]} />
      <View style={[styles.circle, { width: 130, height: 130, bottom: 120, left: -50 }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        enabled
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Header */}
          <Animated.View
            style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSubtitle}>
              Register with your Aadhaar to get started
            </Text>
          </Animated.View>

          {/* Form Card */}
          <Animated.View
            style={[styles.formCard, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
          >
            {/* Safety / verification notice */}
            <View style={styles.safetyNotice}>
              <Ionicons name="shield-checkmark" size={18} color={colors.success} />
              <Text style={styles.safetyNoticeText}>
                Aadhaar verification required to ensure community safety
              </Text>
            </View>

            {/* ── Personal Information ─────────────────────────────────── */}
            <SectionTitle title="Personal Information" icon="person-outline" />

            {renderInput('person-outline', 'Full Name', name, setName, {
              autoCapitalize: 'words',
            })}

            {/* Gender picker styled to match card */}
            <View style={styles.pickerLabel}>
              <Ionicons name="transgender-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.pickerLabelText}>Gender</Text>
            </View>
            <View
              style={[
                styles.inputWrapper,
                { paddingHorizontal: 8, height: 52 },
              ]}
            >
              <Ionicons
                name="chevron-down-outline"
                size={18}
                color={colors.textLight}
                style={{ marginRight: 4 }}
              />
              <Picker
                selectedValue={gender}
                onValueChange={setGender}
                style={styles.picker}
                dropdownIconColor={colors.primary}
              >
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>

            {renderInput('calendar-outline', 'Date of Birth (YYYY-MM-DD)', dob, setDob)}

            {renderInput('mail-outline', 'Email address', email, setEmail, {
              keyboardType: 'email-address',
              autoCapitalize: 'none',
            })}

            {/* ── Aadhaar Verification ────────────────────────────────── */}
            <SectionTitle title="Aadhaar Verification" icon="card-outline" />

            {renderInput('card-outline', 'Aadhaar Number (12 digits)', aadhaarNumber, setAadhaarNumber, {
              keyboardType: 'number-pad',
              maxLength: 12,
              editable: !isAadhaarVerified,
            })}

            {!showOtpInput && !isAadhaarVerified && (
              <TouchableOpacity
                onPress={handleVerifyAadhaar}
                disabled={loading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={loading ? ['#ccc', '#bbb'] : ['#FF9800', '#F57C00']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.actionButton}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.actionButtonText}>Verify Aadhaar</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {showOtpInput && !isAadhaarVerified && (
              <>
                <View style={styles.otpInfoBox}>
                  <Ionicons name="information-circle" size={20} color="#007AFF" />
                  <Text style={styles.otpInfoText}>
                    Check your backend terminal for the OTP
                  </Text>
                </View>

                {renderInput('keypad-outline', 'Enter OTP (6 digits)', otp, setOtp, {
                  keyboardType: 'number-pad',
                  maxLength: 6,
                })}

                <TouchableOpacity
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={loading ? ['#ccc', '#bbb'] : ['#FF9800', '#F57C00']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.actionButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.actionButtonText}>Verify OTP</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}

            {isAadhaarVerified && (
              <View style={styles.verifiedBanner}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={styles.verifiedText}>Aadhaar Verified ✓</Text>
              </View>
            )}

            {/* ── Account Credentials (shown only after Aadhaar verified) ── */}
            {isAadhaarVerified && (
              <>
                <SectionTitle title="Account Credentials" icon="lock-closed-outline" />

                {renderInput('at-outline', 'Username', username, setUsername, {
                  autoCapitalize: 'none',
                })}

                {renderInput('lock-closed-outline', 'Password', password, setPassword, {
                  secureTextEntry: true,
                })}

                {renderInput('lock-closed-outline', 'Confirm Password', confirmPassword, setConfirmPassword, {
                  secureTextEntry: true,
                })}

                {password && confirmPassword && password !== confirmPassword && (
                  <Text style={styles.errorText}>Passwords do not match</Text>
                )}

                {/* Register button */}
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={loading ? ['#ccc', '#bbb'] : gradients.primary}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.actionButton, styles.registerButton]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Text style={styles.registerButtonText}>Create Account</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </Animated.View>

          {/* Sign-in link */}
          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={styles.loginBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 48,
  },

  // decorative background circles
  circle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  // back button
  backButton: {
    marginTop: Platform.OS === 'ios' ? 56 : 40,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // header
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 32,
    color: '#fff',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
    lineHeight: 22,
  },

  // form card
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderRadius: 24,
    padding: 24,
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },

  // safety notice
  safetyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 10,
  },
  safetyNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    lineHeight: 17,
  },

  // section heading
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 16,
    color: colors.text,
    letterSpacing: 0.3,
  },

  // shared text input row
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    height: 52,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaded,
  },
  inputIcon: { marginRight: 12 },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },

  // gender picker
  pickerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
    marginLeft: 2,
  },
  pickerLabelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  picker: {
    flex: 1,
    color: colors.text,
    height: 50,
  },

  // OTP info banner
  otpInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    gap: 10,
  },
  otpInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
    lineHeight: 18,
  },

  // verified banner
  verifiedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
    gap: 10,
  },
  verifiedText: {
    fontFamily: 'DonegalOne_400Regular',
    fontSize: 14,
    color: colors.success,
    letterSpacing: 0.3,
  },

  // action buttons (verify / OTP)
  actionButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonText: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // final register button (slightly taller)
  registerButton: {
    height: 54,
    marginTop: 8,
    shadowColor: colors.primary,
  },
  registerButtonText: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // error text
  errorText: {
    color: colors.error,
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
    marginTop: -8,
  },

  // sign-in link
  loginLink: {
    marginTop: 24,
    alignItems: 'center',
    paddingBottom: 20,
  },
  loginText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
  },
  loginBold: {
    fontFamily: 'DonegalOne_400Regular',
    color: '#fff',
  },
});