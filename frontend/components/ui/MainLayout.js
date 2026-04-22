import React from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// c file colour tokens
const colors = {
  primary: '#FF9B69',
  card: '#FFFFFF',
  textLight: '#9CA3AF',
  background: '#F5F1EB',
  border: 'rgba(0,0,0,0.04)',
  shadowColor: 'rgba(0,0,0,0.12)',
};
const gradients = {
  primary: ['#FF9B69', '#FF6B6B'],
};

// Tab definitions — Help removed, Maps added (navigates to JourneyHistory)
const TABS = [
  { label: 'Home',      icon: 'home',      route: 'Home' },
  { label: 'Maps',      icon: 'map',       route: 'JourneyHistory' },
  { label: 'Community', icon: 'people',    route: 'Community' },
  { label: 'Guardian',  icon: 'shield',    route: 'Guardian' },
  { label: 'Settings',  icon: 'settings',  route: 'Settings' },
];

const MainLayout = ({ children, navigation }) => {
  // Determine active route name from navigation state
  const currentRoute = navigation.getState?.()?.routes?.[navigation.getState?.()?.index]?.name ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Screen Content */}
      <View style={{ flex: 1 }}>
        {React.cloneElement(children, { navigation })}
      </View>

      {/* Bottom Navigation Bar — c file style */}
      <View style={styles.tabBarContainer}>
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isFocused = currentRoute === tab.route ||
              (tab.route === 'JourneyHistory' && currentRoute === 'JourneyHistory');

            return (
              <TouchableOpacity
                key={tab.route}
                style={styles.tabItem}
                onPress={() => navigation.navigate(tab.route)}
                activeOpacity={0.7}
              >
                {isFocused ? (
                  <View style={styles.activeTab}>
                    <LinearGradient colors={gradients.primary} style={styles.activeIconBg}>
                      <Ionicons name={tab.icon} size={22} color="#fff" />
                    </LinearGradient>
                  </View>
                ) : (
                  <View style={styles.inactiveTab}>
                    <Ionicons name={`${tab.icon}-outline`} size={22} color={colors.textLight} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    paddingTop: 6,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 28,
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  activeTab: { alignItems: 'center' },
  activeIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  inactiveTab: {
    width: 46,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MainLayout;