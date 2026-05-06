import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PhonePeSvg from "../../assets/Payment/phonepe.svg";
import GooglePaySvg from "../../assets/Payment/googlepay.svg";
import PaytmSvg from "../../assets/Payment/paytm.svg";
import AmazonPaySvg from "../../assets/Payment/amazonpay.svg";
import CreditCardSvg from "../../assets/Payment/creditcard.svg";
import CashSvg from "../../assets/Payment/cash.svg";
import WhatsappSvg from "../../assets/Payment/whatsapp.svg";
import DateSvg from "../../assets/Payment/date.svg";
import ClockSvg from "../../assets/Payment/clock.svg";
import HomeSvg from "../../assets/Payment/home.svg";
import LocationSvg from "../../assets/Payment/location.svg";
import ArrowIcon from "../../assets/Settings/arrow.svg";
import AppPayment from "../../components/common/AppPayment";
import { createAppointment } from "../doctor/doctorService";
import type { AppStackParamList } from "../../navigation/types";
import { ROUTES } from "../../navigation/routes";

type PaymentIconProps = {
  SvgComponent: any;
  bordered?: boolean;
};

const PaymentIcon = ({ SvgComponent, bordered = false }: PaymentIconProps) => (
  <View style={[styles.iconWrapper, bordered && styles.iconBordered]}>
    <SvgComponent width={24} height={24} />
  </View>
);

const doctorImagePlaceholder = require("../../assets/Banner/doctor.png");

const paymentMethods = [
  { id: "phonepe", name: "Phone Pe", Svg: PhonePeSvg, bordered: false },
  { id: "gpay", name: "Google Pay", Svg: GooglePaySvg, bordered: false },
  { id: "paytm", name: "Paytm", Svg: PaytmSvg, bordered: false },
  { id: "amazon", name: "Amazon Pay", Svg: AmazonPaySvg, bordered: false },
  { id: "card", name: "Credit Card", Svg: CreditCardSvg, bordered: false },
  { id: "cash", name: "Cash On Visit", Svg: CashSvg, bordered: false },
];

export default function BookingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const route =
    useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_PAYMENT>>();

  // Get booking params (passed from DoctorDetailPage)
  const params = route.params;
  const doctor = params?.doctor;
  const hospitalId = params?.hospitalId || "";
  const hospitalName = params?.hospitalName || "";
  const appointmentDate = params?.appointmentDate || "";
  const appointmentDateDisplay = params?.appointmentDateDisplay || "";
  const startTime = params?.startTime || "";
  const startTimeDisplay = params?.startTimeDisplay || "";
  const appointmentMode = params?.appointmentMode || "offline";
  const consultationTypeLabel = params?.consultationTypeLabel || "Clinic Visit";
  const fee = params?.fee || 0;

  const [paymentType, setPaymentType] = useState<"now" | "later">("now");
  const [selectedMethod, setSelectedMethod] = useState("phonepe");
  const [whatsappNotify, setWhatsappNotify] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const totalPayable = fee; // assuming no extra tax/fee

  const handleConfirm = async () => {
    if (!doctor || !hospitalId || !appointmentDate || !startTime) {
      Alert.alert("Error", "Missing booking information");
      return;
    }

    setIsBooking(true);
    try {
      const res = await createAppointment({
        doctor_id: doctor.id,
        hospital_id: hospitalId,
        appointment_mode: appointmentMode === "offline" ? "offline" : "online",
        appointment_date: appointmentDate,
        start_time: startTime,
      });

      if (res.success) {
        Alert.alert(
          "Success",
          `Appointment booked with ${doctor.name} on ${appointmentDateDisplay} at ${startTimeDisplay}`,
          [
            {
              text: "OK",
              onPress: () => navigation.navigate(ROUTES.MAIN.TABS),
            },
          ]
        );
      } else {
        Alert.alert("Error", res.message || "Failed to book appointment");
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", "An error occurred while booking. Please try again.");
    } finally {
      setIsBooking(false);
    }
  };

  // If params are missing (user directly opened this screen), show error
  if (!doctor) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No booking information found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.errorBack}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUrl = doctor.details?.avatar_s3_key || doctorImagePlaceholder;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#2B7A78" />

      {/* Header */}
      <View style={[styles.headerWrapper, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowIcon width={22} height={22} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* Booking Card */}
        <View style={styles.card}>
          <View style={styles.doctorRow}>
            <Image
              source={{ uri: avatarUrl }}
              style={styles.doctorImage}
              resizeMode="cover"
              defaultSource={doctorImagePlaceholder}
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.speciality}>
                {doctor.specialities?.[0] || "Consultation"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <DateSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Date :</Text>
            </View>
            <Text style={styles.infoValue}>{appointmentDateDisplay}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <ClockSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Time :</Text>
            </View>
            <Text style={styles.infoValue}>{startTimeDisplay}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <HomeSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Type :</Text>
            </View>
            <Text style={styles.infoValue}>{consultationTypeLabel}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <LocationSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Location :</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.infoValue}>{hospitalName}</Text>
          </View>

          <Text style={styles.sectionTitle}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billText}>Consultation fee :</Text>
            <View style={styles.divider} />
            <Text style={styles.billText}>₹ {fee}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billText}>Service Fee & Tax</Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.strikeText}>₹ 30 </Text>
              <View style={styles.freeBadge}>
                <Text style={styles.freeText}>FREE</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.billRow}>
            <Text style={styles.totalText}>Total Payable</Text>
            <Text style={styles.totalText}>₹ {totalPayable}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          {/* Pay Later */}
          <TouchableOpacity
            style={styles.paymentRow}
            onPress={() => {
              setPaymentType("later");
              setSelectedMethod("");
            }}
          >
            <Text style={styles.paymentText}>Pay Later</Text>
            <View style={styles.radioOuter}>
              {paymentType === "later" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {/* Pay Now */}
          <TouchableOpacity
            style={styles.paymentRow}
            onPress={() => setPaymentType("now")}
          >
            <Text style={styles.paymentText}>Pay Now</Text>
            <View style={styles.radioOuter}>
              {paymentType === "now" && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {paymentType === "now" && (
            <>
              {paymentMethods.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.paymentRow}
                  onPress={() => setSelectedMethod(item.id)}
                >
                  <View style={styles.paymentLeft}>
                    <PaymentIcon
                      SvgComponent={item.Svg}
                      bordered={item.bordered}
                    />
                    <Text style={styles.paymentText}>{item.name}</Text>
                  </View>

                  <View style={styles.radioOuter}>
                    {selectedMethod === item.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <AppPayment />
            </>
          )}

          {/* WhatsApp Notification */}
          <View style={styles.whatsappBox}>
            <TouchableOpacity
              style={styles.whatsappRow}
              onPress={() => setWhatsappNotify(!whatsappNotify)}
            >
              <View style={styles.paymentLeft}>
                <WhatsappSvg width={24} height={24} />
                <Text style={styles.paymentText}>
                  Get notifications on WhatsApp
                </Text>
              </View>

              <View
                style={[
                  styles.checkbox,
                  whatsappNotify && styles.checkboxChecked,
                ]}
              >
                {whatsappNotify && <Text style={styles.checkmark}>✓</Text>}
              </View>
            </TouchableOpacity>

            <Text style={styles.subText}>
              Updates related to your appointment
            </Text>

            <View style={styles.innerDivider} />

            <Text style={styles.legalText}>
              • Updates will be sent to +91 7892500634
            </Text>
            <Text style={styles.legalText}>
              • By booking, you agree to Terms & Conditions
            </Text>
            <Text style={styles.legalText}>
              • You can pre-pay by selecting an online option
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.payNowAmount}>₹ {totalPayable}</Text>
          <Text style={styles.payNowLabel}>Pay Now</Text>
        </View>

        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          disabled={isBooking}
        >
          {isBooking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.confirmText}>Confirm Clinic Visit</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F8FA",
  },
  doctorImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  headerWrapper: {
    backgroundColor: "#2B7A78",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    marginTop: 8,
  },
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
  },
  speciality: {
    fontSize: 13,
    color: "#777",
    marginTop: 2,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  infoLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: "#666",
  },
  infoValue: {
    fontSize: 13,
    color: "#222",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222",
    marginTop: 14,
    marginBottom: 14,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  billText: {
    fontSize: 14,
    color: "#444",
  },
  strikeText: {
    fontSize: 12,
    color: "#aaa",
    textDecorationLine: "line-through",
  },
  freeBadge: {
    backgroundColor: "#E8F5E9",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freeText: {
    fontSize: 12,
    color: "#2E7D32",
    fontWeight: "700",
  },
  divider: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginVertical: 10,
  },
  totalText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  paymentLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  paymentText: {
    fontSize: 15,
    color: "#333",
  },
  iconWrapper: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  iconBordered: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2B7A78",
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#2B7A78",
  },
  whatsappBox: {
    borderWidth: 1,
    borderColor: "#D8D8D8",
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  whatsappRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#2B7A78",
  },
  checkboxChecked: {
    backgroundColor: "#2B7A78",
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    color: "#fff",
    fontWeight: "700",
  },
  subText: {
    fontSize: 12,
    color: "#888",
    marginTop: 6,
  },
  innerDivider: {
    borderTopWidth: 1,
    borderTopColor: "#eee",
    marginVertical: 10,
  },
  legalText: {
    fontSize: 11.5,
    color: "#999",
    lineHeight: 18,
    marginBottom: 4,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#EAEAEA",
  },
  payNowAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2B7A78",
  },
  payNowLabel: {
    fontSize: 13,
    color: "#888",
  },
  confirmBtn: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: "#2B7A78",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: "red",
    marginBottom: 16,
  },
  errorBack: {
    fontSize: 16,
    color: "#2B7A78",
    textDecorationLine: "underline",
  },
});