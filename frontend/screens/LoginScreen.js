import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomInput from "../components/CustomInput";
import { loginUser } from "../services/api";
import { colors, gradients } from "../styles/colors";

const { width, height } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // ── entrance animations (from file-1) ──────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  // ──────────────────────────────────────────────────────────────────────────

  // ── original file-2 logic, untouched ──────────────────────────────────────
  const handleLogin = async () => {
    if (!username || !password) {
      alert("All fields are required");
      return;
    }
    if (username.trim().length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }
    try {
      setLoading(true);
      console.log("Attempting login with username:", username);
      const response = await loginUser(username, password);
      console.log("Login response:", response);

      if (response.success) {
        await AsyncStorage.setItem("authToken", response.token);
        await AsyncStorage.setItem("user", JSON.stringify(response.user));
        console.log("✅ Token and user saved to AsyncStorage");
        console.log("Navigating to Home...");
        navigation.replace("Home", {
          user: response.user,
          token: response.token,
        });
      } else {
        alert(response.message || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  // ──────────────────────────────────────────────────────────────────────────

  const isDisabled = loading || !username || !password;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Background gradient */}
      <LinearGradient
        colors={gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative circles */}
      <View style={[styles.circle, styles.circle1]} />
      <View style={[styles.circle, styles.circle2]} />
      <View style={[styles.circle, styles.circle3]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        enabled
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header (file-1 look, file-2 copy) ── */}
          <Animated.View
            style={[
              styles.header,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                style={styles.logoCircle}
              >
                <Ionicons name="lock-closed" size={48} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>Aabha</Text>
            <Text style={styles.tagline}>Your Safety Companion</Text>
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View
            style={[
              styles.formCard,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSubtitle}>Enter your credentials to continue</Text>

            {/* Username — still uses CustomInput from file-2 */}
            <CustomInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              autoCapitalize="none"
            />

            {/* Password */}
            <CustomInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
            />

            {/* Sign In Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isDisabled}
              activeOpacity={0.85}
              style={{ marginTop: 28 }}
            >
              <LinearGradient
                colors={isDisabled ? ["#ccc", "#bbb"] : gradients.primary}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.signInButton}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="large" />
                ) : (
                  <>
                    <Ionicons
                      name="log-in"
                      size={20}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.signInText}>Login</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={20}
                      color="#fff"
                      style={{ marginLeft: 8 }}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Register link */}
          <TouchableOpacity
            style={styles.registerLink}
            onPress={() => navigation.navigate("Registration")}
          >
            <Text style={styles.registerText}>
              Don't have an account?{" "}
              <Text style={styles.registerBold}>Register here</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ── Styles (file-1 design system) ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 40,
  },

  // Decorative circles
  circle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  circle1: { width: 200, height: 200, top: -60, right: -60 },
  circle2: { width: 140, height: 140, top: height * 0.15, left: -50 },
  circle3: { width: 100, height: 100, bottom: height * 0.15, right: -30 },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 36,
    marginTop: 60,
  },
  logoContainer: { marginBottom: 16 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
  },
  appName: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
    letterSpacing: 0.5,
  },

  // Form Card
  formCard: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    padding: 28,
    shadowColor: "rgba(0,0,0,0.15)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    elevation: 10,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 20,
  },

  // Sign In Button
  signInButton: {
    flexDirection: "row",
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  signInText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Register
  registerLink: { marginTop: 20, alignItems: "center" },
  registerText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  registerBold: { color: "#fff", fontWeight: "700" },
});

export default LoginScreen;