import 'react-native-url-polyfill/auto';
import React, { useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, DonegalOne_400Regular } from '@expo-google-fonts/donegal-one';
import { View } from 'react-native';

import AppNavigator from './navigation/AppNavigator';
import { AuthProvider } from './context/AuthContext';

// Keep splash screen visible while fonts are loading
SplashScreen.preventAutoHideAsync();

function App() {
  const [fontsLoaded, fontError] = useFonts({
    DonegalOne_400Regular,
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are ready (or failed gracefully)
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <NavigationContainer>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <AppNavigator />
        </View>
      </NavigationContainer>
    </AuthProvider>
  );
}

export default registerRootComponent(App);
