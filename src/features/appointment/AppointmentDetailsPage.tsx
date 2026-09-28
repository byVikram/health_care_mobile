// src/features/appointment/AppointmentDetailsPage.tsx
//
// Routed, full-page counterpart of AppointmentHistoryTab's bottom sheet --
// same real fetch/render logic (shared via AppointmentDetailsContent), just
// presented as its own screen so the booking flow can navigate straight to
// it: Select slot -> Payment -> Appointment confirmed -> Appointment details.

import React from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NavigationProp, RouteProp } from '@react-navigation/native'
import { AppScreenHeader } from '../../components/common'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import AppointmentDetailsContent from './components/AppointmentDetailsContent'
import PatientAppointmentDetails from './components/patient-details/PatientAppointmentDetails'

const PRIMARY = '#2B6F71'
const SURFACE_MUTED = '#F5F8F8'

export default function AppointmentDetailsPage() {
	const navigation = useNavigation<NavigationProp<AppStackParamList>>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.APPOINTMENT_DETAILS>>()
	const { role } = useAuth()
	const appointmentId = route.params?.appointmentId ?? null
	const viewAs = role === 'doctor' ? 'doctor' : 'patient'

	// Patients get the redesigned details screen (design 7 / 7a); the doctor
	// view keeps the shared AppointmentDetailsContent exactly as before.
	if (viewAs === 'patient') return <PatientAppointmentDetails appointmentId={appointmentId} />

	return (
		<View style={styles.container}>
			<AppScreenHeader
				title="Appointment"
				variant="flat"
				backgroundColor={PRIMARY}
				onBack={() => navigation.goBack()}
			/>
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				<AppointmentDetailsContent active appointmentId={appointmentId} viewAs={viewAs} />
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: SURFACE_MUTED },
	scrollContent: { paddingTop: 16, paddingBottom: 32 },
})
