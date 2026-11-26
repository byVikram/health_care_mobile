// src/features/care-ai/components/DoctorResultsCard.tsx
//
// The doctors Care AI found for the patient: one row each (face, name, speciality and experience, fee and clinic,
// the next free slot). A tap opens that doctor's page, where the patient books.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppAvatarStack } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CARE_AI } from '../careAiTheme'
import type { CareAiDoctorResult } from '../careAiTypes'
import { ReplyCard } from './ReplyCard'

type Props = {
	doctors: CareAiDoctorResult[]
	onOpenDoctor: (id: string) => void
}

export function DoctorResultsCard({ doctors, onOpenDoctor }: Props) {
	return (
		<ReplyCard>
			{doctors.map((doctor, index) => (
				<TouchableOpacity
					key={doctor.id}
					onPress={() => onOpenDoctor(doctor.id)}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel={`${doctor.name}. ${doctor.meta}. ${doctor.slot ?? ''}`}
					style={[styles.row, index < doctors.length - 1 && styles.rowDivider]}
				>
					<AppAvatarStack items={[{ name: doctor.name, label: doctor.name }]} size={44} />
					<View style={styles.text}>
						<Text style={styles.name} numberOfLines={1}>
							{doctor.name}
						</Text>
						{doctor.meta ? (
							<Text style={styles.meta} numberOfLines={1}>
								{doctor.meta}
							</Text>
						) : null}
						{doctor.detail ? (
							<Text style={styles.meta} numberOfLines={1}>
								{doctor.detail}
							</Text>
						) : null}
						{doctor.slot ? <Text style={styles.slot}>{doctor.slot}</Text> : null}
					</View>
				</TouchableOpacity>
			))}
		</ReplyCard>
	)
}

const styles = StyleSheet.create({
	row: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowDivider: { borderBottomWidth: 1, borderBottomColor: CARE_AI.rowDivider },
	text: { flex: 1, minWidth: 0, gap: 2 },
	name: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	meta: { fontSize: 12, lineHeight: 16, color: CARE_AI.body },
	slot: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.primary },
})
