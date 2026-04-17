const db = require('../config/db');

// ============================================
// CREATE ROUTE
// ============================================
const createRoute = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      fromAddress,
      toAddress,
      fromLatitude,
      fromLongitude,
      toLatitude,
      toLongitude
    } = req.body;

    console.log('📍 Creating route for user:', userId);

    // Validation
    if (!fromAddress || !toAddress || !fromLatitude || !fromLongitude || !toLatitude || !toLongitude) {
      return res.status(400).json({
        success: false,
        message: 'All route details are required'
      });
    }

    // Insert route
    const [result] = await db.query(
      `INSERT INTO routes 
       (user_id, from_address, to_address, from_latitude, from_longitude, to_latitude, to_longitude) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, fromAddress, toAddress, fromLatitude, fromLongitude, toLatitude, toLongitude]
    );

    console.log('✅ Route created with ID:', result.insertId);

    return res.status(201).json({
      success: true,
      message: 'Route created successfully',
      routeId: result.insertId
    });

  } catch (error) {
    console.error('❌ Create route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// GET USER ROUTES
// ============================================
const getUserRoutes = async (req, res) => {
  try {
    const userId = req.user.userId;

    const [routes] = await db.query(
      `SELECT 
        id,
        from_address,
        to_address,
        from_latitude,
        from_longitude,
        to_latitude,
        to_longitude,
        geofence_radius,
        trips_completed,
        learned_percentage,
        estimated_time,
        last_visit,
        created_at,
        updated_at
       FROM routes
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    console.log('📍 Found routes:', routes.length);

    return res.status(200).json({
      success: true,
      routes
    });

  } catch (error) {
    console.error('❌ Get routes error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// GET ROUTE BY ID
// ============================================
const getRouteById = async (req, res) => {
  try {
    const { routeId } = req.params;
    const userId = req.user.userId;

    const [routes] = await db.query(
      `SELECT * FROM routes WHERE id = ? AND user_id = ?`,
      [routeId, userId]
    );

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Get learned route if exists
    const [learnedRoute] = await db.query(
      `SELECT path_json, corridor_json, confidence FROM learned_routes WHERE route_id = ?`,
      [routeId]
    );

    const route = {
      ...routes[0],
      learnedRoute: learnedRoute.length > 0 ? {
        path: JSON.parse(learnedRoute[0].path_json || '[]'),
        corridor: JSON.parse(learnedRoute[0].corridor_json || '[]'),
        confidence: parseFloat(learnedRoute[0].confidence)
      } : null
    };

    return res.status(200).json({
      success: true,
      route
    });

  } catch (error) {
    console.error('❌ Get route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// DELETE ROUTE
// ============================================
const deleteRoute = async (req, res) => {
  try {
    const { routeId } = req.params;
    const userId = req.user.userId;

    await db.query(
      `DELETE FROM routes WHERE id = ? AND user_id = ?`,
      [routeId, userId]
    );

    console.log('✅ Route deleted:', routeId);

    return res.status(200).json({
      success: true,
      message: 'Route deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete route error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// START TRIP
// ============================================
const startTrip = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { routeId } = req.body;

    console.log('🚗 Starting trip for route:', routeId);

    // Verify route exists
    const [routes] = await db.query(
      `SELECT * FROM routes WHERE id = ? AND user_id = ?`,
      [routeId, userId]
    );

    if (routes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Route not found'
      });
    }

    // Create trip
    const [result] = await db.query(
      `INSERT INTO trips (route_id, user_id, started_at, status) VALUES (?, ?, NOW(), 'active')`,
      [routeId, userId]
    );

    const tripId = result.insertId;

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

    console.log('✅ Trip started:', tripId, '| Guardians notified:', guardians.length);

    return res.status(201).json({
      success: true,
      message: 'Trip started',
      tripId,
      guardiansNotified: guardians.length
    });

  } catch (error) {
    console.error('❌ Start trip error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// SAVE GPS POINT
// ============================================
const saveGPSPoint = async (req, res) => {
  try {
    const { tripId, latitude, longitude, accuracy } = req.body;

    if (!tripId || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Trip ID, latitude, and longitude are required'
      });
    }

    // Save GPS point
    await db.query(
      `INSERT INTO gps_points (trip_id, latitude, longitude, accuracy, recorded_at) VALUES (?, ?, ?, ?, NOW())`,
      [tripId, latitude, longitude, accuracy || null]
    );

    // Update trip GPS points count
    await db.query(
      `UPDATE trips SET total_gps_points = total_gps_points + 1 WHERE id = ?`,
      [tripId]
    );

    return res.status(201).json({
      success: true,
      message: 'GPS point saved'
    });

  } catch (error) {
    console.error('❌ Save GPS point error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
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

    // Insert alert
    const [result] = await db.query(
      `INSERT INTO deviation_alerts 
       (trip_id, user_id, deviation_percentage, alert_latitude, alert_longitude, user_response) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tripId, userId, deviationPercentage, latitude, longitude, userResponse || 'no_response']
    );

    // Update trip deviation count
    await db.query(
      `UPDATE trips SET deviation_count = deviation_count + 1 WHERE id = ?`,
      [tripId]
    );

    // Notify guardians if emergency
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

    return res.status(201).json({
      success: true,
      message: 'Deviation alert logged',
      alertId: result.insertId
    });

  } catch (error) {
    console.error('❌ Log deviation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// END TRIP
// ============================================
const endTrip = async (req, res) => {
  try {
    const { tripId } = req.body;

    console.log('🏁 Ending trip:', tripId);

    // Get trip start time
    const [trips] = await db.query(
      `SELECT started_at, route_id, user_id FROM trips WHERE id = ?`,
      [tripId]
    );

    if (trips.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    const trip = trips[0];
    const startTime = new Date(trip.started_at);
    const endTime = new Date();
    const duration = endTime - startTime;

    // Update trip
    await db.query(
      `UPDATE trips SET ended_at = NOW(), duration = ?, status = 'completed' WHERE id = ?`,
      [duration, tripId]
    );

    // Update route stats
    await db.query(
      `UPDATE routes SET 
        trips_completed = trips_completed + 1,
        learned_percentage = LEAST(trips_completed * 33, 100),
        last_visit = NOW()
       WHERE id = ?`,
      [trip.route_id]
    );

    // Calculate average time if we have trips
    const [routeTrips] = await db.query(
      `SELECT AVG(duration) as avg_duration FROM trips WHERE route_id = ? AND status = 'completed'`,
      [trip.route_id]
    );

    if (routeTrips[0].avg_duration) {
      await db.query(
        `UPDATE routes SET estimated_time = ? WHERE id = ?`,
        [Math.round(routeTrips[0].avg_duration), trip.route_id]
      );
    }

    // Notify guardians
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
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
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
        t.id as trip_id,
        t.started_at,
        t.deviation_count,
        t.total_gps_points,
        r.from_address,
        r.to_address,
        r.from_latitude,
        r.from_longitude,
        r.to_latitude,
        r.to_longitude,
        u.name as user_name,
        u.username,
        u.mobile_number
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'active'
       AND t.user_id IN (
         SELECT user_id FROM guardian_relationships 
         WHERE guardian_id = ? AND status = 'accepted'
       )
       ORDER BY t.started_at DESC`,
      [guardianId]
    );

    console.log('🚗 Active journeys for guardian:', journeys.length);

    return res.status(200).json({
      success: true,
      journeys
    });

  } catch (error) {
    console.error('❌ Get active journeys error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
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
        t.id as trip_id,
        t.started_at,
        t.ended_at,
        t.duration,
        t.deviation_count,
        r.from_address,
        r.to_address,
        u.name as user_name,
        u.username
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       JOIN users u ON t.user_id = u.id
       WHERE t.status = 'completed'
       AND t.user_id IN (
         SELECT user_id FROM guardian_relationships 
         WHERE guardian_id = ? AND status = 'accepted'
       )
       ORDER BY t.ended_at DESC
       LIMIT 50`,
      [guardianId]
    );

    console.log('🏁 Completed journeys for guardian:', journeys.length);

    return res.status(200).json({
      success: true,
      journeys
    });

  } catch (error) {
    console.error('❌ Get completed journeys error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// GET USER JOURNEY DETAILS (for guardian)
// ============================================
const getUserJourneyDetails = async (req, res) => {
  try {
    const { userId } = req.params;
    const guardianId = req.user.userId;

    // Verify guardian relationship
    const [relationship] = await db.query(
      `SELECT * FROM guardian_relationships WHERE user_id = ? AND guardian_id = ? AND status = 'accepted'`,
      [userId, guardianId]
    );

    if (relationship.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get active journeys
    const [activeJourneys] = await db.query(
      `SELECT 
        t.id as trip_id,
        t.started_at,
        t.deviation_count,
        t.total_gps_points,
        r.from_address,
        r.to_address,
        r.from_latitude,
        r.from_longitude,
        r.to_latitude,
        r.to_longitude
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       WHERE t.user_id = ? AND t.status = 'active'
       ORDER BY t.started_at DESC`,
      [userId]
    );

    // Get completed journeys
    const [completedJourneys] = await db.query(
      `SELECT 
        t.id as trip_id,
        t.started_at,
        t.ended_at,
        t.duration,
        t.deviation_count,
        r.from_address,
        r.to_address
       FROM trips t
       JOIN routes r ON t.route_id = r.id
       WHERE t.user_id = ? AND t.status = 'completed'
       ORDER BY t.ended_at DESC
       LIMIT 20`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      activeJourneys,
      completedJourneys
    });

  } catch (error) {
    console.error('❌ Get user journey details error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// ============================================
// GET TRIP GPS POINTS (for guardian live tracking)
// ============================================
const getTripGPSPoints = async (req, res) => {
  try {
    const { tripId } = req.params;
    const guardianId = req.user.userId;

    // Verify guardian has access to this trip
    const [trip] = await db.query(
      `SELECT t.user_id FROM trips t
       WHERE t.id = ?
       AND t.user_id IN (
         SELECT user_id FROM guardian_relationships 
         WHERE guardian_id = ? AND status = 'accepted'
       )`,
      [tripId, guardianId]
    );

    if (trip.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get GPS points
    const [points] = await db.query(
      `SELECT latitude, longitude, accuracy, recorded_at 
       FROM gps_points 
       WHERE trip_id = ? 
       ORDER BY recorded_at ASC`,
      [tripId]
    );

    return res.status(200).json({
      success: true,
      points
    });

  } catch (error) {
    console.error('❌ Get GPS points error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createRoute,
  getUserRoutes,
  getRouteById,
  deleteRoute,
  startTrip,
  saveGPSPoint,
  logDeviationAlert,
  endTrip,
  getGuardianActiveJourneys,
  getGuardianCompletedJourneys,
  getUserJourneyDetails,
  getTripGPSPoints
};