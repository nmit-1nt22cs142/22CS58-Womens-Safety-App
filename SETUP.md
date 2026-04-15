# 🛠️ Setup Guide — Aabha Women's Safety App

Follow these steps to get the project running on your system.

---

## Step 1: System Requirements

Install these on your computer **before** cloning the repo:

| Software | Version | Download Link | Check Command |
| :--- | :--- | :--- | :--- |
| **Node.js** | v18 or higher | https://nodejs.org/ (LTS version) | `node --version` |
| **npm** | v9 or higher | Comes with Node.js | `npm --version` |
| **Git** | Latest | https://git-scm.com/ | `git --version` |
| **Expo Go** (Phone) | Latest | App Store / Play Store | — |

> ⚠️ **Important**: Your phone and computer must be on the **same Wi-Fi network** to test the app.

---

## Step 2: Clone the Repository

```bash
git clone https://github.com/nmit-1nt22cs142/22CS58-Womens-Safety-App.git
cd 22CS58-Womens-Safety-App
```

---

## Step 3: Install All Dependencies

### Option A: Run Both at Once (Recommended)

**Windows (PowerShell):**
```powershell
cd backend; npm install; cd ..\frontend; npm install; cd ..
```

**Mac/Linux (Terminal):**
```bash
cd backend && npm install && cd ../frontend && npm install && cd ..
```

### Option B: Install One by One

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

---

## Step 4: Start the App

You need **two terminal windows** running at the same time:

### Terminal 1 — Backend Server
```bash
cd backend
npm run dev
```
> ✅ You should see: `Server is running on port 5000` and `Connected to MongoDB Atlas`

### Terminal 2 — Mobile App
```bash
cd frontend
npx expo start
```
> ✅ You should see a QR code in the terminal

### Terminal 2 — If QR Code Doesn't Connect
```bash
npx expo start --tunnel
```
> This creates a secure tunnel that bypasses firewall issues (installs `@expo/ngrok` on first run)

---

## Step 5: Open on Your Phone

1. Open the **Expo Go** app on your phone
2. **Android**: Tap "Scan QR Code" and scan the QR from Terminal 2
3. **iOS**: Open Camera app → scan QR code → tap the Expo link
4. The app should load within 15-30 seconds

---

## 🔧 Troubleshooting

### "Project is incompatible with this version of Expo Go"
- Make sure you have the **latest** Expo Go from the App Store
- The project uses Expo SDK 54 — update Expo Go if needed

### "Network Error" or "Could not connect to development server"
- Ensure phone & computer are on the **same Wi-Fi**
- Try `npx expo start --tunnel` instead
- On Windows, allow Node.js through the firewall when prompted

### "Module not found" errors
```bash
cd frontend
npm install
npx expo start --clear    # Clears the Metro bundler cache
```

### Backend won't start
```bash
cd backend
npm install
```
- Check that the `.env` file exists with MongoDB and Cloudinary credentials
- Ask the team lead for the `.env` file if you don't have it

---

## 📦 What Gets Installed

### Backend Dependencies (`backend/package.json`)
| Package | Purpose |
| :--- | :--- |
| `express` | Web server framework |
| `mongoose` | MongoDB database ODM |
| `cors` | Cross-origin request handling |
| `dotenv` | Environment variable loading |
| `cloudinary` | Image/media cloud storage |
| `multer` | File upload handling |
| `jsonwebtoken` | JWT authentication (for future use) |
| `nodemon` (dev) | Auto-restart server on code changes |

### Frontend Dependencies (`frontend/package.json`)
| Package | Purpose |
| :--- | :--- |
| `expo` (SDK 54) | React Native development platform |
| `react-native` | Mobile UI framework |
| `@react-navigation/*` | Screen navigation (stack + tabs) |
| `axios` | HTTP client for API calls |
| `expo-image-picker` | Camera and gallery access |
| `expo-location` | GPS location services |
| `expo-linear-gradient` | Gradient backgrounds |
| `@react-native-async-storage/async-storage` | Local data storage |
| `@expo-google-fonts/donegal-one` | Brand font |
| `@expo/vector-icons` | Ionicons icon set |
| `react-native-maps` | Map views |

> All of these are installed automatically when you run `npm install`. You do **not** need to install them individually.

---

## 📝 Quick Reference

| Action | Command | Directory |
| :--- | :--- | :--- |
| Install backend deps | `npm install` | `backend/` |
| Install frontend deps | `npm install` | `frontend/` |
| Start backend | `npm run dev` | `backend/` |
| Start frontend | `npx expo start` | `frontend/` |
| Start with tunnel | `npx expo start --tunnel` | `frontend/` |
| Clear cache | `npx expo start --clear` | `frontend/` |
| Check Expo compatibility | `npx expo-doctor` | `frontend/` |
| Fix version mismatches | `npx expo install --fix` | `frontend/` |
