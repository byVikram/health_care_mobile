import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

let settingsAlertOpen = false;

const offerAppSettings = () => {
  if (settingsAlertOpen) return;
  settingsAlertOpen = true;
  const close = () => {
    settingsAlertOpen = false;
  };
  Alert.alert(
    'Location is turned off',
    'Allow Location for KarolaHealth in your phone’s App settings to use this.',
    [
      { text: 'Not now', style: 'cancel', onPress: close },
      {
        text: 'Open Settings',
        onPress: () => {
          close();
          void Linking.openSettings();
        },
      },
    ],
    { onDismiss: close }
  );
};

/**
 * Location permission via the Android system dialog. When Android will no longer show that dialog (the user
 * denied it twice / chose "Don't ask again") and `promptForSettings` is set, a plain system alert offers App
 * Settings instead. Only user-initiated callers set it -- background pings and on-mount lookups must not pop an alert.
 */
const ensureLocationPermission = async (promptForSettings: boolean) => {
  let permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted' && permission.canAskAgain) {
    permission = await Location.requestForegroundPermissionsAsync();
  }
  if (permission.status === 'granted') return;

  if (!permission.canAskAgain && promptForSettings) offerAppSettings();
  throw new Error('Permission to access location was denied');
};

/**
 * Get current GPS location
 */
export const getCurrentLocation = async ({ promptForSettings = false }: { promptForSettings?: boolean } = {}) => {
  await ensureLocationPermission(promptForSettings);

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};

/**
 * Convert a typed address → lat/lng (best effort: null when the device's geocoder can't place it).
 * No location permission is needed for forward geocoding.
 */
export const getCoordsFromAddress = async (address: string, timeoutMs = 6000) => {
  try {
    // The platform geocoder can stall (no network / no Geocoder service) -- give up rather than hang the caller.
    const [match] = await Promise.race([
      Location.geocodeAsync(address),
      new Promise<never[]>((resolve) => setTimeout(() => resolve([]), timeoutMs)),
    ]);
    return match ? { latitude: match.latitude, longitude: match.longitude } : null;
  } catch {
    return null;
  }
};

/**
 * Convert lat/lng → readable address
 */
export const getAddressFromCoords = async (
  latitude: number,
  longitude: number
) => {
  try {
    const [geo] = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    const isValidArea = (value?: string | null) => {
      if (!value) return false;

      const invalid = [
        'floor',
        'room',
        'building',
        'apartment',
        'block',
        'stage',
        'no.',
        'door',
        'house',
      ];

      return !invalid.some(word =>
        value.toLowerCase().includes(word)
      );
    };

    const area =
  (isValidArea(geo?.district ?? undefined) && geo?.district) ||
  (isValidArea(geo?.subregion ?? undefined) && geo?.subregion) ||
  '';

    return {
      area,
      city: geo?.city || '',
      district: geo?.district || '',
      state: geo?.region || '',
      country: geo?.country || '',
      fullAddress: [
        geo?.district,
        geo?.city,
        geo?.region,
        geo?.country,
      ]
        .filter(Boolean)
        .join(', '),
    };
  } catch {
    return {};
  }
};


/**
 * Current GPS position only when location permission is already granted. Never asks, so it is safe to call
 * when a screen opens (the location sheet uses it to show where "Use current location" would land).
 */
export const getCurrentLocationIfPermitted = async () => {
  const permission = await Location.getForegroundPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
  };
};

export type PlaceResult = {
  name: string;
  /** "Suburb, City, State" line shown under the name. */
  area: string;
  latitude: number;
  longitude: number;
};

type NominatimPlace = {
  name?: string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
};

/**
 * Search places by text (OpenStreetMap Nominatim -- free, no API key). Resolves to [] on any failure so the
 * caller just shows "no places found".
 */
export const searchPlaces = async (query: string, signal?: AbortSignal): Promise<PlaceResult[]> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8`;
    const res = await fetch(url, {
      signal,
      headers: {
        'User-Agent': 'MyHealthApp/1.0 (contact@myhealthapp.com)',
        'Accept-Language': 'en',
      },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as NominatimPlace[];

    return rows.map((r) => {
      const a = r.address ?? {};
      const town = a.city ?? a.town ?? a.village;
      const name = r.name || a.road || a.suburb || town || r.display_name.split(',')[0];
      return {
        name,
        area: [a.suburb && a.suburb !== name ? a.suburb : '', town, a.state].filter(Boolean).join(', '),
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon),
      };
    });
  } catch {
    return [];
  }
};
