import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  Linking,
} from "react-native";

import UpiIcon from "../../../assets/icons/upi.svg";

const UpiIconPayment = () => {
  const [loading, setLoading] = useState(false);

  const upiId = "uri@bank";
  const amount = "1.00";
  const payeeName = "Kruthi N L";
  const note = "Test Payment";

  const openUPIPayment = async () => {
    try {
      setLoading(true);

      const upiUrl =
        `upi://pay?pa=${upiId}` +
        `&pn=${encodeURIComponent(payeeName)}` +
        `&tn=${encodeURIComponent(note)}` +
        `&am=${amount}` +
        `&cu=INR`;

      await Linking.openURL(upiUrl);
    } catch (error) {
      Alert.alert("Payment Error", "Unable to open payment app");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.paymentRow}
      onPress={openUPIPayment}
      disabled={loading}
    >
      <View style={styles.leftSection}>
        <View style={styles.iconBox}>
          {loading ? (
            <ActivityIndicator size="small" />
          ) : (
            <UpiIcon width={26} height={26} />
          )}
        </View>

        <View>
          <Text style={styles.title}>UPI Payment</Text>
          <Text style={styles.subtitle}>Fast & secure payment</Text>
        </View>
      </View>

    </TouchableOpacity>
  );
};

export default UpiIconPayment;

const styles = StyleSheet.create({
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F4F8F8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },

  subtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },


});