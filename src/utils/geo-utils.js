/**
 * Geospatial utility functions
 */

const R = 6371; // Earth radius in km

/** Haversine distance between two points in km */
export function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Bearing from point A to point B in degrees */
export function bearing(lat1, lng1, lat2, lng2) {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
            Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Calculate polygon area from coordinate array (approximate in km²) */
export function polygonAreaKm2(coords) {
  // Shoelace formula on projected coordinates
  const n = coords.length;
  if (n < 3) return 0;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Approximate: 1 degree lat ≈ 111 km, 1 degree lng ≈ 111 * cos(lat) km
    const avgLat = toRad((coords[i][1] + coords[j][1]) / 2);
    const x1 = coords[i][0] * 111 * Math.cos(avgLat);
    const y1 = coords[i][1] * 111;
    const x2 = coords[j][0] * 111 * Math.cos(avgLat);
    const y2 = coords[j][1] * 111;
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2;
}

/** Format coordinates to degrees/minutes */
export function formatCoord(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`;
}

/** Convert degrees to compass direction */
export function degreesToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

function toRad(d) { return d * Math.PI / 180; }
function toDeg(r) { return r * 180 / Math.PI; }
