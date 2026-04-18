import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "../screens/LoginScreen";
import RegistrationScreen from "../screens/RegistrationScreen";
import HomeScreen from "../screens/HomeScreen";
import CommunityScreen from "../screens/CommunityScreen";
import GuardianScreen from "../screens/GuardianScreen";
import HelpScreen from "../screens/HelpScreen";
import SettingsScreen from "../screens/SettingsScreen";
import GeofencingScreen from "../screens/GeofencingScreen";
import StartJourneyScreen from "../screens/StartJourneyScreen";
import TrackRouteScreen from "../screens/TrackRouteScreen";
import GuardianJourneyViewScreen from '../screens/GuardianJourneyViewScreen';
import MainLayout from "../components/ui/MainLayout";

const Stack = createStackNavigator();

const withLayout = (ScreenComponent) => {
  return (props) => (
    <MainLayout navigation={props.navigation}>
      <ScreenComponent {...props} />
    </MainLayout>
  );
};

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#fff' },
      }}
    >
      {/* AUTH SCREENS */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registration" component={RegistrationScreen} />

      {/* MAIN APP SCREENS WITH LAYOUT */}
      <Stack.Screen name="Home" component={withLayout(HomeScreen)} />
      <Stack.Screen name="Community" component={withLayout(CommunityScreen)} />
      <Stack.Screen name="Guardian" component={withLayout(GuardianScreen)} />
      <Stack.Screen name="Help" component={withLayout(HelpScreen)} />
      <Stack.Screen name="Settings" component={withLayout(SettingsScreen)} />

      {/* JOURNEY SCREENS WITHOUT LAYOUT */}
      <Stack.Screen name="StartJourney" component={StartJourneyScreen} />
      <Stack.Screen name="TrackRoute" component={TrackRouteScreen} />
      <Stack.Screen name="GuardianJourneyView" component={GuardianJourneyViewScreen} />
    </Stack.Navigator>
  );
}