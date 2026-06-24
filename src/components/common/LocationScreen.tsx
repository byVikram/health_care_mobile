import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Keyboard,
  Animated,
  Platform,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getCurrentLocation,
  getAddressFromCoords,
} from '../../services/locationService';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface LatLng {
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    state?: string;
    country?: string;
  };
}

// ─────────────────────────────────────────────────────────────
// Nominatim search  (OpenStreetMap — 100% free, no API key)
// ─────────────────────────────────────────────────────────────

const searchNominatim = async (query: string): Promise<NominatimResult[]> => {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`;

  const res = await fetch(url, {
    headers: {
      // Nominatim requires a descriptive User-Agent
      'User-Agent': 'MyHealthApp/1.0 (contact@myhealthapp.com)',
      'Accept-Language': 'en',
    },
  });

  return res.json();
};

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function LocationScreen() {
  const insets = useSafeAreaInsets();

  // ── State ────────────────────────────────────────────────
  const [gpsLoading, setGpsLoading] = useState(false);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [mapVisible, setMapVisible] = useState(false);
  const mapHeight = useRef(new Animated.Value(0)).current;

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helpers ──────────────────────────────────────────────
  const showMap = () => {
    setMapVisible(true);
    Animated.spring(mapHeight, {
      toValue: 220,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
  };

  interface AddressResponse {
    area?: string;
    city?: string;
    district?: string;
    state?: string;
    country?: string;
    fullAddress?: string;
  }

  const resolveReadableAddress = (
    value: string | AddressResponse | null | undefined
  ) => {
    if (typeof value === 'string') return value;
    return value?.fullAddress ?? '';
  };

  const applyLocation = (
    position: LatLng,
    readable: string | AddressResponse | null | undefined
  ) => {
    setCoords(position);
    setAddress(resolveReadableAddress(readable));
    setSuggestions([]);
    setSearchText('');
    showMap();
  };

  // ── GPS ──────────────────────────────────────────────────
  const handleEnableLocation = async () => {
    try {
      setGpsLoading(true);
      const position = await getCurrentLocation();
      const readable = await getAddressFromCoords(
        position.latitude,
        position.longitude
      );
      applyLocation(position, readable);
    } catch (err: any) {
      console.warn('GPS error:', err?.message ?? err);
    } finally {
      setGpsLoading(false);
    }
  };

  // ── Nominatim search ─────────────────────────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const results = await searchNominatim(text);
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);
  }, []);

  const handleSelectSuggestion = (item: NominatimResult) => {
    Keyboard.dismiss();
    const position: LatLng = {
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
    };

    // Build a short readable label from the Nominatim address parts
    const { road, suburb, city, town, state } = item.address;
    const readable =
      [road, suburb, city ?? town, state]
        .filter(Boolean)
        .join(', ') || item.display_name;

    applyLocation(position, readable);
  };

  // ── Map interactions ─────────────────────────────────────
  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ latitude, longitude });
    const readable = await getAddressFromCoords(latitude, longitude);
    setAddress(resolveReadableAddress(readable));
  };

  const handleMarkerDragEnd = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setCoords({ latitude, longitude });
    const readable = await getAddressFromCoords(latitude, longitude);
    setAddress(resolveReadableAddress(readable));
  };

  // ── Confirm ──────────────────────────────────────────────
  const handleConfirm = () => {
    // Pass address + coords back to the app however you need
    console.log('Confirmed location:', address, coords);
  };

  // ── Map region ───────────────────────────────────────────
  const mapRegion: Region | undefined = coords
    ? {
        latitude: coords.latitude,
        longitude: coords.longitude,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      }
    : undefined;

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>

      {/* ── Teal header (matches screenshot) ───────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>What's your location?</Text>
        <Text style={styles.headerSub}>
          We need your location to find doctors available near you.
        </Text>
      </View>

      {/* ── White bottom card ───────────────────────────── */}
      <View style={styles.card}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardContent}
        >

          {/* Search box */}
          <View style={styles.searchBox}>
            <Text style={styles.searchIconText}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search location..."
              placeholderTextColor="#9CA3AF"
              value={searchText}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchLoading && (
              <ActivityIndicator size="small" color="#0c7c7c" />
            )}
          </View>

          {/* Nominatim suggestions dropdown */}
          {suggestions.length > 0 && (
            <View style={styles.dropdown}>
              {suggestions.map((item, idx) => {
                const { road, suburb, city, town, state } = item.address;
                const main = road ?? suburb ?? city ?? town ?? 'Location';
                const sub = [city ?? town, state].filter(Boolean).join(', ');

                return (
                  <TouchableOpacity
                    key={item.place_id}
                    style={[
                      styles.dropdownItem,
                      idx < suggestions.length - 1 && styles.dropdownDivider,
                    ]}
                    onPress={() => handleSelectSuggestion(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownPin}>📍</Text>
                    <View style={styles.dropdownTexts}>
                      <Text style={styles.dropdownMain} numberOfLines={1}>
                        {main}
                      </Text>
                      {sub.length > 0 && (
                        <Text style={styles.dropdownSub} numberOfLines={1}>
                          {sub}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Map preview — animates in after location set */}
          {mapVisible && mapRegion && (
            <Animated.View style={[styles.mapWrapper, { height: mapHeight }]}>
              <MapView
                style={StyleSheet.absoluteFillObject}
                region={mapRegion}
                onPress={handleMapPress}
              >
                <Marker
                  coordinate={coords!}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                  pinColor="#0c7c7c"
                />
              </MapView>
              <View style={styles.mapBadge}>
                <Text style={styles.mapBadgeText}>Drag pin to adjust</Text>
              </View>
            </Animated.View>
          )}

          {/* Address chip */}
          {address !== '' && (
            <View style={styles.addressChip}>
              <Text style={styles.addressChipIcon}>📌</Text>
              <Text style={styles.addressChipText} numberOfLines={2}>
                {address}
              </Text>
            </View>
          )}

          {/* Two action buttons — matches screenshot exactly */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.outlineBtn}
              onPress={() => {
                setSearchText('');
                setSuggestions([]);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.outlineBtnText}>Search location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.solidBtn}
              onPress={handleEnableLocation}
              disabled={gpsLoading}
              activeOpacity={0.85}
            >
              {gpsLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.solidBtnText}>Enable location</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm button — appears after location resolved */}
          {address !== '' && (
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>✓  Confirm this location</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0c7c7c',
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 44,
    alignItems: 'center',
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 19,
  },

  // ── Card ────────────────────────────────────────────────
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 10,
    overflow: 'hidden',
  },

  cardContent: {
    padding: 22,
    paddingBottom: 40,
  },

  // ── Search ──────────────────────────────────────────────
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    backgroundColor: '#F9FAFB',
    gap: 10,
    marginBottom: 4,
  },

  searchIconText: {
    fontSize: 15,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    padding: 0,
  },

  // ── Dropdown ────────────────────────────────────────────
  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    backgroundColor: '#fff',
    marginTop: 6,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },

  dropdownDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  dropdownPin: {
    fontSize: 15,
  },

  dropdownTexts: {
    flex: 1,
  },

  dropdownMain: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  dropdownSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },

  // ── Map ─────────────────────────────────────────────────
  mapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 16,
  },

  mapBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },

  mapBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },

  // ── Address chip ────────────────────────────────────────
  addressChip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FAF9',
    borderWidth: 1,
    borderColor: '#B2DFDB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },

  addressChipIcon: {
    fontSize: 15,
    marginTop: 1,
  },

  addressChipText: {
    flex: 1,
    fontSize: 14,
    color: '#065F46',
    fontWeight: '500',
    lineHeight: 20,
  },

  // ── Buttons ─────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },

  outlineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#0c7c7c',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },

  outlineBtnText: {
    color: '#0c7c7c',
    fontSize: 14,
    fontWeight: '600',
  },

  solidBtn: {
    flex: 1,
    backgroundColor: '#0c7c7c',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    shadowColor: '#0c7c7c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },

  solidBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  confirmBtn: {
    backgroundColor: '#111827',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },

  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});