/**
 * Calculate the great-circle distance between two points 
 * on the Earth's surface in meters.
 * 
 * @param lat1 Latitude of point 1 (in degrees)
 * @param lon1 Longitude of point 1 (in degrees)
 * @param lat2 Latitude of point 2 (in degrees)
 * @param lon2 Longitude of point 2 (in degrees)
 * @returns Distance in meters
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  // Earth's radius in meters
  const R = 6371000;
  
  // Convert latitude and longitude from degrees to radians
  const lat1Rad = (Math.PI * lat1) / 180;
  const lon1Rad = (Math.PI * lon1) / 180;
  const lat2Rad = (Math.PI * lat2) / 180;
  const lon2Rad = (Math.PI * lon2) / 180;
  
  // Differences
  const dlat = lat2Rad - lat1Rad;
  const dlon = lon2Rad - lon1Rad;
  
  // Haversine formula
  const a = Math.sin(dlat/2)**2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dlon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
} 