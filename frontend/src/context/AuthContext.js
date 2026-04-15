import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('aabha_user');
      if (userData) {
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      }
    } catch (e) {
      console.log('Error loading user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email, password) => {
    // For presentation: simple client-side auth
    // In production, this would call the backend
    const mockUser = {
      id: 'user_' + Date.now(),
      name: 'Aabha User',
      email: email,
      verified: true,
      avatar: null,
      joinedDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem('aabha_user', JSON.stringify(mockUser));
    setUser(mockUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  const register = async (userData) => {
    // For presentation: store user locally
    const newUser = {
      id: 'user_' + Date.now(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      verified: false, // Will be true after verification
      avatar: null,
      joinedDate: new Date().toISOString(),
    };
    await AsyncStorage.setItem('aabha_user', JSON.stringify(newUser));
    setUser(newUser);
    return { success: true, user: newUser };
  };

  const completeVerification = async () => {
    // Mark user as verified after ID submission
    const updatedUser = { ...user, verified: true };
    await AsyncStorage.setItem('aabha_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
    setIsAuthenticated(true);
    return { success: true };
  };

  const logout = async () => {
    await AsyncStorage.removeItem('aabha_user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = async (updates) => {
    const updatedUser = { ...user, ...updates };
    await AsyncStorage.setItem('aabha_user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      login,
      register,
      completeVerification,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
