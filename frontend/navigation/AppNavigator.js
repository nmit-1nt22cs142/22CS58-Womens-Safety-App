import React from "react";
import { createStackNavigator } from "@react-navigation/stack";

import LoginScreen from "../screens/LoginScreen";
import RegistrationScreen from "../screens/RegistrationScreen";
import HomeScreen from "../screens/HomeScreen";
import GuardianScreen from "../screens/GuardianScreen";
import SettingsScreen from "../screens/SettingsScreen";
import StartJourneyScreen from "../screens/StartJourneyScreen";
import TrackRouteScreen from "../screens/TrackRouteScreen";
import GuardianJourneyViewScreen from '../screens/GuardianJourneyViewScreen';
import LiveLocationScreen from '../screens/LiveLocationScreen';
import JourneyHistoryScreen from '../screens/JourneyHistoryScreen';
import MainLayout from "../components/ui/MainLayout";

// Community screens (integrated from community feature)
import CommunityFeedScreen from "../screens/community/CommunityFeedScreen";
import CreatePostScreen from "../screens/community/CreatePostScreen";
import PostDetailScreen from "../screens/community/PostDetailScreen";
import MyReportsScreen from "../screens/community/MyReportsScreen";

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

      {/* MAIN APP SCREENS WITH BOTTOM NAV */}
      <Stack.Screen name="Home" component={withLayout(HomeScreen)} />
      <Stack.Screen name="Guardian" component={withLayout(GuardianScreen)} />
      <Stack.Screen name="Settings" component={withLayout(SettingsScreen)} />

      {/* COMMUNITY SCREENS — Feed uses bottom nav; sub-screens are full-screen */}
      <Stack.Screen name="Community" component={withLayout(CommunityFeedScreen)} />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} />

      {/* JOURNEY HISTORY — shown with bottom nav (Maps tab) */}
      <Stack.Screen name="JourneyHistory" component={withLayout(JourneyHistoryScreen)} />
      <Stack.Screen name="StartJourney" component={StartJourneyScreen} />
      <Stack.Screen name="TrackRoute" component={TrackRouteScreen} />

      {/* GUARDIAN SCREENS — full screen, no bottom nav */}
      <Stack.Screen name="GuardianJourneyView" component={GuardianJourneyViewScreen} />
      <Stack.Screen name="LiveLocation" component={LiveLocationScreen} />
    </Stack.Navigator>
  );
}
