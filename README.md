# Aabha — Women Safety App

Aabha is a full-stack mobile application built to improve personal safety for women. It combines real-time GPS tracking, guardian alerts, journey monitoring, community incident reporting, and Aadhaar-based identity verification into a single React Native (Expo) application backed by two separate Node.js servers.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Project Structure](#project-structure)
3. [Tech Stack](#tech-stack)
4. [How the Three Parts Communicate](#how-the-three-parts-communicate)
5. [Complete Setup Guide](#complete-setup-guide)
6. [Running the Project](#running-the-project)
7. [API Reference Summary](#api-reference-summary)
8. [Common Errors & Fixes](#common-errors--fixes)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│              FRONTEND (Expo / React Native)      │
│                  runs on your phone              │
│         or Android emulator via Expo Go          │
└───────────┬─────────────────────┬───────────────┘
            │ HTTP + Socket.IO    │ HTTP REST
            │ Port 3000           │ Port 5000
            ▼                     ▼
┌───────────────────┐   ┌──────────────────────────┐
│  BACKEND — SQL    │   │  BACKEND — COMMUNITY     │
│  backend/         │   │  backend/community/src/  │
│  Node + Express   │   │  Node + Express          │
│  MySQL (local)    │   │  MongoDB Atlas (cloud)   │
│  Socket.IO        │   │  Cloudinary (cloud)      │
└───────────────────┘   └──────────────────────────┘
```

**Two backend servers must always be running simultaneously.** They are completely independent — they do not call each other. The frontend decides which one to talk to based on the feature being used.

---

## Project Structure

```
aabha-complete/
│
├── backend/                        ← SQL Backend (Port 3000)
│   ├── server.js                   ← Entry point; Express + Socket.IO setup
│   ├── .env                        ← Environment variables (DB, JWT, IP, Google Maps)
│   ├── package.json
│   │
│   ├── config/
│   │   └── db.js                   ← MySQL connection pool (mysql2)
│   │
│   ├── controllers/
│   │   ├── aadhaarController.js    ← Aadhaar verification + OTP logic
│   │   ├── authController.js       ← Register + Login with JWT
│   │   ├── guardianController.js   ← Guardian requests, alerts, SOS
│   │   └── routeController.js      ← Trips, GPS tracking, live location
│   │
│   ├── middleware/
│   │   └── authMiddleware.js       ← JWT token verification for protected routes
│   │
│   ├── routes/
│   │   ├── aadhaarRoutes.js        ← /api/aadhaar/*
│   │   ├── authRoutes.js           ← /api/auth/*
│   │   ├── guardianRoutes.js       ← /api/guardian/*
│   │   └── routeRoutes.js          ← /api/routes/*
│   │
│   ├── migrations/
│   │   └── migrate.sql             ← Full DB schema; run once to set up MySQL
│   │
│   └── utils/
│       └── otpService.js           ← OTP generator (logs to console; no real SMS)
│
├── backend/community/src/          ← MongoDB/Community Backend (Port 5000)
│   ├── index.js                    ← Entry point; Express + Mongoose setup
│   ├── .env                        ← MongoDB URI + Cloudinary credentials
│   ├── package.json
│   │
│   ├── config/
│   │   └── cloudinary.js           ← Cloudinary SDK config + Multer storage
│   │
│   ├── models/community/
│   │   └── Post.js                 ← Mongoose schema for community posts
│   │
│   ├── controllers/community/
│   │   └── postController.js       ← createPost + getPosts handlers
│   │
│   └── routes/community/
│       └── postRoutes.js           ← GET/POST /api/community/posts
│
└── frontend/                       ← React Native App (Expo)
    ├── App.js                      ← Root component; wraps AuthProvider + AppNavigator
    ├── app.json                    ← Expo configuration (name, bundle ID, permissions)
    ├── babel.config.js             ← Babel preset for Expo
    ├── metro.config.js             ← Metro bundler config
    ├── .env                        ← EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
    │
    ├── navigation/
    │   └── AppNavigator.js         ← Stack navigator with all screen routes
    │
    ├── context/
    │   └── AuthContext.js          ← Reads AsyncStorage session; exposes useAuth() hook
    │
    ├── services/
    │   ├── api.js                  ← Axios instances for port 3000 and port 5000
    │   └── googlePlacesService.js  ← Google Places Autocomplete helper
    │
    ├── screens/
    │   ├── LoginScreen.js          ← Username + password login
    │   ├── RegistrationScreen.js   ← Aadhaar verify → OTP → fill details → register
    │   ├── HomeScreen.js           ← Main dashboard; SOS button; live location sharing
    │   ├── GuardianScreen.js       ← View people you are guarding; see their journeys
    │   ├── SettingsScreen.js       ← Add/remove guardians; manage account
    │   ├── StartJourneyScreen.js   ← Pick destination; start a tracked trip
    │   ├── TrackRouteScreen.js     ← Live map during an active trip; deviation alerts
    │   ├── GeofencingScreen.js     ← View saved routes and manage geofence zones
    │   ├── AddRouteScreen.js       ← Save a new named route for future journeys
    │   ├── JourneyHistoryScreen.js ← Browse past completed trips
    │   ├── GuardianJourneyViewScreen.js ← Guardian sees a specific user's live journey
    │   ├── LiveLocationScreen.js   ← Guardian watches real-time dot on map via Socket.IO
    │   ├── HelpScreen.js           ← Static help & FAQ page
    │   └── community/
    │       ├── CommunityFeedScreen.js  ← Browse all incident reports
    │       ├── CreatePostScreen.js     ← Submit a new incident report with photo/video
    │       ├── PostDetailScreen.js     ← View one post in full
    │       └── MyReportsScreen.js      ← View only my submitted reports
    │
    ├── components/
    │   ├── CustomInput.js          ← Reusable styled text input
    │   ├── SearchableInput.js      ← Autocomplete input backed by Google Places
    │   └── ui/
    │       └── MainLayout.js       ← Bottom tab bar (Home, Maps, Community, Settings)
    │
    ├── constants/
    │   └── theme.ts                ← Font sizes, spacing, border radii
    │
    ├── styles/
    │   └── colors.js               ← App color palette and gradient presets
    │
    └── hooks/
        └── use-color-scheme.ts     ← Light/dark mode detection
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile Frontend | React Native via Expo SDK 54, React Navigation (Stack + Bottom Tabs) |
| SQL Backend | Node.js, Express 4, mysql2, Socket.IO 4, bcryptjs, jsonwebtoken |
| Community Backend | Node.js, Express 5, Mongoose, MongoDB Atlas, Cloudinary, Multer |
| Database 1 | MySQL 8.x (runs locally on your machine) |
| Database 2 | MongoDB Atlas (cloud — free tier works fine) |
| File Storage | Cloudinary (cloud — free tier works fine) |
| Maps | react-native-maps + Google Maps API (Directions + Places) |
| Real-time | Socket.IO (WebSocket) for live location sharing |
| Auth | JWT tokens stored in AsyncStorage |

---

## How the Three Parts Communicate

### Frontend → SQL Backend (port 3000)
All calls go through `frontend/services/api.js`. The file defines `YOUR_COMPUTER_IP` at the top and builds the base URL as `http://<YOUR_COMPUTER_IP>:3000/api`. This handles: authentication, guardians, trips, live location REST calls.

### Frontend → Community Backend (port 5000)
The same `api.js` file defines a **second** Axios instance pointed at port 5000 (`http://<YOUR_COMPUTER_IP>:5000/api`). This handles: community post creation and retrieval.

### Frontend → Socket.IO (port 3000)
`HomeScreen.js`, `StartJourneyScreen.js`, and `LiveLocationScreen.js` each define their own `SOCKET_URL` constant — a hardcoded string like `http://10.x.x.x:3000`. This must be updated separately from `api.js`. See the IP update section in setup below.

---

## Complete Setup Guide

### Prerequisites

Make sure the following are installed before you begin:

- **Node.js** v18 or higher (`node -v` to check)
- **npm** v9 or higher
- **MySQL 8.x** installed and running locally
- **Expo CLI** — install globally: `npm install -g expo-cli`
- **Expo Go** app on your physical Android/iOS device, OR an Android emulator via Android Studio
- A **MongoDB Atlas** account (free at mongodb.com)
- A **Cloudinary** account (free at cloudinary.com)
- A **Google Cloud** project with Maps SDK, Directions API, and Places API enabled

---

### Step 1 — Find Your Local IP Address

Your phone and your laptop must be on the **same Wi-Fi network**. You need to know your laptop's local IP address (something like `192.168.x.x` or `10.x.x.x`).

**On macOS/Linux:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

**On Windows:**
```cmd
ipconfig
```

Look for the IPv4 address under your Wi-Fi adapter. Write it down — you will use it in three places.

> ⚠️ If you switch networks (e.g., home Wi-Fi → college Wi-Fi → hotspot), your IP changes and you must update all three places again.

---

### Step 2 — MySQL Setup

#### 2a. Install and start MySQL
If MySQL is not already running, start it:
- **macOS (Homebrew):** `brew services start mysql`
- **Ubuntu/Debian:** `sudo systemctl start mysql`
- **Windows:** Start MySQL from Services or MySQL Workbench

#### 2b. Run the migration script
Log in to MySQL and run the provided schema:

```bash
mysql -u root -p < backend/migrations/migrate.sql
```

This creates the `women_safety_db` database and all tables:
- `sample_aadhaar_data` — mock Aadhaar records used to simulate OTP verification
- `otp_verifications` — temporary OTP storage (expires in 5 minutes)
- `users` — registered app users
- `guardian_relationships` — who is guarding whom
- `guardian_requests` — pending/accepted/rejected requests
- `danger_alerts` — SOS events
- `saved_routes` — user-saved named routes
- `trips` — active and completed journeys
- `gps_points` — GPS breadcrumbs for each trip
- `deviation_alerts` — logged route deviations
- `live_location_sessions` — tracks active real-time sharing sessions

#### 2c. Add sample Aadhaar data (required for registration)
The registration flow requires an Aadhaar number that exists in the `sample_aadhaar_data` table. The migration script seeds some rows, but you can add more:

```sql
USE women_safety_db;
INSERT INTO sample_aadhaar_data (aadhaar_number, mobile_number)
VALUES ('123456789012', '9876543210');
```

Use this Aadhaar number and the OTP that prints in the backend terminal when testing registration.

---

### Step 3 — MongoDB Atlas Setup

1. Go to [cloud.mongodb.com](https://cloud.mongodb.com) and create a free account.
2. Create a new **Project**, then click **Build a Cluster** → choose the free **M0** tier.
3. Choose a region close to you (e.g., Mumbai for India).
4. Once the cluster is ready, click **Connect** → **Connect your application**.
5. Select **Node.js** driver. Copy the connection string — it looks like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Community
   ```
6. Replace `<username>` and `<password>` with your Atlas database user credentials (create one under **Database Access** if you haven't).
7. Under **Network Access**, click **Add IP Address** → **Allow Access from Anywhere** (for development). This adds `0.0.0.0/0`.
8. Paste the full URI into `backend/community/src/.env` as the value of `MONGODB_URI`.

---

### Step 4 — Cloudinary Setup

1. Go to [cloudinary.com](https://cloudinary.com) and create a free account.
2. After login, go to your **Dashboard**.
3. You will see three values: **Cloud name**, **API Key**, **API Secret**.
4. Copy all three into `backend/community/src/.env`.

The community backend uses Cloudinary to store images and videos uploaded with incident reports. Files are saved under a folder called `aabha-community` in your Cloudinary account.

---

### Step 5 — Configure the SQL Backend `.env`

Open `backend/.env` and fill in every value:

```env
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=women_safety_db

JWT_SECRET=pick_any_long_random_string_here

OTP_EXPIRY_MINUTES=5

YOUR_IP_ADDRESS=192.168.x.x        # ← Your laptop's local IP from Step 1

GOOGLE_MAPS_API_KEY=AIza...         # ← Your Google Maps API key
```

`YOUR_IP_ADDRESS` is printed in the server startup log and is used for display only. It does not affect routing.

---

### Step 6 — Configure the Community Backend `.env`

Open `backend/community/src/.env` and fill in every value:

```env
PORT=5000

MONGODB_URI=mongodb+srv://youruser:yourpassword@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Community

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

### Step 7 — Update the Three IP Address Locations in the Frontend

This is the most common source of errors. There are **three separate places** in the frontend code where your IP must be set. All three must point to the same IP address (your laptop's IP from Step 1).

#### Location 1 — `frontend/services/api.js` line 4
```js
const YOUR_COMPUTER_IP = '192.168.x.x'; // 👈 replace with your IP
```
This controls all REST API calls to both port 3000 and port 5000.

#### Location 2 — `frontend/screens/HomeScreen.js` line 18
```js
const SOCKET_URL = 'http://192.168.x.x:3000'; // 👈 replace with your IP
```
This controls the Socket.IO connection used for live location sharing on the home screen.

#### Location 3 — `frontend/screens/StartJourneyScreen.js` line 16
```js
const SOCKET_URL = 'http://192.168.x.x:3000'; // 👈 replace with your IP
```
This controls the Socket.IO connection used when a journey is started.

> `LiveLocationScreen.js` also has a `SOCKET_URL` constant (line 14) that must match. Check it too.

---

### Step 8 — Configure the Frontend `.env`

Open `frontend/.env`:

```env
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...   # ← Same key as backend, or a separate one
```

---

### Step 9 — Install Dependencies

```bash
# SQL backend
cd backend
npm install

# Community backend
cd ../backend/community/src
npm install

# Frontend
cd ../../../frontend
npm install
```

---

## Running the Project

You need **three terminal windows** open simultaneously.

### Terminal 1 — SQL Backend (Port 3000)
```bash
cd backend
npm run dev
```
Expected output:
```
✅ Database connected successfully
🚀 Server is running successfully!
📍 Local:   http://localhost:3000
🔌 Socket.io is active on the same port
```

### Terminal 2 — Community Backend (Port 5000)
```bash
cd backend/community/src
npm run dev
```
Expected output:
```
✅ Connected to MongoDB Atlas
✅ Server is running on port 5000
```

### Terminal 3 — Frontend (Expo)
```bash
cd frontend
npm start
```
Expo will print a QR code. Scan it with the **Expo Go** app on your phone (Android or iOS). Make sure your phone is on the same Wi-Fi as your laptop.

For Android emulator:
```bash
npm run android
```

---

## API Reference Summary

### SQL Backend — Port 3000

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/aadhaar/verify-aadhaar` | No | Check if Aadhaar exists; send OTP to linked mobile |
| POST | `/api/aadhaar/verify-otp` | No | Confirm OTP; mark Aadhaar as verified |
| POST | `/api/auth/register` | No | Create user account (requires prior Aadhaar OTP) |
| POST | `/api/auth/login` | No | Login; returns JWT |
| POST | `/api/guardian/request` | JWT | Send guardian request by username |
| GET | `/api/guardian/requests/pending` | JWT | List incoming guardian requests |
| POST | `/api/guardian/requests/respond` | JWT | Accept or reject a request |
| GET | `/api/guardian/my-guardians` | JWT | People guarding me |
| GET | `/api/guardian/people-im-guarding` | JWT | People I am guarding |
| DELETE | `/api/guardian/remove` | JWT | Remove a guardian relationship |
| POST | `/api/guardian/danger-alert` | JWT | Trigger SOS alert to all guardians |
| GET | `/api/guardian/alerts` | JWT | Fetch SOS alerts sent to me (as guardian) |
| POST | `/api/guardian/alerts/mark-seen` | JWT | Mark an alert as acknowledged |
| GET | `/api/guardian/user/:userId` | JWT | Get basic info of a guarded user |
| POST | `/api/routes/trip/start` | JWT | Start a new journey (auto-starts live location) |
| POST | `/api/routes/trip/gps-point` | JWT | Save a GPS breadcrumb during a trip |
| POST | `/api/routes/trip/deviation` | JWT | Log a route deviation event |
| POST | `/api/routes/trip/end` | JWT | End the active trip |
| GET | `/api/routes/trip/history` | JWT | My completed trips |
| GET | `/api/routes/trip/active` | JWT | My current active trip |
| GET | `/api/routes/guardian/active-journeys` | JWT | All active journeys of people I guard |
| GET | `/api/routes/guardian/completed-journeys` | JWT | All past journeys of people I guard |
| GET | `/api/routes/guardian/user/:userId/journeys` | JWT | Specific user's journey list |
| GET | `/api/routes/guardian/trip/:tripId/gps-points` | JWT | GPS trail of a specific trip |
| POST | `/api/routes/live-location/start` | JWT | Start standalone live location sharing |
| POST | `/api/routes/live-location/update` | JWT | Update live location via REST (backup to Socket.IO) |
| POST | `/api/routes/live-location/stop` | JWT | Stop sharing live location |
| GET | `/api/routes/live-location/user/:userId` | JWT | Get current live location of a user |

### Community Backend — Port 5000

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/community/posts` | No | Fetch all posts (or filter by `?authorId=x`) |
| POST | `/api/community/posts` | No | Create a post (supports multipart with a `media` file) |

### Socket.IO — Port 3000

| Event (Client → Server) | Payload | Description |
|---|---|---|
| `join_as_user` | `{ userId }` | User joins their room to broadcast location |
| `join_as_guardian` | `{ userId }` | Guardian joins a user's room to receive location |
| `location_update` | `{ userId, latitude, longitude, accuracy, timestamp }` | Push new coordinates |
| `stop_sharing` | `{ userId }` | Signal that sharing has ended |

| Event (Server → Client) | Payload | Description |
|---|---|---|
| `join_success` | `{ message }` | Confirmation of room join |
| `location_update` | `{ userId, latitude, longitude, accuracy, timestamp }` | Broadcast to guardians |
| `sharing_started` | `{ userId }` | Notifies guardians when user joins room |
| `sharing_stopped` | `{ userId }` | Notifies guardians when user stops or disconnects |

---

## Common Errors & Fixes

**`Network request failed` on the phone**
Your IP is wrong in one of the three frontend locations. Double-check all three files. Also make sure your phone and laptop are on the same Wi-Fi — mobile data will not work.

**`❌ Database connection failed`**
MySQL is not running, or the password in `backend/.env` is wrong. Try `mysql -u root -p` in terminal to confirm MySQL is accessible.

**`❌ MongoDB connection error`**
Check that your `MONGODB_URI` in the community `.env` is correct and that your Atlas cluster's Network Access allows connections from your IP (or `0.0.0.0/0` for development).

**OTP not showing**
The OTP system is mocked — there is no SMS sent. The OTP is printed in the **SQL backend terminal** (Terminal 1). Look for the line that says `🔐 OTP:`.

**`Cannot find module 'socket.io'`**
Run `npm install` inside the `backend/` folder.

**Expo: `SDK version mismatch`**
Make sure the Expo Go app on your phone is updated to the latest version. The project uses Expo SDK 54.

**`Port 3000 already in use`**
Another process is using the port. Run `lsof -i :3000` (macOS/Linux) or `netstat -ano | findstr :3000` (Windows) to find and kill it.
