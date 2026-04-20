import axios from 'axios';

// Google Maps API Key from environment
const GOOGLE_MAPS_API_KEY = 'AIzaSyBT8-gEs1ieXgauaJbLqu98z-XwfmI4Mwc';
const GOOGLE_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api';

/**
 * Fetch place predictions from Google Places Autocomplete API
 * @param {string} input - User input text (e.g., "coffee", "hospital")
 * @param {object} options - Additional options like location bias, radius
 * @returns {Promise<array>} - Array of prediction objects with description and place_id
 */
export const getPlacePredictions = async (input, options = {}) => {
  try {
    if (!input || input.trim().length < 2) {
      return [];
    }

    const params = {
      input: input.trim(),
      key: GOOGLE_MAPS_API_KEY,
      components: 'country:in', // Restrict to India
      ...options,
    };

    // Add location bias if provided (latitude, longitude)
    if (options.location) {
      params.location = `${options.location.latitude},${options.location.longitude}`;
    }

    const response = await axios.get(
      `${GOOGLE_MAPS_BASE_URL}/place/autocomplete/json`,
      { params }
    );

    if (response.data.predictions) {
      return response.data.predictions.map((prediction) => ({
        description: prediction.description,
        place_id: prediction.place_id,
        main_text: prediction.main_text,
        secondary_text: prediction.secondary_text,
      }));
    }

    return [];
  } catch (error) {
    console.error('❌ Google Places Autocomplete Error:', error.message);
    return [];
  }
};

/**
 * Get detailed place information including coordinates
 * @param {string} placeId - Google Place ID
 * @returns {Promise<object>} - Place details with lat/lng and formatted address
 */
export const getPlaceDetails = async (placeId) => {
  try {
    const params = {
      place_id: placeId,
      fields: 'geometry,formatted_address,name',
      key: GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(
      `${GOOGLE_MAPS_BASE_URL}/place/details/json`,
      { params }
    );

    if (response.data.result) {
      const { geometry, formatted_address, name } = response.data.result;
      return {
        latitude: geometry.location.lat,
        longitude: geometry.location.lng,
        address: formatted_address,
        name: name,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Google Place Details Error:', error.message);
    return null;
  }
};

/**
 * Reverse geocode coordinates to get address
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<string>} - Formatted address string
 */
export const reverseGeocode = async (latitude, longitude) => {
  try {
    const params = {
      latlng: `${latitude},${longitude}`,
      key: GOOGLE_MAPS_API_KEY,
    };

    const response = await axios.get(
      `${GOOGLE_MAPS_BASE_URL}/geocode/json`,
      { params }
    );

    if (response.data.results && response.data.results.length > 0) {
      // Return the first (most specific) result
      return response.data.results[0].formatted_address;
    }

    return 'Unknown Location';
  } catch (error) {
    console.error('❌ Reverse Geocode Error:', error.message);
    return 'Unable to fetch address';
  }
};

/**
 * Get coordinates from address string
 * @param {string} address - Address string
 * @returns {Promise<object>} - Object with latitude and longitude
 */
export const geocodeAddress = async (address) => {
  try {
    if (!address || address.trim().length === 0) {
      return null;
    }

    const params = {
      address: address.trim(),
      key: GOOGLE_MAPS_API_KEY,
      components: 'country:in', // Restrict to India
    };

    const response = await axios.get(
      `${GOOGLE_MAPS_BASE_URL}/geocode/json`,
      { params }
    );

    if (response.data.results && response.data.results.length > 0) {
      const { lat, lng } = response.data.results[0].geometry.location;
      return {
        latitude: lat,
        longitude: lng,
        address: response.data.results[0].formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.error('❌ Geocode Address Error:', error.message);
    return null;
  }
};
