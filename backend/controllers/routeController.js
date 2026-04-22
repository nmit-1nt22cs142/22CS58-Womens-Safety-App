const db = require('../config/db');
const https = require('https');

// ============================================
// DECODE GOOGLE ENCODED POLYLINE
// ============================================
const decodePolyline = (encoded) => {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, b;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// ============================================
// FETCH ROAD POLYLINE FROM GOOGLE DIRECTIONS API
// ============================================
const fetchGoogleRoutePolyline = (fromLat, fromLng, toLat, toLng) => {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${fromLat},${fromLng}&destination=${toLat},${toLng}&key=${apiKey}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.routes.length > 0) {
            resolve(decodePolyline(json.routes[0].overview_polyline.points));
          } else {
            reject(new Error('Google Directions API returned: ' + json.status));
          }
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
};

// ============================================
// START TRIP (on-demand — no saved route needed)
// Also auto-starts a live location session
// ============================================
const startTrip = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fromAddress, toAddress, fromLatitude, fromLongitude, toLatitude, toLongitude } = req.body;

    if (!fromAddress || !toAddress || !fromLatitude || !fromLongitude || !toLatitude || !toLongitude) {
      return res.status(400).json({ success: false, message: 'All journey details are required' });
    }

    console.log('🚗 Starting journey for user:', userId, '|', fromAddress, '→', toAddress);

    // Fetch Google road polyline
    let polyline = [];
    try {
      polyline = await fetchGoogleRoutePolyline(fromLatitude, fromLongitude, toLatitude, toLongitude);
      console.log('✅ Polyline fetched | Points:', polyline.length);
    } catch (polyErr) {
      console.warn('⚠️ Polyline fetch failed:', polyErr.message);
    }

    // Create trip
    const [result] = await db.query(
      `INSERT INTO trips
       (user_id, from_address, to_address, from_latitude, from_longitude,
        to_latitude, to_longitude, polyline_json, started_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), 'active')`,
      [userId, fromAddress, toAddress, fromLatitude, fromLongitude,
       toLatitude, toLongitude, polyline.length > 0 ? JSON.stringify(polyline) : null]
    );
    const tripId = result.insertId;

    // Auto-start live location session tied to this trip
    // NOTE: Do NOT end existing standalone sessions from HomeScreen
    // This allows users to keep sharing location while also tracking a journey
    const [liveResult] = await db.query(
      `INSERT INTO live_location_sessions (user_id, trip_id, latitude, longitude, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [userId, tripId, fromLatitude, fromLongitude]
    );
    const liveSessionId = liveResult.insertId;

    // Notify all guardians
    const [guardians] = await db.query(
      `SELECT guardian_id FROM guardian_relationships WHERE user_id = ? AND status = 'accepted'`,
      [userId]
    );
    if (guardians.length > 0) {
      const notificationValues = guardians.map(g => [tripId, g.guardian_id, 'journey_started']);
      await db.query(
        `INSERT INTO guardian_journey_notifications (trip_id, guardian_id, notification_type) VALUES ?`,
        [notificationValues]
      );
    }

    console.log('✅ Trip started:', tripId, '| Live session:', liveSessionId, '| Guardians notified:', guardians.length);

    return res.status(201).json({
      success: true,
      message: 'Journey started',
      tripId,
      liveSessionId,
      polyline,
      guardiansNotified: guardians.length
    });

  } catch (error) {
    console.error('❌ Start trip error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// SAVE GPS POINT
// ============================================
const saveGPSPoint = async (req, res) => {
  try {
    const { tripId, latitude, longitude, accuracy } = req.body;

    if (!tripId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Trip ID, latitude, and longitude are required' });
    }

    await db.query(
      `INSERT INTO gps_points (trip_id, latitude, longitude, accuracy, recorded_at) VALUES (?, ?, ?, ?, NOW())`,
      [tripId, latitude, longitude, accuracy || null]
    );
    await db.query(
      `UPDATE trips SET total_gps_points = total_gps_points + 1 WHERE id = ?`,
      [tripId]
    );

    return res.status(201).json({ success: true, message: 'GPS point saved' });

  } catch (error) {
    console.error('❌ Save GPS point error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// LOG DEVIATION ALERT
// ============================================
const logDeviationAlert = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { tripId, deviationPercentage, latitude, longitude, userResponse } = req.body;

    console.log('⚠️ Deviation alert:', deviationPercentage, '%');

    const [result] = await db.query(
      `INSERT INTO deviation_alerts
       (trip_id, user_id, deviation_percentage, alert_latitude, alert_longitude, user_response)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tripId, userId, deviationPercentage, latitude, longitude, userResponse || 'no_response']
    );
    await db.query(
      `UPDATE trips SET deviation_count = deviation_count + 1 WHERE id = ?`,
      [tripId]
    );

    if (userResponse === 'emergency') {
      const [guardians] = await db.query(
        `SELECT guardian_id FROM guardian_relationships
         WHERE user_id = (SELECT user_id FROM trips WHERE id = ?) AND status = 'accepted'`,
        [tripId]
      );
      if (guardians.length > 0) {
        const notificationValues = guardians.map(g => [tripId, g.guardian_id, 'deviation_alert']);
        await db.query(
          `INSERT INTO guardian_journey_notifications (trip_id, guardian_id, notification_type) VALUES ?`,
          [notificationValues]
        );
      }
    }

    return res.status(201).json({ success: true, message: 'Deviation alert logged', alertId: result.insertId });

  } catch (error) {
    console.error('❌ Log deviation error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// END TRIP — also stops the linked live session
// ============================================
const endTrip = async (req, res) => {
  try {
    const { tripId } = req.body;
    console.log('🏁 Ending trip:', tripId);

    const [trips] = await db.query(
      `SELECT started_at, user_id FROM trips WHERE id = ?`,
      [tripId]
    );
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    const trip = trips[0];
    const duration = new Date() - new Date(trip.started_at);

    await db.query(
      `UPDATE trips SET ended_at = NOW(), duration = ?, status = 'completed' WHERE id = ?`,
      [duration, tripId]
    );

    // Stop live location session linked to this trip
    await db.query(
      `UPDATE live_location_sessions SET is_active = 0, ended_at = NOW() WHERE trip_id = ? AND is_active = 1`,
      [tripId]
    );

    const [guardians] = await db.query(
      `SELECT guardian_id FROM guardian_relationships WHERE user_id = ? AND status = 'accepted'`,
      [trip.user_id]
    );
    if (guardians.length > 0) {
      const notificationValues = guardians.map(g => [tripId, g.guardian_id, 'journey_completed']);
      await db.query(
        `INSERT INTO guardian_journey_notifications (trip_id, guardian_id, notification_type) VALUES ?`,
        [notificationValues]
      );
    }

    console.log('✅ Trip completed | Duration:', duration, 'ms');

    return res.status(200).json({
      success: true,
      message: 'Trip completed',
      duration,
      guardiansNotified: guardians.length
    });

  } catch (error) {
    console.error('❌ End trip error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET GUARDIAN'S ACTIVE JOURNEYS
// ============================================
const getGuardianActiveJourneys = async (req, res) => {
  try {
    const guardianId = req.user.userId;

    const [journeys] = await db.query(
      `SELECT
        t.id as trip_id, t.started_at, t.deviation_count, t.total_gps_points,
        t.from_address, t.to_address, t.from_latitude, t.from_longitude,
        t.to_latitude, t.to_longitude,
        u.name as user_name, u.username, u.mobile_number
       FROM trips t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'active'
       AND t.user_id IN (
         SELECT user_id FROM guardian_relationships WHERE guardian_id = ? AND status = 'accepted'
       )
       ORDER BY t.started_at DESC`,
      [guardianId]
    );

    return res.status(200).json({ success: true, journeys });

  } catch (error) {
    console.error('❌ Get active journeys error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET GUARDIAN'S COMPLETED JOURNEYS
// ============================================
const getGuardianCompletedJourneys = async (req, res) => {
  try {
    const guardianId = req.user.userId;

    const [journeys] = await db.query(
      `SELECT
        t.id as trip_id, t.started_at, t.ended_at, t.duration,
        t.deviation_count, t.from_address, t.to_address,
        u.name as user_name, u.username
       FROM trips t
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'completed'
       AND t.user_id IN (
         SELECT user_id FROM guardian_relationships WHERE guardian_id = ? AND status = 'accepted'
       )
       ORDER BY t.ended_at DESC LIMIT 50`,
      [guardianId]
    );

    return res.status(200).json({ success: true, journeys });

  } catch (error) {
    console.error('❌ Get completed journeys error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET USER JOURNEY DETAILS (for guardian)
// ============================================
const getUserJourneyDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const guardianId = req.user.userId;

    const [relationship] = await db.query(
      `SELECT * FROM guardian_relationships WHERE user_id = ? AND guardian_id = ? AND status = 'accepted'`,
      [userId, guardianId]
    );
    if (relationship.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const [activeJourneys] = await db.query(
      `SELECT
        t.id as trip_id, t.started_at, t.deviation_count, t.total_gps_points,
        t.from_address, t.to_address, t.from_latitude, t.from_longitude,
        t.to_latitude, t.to_longitude
       FROM trips t
       WHERE t.user_id = ? AND t.status = 'active'
       ORDER BY t.started_at DESC`,
      [userId]
    );

    const [completedJourneys] = await db.query(
      `SELECT
        t.id as trip_id, t.started_at, t.ended_at, t.duration,
        t.deviation_count, t.from_address, t.to_address
       FROM trips t
       WHERE t.user_id = ? AND t.status = 'completed'
       ORDER BY t.ended_at DESC LIMIT 20`,
      [userId]
    );

    // Also return current live location status
    const [liveSessions] = await db.query(
      `SELECT id as session_id, latitude, longitude, trip_id, started_at, updated_at
       FROM live_location_sessions
       WHERE user_id = ? AND is_active = 1
       ORDER BY started_at DESC LIMIT 1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      activeJourneys,
      completedJourneys,
      liveLocation: liveSessions.length > 0 ? liveSessions[0] : null
    });

  } catch (error) {
    console.error('❌ Get user journey details error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET TRIP GPS POINTS (for guardian)
// ============================================
const getTripGPSPoints = async (req, res) => {
  try {
    const { tripId } = req.params;
    const guardianId = req.user.userId;

    const [trip] = await db.query(
      `SELECT t.user_id FROM trips t
       WHERE t.id = ?
       AND t.user_id IN (
         SELECT user_id FROM guardian_relationships WHERE guardian_id = ? AND status = 'accepted'
       )`,
      [tripId, guardianId]
    );
    if (trip.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const [points] = await db.query(
      `SELECT latitude, longitude, accuracy, recorded_at
       FROM gps_points WHERE trip_id = ? ORDER BY recorded_at ASC`,
      [tripId]
    );

    return res.status(200).json({ success: true, points });

  } catch (error) {
    console.error('❌ Get GPS points error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// START LIVE LOCATION SHARING (standalone)
// ============================================
const startLiveLocation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }

    // End any existing STANDALONE sessions (trip_id = NULL) only
    // Do NOT end trip-based sessions - allow both to coexist
    await db.query(
      `UPDATE live_location_sessions SET is_active = 0, ended_at = NOW() WHERE user_id = ? AND is_active = 1 AND trip_id IS NULL`,
      [userId]
    );

    // Create new standalone session (trip_id = NULL)
    const [result] = await db.query(
      `INSERT INTO live_location_sessions (user_id, trip_id, latitude, longitude, is_active) VALUES (?, NULL, ?, ?, 1)`,
      [userId, latitude, longitude]
    );

    const [guardians] = await db.query(
      `SELECT COUNT(*) as count FROM guardian_relationships WHERE user_id = ? AND status = 'accepted'`,
      [userId]
    );

    console.log('📍 Standalone live session started:', result.insertId, 'for user:', userId);

    return res.status(201).json({
      success: true,
      message: 'Live location sharing started',
      sessionId: result.insertId,
      guardiansCount: guardians[0].count
    });

  } catch (error) {
    console.error('❌ Start live location error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// UPDATE LIVE LOCATION
// ============================================
const updateLiveLocation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId, latitude, longitude } = req.body;

    if (!sessionId || !latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Session ID, latitude, and longitude are required' });
    }

    const [result] = await db.query(
      `UPDATE live_location_sessions
       SET latitude = ?, longitude = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ? AND is_active = 1`,
      [latitude, longitude, sessionId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Active session not found' });
    }

    return res.status(200).json({ success: true, message: 'Location updated' });

  } catch (error) {
    console.error('❌ Update live location error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// STOP LIVE LOCATION SHARING
// ============================================
const stopLiveLocation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { sessionId } = req.body;

    await db.query(
      `UPDATE live_location_sessions SET is_active = 0, ended_at = NOW() WHERE id = ? AND user_id = ?`,
      [sessionId, userId]
    );

    console.log('🛑 Live location session stopped:', sessionId);

    return res.status(200).json({ success: true, message: 'Live location sharing stopped' });

  } catch (error) {
    console.error('❌ Stop live location error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET LIVE LOCATION (for guardian polling)
// ============================================
const getLiveLocation = async (req, res) => {
  try {
    const { userId } = req.params;
    const guardianId = req.user.userId;

    // Verify guardian relationship
    const [relationship] = await db.query(
      `SELECT * FROM guardian_relationships WHERE user_id = ? AND guardian_id = ? AND status = 'accepted'`,
      [userId, guardianId]
    );
    if (relationship.length === 0) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const [sessions] = await db.query(
      `SELECT
        lls.id as session_id, lls.latitude, lls.longitude,
        lls.trip_id, lls.started_at, lls.updated_at,
        u.name as user_name
       FROM live_location_sessions lls
       JOIN users u ON lls.user_id = u.id
       WHERE lls.user_id = ? AND lls.is_active = 1
       ORDER BY lls.started_at DESC LIMIT 1`,
      [userId]
    );

    if (sessions.length === 0) {
      return res.status(200).json({ success: true, isSharing: false, location: null });
    }

    return res.status(200).json({
      success: true,
      isSharing: true,
      location: sessions[0]
    });

  } catch (error) {
    console.error('❌ Get live location error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET USER'S OWN TRIP HISTORY (for journey history screen)
// ============================================
const getUserTripHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = req.query.limit || 20;
    const offset = req.query.offset || 0;

    const [trips] = await db.query(
      `SELECT
        id as trip_id, from_address, to_address, from_latitude, from_longitude,
        to_latitude, to_longitude, started_at, ended_at, duration, status,
        polyline_json, deviation_count, total_gps_points
       FROM trips
       WHERE user_id = ?
       ORDER BY started_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(limit), parseInt(offset)]
    );

    return res.status(200).json({ success: true, trips });

  } catch (error) {
    console.error('❌ Get user trip history error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ============================================
// GET USER'S ACTIVE TRIP (if any)
// ============================================
const getActiveTrip = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [trips] = await db.query(
      `SELECT
        id as trip_id, from_address, to_address, from_latitude, from_longitude,
        to_latitude, to_longitude, started_at, polyline_json
       FROM trips
       WHERE user_id = ? AND status = 'active'
       ORDER BY started_at DESC
       LIMIT 1`,
      [userId]
    );

    if (trips.length === 0) {
      return res.status(200).json({ success: true, hasActiveTrip: false, trip: null });
    }

    return res.status(200).json({ success: true, hasActiveTrip: true, trip: trips[0] });

  } catch (error) {
    console.error('❌ Get active trip error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  startTrip,
  saveGPSPoint,
  logDeviationAlert,
  endTrip,
  getGuardianActiveJourneys,
  getGuardianCompletedJourneys,
  getUserJourneyDetails,
  getTripGPSPoints,
  startLiveLocation,
  updateLiveLocation,
  stopLiveLocation,
  getLiveLocation,
  getUserTripHistory,
  getActiveTrip
};