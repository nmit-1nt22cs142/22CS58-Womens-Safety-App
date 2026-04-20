import React, { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomInput from "../components/CustomInput";
import { loginUser } from "../services/api";

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    // Validation
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
      console.log('Attempting login with username:', username);
      
      const response = await loginUser(username, password);
      console.log('Login response:', response);

      if (response.success) {
        // Store token and user data in AsyncStorage
        await AsyncStorage.setItem('authToken', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));
        
        console.log('✅ Token and user saved to AsyncStorage');
        console.log('Navigating to Home...');
        
        navigation.replace("Home", { 
          user: response.user,
          token: response.token
        });
      } else {
        alert(response.message || "Login failed");
      }
    } catch (err) {
      console.error('Login error:', err);
      alert(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      enabled={true}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Ionicons name="lock-closed" size={48} color="#FF6B9D" />
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Login to secure your journey</Text>
        </View>

        <View style={styles.form}>
          <CustomInput 
            label="Username" 
            value={username} 
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
          />
          
          <CustomInput 
            label="Password" 
            value={password} 
            onChangeText={setPassword} 
            secureTextEntry
            placeholder="Enter your password"
          />

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Ionicons name="log-in" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Login</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate("Registration")}
            style={styles.linkContainer}
          >
            <Text style={styles.link}>Don't have an account? </Text>
            <Text style={styles.linkBold}>Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 24,
    paddingTop: 40,
    paddingBottom: 60,
    minHeight: Dimensions.get('window').height,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: { 
    fontSize: 32, 
    fontWeight: "bold", 
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#fff',
    padding: 28,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  button: { 
    backgroundColor: "#FF6B9D", 
    padding: 16, 
    borderRadius: 12, 
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: "#D0D0D0",
    elevation: 0,
    shadowOpacity: 0,
  },
  btnText: { 
    color: "#fff", 
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  link: { 
    color: "#666",
    fontSize: 14,
  },
  linkBold: {
    color: "#FF6B9D",
    fontWeight: "700",
    fontSize: 14,
  },
});

export default LoginScreen;