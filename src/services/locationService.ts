import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { normalizePincode } from '../utils/pincode';
import { showStatusModal } from './apiService';

let settingsAlertOpen = false;

type SettingsPromptOptions = {
  title?: string;
  description?: string;
  /** What "Open Settings" does; the app's own settings page by default. */
  openSettings?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  /** The confirm button's text; "Open Settings" by default. */
  submitText?: string;
};

/** A "Location is off" prompt with an Open Settings button (one at a time). */
export const offerAppSettings = (options: SettingsPromptOptions = {}) => {
  if (settingsAlertOpen) return;
  settingsAlertOpen = true;
  const close = () => {
    settingsAlertOpen = false;
  };
  showStatusModal({
    status: 'info',
    title: options.title ?? 'Location is turned off',
    description: options.description ?? 'Allow Location for KarolaHealth in your phone’s App settings to use this.',
    submitText: options.submitText ?? 'Open Settings',
    onSubmit: () => {
      close();
      if (options.openSettings) options.openSettings();
      else void Linking.openSettings();
    },
    cancelText: options.cancelText ?? 'Not now',
    onCancel: () => {
      close();
      options.onCancel?.();
    },
  });
};

/** The phone's own Location switch (GPS): Android has a settings page for it; iOS can only open the app's settings. */
export const openLocationServicesSettings = async () => {
  try {
    if (Platform.OS === 'android') {
      await Linking.sendIntent('android.settings.LOCATION_SOURCE_SETTINGS');
      return;
    }
  } catch {
    // fall through to the app's settings
  }
  await Linking.openSettings();
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
    /** Metres; undefined when the device does not say. */
    accuracy: location.coords.accuracy ?? undefined,
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
 * Reverse geocoding for a device that has no geocoder of its own (a browser, or an Android phone without Google services): the same
 * OpenStreetMap Nominatim service the place search already uses. Only asked when the device's own geocoder found nothing usable.
 * Null on any failure.
 */
export type PlaceDetails = {
  area?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pincode?: string;
  fullAddress?: string;
};

const reverseGeocodeOnline = async (latitude: number, longitude: number): Promise<PlaceDetails | null> => {
  try {
    // Plain fetch on purpose: a third-party geocoder, not our API (ApiService would send our auth header to it).
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&addressdetails=1&zoom=18&lat=${latitude}&lon=${longitude}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const row = (await res.json()) as { address?: Record<string, string | undefined> };
    const a = row.address ?? {};
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? '';
    const area = a.suburb ?? a.neighbourhood ?? a.city_district ?? a.road ?? '';
    if (!city && !a.postcode) return null;
    return {
      area,
      city,
      district: a.city_district ?? '',
      state: a.state ?? '',
      country: a.country ?? '',
      pincode: normalizePincode(a.postcode),
      fullAddress: [area, city, a.state, a.country].filter(Boolean).join(', '),
    };
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
): Promise<PlaceDetails> => {
  try {
    let geo: Location.LocationGeocodedAddress | undefined;
    try {
      [geo] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
    } catch {
      // No geocoder on this device: the online lookup below.
    }
    if (!geo || (!geo.city && !geo.postalCode)) {
      const online = await reverseGeocodeOnline(latitude, longitude);
      if (online) return online;
    }

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
      pincode: normalizePincode(geo?.postalCode),
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

export type DevicePosition = { latitude: number; longitude: number; accuracy: number | null };

/** A GPS fix less accurate than this (metres) is not used as the location (the backend refuses it as an address too). */
export const MAX_GPS_ACCURACY_METERS = 500;

export type PositionResult =
  | { status: 'ok'; position: DevicePosition }
  | { status: 'denied' | 'services_off' | 'timeout' | 'error' | 'inaccurate' };

const withTimeout = <T>(work: Promise<T>, ms: number): Promise<T | 'timeout'> =>
  Promise.race([work, new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), ms))]);

/**
 * The device position for the automatic location (useAutoLocation). It never asks for permission and never throws: the
 * reason it could not get a position comes back as the status. A recent, accurate last-known fix is used as it is (no GPS
 * start-up); otherwise one fresh balanced-accuracy fix is requested, with a timeout.
 */
export const getDevicePosition = async ({
  maxAgeMs = 5 * 60 * 1000,
  maxAccuracyMeters = MAX_GPS_ACCURACY_METERS,
  timeoutMs = 10000,
}: { maxAgeMs?: number; maxAccuracyMeters?: number; timeoutMs?: number } = {}): Promise<PositionResult> => {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') return { status: 'denied' };
    if (!(await Location.hasServicesEnabledAsync())) return { status: 'services_off' };

    const toPosition = (p: Location.LocationObject): PositionResult => ({
      status: 'ok',
      position: { latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy ?? null },
    });

    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: maxAgeMs, requiredAccuracy: maxAccuracyMeters });
      if (last) return toPosition(last);
    } catch {
      // No last-known fix on this device: ask for a fresh one below.
    }

    const fresh = await withTimeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeoutMs);
    if (fresh === 'timeout') return { status: 'timeout' };
    // A fix that is too rough (a cell-tower guess indoors) must not become the location: the next refresh tries again.
    if (fresh.coords.accuracy != null && fresh.coords.accuracy > maxAccuracyMeters) return { status: 'inaccurate' };
    return toPosition(fresh);
  } catch {
    return { status: 'error' };
  }
};

/** Metres between two coordinates (haversine): enough to tell "moved" from GPS wobble. */
export const distanceMeters = (
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
};

/** The short place text shown in the location row: "Indiranagar, Bengaluru" (or the longer address when there is no area / city). */
export const placeLabel = (a: { area?: string; city?: string; fullAddress?: string }) =>
  [a.area, a.city].filter(Boolean).join(', ') || a.fullAddress || '';

/** Reverse geocoding with a time limit (the platform geocoder can stall); null when it times out. */
export const getPlaceFromCoords = async (latitude: number, longitude: number, timeoutMs = 6000) => {
  const place = await withTimeout(getAddressFromCoords(latitude, longitude), timeoutMs);
  return place === 'timeout' ? null : place;
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
    // Plain fetch on purpose: a third-party geocoder, not our API (ApiService would send our auth header to it).
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
