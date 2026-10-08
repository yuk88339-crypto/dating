/**
 * Haversine formula for calculating spherical distance between two geographic coordinates
 * and privacy-preserving distance range formatting.
 */

const EARTH_RADIUS_KM = 6371.0;

/**
 * Calculates the great-circle distance between two points on the Earth's surface in kilometers.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const radLat1 = toRad(lat1);
  const radLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Validates that latitude and longitude are valid finite numbers within terrestrial boundaries.
 * @param {any} lat 
 * @param {any} lng 
 * @returns {boolean}
 */
export function isValidCoordinates(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return false;
  }
  if (lat < -90 || lat > 90) {
    return false;
  }
  if (lng < -180 || lng > 180) {
    return false;
  }
  return true;
}

/**
 * Obfuscates exact distance into a privacy-friendly rounded distance range.
 * Raw lat/lng is NEVER sent to any peer.
 * @param {number} km Distance in kilometers
 * @returns {string} Obfuscated range label (e.g. "< 2 km", "~5 km", "5-10 km", "10-20 km", "20-30 km")
 */
export function formatDistanceRange(km) {
  if (km < 2) {
    return '< 2 km';
  } else if (km < 5) {
    return '~5 km';
  } else if (km < 10) {
    return '5-10 km';
  } else if (km < 20) {
    return '10-20 km';
  } else {
    return '20-30 km';
  }
}
