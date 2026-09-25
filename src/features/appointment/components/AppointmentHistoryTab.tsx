// src/features/appointment/components/AppointmentHistoryTab.tsx
//
// Bottom-sheet wrapper around the shared AppointmentDetailsContent (see that
// file for the actual fetch/render logic). AppointmentDetailsPage.tsx is the
// full-page counterpart using the same content component.

import React from 'react'
import { AppBottomSheet } from '../../../components/common/AppBottomSheet'
import AppointmentDetailsContent from './AppointmentDetailsContent'

interface AppointmentHistoryTabProps {
	open: boolean
	onClose: () => void
	appointmentId: string | null
	viewAs?: 'doctor' | 'patient'
}

export default function AppointmentHistoryTab({
	open,
	onClose,
	appointmentId,
	viewAs = 'patient',
}: AppointmentHistoryTabProps) {
	return (
		<AppBottomSheet
			visible={open}
			title="Appointment Details"
			onClose={onClose}
			maxHeightRatio={0.92}
			scrollEnabled={false}
		>
			<AppointmentDetailsContent
				active={open}
				appointmentId={appointmentId}
				viewAs={viewAs}
				onBeforeNavigate={onClose}
			/>
		</AppBottomSheet>
	)
}
