# Aabha — Women's Safety App 🛡️

A community-driven women's safety mobile application built with **React Native (Expo)** and **Node.js/Express/MongoDB**.

## 📱 App Overview

Aabha empowers women to stay safe through community reporting, live location sharing, and emergency alerts. The app features identity-verified accounts to ensure a trusted community.

### Current Feature Status

| Feature | Tab | Status | Owner |
| :--- | :--- | :--- | :--- |
| **Community Feed & Reports** | Community | ✅ Fully Working | Community Team |
| **SOS / Panic Button** | Home | 🎨 UI Ready | Alerts Team |
| **Live Tracking & Maps** | Maps | 🎨 UI Ready | Tracking Team |
| **Guardian Management** | — | 📋 Planned | Guardian Team |
| **User Auth & Profiles** | Login/Register | ✅ Working (Client-side) | Auth Team |
| **Identity Verification** | Registration Flow | ✅ Working (Client-side) | Auth Team |
| **Profile & Settings** | Profile | 🎨 UI Ready | Auth Team |

> **Legend**: ✅ = Functional with API | 🎨 = Beautiful UI built, needs backend | 📋 = Planned

---

## 🏗️ Project Structure

```
aabha-community/
├── backend/              # Node.js + Express API
│   ├── src/
│   │   ├── config/       # Cloudinary, DB config
│   │   ├── controllers/  # Route handlers (by feature)
│   │   ├── middleware/    # Auth, upload middleware
│   │   ├── models/       # Mongoose schemas
│   │   └── routes/       # API route definitions
│   └── .env              # Environment variables
│
├── frontend/             # React Native Expo App
│   ├── App.js            # Entry point (AuthProvider wrapper)
│   ├── src/
│   │   ├── context/      # AuthContext (login/register state)
│   │   ├── navigation/   # Stack + Tab navigators
│   │   ├── screens/      # All screens (by feature folder)
│   │   ├── styles/       # Design system (colors, globalStyles)
│   │   ├── services/     # API client (axios)
│   │   ├── components/   # Shared UI components
│   │   └── utils/        # Helper functions
│   └── app.json          # Expo config
│
├── .gitignore
└── README.md             # ← You are here
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ installed
- **Expo Go** app on your phone (latest from App Store / Play Store)
- Phone and computer on the **same Wi-Fi network**

### 1. Clone & Install

```bash
git clone <repo-url>
cd aabha-community

# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### 2. Start Backend

```bash
cd backend
npm run dev
```
> Server runs on `http://localhost:5000`. MongoDB Atlas is already configured.

### 3. Start Frontend

```bash
cd frontend
npx expo start
```
> Scan the QR code with Expo Go. If connection fails, try `npx expo start --tunnel`.

---

## 🎨 Design System

- **Primary Color**: `#FF9B69` (Warm Orange)
- **Font**: `Donegal One` (Google Fonts, loaded via Expo)
- **Style**: Warm gradients, rounded cards, floating tab bar, subtle shadows
- **Files**: `src/styles/colors.js`, `src/styles/globalStyles.js`

---

## 👥 Team Collaboration Guide

Each feature has its own folder in both `frontend/src/screens/<feature>` and `backend/src/controllers/<feature>`. Work inside your assigned folder to avoid merge conflicts.

| Team Member Role | Frontend Folder | Backend Folder |
| :--- | :--- | :--- |
| Auth & Profiles | `screens/auth/`, `screens/profile/` | `controllers/auth/`, `models/auth/` |
| Live Tracking & Maps | `screens/maps/` | `controllers/tracking/` |
| Community Feed | `screens/community/` | `controllers/community/`, `models/community/` |
| Guardian & Alerts | `screens/alerts/`, `screens/guardian/` | `controllers/guardian/` |

### How to Add Your Feature Backend
1. Create your controller in `backend/src/controllers/<your-feature>/`
2. Create your model in `backend/src/models/<your-feature>/`
3. Register your route in `backend/src/routes/`
4. The frontend screens are already built — just connect them to your API

---

## 📝 Tech Stack

| Layer | Technology |
| :--- | :--- |
| Mobile | React Native 0.81 + Expo SDK 54 |
| Navigation | React Navigation v7 (Stack + Bottom Tabs) |
| State | React Context + AsyncStorage |
| HTTP | Axios |
| Backend | Node.js + Express 5 |
| Database | MongoDB Atlas (Mongoose) |
| File Storage | Cloudinary |
| Icons | Ionicons (@expo/vector-icons) |
| Fonts | Donegal One (@expo-google-fonts) |