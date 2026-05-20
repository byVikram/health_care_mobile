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
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
import { AppModal } from "../../components/common/AppModal";
import { createAppointment } from "../doctor/doctorService";
import PreIntakeModal, {
  type PreIntakeSeverity,
} from "../patient/components/PreIntakeModal";
import type { AppStackParamList } from "../../navigation/types";
import { ROUTES } from "../../navigation/routes";

type PaymentIconProps = {
  SvgComponent: any;
  bordered?: boolean;
};

type BookedAppointmentMode = "clinic_visit" | "video_call";

type BookedAppointmentStatus = "pending" | string;

type BookedAppointmentDoctor = {
  id: string;
  name: string;
};

type BookedAppointmentPatient = {
  id: string;
  name: string;
  avatar_s3_key: string | null;
  gender: string;
  age: number;
};

type BookedAppointmentHospital = {
  id: string;
  name: string;
  address: string;
};

type BookedAppointment = {
  id: string;
  appointment_mode: BookedAppointmentMode;
  appointment_date: string;
  start_time: string;
  end_time: string;
  fees: number;
  created_at: string;
  status: BookedAppointmentStatus;
  doctor: BookedAppointmentDoctor;
  patient: BookedAppointmentPatient;
  hospital: BookedAppointmentHospital;
};

type BookAppointmentResponse = {
  success: boolean;
  message: string;
  data: BookedAppointment;
};

const PaymentIcon = ({ SvgComponent, bordered = false }: PaymentIconProps) => (
  <View style={[styles.iconWrapper, bordered && styles.iconBordered]}>
    <SvgComponent width={24} height={24} />
  </View>
);

const doctorImagePlaceholder = require("../../assets/Banner/doctor.png");

const normalizeBookedAppointmentMode = (mode: unknown): BookedAppointmentMode =>
  mode === "video_call" ? "video_call" : "clinic_visit";

const mapBookAppointmentResponse = (response: unknown): BookAppointmentResponse => {
  const raw = response as {
    success?: boolean;
    message?: string;
    data?: Partial<BookedAppointment>;
  };
  const data = raw.data || {};

  return {
    success: raw.success === true,
    message: raw.message || "",
    data: {
      id: String(data.id || ""),
      appointment_mode: normalizeBookedAppointmentMode(data.appointment_mode),
      appointment_date: String(data.appointment_date || ""),
      start_time: String(data.start_time || ""),
      end_time: String(data.end_time || ""),
      fees: Number(data.fees || 0),
      created_at: String(data.created_at || ""),
      status: String(data.status || "pending"),
      doctor: {
        id: String(data.doctor?.id || ""),
        name: String(data.doctor?.name || ""),
      },
      patient: {
        id: String(data.patient?.id || ""),
        name: String(data.patient?.name || ""),
        avatar_s3_key: data.patient?.avatar_s3_key || null,
        gender: String(data.patient?.gender || ""),
        age: Number(data.patient?.age || 0),
      },
      hospital: {
        id: String(data.hospital?.id || ""),
        name: String(data.hospital?.name || ""),
        address: String(data.hospital?.address || ""),
      },
    },
  };
};

const formatAppointmentMode = (mode: string) =>
  mode === "video_call" ? "Video Call" : "Clinic Visit";

const formatTimeRange = (start?: string, end?: string) => {
  if (start && end) return `${start} - ${end}`;
  return start || "";
};

const paymentMethods = [
  { id: "phonepe", name: "Phone Pe", Svg: PhonePeSvg, bordered: false },
  { id: "gpay", name: "Google Pay", Svg: GooglePaySvg, bordered: false },
  { id: "paytm", name: "Paytm", Svg: PaytmSvg, bordered: false },
  { id: "amazon", name: "Amazon Pay", Svg: AmazonPaySvg, bordered: false },
  { id: "card", name: "Credit Card", Svg: CreditCardSvg, bordered: false },
  { id: "cash", name: "Cash On Visit", Svg: CashSvg, bordered: false },
];

const getPatientToken = async () => {
  const entries = await AsyncStorage.multiGet([
    "patient_token",
    "access_token",
    "role",
    "user",
  ]);
  const [source, token] =
    entries
      .filter(([key]) => key === "patient_token" || key === "access_token")
      .find(([, value]) => Boolean(value)) || [null, null];
  const storedRole = entries.find(([key]) => key === "role")?.[1] || null;
  const storedUser = entries.find(([key]) => key === "user")?.[1] || null;

  console.log("[PatientPayment] AsyncStorage token values", {
    patient_token: entries.find(([key]) => key === "patient_token")?.[1] || null,
    access_token: entries.find(([key]) => key === "access_token")?.[1] || null,
    role: storedRole,
    user: storedUser,
    selectedSource: source,
    selectedToken: token,
  });

  return { source, token, storedRole, storedUser };
};

const decodeBase64Url = (value: string) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  );
  let output = "";

  for (let block = 0, charCode = 0, idx = 0, map = chars; padded.charAt(idx | 0);) {
    const currentChar = padded.charAt(idx++);
    const currentValue = map.indexOf(currentChar);
    if (currentValue < 0) continue;
    charCode = block % 4 ? charCode * 64 + currentValue : currentValue;
    if (block++ % 4) {
      output += String.fromCharCode(255 & (charCode >> ((-2 * block) & 6)));
    }
  }

  return decodeURIComponent(
    output
      .split("")
      .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("")
  );
};

const decodeJwtPayload = (token: string) => {
  try {
    const payload = token.split(".")[1];
    return payload ? JSON.parse(decodeBase64Url(payload)) : null;
  } catch (error) {
    console.log("[PatientPayment] Failed to decode JWT payload", error);
    return null;
  }
};

const getTokenDiagnostics = (token: string) => {
  const payload = decodeJwtPayload(token);
  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  const expiresAt = exp ? new Date(exp * 1000).toISOString() : null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const role =
    payload?.role ||
    payload?.user?.role ||
    payload?.user_role ||
    payload?.account_type ||
    null;

  return {
    payload,
    exp,
    expiresAt,
    now: new Date().toISOString(),
    isExpired: exp ? exp <= nowSeconds : null,
    role,
    isPatientRole: typeof role === "string" ? role.toLowerCase() === "patient" : null,
  };
};

export default function BookingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
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
  const [bookedAppointment, setBookedAppointment] =
    useState<BookedAppointment | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [symptoms, setSymptoms] = useState("");
  const [duration, setDuration] = useState("");
  const [severity, setSeverity] = useState<PreIntakeSeverity>("");

  const bookingDoctorName = bookedAppointment?.doctor.name || doctor?.name || "";
  const bookingHospitalName =
    bookedAppointment?.hospital.name || hospitalName || "";
  const bookingHospitalAddress = bookedAppointment?.hospital.address || "";
  const bookingDate =
    bookedAppointment?.appointment_date || appointmentDateDisplay || appointmentDate;
  const bookingTime = bookedAppointment
    ? formatTimeRange(bookedAppointment.start_time, bookedAppointment.end_time)
    : startTimeDisplay;
  const bookingType = bookedAppointment
    ? formatAppointmentMode(bookedAppointment.appointment_mode)
    : consultationTypeLabel;
  const bookingFee = bookedAppointment?.fees ?? fee;
  const bookingStatus = bookedAppointment?.status || "";
  const totalPayable = bookingFee; // assuming no extra tax/fee

  const handleConfirm = async () => {
    if (!doctor || !hospitalId || !appointmentDate || !startTime) {
      Alert.alert("Error", "Missing booking information");
      return;
    }

    setIsBooking(true);
    try {
      const patientTokenInfo = await getPatientToken();
      const patientToken = patientTokenInfo.token;

      if (!patientToken) {
        Alert.alert("Error", "Patient session expired. Please log in again.");
        return;
      }

      const authorizationHeader = `Bearer ${patientToken}`;
      console.log("[PatientPayment] token diagnostics", {
        source: patientTokenInfo.source,
        token: patientToken,
        authorizationHeader,
        diagnostics: getTokenDiagnostics(patientToken),
        asyncStorageRole: patientTokenInfo.storedRole,
        asyncStorageUser: patientTokenInfo.storedUser,
        asyncStorageRoleIsPatient:
          patientTokenInfo.storedRole?.toLowerCase() === "patient",
      });

      console.log("BOOKING PAYLOAD =>", {
        doctor_id: doctor.id,
        hospital_id: hospitalId,
        appointment_mode:
          appointmentMode === "offline"
            ? "clinic_visit"
            : "video_call",
        appointment_date: appointmentDate,
        start_time: startTime,
      });

      console.log("[PatientPayment] Authorization header before API call", {
        Authorization: authorizationHeader,
        webComparison:
          "React web booking expected header is the same shape: Authorization: Bearer <localStorage access_token>.",
      });

      const res = await createAppointment({
        doctor_id: doctor.id,
        hospital_id: hospitalId,
        appointment_mode: appointmentMode === "offline" ? "clinic_visit" : "video_call",
        appointment_date: appointmentDate,
        start_time: startTime,
      }, patientToken);
      console.log("[PatientPayment] booking API response", res);
      const bookingResponse = mapBookAppointmentResponse(res);

      if (bookingResponse.success) {
        const appointment = bookingResponse.data;
        setBookedAppointment(appointment);
        setSuccessOpen(true);
      } else {
        Alert.alert(
          "Error",
          bookingResponse.message || "Failed to book appointment"
        );
      }
    } catch (error: any) {
      console.log(
        "BOOKING ERROR =>",
        error?.response?.status,
        error?.response?.data
      );

      console.log("[PatientPayment] booking API error details", {
        message: error?.message,
        responseStatus: error?.response?.status,
        responseData: error?.response?.data,
        requestHeaders: error?.config?.headers || error?.response?.config?.headers,
      });

      console.error(error);

      Alert.alert(
        "Error",
        error?.response?.data?.message ||
          "An error occurred while booking. Please try again."
      );
    } finally {
      setIsBooking(false);
    }
  };

  const openSymptomsForm = () => {
    setSuccessOpen(false);
    setSymptomsOpen(true);
  };

  const closeSymptomsForm = () => {
    setSymptomsOpen(false);
    navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: doctor.id });
  };

  const handleSubmitSymptoms = async () => {
    const storageKey = `symptoms_${doctor.id}_${appointmentDate}_${startTime}`;
    await AsyncStorage.setItem(
      storageKey,
      JSON.stringify({ symptoms, duration, severity })
    );
    closeSymptomsForm();
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
              <Text style={styles.doctorName}>{bookingDoctorName}</Text>
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
            <Text style={styles.infoValue}>{bookingDate}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <ClockSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Time :</Text>
            </View>
            <Text style={styles.infoValue}>{bookingTime}</Text>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <HomeSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Type :</Text>
            </View>
            <Text style={styles.infoValue}>{bookingType}</Text>
          </View>

          {bookedAppointment ? (
            <>
              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <ClockSvg width={14} height={14} />
                  <Text style={styles.infoLabel}> Status :</Text>
                </View>
                <Text style={[styles.infoValue, styles.statusText]}>
                  {bookingStatus}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoLeft}>
                  <ClockSvg width={14} height={14} />
                  <Text style={styles.infoLabel}> Booking ID :</Text>
                </View>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {bookedAppointment.id}
                </Text>
              </View>
            </>
          ) : null}

          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <LocationSvg width={14} height={14} />
              <Text style={styles.infoLabel}> Location :</Text>
            </View>
            <View style={styles.divider} />
            <Text style={styles.infoValue}>
              {bookingHospitalAddress
                ? `${bookingHospitalName}, ${bookingHospitalAddress}`
                : bookingHospitalName}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Bill Details</Text>

          <View style={styles.billRow}>
            <Text style={styles.billText}>Consultation fee :</Text>
            <View style={styles.divider} />
            <Text style={styles.billText}>₹ {bookingFee}</Text>
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
            <Text style={styles.confirmText}>Confirm {bookingType}</Text>
          )}
        </TouchableOpacity>
      </View>

      <AppModal
        visible={successOpen}
        onDismiss={openSymptomsForm}
      >
        <View
          style={[styles.successContent, isTablet && styles.successContentTablet]}
        >
          <View style={styles.successIconCircle}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={34}
              color="#fff"
            />
          </View>

          <Text style={styles.successTitle}>
            Your appointment is successfully booked
          </Text>
          <Text style={styles.successDescription}>
            The update will appear in your profile.
          </Text>

          <TouchableOpacity
            style={styles.successDoneButton}
            onPress={openSymptomsForm}
            activeOpacity={0.85}
          >
            <Text style={styles.successDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </AppModal>

      <PreIntakeModal
        visible={symptomsOpen}
        symptoms={symptoms}
        duration={duration}
        severity={severity}
        onSymptomsChange={setSymptoms}
        onDurationChange={setDuration}
        onSeverityChange={setSeverity}
        onSkip={closeSymptomsForm}
        onSubmit={handleSubmitSymptoms}
      />
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
    flexShrink: 1,
    marginLeft: 12,
    textAlign: "right",
  },
  statusText: {
    color: "#B26A00",
    fontWeight: "700",
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
  successContent: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  successContentTablet: {
    maxWidth: 420,
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#2B6F71",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#2B6F71",
    shadowOpacity: 0.34,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  successTitle: {
    color: "#222",
    fontSize: 20,
    lineHeight: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
  },
  successDescription: {
    color: "#667085",
    fontSize: 14,
    lineHeight: 23,
    textAlign: "center",
    marginBottom: 24,
  },
  successDoneButton: {
    width: "100%",
    maxWidth: 280,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: "#2B7A78",
    alignItems: "center",
    justifyContent: "center",
  },
  successDoneText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
