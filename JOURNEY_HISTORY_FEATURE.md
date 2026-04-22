# Journey History Feature Implementation

## Overview
The "Start Journey" feature has been completely redesigned. Now instead of going directly to the map screen, users first see their journey history with options to restart previous journeys or start new routes.

## Changes Made

### Backend Changes

#### 1. **New API Endpoints in `routeController.js`**

**getUserTripHistory** - Get user's trip history
```
GET /routes/trip/history?limit=20&offset=0
- Returns: { success: true, trips: [...] }
- Fields: trip_id, from_address, to_address, from_latitude, from_longitude, 
         to_latitude, to_longitude, started_at, ended_at, duration, status,
         polyline_json, deviation_count, total_gps_points
```

**getActiveTrip** - Check if user has active trip
```
GET /routes/trip/active
- Returns: { success: true, hasActiveTrip: boolean, trip: {...} }
- If active: includes trip_id, from_address, to_address, from_latitude, 
  from_longitude, to_latitude, to_longitude, started_at, polyline_json
```

#### 2. **Updated Routes in `routeRoutes.js`**
```javascript
router.get('/trip/history', getUserTripHistory);
router.get('/trip/active', getActiveTrip);
```

### Frontend Changes

#### 1. **New Screen: `JourneyHistoryScreen.js`**
- **Purpose**: Shows user's journey history and allows them to restart previous journeys
- **Features**:
  - Displays journey history as tabs
  - Each tab shows from/to locations with dates and times
  - Each tab has a "Start" button to restart that journey
  - Shows trip statistics (duration, GPS points, deviations) if trip is completed
  - "Start New Route" button at bottom to create new journey
  - "Stop" button to end active journey
  - Pull-to-refresh functionality
  - Empty state when no journey history

#### 2. **Updated `HomeScreen.js`**
- Changed "Start Journey" button navigation from 'StartJourney' to 'JourneyHistory'

#### 3. **Updated `StartJourneyScreen.js`**
- Now accepts `route.params.prefilledData` to auto-fill locations from journey history
- If pre-filled data provided:
  - From location, To location, and coordinates are automatically set
  - User can directly start the journey
- If no pre-filled data:
  - Behaves normally (current location + manual destination selection)

#### 4. **Updated `AppNavigator.js`**
- Added JourneyHistoryScreen to stack navigator
- Placed before StartJourneyScreen in navigation order

#### 5. **New API Functions in `api.js`**
```javascript
export const getUserTripHistory = async (token, limit = 20, offset = 0)
export const getActiveTrip = async (token)
```

### Database Schema (Already Exists)
The existing `trips` table contains all necessary fields:
- `id`, `user_id`, `from_address`, `to_address`, `from_latitude`, `from_longitude`,
- `to_latitude`, `to_longitude`, `polyline_json`, `started_at`, `ended_at`,
- `duration`, `status`, `deviation_count`, `total_gps_points`

## User Flow

### Scenario 1: First Time User (No History)
1. User clicks "Start Journey" on HomeScreen
2. Goes to JourneyHistoryScreen
3. Sees empty state with "Start New Route" button
4. Clicks "Start New Route"
5. Goes to StartJourneyScreen to enter destination
6. Starts journey

### Scenario 2: User with Journey History
1. User clicks "Start Journey" on HomeScreen
2. Goes to JourneyHistoryScreen
3. Sees list of previous journeys as tabs
4. **Option A**: Click "Start" on a previous journey
   - Pre-filled data sent to StartJourneyScreen
   - Journey starts with same from/to locations
5. **Option B**: Click "Start New Route" at bottom
   - Goes to StartJourneyScreen
   - User can enter new destination

### Scenario 3: User with Active Journey
1. JourneyHistoryScreen detects active journey
2. Shows "ACTIVE NOW" badge with active journey details
3. Displays "Stop" button to end journey
4. User can click "Stop" to end active journey
5. Can then start a new journey if desired

## UI Components

### JourneyHistoryScreen Elements

**Header Section**
- Back button to return to HomeScreen
- Title: "Journey History"
- Subtitle: "Your past and current trips"

**Active Journey Card** (if active)
- "ACTIVE NOW" badge with pulsing dot
- "Stop" button (red)
- From location
- To location
- Current journey details

**Journey History List**
- Empty state if no journeys
- Tab cards for each journey with:
  - Date/Time in top left
  - Status badge (Completed/Cancelled)
  - From location → To location (visual flow)
  - Stats row (Duration, Points tracked, Deviations if any)
  - "Start" button at bottom

**Bottom Action Button**
- "Start New Route" button (pink, always visible)
- Fixed at bottom of screen above safe area

## Testing Checklist

- [ ] Click "Start Journey" from HomeScreen → goes to JourneyHistoryScreen
- [ ] If no history: Empty state shows with "Start New Route" button
- [ ] Click "Start New Route" → goes to StartJourneyScreen
- [ ] Complete a journey
- [ ] Go back to JourneyHistoryScreen → see completed journey in history
- [ ] Click "Start" on a previous journey → goes to StartJourneyScreen with pre-filled data
- [ ] Pre-filled journey should have all coordinates ready
- [ ] Start active journey from history
- [ ] Check JourneyHistoryScreen shows "ACTIVE NOW" badge
- [ ] Click "Stop" button → end active journey
- [ ] Verify journey appears in history after completion
- [ ] Pull-to-refresh works on JourneyHistoryScreen

## API Response Examples

### getUserTripHistory Response
```json
{
  "success": true,
  "trips": [
    {
      "trip_id": 123,
      "from_address": "Home, Bangalore",
      "to_address": "Office, Bangalore",
      "from_latitude": 12.9716,
      "from_longitude": 77.5946,
      "to_latitude": 13.0827,
      "to_longitude": 80.2707,
      "started_at": "2026-04-22T08:00:00.000Z",
      "ended_at": "2026-04-22T09:30:00.000Z",
      "duration": "1h 30m",
      "status": "completed",
      "polyline_json": "[...]",
      "deviation_count": 0,
      "total_gps_points": 45
    }
  ]
}
```

### getActiveTrip Response
```json
{
  "success": true,
  "hasActiveTrip": true,
  "trip": {
    "trip_id": 124,
    "from_address": "Home, Bangalore",
    "to_address": "Airport, Bangalore",
    "from_latitude": 12.9716,
    "from_longitude": 77.5946,
    "to_latitude": 12.4416,
    "to_longitude": 77.0099,
    "started_at": "2026-04-22T15:00:00.000Z",
    "polyline_json": "[...]"
  }
}
```

## Navigation Structure

```
HomeScreen
    ↓ "Start Journey" click
JourneyHistoryScreen
    ↓ "Start New Route" OR "Start" on history
StartJourneyScreen (with/without pre-filled data)
    ↓ "Start Journey" click
TrackRouteScreen
```

## State Management

### JourneyHistoryScreen State
- `tripHistory` - Array of past trips
- `activeTrip` - Current active trip (null if none)
- `loading` - Initial load state
- `refreshing` - Pull-to-refresh state
- `stoppingTrip` - Stop journey loading state

### StartJourneyScreen State (Enhanced)
- `route.params.prefilledData` - Pre-filled location data from history
- Uses existing state if no pre-filled data provided

## Error Handling

- Network errors show alert: "Failed to load journey history"
- Stop journey errors show: "Failed to stop journey"
- Load data handles missing/null responses gracefully
- Empty states display appropriate messaging

## Performance Optimizations

- Journey history limited to 20 items by default (pagination support)
- Pull-to-refresh only loads data on demand
- Polyline data stored as JSON for efficient retrieval
- Database queries indexed on `user_id` and `status` fields

## Future Enhancements

- [ ] Pagination for journey history (infinite scroll)
- [ ] Filter journeys by date range
- [ ] Search journeys by destination
- [ ] View detailed analytics for past journeys
- [ ] Export journey data
- [ ] Share journey routes with guardians
- [ ] Favorite/bookmark frequent routes
