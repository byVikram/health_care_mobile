import * as Location from 'expo-location';

/**
 * Get current GPS location
 */
export const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error('Permission to access location was denied');
  }

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};

/**
 * Convert lat/lng → readable address
 */
export const getAddressFromCoords = async (lat: number, lng: number) => {
  const result = await Location.reverseGeocodeAsync({
    latitude: lat,
    longitude: lng,
  });

  if (result.length > 0) {
    const place = result[0];
    return `${place.name || ''}, ${place.city || ''}, ${place.region || ''}`;
  }

  return 'Unknown location';
};