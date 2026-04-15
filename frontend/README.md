# Aabha Frontend — React Native (Expo) Mobile App

The complete mobile application for the Aabha Women's Safety platform.

---

## 🚀 Quick Start

```bash
cd frontend
npm install
npx expo start
```

> Scan the QR code with **Expo Go** (phone must be on the same Wi-Fi as your computer).

If connection issues occur:
```bash
npx expo start --tunnel    # Uses ngrok tunnel (bypasses firewall)
```

---

## 📱 App Flow

```
App Launch
  └─→ Font Loading + Auth Check (AsyncStorage)
       ├─→ Not Logged In → Auth Stack
       │     ├─→ LoginScreen (email + password)
       │     ├─→ RegisterScreen (name, email, phone, password)
       │     └─→ VerificationScreen (ID upload + selfie → 3 steps)
       │
       └─→ Logged In → Main Tab Navigator
             ├─→ 🏠 Home (SOS Dashboard)
             ├─→ 🗺️ Maps (Live Tracking)
             ├─→ 👥 Community (Feed) ← FULLY WORKING
             │     ├─→ CreatePostScreen (modal)
             │     └─→ PostDetailScreen (push)
             └─→ 👤 Profile (Settings + Logout)
```

---

## 📁 Project Structure

```
frontend/src/
├── context/
│   └── AuthContext.js              # ✅ Login/Register/Logout state (AsyncStorage)
│
├── navigation/
│   ├── AppNavigator.js             # Root: Auth vs Main switch
│   ├── AuthStack.js                # Login → Register → Verification
│   └── MainTabNavigator.js         # Custom floating tab bar (4 tabs)
│
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.js          # ✅ Premium login with gradient + glass card
│   │   ├── RegisterScreen.js       # ✅ Registration with terms & safety notice
│   │   └── VerificationScreen.js   # ✅ 3-step ID + selfie verification
│   │
│   ├── home/
│   │   └── HomeScreen.js           # 🎨 SOS button, quick actions, safety tips
│   │
│   ├── maps/
│   │   └── MapsScreen.js           # 🎨 Simulated map, routes, safety zones
│   │
│   ├── community/
│   │   ├── CommunityFeedScreen.js  # ✅ Live feed from API, filters, FAB
│   │   ├── CreatePostScreen.js     # ✅ Star rating, camera/gallery, form
│   │   └── PostDetailScreen.js     # ✅ Full post view with actions
│   │
│   ├── profile/
│   │   └── ProfileScreen.js        # 🎨 Avatar, stats, settings, logout
│   │
│   ├── alerts/                     # 🔧 Team member builds these
│   │   ├── PanicButtonScreen.js
│   │   └── AlertStatusScreen.js
│   │
│   └── guardian/                   # 🔧 Team member builds these
│
├── styles/
│   ├── colors.js                   # Color palette + gradient presets
│   └── globalStyles.js             # Spacing, shadows, cards, buttons, inputs
│
├── services/
│   └── api.js                      # Axios instance (baseURL: localhost:5000/api)
│
├── components/                     # Shared UI components
└── utils/                          # Helper functions
```

> **Legend**: ✅ = Fully functional | 🎨 = UI built, needs backend | 🔧 = Empty, for team members

---

## 🎨 Design System

### Colors (`src/styles/colors.js`)
- **Primary**: `#FF9B69` (Warm Orange) — used for buttons, gradients, active states
- **Gradients**: `primary`, `warm`, `sunset`, `sos`, `dark` (see `gradients` export)
- **Safety Ratings**: Color-coded from red (dangerous) to green (very safe)
- **SOS**: Deep red `#DC2626` with glow effects

### Typography
- **Headings**: `DonegalOne_400Regular` (brand font)
- **Body**: System default (better readability)

### Components (`src/styles/globalStyles.js`)
- Spacing tokens: `xs(4)`, `sm(8)`, `md(16)`, `lg(24)`, `xl(32)`
- Shadow presets: `sm`, `md`, `lg`, `glow`
- Pre-built: cards, inputs, buttons, badges, labels, dividers

---

## 👥 Team Member Guide — How to Build Your Feature

### Step 1: Create Your Screen
Create your screen file inside `src/screens/<your-feature>/`:
```javascript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';
import { globalStyles } from '../../styles/globalStyles';

export default function YourScreen() {
  return (
    <View style={globalStyles.container}>
      <Text style={globalStyles.title}>Your Feature</Text>
    </View>
  );
}
```

### Step 2: Use the Design System
```javascript
import { colors, gradients } from '../../styles/colors';
import { globalStyles, spacing, radius, shadows } from '../../styles/globalStyles';
import { LinearGradient } from 'expo-linear-gradient';

// Use gradient buttons:
<LinearGradient colors={gradients.primary} style={styles.button}>
  <Text>Action</Text>
</LinearGradient>

// Use cards:
<View style={globalStyles.card}>...</View>

// Use the API service:
import { api } from '../../services/api';
const response = await api.get('/your-endpoint');
```

### Step 3: Connect to Navigation
The placeholder screens in `HomeScreen.js` and `MapsScreen.js` are already wired into the tab navigator. To replace them with your real screens:

1. Open `src/navigation/MainTabNavigator.js`
2. Change the import to your new screen
3. That's it — the tab bar handles the rest

### Step 4: Connect to Backend
```javascript
import { api } from '../../services/api';

// GET data
const response = await api.get('/your-feature/endpoint');

// POST data
await api.post('/your-feature/endpoint', { field: 'value' });
```

> **Important**: If testing on a physical phone, update the `baseURL` in `src/services/api.js` with your computer's local IP (e.g., `http://192.168.1.5:5000/api`).

---

## 🔧 Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| Start | `npm start` or `npx expo start` | Opens Expo Dev Menu |
| Android | `npm run android` | Opens on Android emulator |
| iOS | `npm run ios` | Opens on iOS simulator |
| Web | `npm run web` | Opens in browser |
| Tunnel | `npx expo start --tunnel` | For firewall/network issues |

---

## ⚠️ Important Notes

1. **Expo SDK 54** — The app uses SDK 54 for compatibility with the latest Expo Go app
2. **API Connection** — On a physical device, `localhost` won't work. Use your computer's IP address in `api.js`
3. **Auth is client-side** — Currently login/register stores data in AsyncStorage. The Auth team should replace this with real JWT-based backend auth
4. **Community is the only live feature** — It reads/writes to the MongoDB backend. Other tabs show polished UI but aren't connected to APIs yet
