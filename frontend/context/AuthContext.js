/**
 * AuthContext.js
 *
 * Lightweight auth context for the Community feature.
 * Reads the existing user session stored by the w_file auth system
 * (AsyncStorage keys: 'userToken' and 'userData') and exposes a
 * `user` object that the community screens expect:
 *   { id, name, email, phone }
 *
 * This does NOT replace or interfere with the existing login/registration
 * flow. It simply makes the logged-in user available to community screens
 * via the useAuth() hook.
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Read user info from AsyncStorage keys used by the w_file auth system.
   * The existing system stores:
   *   'userToken'  → JWT string
   *   'userData'   → JSON { id, username, email, phone, ... }
   *
   * We map these to the shape the community screens expect.
   */
  const loadUser = async () => {
    try {
      const [token, rawUserData] = await Promise.all([
        AsyncStorage.getItem('userToken'),
        AsyncStorage.getItem('userData'),
      ]);

      if (token && rawUserData) {
        const parsed = JSON.parse(rawUserData);
        setUser({
          id: String(parsed.id || parsed.userId || parsed.user_id || 'anon'),
          name: parsed.username || parsed.name || parsed.fullName || 'User',
          email: parsed.email || '',
          phone: parsed.phone || '',
          token,
        });
      }
    } catch (e) {
      console.log('[AuthContext] Error loading user:', e);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Call this after a successful login in the existing auth flow
   * to refresh the community context (optional convenience).
   */
  const refreshUser = () => loadUser();

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
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
