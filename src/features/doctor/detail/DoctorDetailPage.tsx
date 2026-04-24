import React, { useEffect, useState } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Image,
	Platform,
	Alert,
} from "react-native";
import { useTheme } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import {
	AppButton,
	AppTypography,
	AppSkeleton,
	DateSlotPicker,
} from "../../../components/common";
import {
	getDoctorById,
	getDoctorAvailability,
	createAppointment,
	SlotGroup,
} from "../doctorService";
import {
	AppointmentType,
	DoctorDetailData,
} from "../../../types/doctor-detail";
import { ROUTES } from "../../../navigation/routes";
import type { AppStackParamList } from "../../../navigation/types";

export default function DoctorDetailPage() {
	const theme = useTheme();
	const navigation = useNavigation<NavigationProp<AppStackParamList>>();
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_DETAIL>>();

	const [doctor, setDoctor] = useState<DoctorDetailData | null>(null);
	const [loading, setLoading] = useState(true);

	// Form States
	const [selectedHospital, setSelectedHospital] = useState<string | null>(
		null,
	);
	const [apptType, setApptType] = useState<"offline" | "video" | null>(
		"offline",
	);
	const [selectedDate, setSelectedDate] = useState<Date>(new Date());
	const [selectedTime, setSelectedTime] = useState<string | null>(null);

	const [availableSlotGroups, setAvailableSlotGroups] = useState<SlotGroup[]>(
		[],
	);
	const [slotsLoading, setSlotsLoading] = useState(false);
	const [booking, setBooking] = useState(false);

	// Generate 7 days loosely for UI
	const dates = Array.from({ length: 7 }, (_, i) => {
		const d = new Date();
		d.setDate(d.getDate() + i);
		return {
			dateObj: d,
			id: i,
			dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
			dateNum: d.getDate(),
		};
	});

	const formatDateForApi = (date: Date) => {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const day = String(date.getDate()).padStart(2, "0");
		return `${year}-${month}-${day}`;
	};

	const formatTimeForApi = (timeLabel: string) => {
		const trimmed = timeLabel.trim().toUpperCase();
		const match = trimmed.match(/^(\d{1,2}):(\d{2})(AM|PM)$/);
		if (!match) return timeLabel;
		const [, hText, mText, suffix] = match;
		let hour = Number.parseInt(hText, 10);
		if (suffix === "PM" && hour !== 12) hour += 12;
		if (suffix === "AM" && hour === 12) hour = 0;
		return `${String(hour).padStart(2, "0")}:${mText}`;
	};

	useEffect(() => {
		const fetchDetail = async () => {
			if (!route.params?.id) return;
			try {
				const res = await getDoctorById(route.params.id);
				if (res.success && res.data) {
					setDoctor(res.data);
					if (res.data.hospitals?.length > 0) {
						setSelectedHospital(res.data.hospitals[0].hospital.id);
					}
				}
			} catch (error) {
				console.error("Error fetching doctor details:", error);
			} finally {
				setLoading(false);
			}
		};
		fetchDetail();
	}, [route.params?.id]);

	useEffect(() => {
		const id = route.params?.id;
		if (!id || !selectedHospital || !selectedDate) return;
		let active = true;

		const fetchAvailability = async () => {
			try {
				setSlotsLoading(true);
				const res = await getDoctorAvailability({
					doctor_id: id,
					hospital_id: selectedHospital,
					date: formatDateForApi(selectedDate),
				});
				if (!active) return;
				let processedData: SlotGroup[] = [];
				if (Array.isArray(res)) {
					processedData = res;
				} else if (res && Array.isArray(res.data)) {
					processedData = res.data;
				}
				setAvailableSlotGroups(processedData);
			} catch (err) {
				console.log(err);
				if (!active) return;
				setAvailableSlotGroups([]);
			} finally {
				if (active) {
					setSlotsLoading(false);
				}
			}
		};

		fetchAvailability();
		return () => {
			active = false;
		};
	}, [route.params?.id, selectedHospital, selectedDate]);

	const primaryHospital =
		doctor?.hospitals.find((h) => h.is_primary) ||
		(doctor?.hospitals.length ? doctor.hospitals[0] : null);

	const selectedHospitalEntry =
		doctor?.hospitals.find((h) => h.hospital.id === selectedHospital) ||
		primaryHospital;

	const appointmentTypes: AppointmentType[] = [
		{
			id: "clinic",
			label: "Clinic Visit",
			description: "In-person consultation",
			price: Number(selectedHospitalEntry?.offline_consultation_fee) || 0,
			duration: 30,
		},
		{
			id: "video",
			label: "Video Call",
			description: "Online consultation",
			price: Number(selectedHospitalEntry?.video_consultation_fee) || 0,
			duration: 30,
		},
	];

	if (loading) {
		return (
			<View style={[styles.container, { padding: 16 }]}>
				<AppSkeleton
					height={150}
					style={{ marginBottom: 16, marginTop: 40 }}
				/>
				<AppSkeleton height={100} style={{ marginBottom: 16 }} />
				<AppSkeleton height={300} style={{ marginBottom: 16 }} />
			</View>
		);
	}

	if (!doctor) {
		return (
			<View
				style={[
					styles.container,
					{ justifyContent: "center", alignItems: "center" },
				]}
			>
				<AppTypography>Doctor not found</AppTypography>
				<AppButton variant="text" onPress={() => navigation.goBack()}>
					Go Back
				</AppButton>
			</View>
		);
	}

	const { details, specialities, hospitals } = doctor;
	const avatarUrl =
		details?.avatar_s3_key || "https://via.placeholder.com/150";
	const availabilityLabel = "Available";
	const availabilityColor = "#19a55a";
	const availabilityIcon = "calendar-check";
	const profileHospitals = hospitals.slice(0, 2);

	return (
		<View style={styles.container}>
			<ScrollView
				style={styles.scrollArea}
				contentContainerStyle={{ paddingBottom: 100 }}
			>
				{/* Header Gradient / Background Placeholder */}
				<View style={styles.headerBackground}>
					<View style={styles.headerTop}>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<TouchableOpacity
								onPress={() => navigation.goBack()}
								style={{ padding: 8 }}
							>
								<MaterialCommunityIcons
									name="chevron-left"
									size={28}
									color="#fff"
								/>
							</TouchableOpacity>
							<AppTypography
								variant="h3"
								style={{ color: "#fff", marginLeft: 8 }}
							>
								Appointment
							</AppTypography>
						</View>
						<View
							style={{
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<TouchableOpacity style={{ padding: 8 }}>
								<MaterialCommunityIcons
									name="heart-outline"
									size={24}
									color="#fff"
								/>
							</TouchableOpacity>
							<TouchableOpacity style={{ padding: 8 }}>
								<MaterialCommunityIcons
									name="share-variant"
									size={24}
									color="#fff"
								/>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* Overhead Profile Card */}
				<View style={styles.profileCard}>
					<View style={styles.profileTopRow}>
						<View style={styles.avatarWrapper}>
							<Image
								source={{ uri: avatarUrl }}
								style={styles.avatar}
							/>
							<View style={styles.verifiedBadge}>
								<MaterialCommunityIcons
									name="check"
									size={12}
									color="#fff"
								/>
							</View>
						</View>
						<View style={styles.profileInfo}>
							<View
								style={{
									flexDirection: "row",
									justifyContent: "space-between",
									alignItems: "flex-start",
								}}
							>
								<View style={{ flex: 1 }}>
									<AppTypography
										variant="h3"
										style={styles.doctorName}
									>
										{doctor.name}
									</AppTypography>
									<AppTypography
										variant="caption"
										style={styles.doctorSpec}
									>
										{specialities?.[0] ||
											"Dentist Consultation"}
									</AppTypography>
								</View>
							</View>

							<View style={{ marginTop: 8 }}>
								{profileHospitals.length > 0 ? (
									profileHospitals.map((entry) => (
										<View
											key={entry.hospital.id}
											style={styles.locationRow}
										>
											<MaterialCommunityIcons
												name="map-marker"
												size={12}
												color="#2b7571"
											/>
											<AppTypography
												variant="caption"
												style={styles.locationText}
												numberOfLines={1}
											>
												{entry.hospital.name}
												{entry.hospital.address
													? `, ${entry.hospital.address}`
													: ""}
											</AppTypography>
											{entry.hospital.distance ? (
												<AppTypography
													variant="caption"
													style={styles.distanceText}
												>
													{entry.hospital.distance}
												</AppTypography>
											) : null}
										</View>
									))
								) : (
									<View style={styles.locationRow}>
										<MaterialCommunityIcons
											name="map-marker"
											size={12}
											color="#2b7571"
										/>
										<AppTypography
											variant="caption"
											style={styles.locationText}
											numberOfLines={1}
										>
											{details?.location || "Location not available"}
										</AppTypography>
									</View>
								)}
							</View>
						</View>
					</View>

					{/* Stats Metrics Row */}
					<View style={styles.statsRow}>
						<View style={styles.statBox}>
							<MaterialCommunityIcons
								name="briefcase-outline"
								size={22}
								color="#2b7571"
							/>
							<AppTypography
								variant="caption"
								style={styles.statVal}
							>
								{details?.experience_years
									? `${details.experience_years}+`
									: "--"}
							</AppTypography>
							<AppTypography
								variant="caption"
								style={styles.statLabel}
							>
								Experience
							</AppTypography>
						</View>

						<View style={styles.statsDivider} />

						<View style={styles.statBox}>
							<MaterialCommunityIcons
								name={availabilityIcon}
								size={22}
								color={availabilityColor}
							/>
							<View style={styles.availabilityValueRow}>
								<View
									style={[
										styles.availabilityDot,
										{ backgroundColor: availabilityColor },
									]}
								/>
								<AppTypography
									variant="caption"
									style={[
										styles.statVal,
										{ color: availabilityColor },
									]}
								>
									{availabilityLabel}
								</AppTypography>
							</View>
							<AppTypography
								variant="caption"
								style={styles.statLabel}
							>
								Availability
							</AppTypography>
						</View>
					</View>
				</View>

				{/* About Section */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						About
					</AppTypography>
					<AppTypography variant="caption" style={styles.aboutText}>
						{details?.about ||
							"Dr. Ashika rao is a highly experienced dentist and surgeon with over 10years of expertise in treating tooth and gum related issues Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua... "}
						<AppTypography
							variant="caption"
							style={{ color: "#2b7571", fontWeight: "bold" }}
						>
							Read more
						</AppTypography>
					</AppTypography>
				</View>

				<View style={styles.divider} />

				{/* Working Time */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Working Time
					</AppTypography>
					<AppTypography variant="caption" style={styles.greyText}>
						Mon-Fri, 09:00 AM - 10:30 PM
					</AppTypography>
				</View>

				<View style={styles.divider} />

				{/* Choose Hospital */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Choose Hospital
					</AppTypography>

					{hospitals && hospitals.length > 0 ? (
						hospitals.map((h, index) => {
							const isSelected =
								selectedHospital === h.hospital.id;
							return (
								<TouchableOpacity
									key={h.hospital.id}
									style={[
										styles.radioCard,
										isSelected && styles.radioCardSelected,
									]}
									onPress={() =>
										setSelectedHospital(h.hospital.id)
									}
									activeOpacity={0.7}
								>
									<View style={styles.hospitalNumIcon}>
										<AppTypography
											variant="caption"
											style={{
												color: "#fff",
												fontWeight: "bold",
											}}
										>
											{index + 1}
										</AppTypography>
									</View>
									<View style={{ flex: 1, marginLeft: 12 }}>
										<AppTypography
											variant="body"
											style={{
												fontWeight: "bold",
												color: "#333",
											}}
										>
											{h.hospital.name}
										</AppTypography>
										<AppTypography
											variant="caption"
											style={styles.greyText}
											numberOfLines={1}
										>
											{h.hospital.address}
										</AppTypography>
									</View>
									<View
										style={{
											flexDirection: "row",
											alignItems: "center",
										}}
									>
										<AppTypography
											variant="caption"
											style={styles.greyText}
										>
											{h.hospital.distance || ""}
										</AppTypography>
										<MaterialCommunityIcons
											name={
												isSelected
													? "circle-slice-8"
													: "circle-outline"
											}
											size={22}
											color={
												isSelected ? "#2b7571" : "#ccc"
											}
											style={{ marginLeft: 8 }}
										/>
									</View>
								</TouchableOpacity>
							);
						})
					) : (
						<AppTypography variant="caption">
							No hospitals listed
						</AppTypography>
					)}
				</View>

				{/* Type of Appointment */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionTitle}>
						Type of appointment
					</AppTypography>

					{appointmentTypes.map((type) => {
						const isSelected =
							(apptType === "offline" && type.id === "clinic") ||
							(apptType === "video" && type.id === "video");

						return (
							<TouchableOpacity
								key={type.id}
								style={[
									styles.radioCard,
									isSelected && styles.radioCardSelected,
								]}
								// onPress={() => setApptType(type.id)}
								onPress={() =>
									setApptType(type.id === "clinic" ? "offline" : "video")
								}
								activeOpacity={0.7}
							>
								{/* Icon */}
								<View
									style={[
										styles.typeIconBox,
										{
											backgroundColor:
												type.id === "clinic"
													? "#e8faee"
													: "#e6f0ff",
										},
									]}
								>
									<MaterialCommunityIcons
										name={
											type.id === "clinic"
												? "home-plus"
												: "video"
										}
										size={24}
										color={
											type.id === "clinic"
												? "#00a82d"
												: "#0066ff"
										}
									/>
								</View>

								{/* Text */}
								<View style={{ flex: 1, marginLeft: 12 }}>
									<AppTypography
										variant="body"
										style={{
											fontWeight: "bold",
											color: "#333",
										}}
									>
										{type.label}
									</AppTypography>
									<AppTypography
										variant="caption"
										style={styles.greyText}
									>
										{type.description}
									</AppTypography>
								</View>

								{/* Price + Radio */}
								<View
									style={{
										flexDirection: "row",
										alignItems: "center",
									}}
								>
									<AppTypography
										variant="caption"
										style={{
											color: "#333",
											textAlign: "right",
										}}
									>
										₹ {type.price}/{"\n"}
										{type.duration}min
									</AppTypography>

									<MaterialCommunityIcons
										name={
											isSelected
												? "circle-slice-8"
												: "circle-outline"
										}
										size={22}
										color={isSelected ? "#2b7571" : "#ccc"}
										style={{ marginLeft: 8 }}
									/>
								</View>
							</TouchableOpacity>
						);
					})}
				</View>

				<DateSlotPicker
					selectedDate={selectedDate}
					onDateChange={(date) => {
						setSelectedDate(date);
						setSelectedTime("");
					}}
					selectedTime={selectedTime}
					onTimeChange={setSelectedTime}
					availableSlots={availableSlotGroups}
					loading={slotsLoading}
				/>
			</ScrollView>

			{/* Bottom Sticky Button */}
			<View style={styles.bottomBar}>
				<AppButton
					variant="primary"
					style={styles.bookButton}
					loading={booking}
					disabled={!selectedTime || !selectedHospital}
					onPress={async () => {
						if (!doctor || !selectedTime || !selectedHospital)
							return;
						setBooking(true);
						try {
							const res = await createAppointment({
								doctor_id: doctor.id,
								hospital_id: selectedHospital,
								appointment_mode:
									apptType === "offline"
										? "offline"
										: "online",
								appointment_date:
									formatDateForApi(selectedDate),
								start_time: formatTimeForApi(selectedTime),
							});
							if (res.success) {
								Alert.alert(
									"Success",
									`Appointment booked with ${doctor.name} on ${selectedDate.toDateString()} at ${selectedTime}`,
								);
								navigation.goBack();
							} else {
								Alert.alert(
									"Error",
									"Failed to book appointment: " +
									(res.message || "Unknown error"),
								);
							}
						} catch (err: any) {
							console.error(err);
							Alert.alert(
								"Error",
								"An error occurred while booking. Please try again.",
							);
						} finally {
							setBooking(false);
							setSelectedTime(null);
						}
					}}
				>
					{selectedTime
						? `Book at ${selectedTime}`
						: "Select a Time Slot"}
				</AppButton>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fafafa",
	},
	scrollArea: {
		flex: 1,
	},
	headerBackground: {
		backgroundColor: "#568b8b",
		height: 180,
		paddingTop: Platform.OS === "ios" ? 50 : 30,
		paddingHorizontal: 16,
	},
	headerTop: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
	},
	profileCard: {
		backgroundColor: "#fff",
		borderRadius: 16,
		marginHorizontal: 16,
		marginTop: -60,
		padding: 16,
		elevation: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	profileTopRow: {
		flexDirection: "row",
		marginBottom: 16,
	},
	avatarWrapper: {
		position: "relative",
		marginRight: 16,
	},
	avatar: {
		width: 65,
		height: 65,
		borderRadius: 12,
		backgroundColor: "#eee",
	},
	verifiedBadge: {
		position: "absolute",
		top: -4,
		right: -4,
		backgroundColor: "#2b7571",
		borderRadius: 10,
		padding: 2,
	},
	profileInfo: {
		flex: 1,
	},
	doctorName: {
		fontWeight: "bold",
		color: "#333",
		fontSize: 16,
	},
	doctorSpec: {
		color: "#888",
		marginTop: 2,
	},
	locationRow: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 4,
	},
	locationText: {
		color: "#888",
		marginLeft: 4,
		flex: 1,
	},
	distanceText: {
		color: "#2b7571",
		fontWeight: "bold",
	},
	statsRow: {
		flexDirection: "row",
		alignItems: "stretch",
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
		paddingTop: 16,
	},
	statBox: {
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		minHeight: 72,
		paddingHorizontal: 10,
	},
	statsDivider: {
		width: 1,
		backgroundColor: "#edf1f1",
		marginHorizontal: 8,
	},
	statVal: {
		fontWeight: "bold",
		color: "#333",
		marginTop: 4,
		fontSize: 11,
	},
	statLabel: {
		color: "#888",
		fontSize: 9,
	},
	availabilityValueRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		marginTop: 4,
	},
	availabilityDot: {
		width: 7,
		height: 7,
		borderRadius: 4,
		marginRight: 5,
	},
	section: {
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	sectionTitle: {
		color: "#333",
		fontWeight: "bold",
		marginBottom: 8,
	},
	aboutText: {
		color: "#666",
		lineHeight: 18,
	},
	divider: {
		height: 1,
		backgroundColor: "#f0f0f0",
		marginHorizontal: 16,
	},
	greyText: {
		color: "#888",
	},
	radioCard: {
		flexDirection: "row",
		alignItems: "center",
		padding: 12,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		borderRadius: 8,
		marginBottom: 8,
		backgroundColor: "#fff",
	},
	radioCardSelected: {
		borderColor: "#2b7571",
		backgroundColor: "#f7fcfc",
	},
	hospitalNumIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: "#2b7571",
		justifyContent: "center",
		alignItems: "center",
	},
	typeIconBox: {
		width: 44,
		height: 44,
		borderRadius: 8,
		justifyContent: "center",
		alignItems: "center",
	},
	dateBox: {
		width: 50,
		height: 65,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: "#e0e0e0",
		justifyContent: "center",
		alignItems: "center",
		marginRight: 8,
		backgroundColor: "#fff",
	},
	dateBoxSelected: {
		backgroundColor: "#2b7571",
		borderColor: "#2b7571",
	},
	dayName: {
		color: "#5b7282",
		marginBottom: 4,
	},
	dateNum: {
		fontWeight: "bold",
		color: "#333",
	},
	// Updated time-related styles with proper gaps
	timeGrid: {
		marginTop: 8,
	},
	timeGroupContainer: {
		marginBottom: 24,
	},
	timeGroupLabel: {
		fontSize: 14,
		fontWeight: "600",
		color: "#333",
		marginBottom: 12,
	},
	slotsGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		rowGap: 12, // Row gap between time slots
		columnGap: 8, // Column gap between time slots
	},
	timeBox: {
		width: "23%", // 4 items per row with gaps (23% + gap space)
		minWidth: 70, // Minimum width for better appearance on smaller screens
		borderWidth: 1,
		borderColor: "#d0d0d0",
		borderRadius: 20,
		paddingVertical: 10,
		paddingHorizontal: 4,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#fff",
	},
	timeBoxSelected: {
		backgroundColor: "#568b8b",
		borderColor: "#568b8b",
	},
	timeBoxDisabled: {
		opacity: 0.5,
		backgroundColor: "#f0f0f0",
	},
	timeText: {
		color: "#555",
		fontSize: 12,
	},
	timeTextSelected: {
		color: "#fff",
		fontWeight: "bold",
	},
	timeTextDisabled: {
		color: "#a0a0a0",
		// textDecorationLine: 'line-through',
	},
	bottomBar: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: "#fff",
		padding: 16,
		paddingBottom: Platform.OS === "ios" ? 32 : 16,
		borderTopWidth: 1,
		borderTopColor: "#f0f0f0",
	},
	bookButton: {
		backgroundColor: "#2b7571",
		borderRadius: 8,
		paddingVertical: 6,
	},
});
