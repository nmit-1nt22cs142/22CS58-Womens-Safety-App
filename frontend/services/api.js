import axios from 'axios';
import { Platform } from 'react-native';

// ⚠️ IMPORTANT: Update this IP address with your computer's actual IP
const YOUR_COMPUTER_IP = '172.16.9.62'; // 👈 UPDATE THIS!
// hostel: 172.16.9.62
//harsha: 10.49.216.52
const getBaseURL = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api';
  } else {
    return `http://${YOUR_COMPUTER_IP}:3000/api`;
  }
};

const API_BASE_URL = getBaseURL();

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🖥️ Platform:', Platform.OS);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`📤 API Request: ${config.method.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response Error Details:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.response?.data?.message);
    return Promise.reject(error);
  }
);

// ============================================
// Authentication APIs
// ============================================

// Aadhaar verification
export const verifyAadhaar = async (aadhaarNumber) => {
  try {
    console.log('🔍 Verifying Aadhaar:', aadhaarNumber);
    const response = await api.post('/aadhaar/verify-aadhaar', { aadhaarNumber });
    return response.data;
  } catch (error) {
    console.error('❌ Aadhaar verification error:', error);
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

// OTP verification
export const verifyOTP = async (aadhaarNumber, otp) => {
  try {
    console.log('🔍 Verifying OTP:', { aadhaarNumber, otp });
    const response = await api.post('/aadhaar/verify-otp', { aadhaarNumber, otp });
    return response.data;
  } catch (error) {
    console.error('❌ OTP verification error:', error);
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

// User registration
export const registerUser = async (userData) => {
  try {
    console.log('📝 Registering user:', userData);
    const response = await api.post('/auth/register', userData);
    console.log('✅ Registration response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('❌ Error response:', error.response?.data);
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

// User login (USERNAME + PASSWORD)
export const loginUser = async (username, password) => {
  try {
    console.log('🔐 Logging in with username:', username);
    const response = await api.post('/auth/login', { username, password });
    console.log('✅ Login response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Login error:', error);
    console.error('❌ Error response:', error.response?.data);
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

// ============================================
// Guardian APIs
// ============================================

// Send guardian request
export const sendGuardianRequest = async (guardianUsername, token) => {
  try {
    const response = await api.post('/guardian/request', 
      { guardianUsername },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get pending guardian requests
export const getPendingGuardianRequests = async (token) => {
  try {
    const response = await api.get('/guardian/requests/pending', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Respond to guardian request
export const respondToGuardianRequest = async (requestId, action, token) => {
  try {
    const response = await api.post('/guardian/requests/respond', 
      { requestId, action },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get my guardians
export const getMyGuardians = async (token) => {
  try {
    const response = await api.get('/guardian/my-guardians', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get people I'm guarding
export const getPeopleImGuarding = async (token) => {
  try {
    const response = await api.get('/guardian/people-im-guarding', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Remove guardian
export const removeGuardian = async (guardianId, token) => {
  try {
    const response = await api.delete('/guardian/remove', {
      data: { guardianId },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Trigger danger alert
export const triggerDangerAlert = async (latitude, longitude, message, token) => {
  try {
    const response = await api.post('/guardian/danger-alert', 
      { latitude, longitude, message },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get alerts for guardian
export const getAlertsForGuardian = async (token) => {
  try {
    const response = await api.get('/guardian/alerts', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Mark alert as seen
export const markAlertAsSeen = async (alertId, token) => {
  try {
    const response = await api.post('/guardian/alerts/mark-seen', 
      { alertId },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get user details
export const getUserDetails = async (userId, token) => {
  try {
    const response = await api.get(`/guardian/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// ============================================
// Route/Geofencing APIs
// ============================================

// Start journey (on-demand — no saved route needed)
export const startTrip = async (fromAddress, toAddress, fromLatitude, fromLongitude, toLatitude, toLongitude, token) => {
  try {
    const response = await api.post('/routes/trip/start',
      { fromAddress, toAddress, fromLatitude, fromLongitude, toLatitude, toLongitude },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Save GPS point
export const saveGPSPoint = async (tripId, latitude, longitude, accuracy, token) => {
  try {
    const response = await api.post('/routes/trip/gps-point',
      { tripId, latitude, longitude, accuracy },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Log deviation alert
export const logDeviationAlert = async (tripId, deviationPercentage, latitude, longitude, userResponse, token) => {
  try {
    const response = await api.post('/routes/trip/deviation',
      { tripId, deviationPercentage, latitude, longitude, userResponse },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// End trip
export const endTrip = async (tripId, token) => {
  try {
    const response = await api.post('/routes/trip/end',
      { tripId },
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get guardian active journeys
export const getGuardianActiveJourneys = async (token) => {
  try {
    const response = await api.get('/routes/guardian/active-journeys', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get guardian completed journeys
export const getGuardianCompletedJourneys = async (token) => {
  try {
    const response = await api.get('/routes/guardian/completed-journeys', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get user journey details (for guardian)
export const getUserJourneyDetails = async (userId, token) => {
  try {
    const response = await api.get(`/routes/guardian/user/${userId}/journeys`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get trip GPS points
export const getTripGPSPoints = async (tripId, token) => {
  try {
    const response = await api.get(`/routes/guardian/trip/${tripId}/gps-points`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// ============================================
// Live Location APIs
// ============================================

// Start live location sharing
export const startLiveLocation = async (latitude, longitude, token) => {
  try {
    const response = await api.post('/routes/live-location/start',
      { latitude, longitude },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Update live location
export const updateLiveLocation = async (sessionId, latitude, longitude, token) => {
  try {
    const response = await api.post('/routes/live-location/update',
      { sessionId, latitude, longitude },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Stop live location sharing
export const stopLiveLocation = async (sessionId, token) => {
  try {
    const response = await api.post('/routes/live-location/stop',
      { sessionId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// Get live location of a user (for guardian)
export const getLiveLocation = async (userId, token) => {
  try {
    const response = await api.get(`/routes/live-location/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export default api;