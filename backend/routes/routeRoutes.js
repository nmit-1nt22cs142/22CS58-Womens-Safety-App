const express = require('express');
const router = express.Router();
const {
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
  getLiveLocation
} = require('../controllers/routeController');
const authMiddleware = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authMiddleware);

// Trip management (on-demand journeys)
router.post('/trip/start', startTrip);
router.post('/trip/gps-point', saveGPSPoint);
router.post('/trip/deviation', logDeviationAlert);
router.post('/trip/end', endTrip);

// Guardian views
router.get('/guardian/active-journeys', getGuardianActiveJourneys);
router.get('/guardian/completed-journeys', getGuardianCompletedJourneys);
router.get('/guardian/user/:userId/journeys', getUserJourneyDetails);
router.get('/guardian/trip/:tripId/gps-points', getTripGPSPoints);

// Live location sharing
router.post('/live-location/start', startLiveLocation);
router.post('/live-location/update', updateLiveLocation);
router.post('/live-location/stop', stopLiveLocation);
router.get('/live-location/user/:userId', getLiveLocation);

module.exports = router;