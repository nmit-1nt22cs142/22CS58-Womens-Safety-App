# Aabha Backend — API Server

Node.js + Express REST API with MongoDB Atlas and Cloudinary for media uploads.

---

## 🚀 Quick Start

```bash
cd backend
npm install
npm run dev        # Starts with nodemon (auto-restarts on changes)
```

> Server runs at **http://localhost:5000**

### Environment Variables

The `.env` file contains:
```
PORT=5000
MONGODB_URI=mongodb+srv://...       # MongoDB Atlas connection
CLOUDINARY_CLOUD_NAME=...           # Cloudinary config
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
JWT_SECRET=...                      # For future JWT auth
```

---

## 📁 Project Structure

```
backend/src/
├── index.js                        # Express server entry point
├── config/
│   └── cloudinary.js               # Cloudinary upload config
├── controllers/
│   ├── auth/                       # 🔧 Auth team works here
│   ├── community/
│   │   └── postController.js       # ✅ Create & Get posts (working)
│   ├── tracking/                   # 🔧 Tracking team works here
│   └── guardian/                   # 🔧 Guardian team works here
├── models/
│   ├── auth/                       # 🔧 User model goes here
│   ├── community/
│   │   └── Post.js                 # ✅ Post schema (working)
│   ├── tracking/                   # 🔧 Location model goes here
│   └── guardian/                   # 🔧 Guardian model goes here
├── middleware/                     # Auth middleware, multer config
└── routes/                         # API route definitions
```

---

## 📡 API Endpoints (Currently Working)

### Community Posts

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/community/posts` | Get all posts (newest first) |
| `POST` | `/api/community/posts` | Create a new safety report |

#### POST `/api/community/posts` — Body (multipart/form-data)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `authorId` | string | ✅ | User identifier |
| `address` | string | ✅ | Location description |
| `description` | string | ✅ | Incident details |
| `harasserDetails` | string | ❌ | Suspect description |
| `safetyRating` | number (1-5) | ❌ | Area safety rating |
| `media` | file | ❌ | Photo evidence (uploaded to Cloudinary) |
| `longitude` | number | ❌ | GPS longitude |
| `latitude` | number | ❌ | GPS latitude |

---

## 👥 Team Member Guide

### How to Add Your Feature

1. **Create your model** in `src/models/<your-feature>/`
   ```javascript
   // Example: src/models/auth/User.js
   const mongoose = require('mongoose');
   const userSchema = new mongoose.Schema({ ... });
   module.exports = mongoose.model('User', userSchema);
   ```

2. **Create your controller** in `src/controllers/<your-feature>/`
   ```javascript
   // Example: src/controllers/auth/authController.js
   exports.register = async (req, res) => { ... };
   exports.login = async (req, res) => { ... };
   ```

3. **Create your route** in `src/routes/`
   ```javascript
   // Example: src/routes/authRoutes.js
   const router = require('express').Router();
   const { register, login } = require('../controllers/auth/authController');
   router.post('/register', register);
   router.post('/login', login);
   module.exports = router;
   ```

4. **Register the route** in `src/index.js`
   ```javascript
   app.use('/api/auth', require('./routes/authRoutes'));
   ```

### Feature Assignments

| Feature | Folder | What to Build |
| :--- | :--- | :--- |
| **Auth & Profiles** | `controllers/auth/`, `models/auth/` | User registration, login (JWT), profile CRUD |
| **Live Tracking** | `controllers/tracking/`, `models/tracking/` | Location updates, route history, safe zone detection |
| **Community** | `controllers/community/` | ✅ Already done — posts + media upload |
| **Guardian** | `controllers/guardian/`, `models/guardian/` | Emergency contacts, alert notifications, guardian pairing |

---

## 🔧 Scripts

| Script | Command | Description |
| :--- | :--- | :--- |
| Development | `npm run dev` | Starts with nodemon (hot-reload) |
| Production | `npm start` | Starts with node |
