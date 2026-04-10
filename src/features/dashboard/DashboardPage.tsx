import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useTheme } from "react-native-paper"; 

import HeroSection from "./HeroSection";
import SpecialitySection from "./SpecialitySection";
import ConsultSection from "./ConsultSection";
import CommunityBlogsSection from "./CommunityBlogsSection";
import PatientQuestionsSection from "./PatientQuestionsSection"; // ← NEW

import DoctorAppointments from "../doctor/DoctorAppointments";
import { getAppointments, Appointment } from "../doctor/doctorService";

import { formatDateForApi } from "../../utils/date";
import { USER_ROLES } from "../../constants/constants";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPage() {
	const { width } = useWindowDimensions();
	const isTablet = width >= 768;
	const { role } = useAuth();
	const isDoctor = role === USER_ROLES.DOCTOR;

	const [appointments, setAppointments] = useState<Appointment[]>([]);
	const [apptLoading, setApptLoading] = useState(false);
	const [apptError, setApptError] = useState("");

	const [selectedDate, setSelectedDate] = useState(0);
	type WeekDay = {
		dateObj: Date;
	};
	const buildWeekDays = () => {
		const today = new Date();
		const days = [];
		for (let i = 0; i < 7; i += 1) {
			const d = new Date(
				today.getFullYear(),
				today.getMonth(),
				today.getDate() + i,
			);
			const dayLabel = d.toLocaleDateString("en-US", {
				weekday: "short",
			});
			const isWeekend = d.getDay() === 0 || d.getDay() === 6;
			days.push({
				day: dayLabel,
				date: String(d.getDate()),
				red: isWeekend,
				dateObj: d,
			});
		}
		return days;
	};
	const [weekDays] = useState(() => buildWeekDays());

	const theme = useTheme();

	useEffect(() => {
		if (!isDoctor || !weekDays.length) return;

		const fetchAppointments = async () => {
			try {
				setApptLoading(true);
				setApptError("");

				const dateStr = formatDateForApi(
					weekDays[selectedDate]?.dateObj ?? new Date(),
				);

				const res = await getAppointments({
					appointment_date: dateStr,
				});

				if (res.success) {
					const items = Array.isArray(res.data) ? res.data : [];
					setAppointments(items);
				} else {
					setApptError(res.message ?? "Failed to load appointments");
				}
			} catch {
				setApptError("Failed to load appointments");
			} finally {
				setApptLoading(false);
			}
		};

		fetchAppointments();
	}, [isDoctor, selectedDate, weekDays]);

	const renderDashboard = () => {
		return (
			<>
				{isTablet ? (
					<View style={styles.tabletTopRow}>
						<View style={styles.tabletColumn}>
							<HeroSection />
						</View>

						{isDoctor ? (
							<View style={[styles.tabletColumn, styles.tabletColumnRight]}>
								<DoctorAppointments
									selectedDate={selectedDate}
									setSelectedDate={setSelectedDate}
									appointments={appointments}
									apptLoading={apptLoading}
									apptError={apptError}
									weekDays={weekDays}
									selectedDateObj={weekDays[selectedDate]?.dateObj}
								/>
							</View>
						) : null}
					</View>
				) : (
					<>
						<HeroSection />

						{isDoctor ? (
							
							<DoctorAppointments
								selectedDate={selectedDate}
								setSelectedDate={setSelectedDate}
								appointments={appointments}
								apptLoading={apptLoading}
								apptError={apptError}
								weekDays={weekDays}
								selectedDateObj={weekDays[selectedDate]?.dateObj}
							/>
						) : null}
					</>
				)}

				{/* Patient Questions — only visible to doctors */}
				<SpecialitySection />

				<ConsultSection />
				<CommunityBlogsSection />
				{isDoctor ? (
					<PatientQuestionsSection
						// Pass real questions + handler once you wire up the API:
						// questions={patientQuestions}
						// loading={questionsLoading}
						// onSubmitAnswer={handleSubmitAnswer}
					/>
				) : null}
			</>
		);
	};

	return (
		<ScrollView style={styles.container}>{renderDashboard()}</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#f5f5f5",
	},
	tabletTopRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		paddingHorizontal: 8,
	},
	tabletColumn: {
		flex: 1,
	},
	tabletColumnRight: {
		marginLeft: 8,
	},
	card: {
		marginHorizontal: 16,
		marginBottom: 24,
	},
	sectionTitle: {
		marginHorizontal: 16,
		marginBottom: 12,
		fontWeight: "bold",
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		paddingHorizontal: 8,
	},
	gridItem: {
		width: "45%",
		margin: "2.5%",
		justifyContent: "center",
		height: 100,
	},
});