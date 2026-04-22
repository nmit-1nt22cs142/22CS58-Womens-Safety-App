import axios from 'axios';
import { Platform } from 'react-native';

const YOUR_COMPUTER_IP = '192.168.0.105'; // 👈 UPDATE THIS!
// hostel: 172.16.9.62
// harsha: 10.49.216.52
// adarsh home:192.168.0.101
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
  headers: { 'Content-Type': 'application/json' },
});

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

export const verifyAadhaar = async (aadhaarNumber) => {
  try {
    const response = await api.post('/aadhaar/verify-aadhaar', { aadhaarNumber });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

export const verifyOTP = async (aadhaarNumber, otp) => {
  try {
    const response = await api.post('/aadhaar/verify-otp', { aadhaarNumber, otp });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await api.post('/auth/register', userData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error. Check if backend is running.' };
  }
};

// ============================================
// Guardian APIs
// ============================================

export const sendGuardianRequest = async (guardianUsername, token) => {
  try {
    const response = await api.post('/guardian/request',
      { guardianUsername },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getPendingGuardianRequests = async (token) => {
  try {
    const response = await api.get('/guardian/requests/pending', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const respondToGuardianRequest = async (requestId, action, token) => {
  try {
    const response = await api.post('/guardian/requests/respond',
      { requestId, action },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getMyGuardians = async (token) => {
  try {
    const response = await api.get('/guardian/my-guardians', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getPeopleImGuarding = async (token) => {
  try {
    const response = await api.get('/guardian/people-im-guarding', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const removeGuardian = async (guardianId, token) => {
  try {
    const response = await api.delete('/guardian/remove', {
      data: { guardianId },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const triggerDangerAlert = async (latitude, longitude, message, token) => {
  try {
    const response = await api.post('/guardian/danger-alert',
      { latitude, longitude, message },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getAlertsForGuardian = async (token) => {
  try {
    const response = await api.get('/guardian/alerts', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const markAlertAsSeen = async (alertId, token) => {
  try {
    const response = await api.post('/guardian/alerts/mark-seen',
      { alertId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getUserDetails = async (userId, token) => {
  try {
    const response = await api.get(`/guardian/user/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// ============================================
// Route / Trip APIs
// ============================================

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

export const saveGPSPoint = async (tripId, latitude, longitude, accuracy, token) => {
  try {
    const response = await api.post('/routes/trip/gps-point',
      { tripId, latitude, longitude, accuracy },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const logDeviationAlert = async (tripId, deviationPercentage, latitude, longitude, userResponse, token) => {
  try {
    const response = await api.post('/routes/trip/deviation',
      { tripId, deviationPercentage, latitude, longitude, userResponse },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const endTrip = async (tripId, token) => {
  try {
    const response = await api.post('/routes/trip/end',
      { tripId },
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getGuardianActiveJourneys = async (token) => {
  try {
    const response = await api.get('/routes/guardian/active-journeys', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getGuardianCompletedJourneys = async (token) => {
  try {
    const response = await api.get('/routes/guardian/completed-journeys', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getUserJourneyDetails = async (userId, token) => {
  try {
    const response = await api.get(`/routes/guardian/user/${userId}/journeys`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getTripGPSPoints = async (tripId, token) => {
  try {
    const response = await api.get(`/routes/guardian/trip/${tripId}/gps-points`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

// ============================================
// Live Location APIs
// ============================================

// Start standalone live location sharing (from HomeScreen)
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

// Push a location update every 5 seconds
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

// Stop sharing
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

// Guardian polls this every 5 seconds
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

// ============================================
// USER'S TRIP HISTORY APIS
// ============================================

export const getUserTripHistory = async (token, limit = 20, offset = 0) => {
  try {
    const response = await api.get('/routes/trip/history', {
      params: { limit, offset },
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export const getActiveTrip = async (token) => {
  try {
    const response = await api.get('/routes/trip/active', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, message: 'Network error' };
  }
};

export default api;