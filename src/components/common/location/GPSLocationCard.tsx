import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useGPSLocation } from '../../../hooks/useGPSLocation'

export const GPSLocationCard = () => {
  const {
    coordinates,
    gpsLoading,
    gpsError,
    isTracking,
    startTracking,
    stopTracking,
  } = useGPSLocation();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📍 Your Location</Text>

      {coordinates && isTracking ? (
        <View style={styles.card}>
          
          {/* 🔴 Live Indicator */}
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live Tracking</Text>

            <TouchableOpacity style={styles.stopBtn} onPress={stopTracking}>
              <Text style={styles.stopText}>Stop</Text>
            </TouchableOpacity>
          </View>

          {/* 📌 Location Details */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              📍 <Text style={styles.bold}>Area:</Text> {coordinates.area}
            </Text>

            <Text style={styles.infoText}>
              🏙 <Text style={styles.bold}>City:</Text> {coordinates.city}
            </Text>

           
            <Text style={styles.infoText}>
              🌎 <Text style={styles.bold}>State:</Text> {coordinates.state}
            </Text>
          </View>

          {/* 📊 Coordinates */}
          <View style={styles.coordBox}>
            <Text style={styles.coordText}>
              Lat: {coordinates.latitude.toFixed(5)}
            </Text>
            <Text style={styles.coordText}>
              Lng: {coordinates.longitude.toFixed(5)}
            </Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.detectBtn}
          onPress={startTracking}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.detectText}>📡 Detect My Location</Text>
          )}
        </TouchableOpacity>
      )}

      {gpsError ? <Text style={styles.error}>{gpsError}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1a1a1a",
  },

  /* Card */
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    elevation: 4, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  /* Live Row */
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  liveDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22c55e",
    marginRight: 6,
  },

  liveText: {
    flex: 1,
    fontWeight: "600",
    color: "#22c55e",
  },

  stopBtn: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  stopText: {
    color: "#dc2626",
    fontWeight: "600",
  },

  /* Info */
  infoContainer: {
    marginBottom: 12,
    gap: 4,
  },

  infoText: {
    fontSize: 13,
    color: "#444",
  },

  bold: {
    fontWeight: "700",
    color: "#000",
  },

  /* Coordinates */
  coordBox: {
    backgroundColor: "#f0f9f7",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  coordText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2e7d74",
  },

  /* Detect Button */
  detectBtn: {
    backgroundColor: "#2e7d74",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  detectText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  /* Error */
  error: {
    color: "#dc2626",
    marginTop: 6,
    fontSize: 12,
  },
});