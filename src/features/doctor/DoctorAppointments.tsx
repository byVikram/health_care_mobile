import React from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AppSkeleton } from "../../components/common";

const actionButtons: {
	label: string;
	bg: string;
	color: string;
	action: string;
	icon: keyof typeof MaterialCommunityIcons.glyphMap;
}[] = [
	{ label: "Confirm",    bg: "#d6eed8", color: "#2e8b57", action: "confirm",    icon: "check" },
	{ label: "Reject",     bg: "#f8dddd", color: "#d84545", action: "reject",     icon: "close" },
	{ label: "Reschedule", bg: "#f8e8c6", color: "#d08a0a", action: "reschedule", icon: "refresh" },
	{ label: "Refer",      bg: "#dbe2f5", color: "#4d6bb1", action: "refer",      icon: "account-multiple-outline" },
];

export default function DoctorAppointments({
	selectedDate,
	setSelectedDate,
	appointments,
	apptLoading,
	apptError,
	weekDays,
	selectedDateObj,
}: any) {
	const { width } = useWindowDimensions();
	const isTablet = width >= 768;

	const getStatusLabel = (status: any) =>
		typeof status === "string" ? status : (status?.label ?? "pending");
	const formatStatus = (s: string) =>
		s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
	const getPatientAge = (apt: any) => apt?.patient?.age ?? apt?.age ?? "--";
	const getPatientGender = (apt: any) =>
		apt?.patient?.gender ?? apt?.patient?.sex ?? apt?.gender ?? "--";
	const getTimeRange = (apt: any) => {
		const start = apt?.appointment_time;
		const end = apt?.appointment_end_time ?? apt?.end_time;
		if (start && end) return `${start} - ${end}`;
		return start ?? "--";
	};

	const handleAction = (action: string, id: string) => {
		if (action === "confirm")    alert("Confirmed");
		if (action === "reject")     alert("Rejected");
		if (action === "reschedule") alert("Reschedule coming soon");
		if (action === "refer")      alert("Refer coming soon");
	};

	const renderSkeleton = () =>
		Array.from({ length: 3 }).map((_, i) => (
			<View key={`sk-${i}`} style={styles.card}>
				<View style={isTablet ? styles.tabletCardInner : undefined}>
					<View style={styles.skeletonNameRow}>
						<AppSkeleton width={24} height={24} borderRadius={6} />
						<AppSkeleton width={110} height={16} borderRadius={6} />
						<AppSkeleton width={72} height={16} borderRadius={999} />
					</View>
					<View style={[styles.skeletonMetaRow, { marginTop: 8 }]}>
						<AppSkeleton width={14} height={14} borderRadius={7} />
						<AppSkeleton width="80%" height={13} borderRadius={6} />
					</View>
					{isTablet && (
						<View style={styles.skeletonActionsRow}>
							{[0, 1, 2, 3].map((j) => (
								<AppSkeleton key={j} width={52} height={44} borderRadius={6} style={{ marginRight: 8 }} />
							))}
						</View>
					)}
				</View>
			</View>
		));

	const renderActions = (apt: any) => (
		<View style={[styles.actions, isTablet && styles.actionsTablet]}>
			{actionButtons.map((btn, i) => (
				<TouchableOpacity
					key={i}
					onPress={() => handleAction(btn.action, apt.id)}
					style={[styles.btn, { backgroundColor: btn.bg }]}
				>
					<MaterialCommunityIcons name={btn.icon} size={16} color={btn.color} />
					<Text style={[styles.btnLabel, { color: btn.color }]}>{btn.label}</Text>
				</TouchableOpacity>
			))}
			<TouchableOpacity style={styles.chevronBtn}>
				<MaterialCommunityIcons name="chevron-right" size={26} color="#2a7f84" />
			</TouchableOpacity>
		</View>
	);

	const renderCard = (apt: any) => {
		const status = getStatusLabel(apt.status);
		const isCancelled = status === "cancelled";

		const statusStyle =
			status === "confirmed"
				? styles.pillConfirmed
				: status === "cancelled"
				? styles.pillCancelled
				: styles.pillPending;
		const statusTextStyle =
			status === "confirmed"
				? styles.pillTextConfirmed
				: status === "cancelled"
				? styles.pillTextCancelled
				: styles.pillTextPending;

		if (isTablet) {
			return (
				<View key={apt.id} style={[styles.card, isCancelled && styles.cancelledCard]}>
					<View style={styles.tabletCardInner}>
						<View style={styles.tabletLeft}>
							<View style={styles.patientNameRow}>
								<View style={styles.patientIconBox}>
									<MaterialCommunityIcons name="home-heart" size={20} color="#2e7d32" />
								</View>
								<Text style={styles.name} numberOfLines={1}>
									{apt?.patient?.name || "Unknown Patient"}
								</Text>
								<View style={[styles.pill, statusStyle]}>
									<Text style={[styles.pillText, statusTextStyle]}>
										{formatStatus(status)}
									</Text>
								</View>
							</View>
							<View style={styles.metaRow}>
								<MaterialCommunityIcons name="clock-time-three-outline" size={14} color="#5f6973" />
								<Text style={styles.subText}>
									{getPatientAge(apt)} yrs / {getPatientGender(apt)} | {getTimeRange(apt)}
								</Text>
							</View>
							{isCancelled && (
								<Text style={styles.cancelledMsg}>Patient has canceled the appointment</Text>
							)}
						</View>
						{!isCancelled && (
							<View style={styles.tabletRight}>{renderActions(apt)}</View>
						)}
					</View>
				</View>
			);
		}

		return (
			<View key={apt.id} style={[styles.card, isCancelled && styles.cancelledCard]}>
				<View style={styles.patientNameRow}>
					<View style={styles.patientIconBox}>
						<MaterialCommunityIcons name="home-heart" size={20} color="#2e7d32" />
					</View>
					<Text style={styles.name} numberOfLines={1}>
						{apt?.patient?.name || "Unknown Patient"}
					</Text>
					<View style={[styles.pill, statusStyle]}>
						<Text style={[styles.pillText, statusTextStyle]}>
							{formatStatus(status)}
						</Text>
					</View>
				</View>
				<View style={styles.metaRow}>
					<MaterialCommunityIcons name="clock-time-three-outline" size={14} color="#5f6973" />
					<Text style={styles.subText}>
						{getPatientAge(apt)} yrs / {getPatientGender(apt)} | {getTimeRange(apt)}
					</Text>
				</View>
				{isCancelled
					? <Text style={styles.cancelledMsg}>Patient has canceled the appointment</Text>
					: renderActions(apt)
				}
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.heading}>Doctor Appointments</Text>
				<Text style={styles.month}>
					{selectedDateObj?.toLocaleDateString("en-US", {
						month: "long",
						year: "numeric",
					})}
				</Text>
			</View>

			<ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekContainer}>
				{weekDays.map((d: any, i: number) => (
					<TouchableOpacity
						key={i}
						onPress={() => setSelectedDate(i)}
						style={[
							styles.dayBox,
							d.red && styles.weekendDayBox,
							selectedDate === i && styles.selectedDay,
						]}
					>
						<Text style={[styles.dayText, d.red && styles.weekendText, selectedDate === i && styles.selectedText]}>
							{d.day}
						</Text>
						<Text style={[styles.dateText, d.red && styles.weekendText, selectedDate === i && styles.selectedText]}>
							{d.date}
						</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

			<View style={styles.listContainer}>
				{apptLoading ? renderSkeleton() : null}
				{apptError ? <Text style={styles.error}>{apptError}</Text> : null}
				{!apptLoading && appointments.length === 0 && (
					<Text style={styles.empty}>No appointments</Text>
				)}
				{!apptLoading && appointments.map(renderCard)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: "#fff",
		borderRadius: 12,
	},
	header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
	heading: { fontSize: 18, fontWeight: "700", color: "#253136" },
	month: { color: "#0c7c7c", fontWeight: "600", fontSize: 13 },
	weekContainer: { marginBottom: 12 },
	dayBox: {
		width: 64, height: 64, borderRadius: 8, marginRight: 10,
		alignItems: "center", justifyContent: "center",
		borderWidth: 1, borderColor: "#b8bec3",
	},
	weekendDayBox: { borderColor: "#efb2b2", backgroundColor: "#fff9f9" },
	selectedDay: { backgroundColor: "#2d7679", borderColor: "#2d7679" },
	dayText: { fontSize: 12, color: "#6f7680", marginBottom: 2 },
	dateText: { fontSize: 16, fontWeight: "700", color: "#2c3136", lineHeight: 32 },
	selectedText: { color: "#fff" },
	weekendText: { color: "#e25555" },
	listContainer: { marginTop: 2 },
	card: {
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: "#d6dbde",
		marginBottom: 10,
		backgroundColor: "#fff",
	},
	cancelledCard: { backgroundColor: "#fff5f5" },
	tabletCardInner: { flexDirection: "row", alignItems: "center", gap: 12 },
	tabletLeft: { flex: 1, minWidth: 0 },
	tabletRight: { flexShrink: 0 },
	patientNameRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
	patientIconBox: {
		width: 28, height: 28, borderRadius: 6,
		backgroundColor: "#e8f4ea",
		alignItems: "center", justifyContent: "center",
	},
	name: { fontSize: 15, fontWeight: "600", color: "#2a2f34", flex: 1 },
	pill: { paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, minWidth: 68, alignItems: "center" },
	pillPending: { backgroundColor: "#f8df8d" },
	pillConfirmed: { backgroundColor: "#d6eed8" },
	pillCancelled: { backgroundColor: "#f8dddd" },
	pillText: { fontSize: 12, fontWeight: "600" },
	pillTextPending: { color: "#c48508" },
	pillTextConfirmed: { color: "#2e7d32" },
	pillTextCancelled: { color: "#d84545" },
	metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
	subText: { fontSize: 13, color: "#5f6973", fontWeight: "500" },
	cancelledMsg: { color: "#d84545", fontSize: 12, marginTop: 4 },
	actions: { flexDirection: "row", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 6 },
	actionsTablet: { flexWrap: "nowrap", marginTop: 0 },
	btn: {
		alignItems: "center", justifyContent: "center",
		borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8,
		minWidth: 52,
	},
	btnLabel: { fontSize: 10, fontWeight: "500", textAlign: "center", marginTop: 3 },
	chevronBtn: { marginLeft: "auto", paddingLeft: 4 },
	skeletonNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
	skeletonMetaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
	skeletonActionsRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
	error: { color: "red", fontSize: 13 },
	empty: { color: "#999", fontSize: 13 },
});