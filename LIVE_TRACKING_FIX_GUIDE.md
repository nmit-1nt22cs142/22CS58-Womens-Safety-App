# Live Location Tracking - Fix Guide & Testing

## What Was Fixed

### 1. **IP Address Mismatch (PRIMARY BUG)**
   - **Issue**: LiveLocationScreen was using `172.16.9.62` while StartJourneyScreen used `192.168.0.105`
   - **Fix**: Updated LiveLocationScreen to use `192.168.0.105:3000`
   - **Impact**: This was causing the WebSocket connection errors you saw

### 2. **Socket Connection Reliability**
   - Added exponential backoff: `reconnectionDelayMax: 5000`
   - Increased reconnection attempts: 10 → 15
   - Added reconnect event handlers to rejoin rooms after network recovery
   - Better error logging for debugging

### 3. **Location Data Persistence**
   - Socket.io location updates now save to database in real-time
   - Guardians can now retrieve last known location even after refreshing
   - Ensures consistency between real-time and REST API

### 4. **Data Type Consistency**
   - All coordinates are now properly converted to floats
   - Prevents NaN or undefined location values
   - Proper timestamp handling

---

## Testing Checklist

### **Setup Requirements**
- [ ] Verify IP: `192.168.0.105` is your development machine IP
  - Run `ipconfig` on Windows to confirm
  - Update if different in: `api.js`, `StartJourneyScreen.js`, `LiveLocationScreen.js`

### **Backend Testing**
1. Stop any running backend: `npm run dev` → Ctrl+C
2. Start fresh backend:
   ```bash
   cd backend
   npm run dev
   ```
3. Look for these logs:
   ```
   🚀 Server is running successfully!
   📍 Local:   http://localhost:3000
   🔌 Socket.io is active on the same port
   ```

### **Frontend - User (Location Sharer)**
1. Stop Expo and restart:
   ```bash
   cd frontend
   npx expo start
   ```
2. Open app on your phone/emulator
3. Login as the user who will share location
4. Navigate to **Start Journey**
5. Set departure and destination
6. Click **Start Journey**
7. Watch console for:
   ```
   ✅ User socket connected: [socket-id]
   📍 Joined room as user: [user-id]
   📍 Location pushed: [lat], [lng]
   ```

### **Frontend - Guardian (Location Tracker)**
1. In another terminal, open same app (or use emulator):
   ```bash
   cd frontend
   npx expo start
   ```
2. Login as a guardian who has accepted location sharing
3. Go to **GuardianScreen** → Click on user to track
4. Watch for these in console:
   ```
   ✅ Guardian socket connected: [socket-id]
   📍 Emitted join_as_guardian for user: [user-id]
   📍 Location update from user: [user-id] → [lat], [lng]
   ```

### **Verify Live Updates**
1. User moves to different location
2. Guardian's map should update with:
   - New marker position (animated)
   - Breadcrumb trail (pink polyline path)
   - Updated timestamp: "Just now" or "Xs ago"
3. Check database for updates:
   ```sql
   SELECT latitude, longitude, updated_at 
   FROM live_location_sessions 
   WHERE user_id = [user-id] AND is_active = 1;
   ```

### **Test Connection Recovery**
1. Guardian side: Disconnect WiFi or pull network cable
2. Wait 10 seconds
3. Reconnect network
4. Should see in console:
   ```
   🔄 Guardian socket reconnected
   📍 Emitted join_as_guardian for user: [user-id]
   ```
5. Location updates should resume

### **Test Multiple Guardians**
1. Have 2+ guardians track the same user
2. Each should receive location updates simultaneously
3. All should see the same position on their maps

---

## Troubleshooting

### Problem: Still getting "Socket connect error"
**Solution:**
1. Double-check IP address in all three files
2. Verify backend is running: `http://192.168.0.105:3000`
3. Check firewall: Port 3000 should be open
4. Try clearing Expo cache: `npx expo start --clear`

### Problem: Location not updating on map
**Check:**
1. [ ] Guardian has accepted location sharing
2. [ ] User has location permission enabled
3. [ ] Both connected to same WiFi/network
4. [ ] Socket shows "Connected" status
5. [ ] Console shows location updates being received

### Problem: Marker not moving smoothly
**Note:** The marker should animate to new position every 5 seconds (user pushes location every 5s)
- Check console for `📍 Location update from user` logs
- Verify latitude/longitude are changing in logs

### Problem: Can't see other user's location at all
**Steps:**
1. Restart backend and frontend
2. Clear AsyncStorage: Uninstall and reinstall app
3. Re-login to ensure proper JWT tokens
4. Verify database has active session: 
   ```sql
   SELECT * FROM live_location_sessions WHERE is_active = 1;
   ```

---

## Console Log Reference

### Guardian Console (Should see):
```
✅ Guardian socket connected: [id]
📍 Emitted join_as_guardian for user: [user-id]
📍 Location update from user: [user-id] → [lat], [lng]
```

### User Console (Should see):
```
✅ User socket connected: [id]
📍 Joined room as user: [user-id]
📍 Location pushed: [lat], [lng]
```

### Backend Console (Should see):
```
✅ User [user-id] joined room: user_[user-id]
✅ Guardian [socket-id] joined room: user_[user-id]
📍 Location from user [user-id]: [lat], [lng]
✅ Location saved for user [user-id]
```

---

## Database Queries for Verification

### Check Active Sessions:
```sql
SELECT id, user_id, latitude, longitude, updated_at, is_active
FROM live_location_sessions
WHERE is_active = 1
ORDER BY updated_at DESC;
```

### Check Session History:
```sql
SELECT u.name, lls.latitude, lls.longitude, lls.updated_at
FROM live_location_sessions lls
JOIN users u ON lls.user_id = u.id
WHERE lls.user_id = ?
ORDER BY lls.updated_at DESC
LIMIT 50;
```

### Verify Guardian Relationships:
```sql
SELECT u.name as guardian, uu.name as user_being_tracked, gr.status
FROM guardian_relationships gr
JOIN users u ON gr.guardian_id = u.id
JOIN users uu ON gr.user_id = uu.id
ORDER BY gr.status DESC;
```

---

## Performance Notes

- Location updates pushed every **5 seconds** (user side)
- Location broadcast is **real-time** via Socket.io
- Map animation duration: **600ms** for smooth movement
- Trail keeps last **50 location points**
- Database query optimized with indexes on `user_id` and `is_active`

---

## Next Steps if Still Issues

1. Collect console logs from both user and guardian
2. Check backend database to confirm locations are being saved
3. Verify network connectivity between devices
4. Look for firewall blocking port 3000
5. Try with both devices on same WiFi
