const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/routeController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Route management
router.post('/', createRoute);
router.get('/', getUserRoutes);
router.get('/:routeId', getRouteById);
router.delete('/:routeId', deleteRoute);

// Trip management
router.post('/trip/start', startTrip);
router.post('/trip/gps-point', saveGPSPoint);
router.post('/trip/deviation', logDeviationAlert);
router.post('/trip/end', endTrip);

// Guardian views
router.get('/guardian/active-journeys', getGuardianActiveJourneys);
router.get('/guardian/completed-journeys', getGuardianCompletedJourneys);
router.get('/guardian/user/:userId/journeys', getUserJourneyDetails);
router.get('/guardian/trip/:tripId/gps-points', getTripGPSPoints);

module.exports = router;