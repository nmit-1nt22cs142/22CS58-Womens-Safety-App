import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import CustomInput from '../components/CustomInput';
import { verifyAadhaar, verifyOTP, registerUser } from '../services/api';

const RegistrationScreen = ({ navigation }) => {
  // Step 1 info
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [email, setEmail] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Step 2
  const [otp, setOtp] = useState('');
  const [isAadhaarVerified, setIsAadhaarVerified] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);

  // Step 3
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);

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
    
    // Validation
    if (!name || !gender || !dob || !email || !username || !password || !confirmPassword) {
      alert('Please fill in all fields');
      return;
    }

    if (!email.endsWith('@gmail.com')) {
      alert('Email must end with @gmail.com');
      return;
    }

    // Validate date format
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
      const userData = {
        name,
        gender,
        dob,
        email,
        aadhaarNumber,
        username,
        password,
      };

      console.log('📤 Sending registration data:', userData);
      const response = await registerUser(userData);
      console.log('📥 Registration response:', response);

      if (response.success) {
        alert('Registration successful! Please login.');
        
        setTimeout(() => {
          navigation.replace('Login');
        }, 100);
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

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      enabled={true}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="person-add" size={48} color="#FF6B9D" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register with your Aadhaar</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Personal Information</Text>

          <CustomInput
            label="Full Name"
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
          />

          <View style={styles.pickerContainer}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerWrapper}>
              <Picker 
                selectedValue={gender} 
                onValueChange={setGender} 
                style={styles.picker}
              >
                <Picker.Item label="Male" value="Male" />
                <Picker.Item label="Female" value="Female" />
                <Picker.Item label="Other" value="Other" />
              </Picker>
            </View>
          </View>

          <CustomInput
            label="Date of Birth"
            value={dob}
            onChangeText={setDob}
            placeholder="YYYY-MM-DD (e.g., 1990-01-01)"
          />

          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="yourname@gmail.com"
            keyboardType="email-address"
          />

          <Text style={styles.sectionTitle}>Aadhaar Verification</Text>

          <CustomInput
            label="Aadhaar Number"
            value={aadhaarNumber}
            onChangeText={setAadhaarNumber}
            placeholder="Enter 12-digit Aadhaar number"
            keyboardType="number-pad"
            maxLength={12}
            editable={!isAadhaarVerified}
          />

          {!showOtpInput && !isAadhaarVerified && (
            <TouchableOpacity 
              style={[styles.verifyButton, loading && styles.buttonDisabled]} 
              onPress={handleVerifyAadhaar}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.verifyButtonText}>Verify Aadhaar</Text>
                </>
              )}
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

              <CustomInput
                label="Enter OTP"
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                maxLength={6}
              />

              <TouchableOpacity 
                style={[styles.verifyButton, loading && styles.buttonDisabled]} 
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.verifyButtonText}>Verify OTP</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {isAadhaarVerified && (
            <View style={styles.verifiedContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.verifiedText}>Aadhaar Verified ✓</Text>
            </View>
          )}

          {isAadhaarVerified && (
            <>
              <Text style={styles.sectionTitle}>Account Credentials</Text>

              <CustomInput
                label="Username"
                value={username}
                onChangeText={setUsername}
                placeholder="Choose a username"
              />

              <CustomInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Create a password (min 6 characters)"
                secureTextEntry
              />

              <CustomInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                secureTextEntry
              />

              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.buttonDisabled]} 
                onPress={handleRegister}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.submitButtonText}>Register</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            style={styles.backToLogin} 
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backToLoginText}>
              Already have an account? Login
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  contentContainer: {
    padding: 24,
    paddingTop: 30,
    paddingBottom: 60,
    minHeight: Dimensions.get('window').height,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
    marginTop: 12,
  },
  subtitle: { 
    fontSize: 15, 
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 28,
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  pickerContainer: { 
    marginBottom: 20 
  },
  label: { 
    fontSize: 15, 
    fontWeight: '600', 
    marginBottom: 10, 
    color: '#1a1a1a',
    letterSpacing: 0.3,
  },
  pickerWrapper: { 
    borderWidth: 1.5, 
    borderColor: '#E0E0E0', 
    borderRadius: 10, 
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: { 
    height: 50,
    color: '#1a1a1a',
  },
  otpInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  otpInfoText: {
    fontSize: 14,
    color: '#007AFF',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  verifyButtonText: { 
    color: '#fff', 
    fontSize: 15, 
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  verifiedText: { 
    fontSize: 15, 
    color: '#4CAF50', 
    fontWeight: '700', 
    marginLeft: 12,
    letterSpacing: 0.3,
  },
  submitButton: {
    backgroundColor: '#FF6B9D',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    backgroundColor: '#D0D0D0',
    elevation: 0,
    shadowOpacity: 0,
    opacity: 1,
  },
  backToLogin: { 
    marginTop: 24, 
    alignItems: 'center',
    paddingVertical: 16,
  },
  backToLoginText: { 
    fontSize: 15, 
    color: '#FF6B9D',
    fontWeight: '600',
  },
});

export default RegistrationScreen;