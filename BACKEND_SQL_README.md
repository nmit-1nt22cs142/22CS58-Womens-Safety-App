# SQL Backend — Port 3000

This is the primary backend server for Aabha. It handles user authentication, Aadhaar-based registration, guardian relationships, SOS alerts, trip tracking, and real-time location sharing via Socket.IO. It connects to a **local MySQL database**.

---

## Directory Structure

```
backend/
├── server.js                   ← Entry point
├── .env                        ← All secrets and config go here
├── package.json
│
├── config/
│   └── db.js                   ← MySQL connection pool
│
├── controllers/
│   ├── aadhaarController.js    ← Aadhaar verification + OTP
│   ├── authController.js       ← Register + Login
│   ├── guardianController.js   ← Guardian management + SOS
│   └── routeController.js      ← Trips + GPS + live location
│
├── middleware/
│   └── authMiddleware.js       ← JWT guard for protected routes
│
├── routes/
│   ├── aadhaarRoutes.js        ← /api/aadhaar/*
│   ├── authRoutes.js           ← /api/auth/*
│   ├── guardianRoutes.js       ← /api/guardian/*
│   └── routeRoutes.js          ← /api/routes/*
│
├── migrations/
│   └── migrate.sql             ← Full database schema; run once
│
└── utils/
    └── otpService.js           ← OTP generator (mock — prints to console)
```

---

## What Each File Does

### `server.js`
The application entry point. It does the following things in order:

1. Creates an Express app and attaches CORS, body-parser middleware.
2. Mounts the four route groups at their respective paths.
3. Adds a health-check GET at `/` and 404/error handlers.
4. Wraps the Express app in a raw Node.js `http.Server` so that Socket.IO can share the same port.
5. Configures Socket.IO with the following room-based event system:
   - A user joins their own room (`user_<userId>`) by emitting `join_as_user`.
   - Guardians join the same room by emitting `join_as_guardian`.
   - When the user emits `location_update`, the server writes the coordinates to the `live_location_sessions` MySQL table and immediately broadcasts to every guardian in the room.
   - When the user disconnects or emits `stop_sharing`, guardians receive a `sharing_stopped` event.
6. Starts listening on `HOST:PORT` from the `.env` file (defaults: `0.0.0.0:3000`).

### `config/db.js`
Creates a `mysql2` connection pool of up to 10 connections. Promisifies the pool so controllers can use `async/await`. Tests the connection on startup and prints a success or failure message. Exports the promise pool — every controller imports this and calls `db.query(sql, params)`.

### `controllers/aadhaarController.js`
Handles two endpoints used exclusively during the registration flow:

- **`verifyAadhaar`**: Validates that the Aadhaar number is exactly 12 digits, looks it up in the `sample_aadhaar_data` table, generates a 6-digit OTP, stores it in `otp_verifications` with a 5-minute expiry, and returns success. The OTP is printed to the server terminal (not sent via real SMS).
- **`verifyOTP`**: Checks the submitted OTP against `otp_verifications`, confirms it has not expired, marks it as `verified = 1`, and returns success. The registration screen uses this confirmation before allowing the user to fill in their personal details.

### `controllers/authController.js`
Handles user accounts:

- **`register`**: Validates all fields, checks that the email ends in `@gmail.com`, confirms the Aadhaar was verified in the current session, hashes the password with bcryptjs (10 salt rounds), retrieves the mobile number linked to the Aadhaar, and inserts the new user into the `users` table.
- **`login`**: Finds the user by username, compares the submitted password against the stored hash using bcryptjs, and on success returns a signed JWT containing `{ userId, mobileNumber }` with a 7-day expiry.

### `controllers/guardianController.js`
The largest controller. Handles all guardian relationship management and SOS functionality:

- **`sendGuardianRequest`**: Finds the target user by username, checks no existing relationship or pending request exists, inserts a `pending` row into `guardian_requests`.
- **`getPendingRequests`**: Fetches all requests where I am the guardian being asked.
- **`respondToRequest`**: Updates a request to `accepted` or `rejected`. On acceptance, inserts a row into `guardian_relationships`.
- **`getMyGuardians`**: Returns all users who have accepted a role as my guardian.
- **`getPeopleImGuarding`**: Returns all users I am currently guarding.
- **`removeGuardian`**: Deletes from both `guardian_requests` and `guardian_relationships`.
- **`getUserDetails`**: Returns basic profile info of a specific user (used by guardian screens).
- **`triggerDangerAlert`**: Creates a danger alert row for every accepted guardian, recording the user's current coordinates and a message.
- **`getAlertsForGuardian`**: Fetches all unseen (or recently seen) alerts where the logged-in user is a guardian.
- **`markAlertAsSeen`**: Sets `is_seen = 1` on a specific alert.

### `controllers/routeController.js`
Handles everything related to movement tracking:

- **`decodePolyline`** (internal): Decodes Google's encoded polyline format into an array of `{ latitude, longitude }` points.
- **`fetchGoogleRoutePolyline`** (internal): Calls the Google Directions API to get a road-following polyline between two coordinates.
- **`startTrip`**: Creates a row in `trips` with the origin, destination, and a Google-fetched polyline representing the expected route. Also starts a `live_location_sessions` row so guardians can see the trip immediately.
- **`saveGPSPoint`**: Inserts a GPS breadcrumb into `gps_points` for the active trip.
- **`logDeviationAlert`**: Inserts a deviation event into `deviation_alerts` when the app detects the user is off-route.
- **`endTrip`**: Marks the trip as completed, sets end time and final coordinates, deactivates the linked live location session.
- **`getUserTripHistory`**: Returns all completed trips for the logged-in user.
- **`getActiveTrip`**: Returns the currently running trip if one exists.
- **`getGuardianActiveJourneys`**: Returns all active trips belonging to people the guardian is watching.
- **`getGuardianCompletedJourneys`**: Returns all past trips of people being guarded.
- **`getUserJourneyDetails`**: Returns the trip list for a specific guarded user.
- **`getTripGPSPoints`**: Returns the full GPS trail for a specific trip (used to draw the path on the guardian's map).
- **`startLiveLocation`**: Creates or reactivates a `live_location_sessions` row for standalone location sharing (not tied to a trip).
- **`updateLiveLocation`**: REST fallback to update coordinates when Socket.IO is not used.
- **`stopLiveLocation`**: Deactivates the live location session.
- **`getLiveLocation`**: Returns the latest coordinates for a user's active session (used by guardians polling via REST).

### `middleware/authMiddleware.js`
Reads the `Authorization: Bearer <token>` header from every protected request. Verifies the JWT using the `JWT_SECRET` from `.env`. On success, attaches the decoded payload (`{ userId, mobileNumber }`) to `req.user` and calls `next()`. On failure, returns 401.

### `routes/aadhaarRoutes.js`
Mounts `verifyAadhaar` on `POST /api/aadhaar/verify-aadhaar` and `verifyOTP` on `POST /api/aadhaar/verify-otp`. No authentication required — these are called before a user account exists.

### `routes/authRoutes.js`
Mounts `register` on `POST /api/auth/register` and `login` on `POST /api/auth/login`. No authentication required.

### `routes/guardianRoutes.js`
Applies `authMiddleware` to the entire router, then mounts all guardian endpoints. Every request must include a valid JWT.

### `routes/routeRoutes.js`
Applies `authMiddleware` to the entire router, then mounts all trip and live location endpoints.

### `migrations/migrate.sql`
A single SQL script that creates the `women_safety_db` database and all tables. Run it once when setting up:

```bash
mysql -u root -p < migrations/migrate.sql
```

Tables created: `sample_aadhaar_data`, `otp_verifications`, `users`, `guardian_requests`, `guardian_relationships`, `danger_alerts`, `saved_routes`, `trips`, `gps_points`, `deviation_alerts`, `live_location_sessions`.

### `utils/otpService.js`
Three small functions:
- **`generateOTP()`**: Returns a random 6-digit string.
- **`sendOTP(mobileNumber, otp)`**: Simulates SMS by printing the OTP to the terminal. In production, replace this body with a real SMS API call (Twilio, MSG91, Fast2SMS).
- **`getOTPExpiryTime()`**: Returns a `Date` object `OTP_EXPIRY_MINUTES` minutes from now.

---

## Environment Variables

File: `backend/.env`

```env
PORT=3000
HOST=0.0.0.0

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_root_password
DB_NAME=women_safety_db

JWT_SECRET=any_long_random_secret_string

OTP_EXPIRY_MINUTES=5

YOUR_IP_ADDRESS=192.168.x.x

GOOGLE_MAPS_API_KEY=AIza...
```

`YOUR_IP_ADDRESS` — set this to your machine's local IP. It is printed in the startup log for reference.  
`GOOGLE_MAPS_API_KEY` — must have the Directions API enabled. This is used server-side by `routeController.js` to fetch road polylines.

---

## Setup

### MySQL

1. Make sure MySQL 8.x is installed and running.
2. Run the migration: `mysql -u root -p < migrations/migrate.sql`
3. Optionally add sample Aadhaar rows for testing:
   ```sql
   USE women_safety_db;
   INSERT INTO sample_aadhaar_data (aadhaar_number, mobile_number)
   VALUES ('123456789012', '9876543210');
   ```
4. Fill in `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in `.env`.

### Install and Run

```bash
npm install
npm run dev      # nodemon — auto-restarts on file changes
# or
npm start        # plain node
```

The server listens on `0.0.0.0:3000`, which means it accepts connections from any device on the network — including your phone.

---

## Notes

- **OTP is not sent via SMS.** Look at the terminal output during registration to see the OTP code.
- **Google Maps API** is called server-side only for route polyline fetching. The frontend uses its own key for the map display.
- **Socket.IO** runs on the same port as the REST API. You do not need a separate WebSocket server.
