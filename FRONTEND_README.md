# Frontend — React Native (Expo)

This is the mobile application for Aabha, built with React Native and Expo SDK 54. It runs on Android and iOS devices through the Expo Go app, or can be built into a standalone APK/IPA. The app communicates with two separate backend servers and uses Google Maps for navigation.

---

## Directory Structure

```
frontend/
├── App.js                              ← Root; wraps AuthProvider around AppNavigator
├── app.json                            ← Expo config (name, icons, permissions)
├── babel.config.js                     ← Babel preset for Expo
├── metro.config.js                     ← Metro bundler config
├── .env                                ← Google Maps API key for the frontend
├── package.json
│
├── navigation/
│   └── AppNavigator.js                 ← Stack navigator; all screen routes
│
├── context/
│   └── AuthContext.js                  ← Global auth state via useAuth() hook
│
├── services/
│   ├── api.js                          ← All API calls (Axios, two base URLs)
│   └── googlePlacesService.js          ← Google Places Autocomplete helper
│
├── screens/
│   ├── LoginScreen.js
│   ├── RegistrationScreen.js
│   ├── HomeScreen.js
│   ├── GuardianScreen.js
│   ├── SettingsScreen.js
│   ├── StartJourneyScreen.js
│   ├── TrackRouteScreen.js
│   ├── GeofencingScreen.js
│   ├── AddRouteScreen.js
│   ├── JourneyHistoryScreen.js
│   ├── GuardianJourneyViewScreen.js
│   ├── LiveLocationScreen.js
│   ├── HelpScreen.js
│   └── community/
│       ├── CommunityFeedScreen.js
│       ├── CreatePostScreen.js
│       ├── PostDetailScreen.js
│       └── MyReportsScreen.js
│
├── components/
│   ├── CustomInput.js
│   ├── SearchableInput.js
│   └── ui/
│       └── MainLayout.js
│
├── constants/
│   └── theme.ts
│
├── styles/
│   └── colors.js
│
└── hooks/
    └── use-color-scheme.ts
```

---

## What Each File Does

### `App.js`
The root of the React component tree. Wraps the entire app in `AuthProvider` (from `context/AuthContext.js`) and renders `AppNavigator`. This ensures every screen has access to the logged-in user via `useAuth()`.

### `app.json`
Expo configuration. Defines the app name (`Aabha`), bundle identifier, icon paths, splash screen, and Android/iOS permissions. The `expo-location` permission is declared here so the OS shows a location prompt to the user.

### `babel.config.js`
Standard Expo Babel preset. No custom transforms.

### `metro.config.js`
Extends the default Expo Metro config. Needed for proper asset resolution with the Expo SDK.

### `navigation/AppNavigator.js`
Defines a single `Stack.Navigator` containing all screens. Screens are split into three groups:

- **Auth screens** (no bottom nav): `Login`, `Registration`
- **Main screens with bottom nav** (wrapped in `withLayout`): `Home`, `Guardian`, `Settings`, `Community`, `JourneyHistory`
- **Full-screen screens** (no bottom nav): `CreatePost`, `PostDetail`, `MyReports`, `StartJourney`, `TrackRoute`, `GuardianJourneyView`, `LiveLocation`

The `withLayout` HOC wraps a screen inside `MainLayout`, which renders the bottom tab bar beneath it.

### `context/AuthContext.js`
A lightweight context that reads the existing user session from `AsyncStorage` on mount. It looks for two keys: `userToken` (the JWT) and `userData` (a JSON object with `id`, `username`, `email`, `phone`). These are written by the login screen after a successful login. The context maps the stored data to a normalized `user` shape (`{ id, name, email, phone, token }`) that community screens consume. Exposes a `refreshUser()` function to re-read storage after login. The `useAuth()` hook is the public interface — import it in any screen to get the current user.

---

## Services

### `services/api.js`
**This is the most important file to configure.** It defines all API calls and contains the IP address that must be updated when you change networks.

**Line 4** — Update this to your machine's local IP address:
```js
const YOUR_COMPUTER_IP = '192.168.x.x'; // 👈 CHANGE THIS
```

The file creates two Axios instances:

- **`api`** — points to `http://<YOUR_COMPUTER_IP>:3000/api`. Used for everything: auth, guardians, trips, live location.
- **`communityApi`** (defined further down) — points to `http://<YOUR_COMPUTER_IP>:5000/api`. Used only for community posts.

On web (`Platform.OS === 'web'`), both instances switch to `localhost` instead of the IP.

Both instances log every request and response to the console for easy debugging.

Exported functions grouped by feature:

**Aadhaar/Auth (no token needed)**
- `verifyAadhaar(aadhaarNumber)` — sends Aadhaar to backend; OTP is printed in server terminal
- `verifyOTP(aadhaarNumber, otp)` — confirms the OTP
- `registerUser(userData)` — creates the account
- `loginUser(username, password)` — returns `{ token, user }`

**Guardian management (JWT required)**
- `sendGuardianRequest(guardianUsername)`
- `getPendingRequests()`
- `respondToRequest(requestId, action)` — action is `'accept'` or `'reject'`
- `getMyGuardians()`
- `getPeopleImGuarding()`
- `removeGuardian(guardianId)`
- `getUserDetails(userId)`

**SOS / Alerts**
- `triggerDangerAlert(latitude, longitude, message)`
- `getAlertsForGuardian()`
- `markAlertAsSeen(alertId)`

**Trips**
- `startTrip(fromLat, fromLng, toLat, toLng, fromAddress, toAddress)`
- `saveGPSPoint(tripId, latitude, longitude, accuracy)`
- `logDeviationAlert(tripId, latitude, longitude, deviation)`
- `endTrip(tripId, latitude, longitude)`
- `getUserTripHistory()`
- `getActiveTrip()`

**Guardian journey views**
- `getGuardianActiveJourneys()`
- `getGuardianCompletedJourneys()`
- `getUserJourneyDetails(userId)`
- `getTripGPSPoints(tripId)`

**Live location**
- `startLiveLocation(latitude, longitude)`
- `updateLiveLocation(latitude, longitude)`
- `stopLiveLocation()`
- `getLiveLocation(userId)`

**Community (calls port 5000)**
- `getCommunityPosts(authorId?)` — pass `authorId` to filter to one user's posts
- `createCommunityPost(formData)` — expects a `FormData` object with text fields and optional `media` file

### `services/googlePlacesService.js`
A helper that calls the Google Places Autocomplete API to suggest place names as the user types a destination. Used by `SearchableInput.js`. Reads the API key from `process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

---

## Screens

### `LoginScreen.js`
Simple username + password form. On submit, calls `loginUser()`, stores the returned `token` in `AsyncStorage` under the key `userToken` and the user object under `userData`, then navigates to `Home`.

### `RegistrationScreen.js`
Multi-step registration flow:
1. Enter 12-digit Aadhaar number → calls `verifyAadhaar()` → OTP is printed in backend terminal.
2. Enter the OTP shown in the terminal → calls `verifyOTP()`.
3. Fill in personal details (name, gender, DOB, email, username, password) → calls `registerUser()`.
4. On success, navigates to `Login`.

### `HomeScreen.js`
The main dashboard screen. Responsibilities:
- Displays user's current location on a map.
- **SOS Button**: When pressed, triggers `triggerDangerAlert()` to notify all guardians, and calls `expo-contacts` to show the phone's contact picker so the user can dial a trusted contact.
- **Live Location Sharing**: Connects to Socket.IO at `SOCKET_URL` (defined on **line 18** — must be updated to your IP). Emits `join_as_user` and then emits `location_update` every few seconds using `expo-location`'s background tracking.
- Shows a list of pending guardian requests and allows accepting/rejecting inline.

> ⚠️ **Line 18 must be updated:** `const SOCKET_URL = 'http://192.168.x.x:3000';`

### `GuardianScreen.js`
Shows two tabs: people I am guarding (with their active status) and SOS alerts sent to me. Tapping a person opens `GuardianJourneyViewScreen`. Alerts can be acknowledged from this screen.

### `SettingsScreen.js`
Allows the user to:
- Search for and send guardian requests by username.
- View and manage existing guardian relationships.
- Log out (clears `AsyncStorage`).
- View their own profile details.

### `StartJourneyScreen.js`
Lets the user pick a destination by typing (backed by Google Places Autocomplete via `SearchableInput`). Calls `startTrip()` which fetches a road polyline from Google Directions via the backend. Connects to Socket.IO at `SOCKET_URL` (defined on **line 16** — must be updated to your IP) and begins emitting location updates. Navigates to `TrackRouteScreen` after the trip starts.

> ⚠️ **Line 16 must be updated:** `const SOCKET_URL = 'http://192.168.x.x:3000';`

### `TrackRouteScreen.js`
Live map view during an active journey. Shows the expected route polyline, the user's current GPS position, and alerts if the user deviates from the route (calls `logDeviationAlert()`). Provides an "End Journey" button that calls `endTrip()`.

### `GeofencingScreen.js`
Displays the user's saved named routes. Shows each route on a small map thumbnail with start/end markers. Users can delete saved routes from here.

### `AddRouteScreen.js`
Form to save a new named route. The user types a name, picks a start and end location (via `SearchableInput`), and saves it. The route is stored in the SQL backend's `saved_routes` table.

### `JourneyHistoryScreen.js`
Lists all completed trips for the logged-in user. Shows the date, start/end addresses, and trip duration. Tapping a trip shows the GPS path on a map.

### `GuardianJourneyViewScreen.js`
A guardian-specific screen that shows all journeys (active and completed) for a specific person being guarded. Displays active trips in a highlighted section at the top. Tapping a journey shows the GPS trail on a map.

### `LiveLocationScreen.js`
A full-screen map where a guardian watches a user's real-time location dot move. Connects to Socket.IO at `SOCKET_URL` (defined on **line 14** — must be updated to your IP), joins the user's room as a guardian via `join_as_guardian`, and updates the map marker on every `location_update` event. Falls back to the REST API (`getLiveLocation`) if Socket.IO is unavailable.

> ⚠️ **Line 14 must be updated:** `const SOCKET_URL = 'http://192.168.x.x:3000';`

### `HelpScreen.js`
A static scrollable screen with FAQs and usage instructions. No API calls.

### `community/CommunityFeedScreen.js`
Fetches and displays all community incident reports using `getCommunityPosts()`. Shows each post's author, location, description, and optional photo/video. Has buttons to navigate to `CreatePost` and `MyReports`.

### `community/CreatePostScreen.js`
A form for submitting a new incident report. The user fills in:
- Location (text address)
- Description
- Optional harasser details
- Optional safety rating (1–5 stars)
- Optional photo or video (picked via `expo-image-picker`)

Sends everything as `FormData` (multipart) to the community backend via `createCommunityPost()`. The `authorId` and `authorName` are read from `useAuth()`.

### `community/PostDetailScreen.js`
Shows the full details of a single community post: all text fields, the embedded map pin, and the media if present. Receives the post object as a navigation param (no extra API call needed).

### `community/MyReportsScreen.js`
Calls `getCommunityPosts(userId)` with the current user's ID to show only their own reports. Allows the user to review what they have submitted.

---

## Components

### `components/CustomInput.js`
A styled `TextInput` wrapper with a label, error state, and consistent padding/border styles matching the app theme. Props: `label`, `value`, `onChangeText`, `error`, `secureTextEntry`, `keyboardType`, and any standard TextInput props.

### `components/SearchableInput.js`
A text input that shows a dropdown of Google Places Autocomplete suggestions as the user types. Used for picking journey start and end points. Calls `googlePlacesService.js` on each keystroke (debounced). Returns the selected place's name and coordinates to the parent via `onSelect`.

### `components/ui/MainLayout.js`
The persistent bottom tab bar rendered on main screens. Four tabs: **Home**, **Maps** (JourneyHistory), **Community**, **Settings**. Uses `@expo/vector-icons` (Ionicons). Highlights the active tab based on the current route name.

---

## Constants and Styles

### `constants/theme.ts`
Exports `fontSizes`, `spacing`, and `borderRadius` objects used throughout the app for consistent sizing.

### `styles/colors.js`
Exports `colors` (a flat palette of named hex values) and `gradients` (arrays of color stops for `LinearGradient`). All screens import from here instead of hardcoding colors.

### `hooks/use-color-scheme.ts`
Returns the current color scheme (`'light'` or `'dark'`). Wraps `useColorScheme` from React Native with a web-compatible fallback.

---

## Environment Variable

File: `frontend/.env`

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...
```

Expo automatically exposes variables prefixed with `EXPO_PUBLIC_` to the JavaScript bundle. This key is used by `googlePlacesService.js` for the Places Autocomplete API.

---

## ⚠️ Three IP Addresses to Update

Every time you change Wi-Fi networks, update all three of these:

**1. `frontend/services/api.js` — line 4**
```js
const YOUR_COMPUTER_IP = '192.168.x.x';
```
Controls all HTTP REST calls to both backends.

**2. `frontend/screens/HomeScreen.js` — line 18**
```js
const SOCKET_URL = 'http://192.168.x.x:3000';
```
Controls Socket.IO for live location sharing on the home screen.

**3. `frontend/screens/StartJourneyScreen.js` — line 16**
```js
const SOCKET_URL = 'http://192.168.x.x:3000';
```
Controls Socket.IO when starting a journey.

Also check `frontend/screens/LiveLocationScreen.js` line 14 — it has its own `SOCKET_URL`.

---

## Running the Frontend

```bash
cd frontend
npm install
npm start
```

Expo will open a browser tab with a QR code. Scan it with **Expo Go** on your phone (Android or iOS). Your phone must be on the same Wi-Fi network as your laptop.

For Android emulator:
```bash
npm run android
```

For iOS simulator (macOS only):
```bash
npm run ios
```

---

## Permissions Required

The following device permissions are requested at runtime:

- **Location (foreground + background)** — for tracking during journeys and live sharing
- **Contacts** — for SOS contact picker on the home screen
- **Camera** — for taking photos/videos when creating community posts
- **Media Library** — for picking existing photos/videos when creating community posts
