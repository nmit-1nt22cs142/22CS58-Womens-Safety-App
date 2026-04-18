import axios from 'axios';
import { Platform } from 'react-native';

// When running on Android Emulator, localhost points to the emulator itself. 
// 10.0.2.2 points to the host machine (your computer)
// If testing on a physical device via Expo, you MUST use your computer's local IP address (e.g., 192.168.1.10)
const getBaseUrl = () => {
    if (__DEV__) {
        return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://192.168.1.13:5000/api';
    }
    // Production Render URL will go here
    return 'https://your-production-url.onrender.com/api'; 
};

export const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json'
    }
});
