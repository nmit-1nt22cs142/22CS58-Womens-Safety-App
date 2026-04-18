import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import MainTabNavigator from './MainTabNavigator';
import CreatePostScreen from '../screens/community/CreatePostScreen';
import PostDetailScreen from '../screens/community/PostDetailScreen';
import MyReportsScreen from '../screens/community/MyReportsScreen';

const RootStack = createStackNavigator();

export default function AppNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthStack} />
        ) : (
          <>
            <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
            <RootStack.Screen
              name="CreatePost"
              component={CreatePostScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name="PostDetail"
              component={PostDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name="MyReports"
              component={MyReportsScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
