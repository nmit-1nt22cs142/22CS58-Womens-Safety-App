import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { useFonts, DonegalOne_400Regular } from '@expo-google-fonts/donegal-one';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import { colors } from './src/styles/colors';

function AppContent() {
  const { isLoading } = useAuth();

  let [fontsLoaded] = useFonts({
    DonegalOne_400Regular,
  });

  if (!fontsLoaded || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
