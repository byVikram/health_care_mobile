// src/features/doctor/dashboard/useStartConsultation.ts
//
// "Start consult" / "Start video" on the doctor's Home card and Schedule row: asks the server to start the consultation, then goes
// to the consultation itself when the patient already gave the code for this appointment, or to the code (OTP) page when not.
// One implementation for both screens, so the two cannot drift apart.

import { useCallback, useState } from 'react'
import { useNavigation } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { ROUTES } from '../../../navigation/routes'
import { startConsultation } from '../doctorService'
import { formatTime12h } from '../scheduleUtils'
import type { Appointment } from '../../../types/appointment'

export function useStartConsultation() {
	const navigation = useNavigation<any>()
	const [startingId, setStartingId] = useState<string | null>(null)

	const start = useCallback(
		async (apt: Appointment) => {
			if (!apt.patient?.id) return
			setStartingId(apt.id)
			try {
				const res = await startConsultation(apt.id)
				if (res.success && res.data?.already_verified) {
					// The patient already gave the code for this appointment: no second code, straight to the consultation.
					navigation.navigate(ROUTES.STACK.CONSULTATION, { appointmentId: apt.id, patientId: apt.patient.id })
				} else if (res.success) {
					navigation.navigate(ROUTES.STACK.VERIFY_ACCESS, {
						appointmentId: apt.id,
						patientId: apt.patient.id,
						patientName: apt.patient.name,
						patientMeta: `${apt.patient.age} yrs · ${apt.patient.gender} · ${formatTime12h(apt.start_time)}`,
						slotTime: formatTime12h(apt.start_time),
					})
				}
			} catch {
				Toast.show({ type: 'error', text1: 'Failed to generate OTP' })
			} finally {
				setStartingId(null)
			}
		},
		[navigation]
	)

	return { startingId, start }
}
