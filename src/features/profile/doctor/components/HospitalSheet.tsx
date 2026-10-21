// Add / edit a hospital or clinic: name, address, phone, in-clinic and video fees, primary toggle.
// Detailed hours are set on the Availability screen.

import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { AppBottomSheet, AppButton, AppFormField, AppToggle } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import type { DoctorHospitalInput, DoctorHospitalLink } from '../doctorProfileService'

export type HospitalSheetProps = {
	visible: boolean
	onClose: () => void
	hospital: DoctorHospitalLink | null
	onSubmit: (input: DoctorHospitalInput) => Promise<void>
}

const feeText = (v: string | number | null | undefined) => (v == null || v === '' ? '' : String(Math.round(Number(v))))

export function HospitalSheet({ visible, onClose, hospital, onSubmit }: HospitalSheetProps) {
	const [name, setName] = useState('')
	const [address, setAddress] = useState('')
	const [phone, setPhone] = useState('')
	const [clinicFee, setClinicFee] = useState('')
	const [videoFee, setVideoFee] = useState('')
	const [primary, setPrimary] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		if (!visible) return
		setName(hospital?.hospital?.name || '')
		setAddress(hospital?.hospital?.address || '')
		setPhone(hospital?.hospital?.contact_number || '')
		setClinicFee(feeText(hospital?.hospital?.offline_consultation_fee))
		setVideoFee(feeText(hospital?.hospital?.video_consultation_fee))
		setPrimary(!!hospital?.is_primary)
	}, [visible])

	const submit = async () => {
		setSaving(true)
		try {
			await onSubmit({
				name: name.trim(),
				full_address: address.trim(),
				phone_number: phone.trim(),
				offline_consultation_fee: clinicFee ? Number(clinicFee) : null,
				video_consultation_fee: videoFee ? Number(videoFee) : null,
				is_primary: primary,
			})
		} finally {
			setSaving(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={hospital ? 'Edit hospital or clinic' : 'Add hospital or clinic'}
			subtitle="Set detailed hours in Availability"
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!saving}
			footer={
				<AppButton
					variant="primary"
					size="lg"
					softDisabled
					onPress={submit}
					disabled={name.trim().length < 2 || saving}
					loading={saving}
				>
					{hospital ? 'Save changes' : 'Add place'}
				</AppButton>
			}
		>
			<View style={styles.body}>
				<AppFormField
					label="Hospital or clinic name"
					required
					value={name}
					onChangeText={setName}
					placeholder="Name and area"
					maxLength={200}
				/>
				<AppFormField
					label="Address"
					value={address}
					onChangeText={setAddress}
					placeholder="Full address"
					maxLength={500}
					multiline
				/>
				<AppFormField
					label="Front desk phone"
					optional
					value={phone}
					onChangeText={setPhone}
					placeholder="+91"
					keyboardType="phone-pad"
					maxLength={20}
				/>
				<View style={styles.pair}>
					<AppFormField
						label="Clinic fee (₹)"
						value={clinicFee}
						onChangeText={(v) => setClinicFee(v.replace(/\D/g, ''))}
						keyboardType="number-pad"
						maxLength={6}
						style={styles.flex}
					/>
					<AppFormField
						label="Video fee (₹)"
						value={videoFee}
						onChangeText={(v) => setVideoFee(v.replace(/\D/g, ''))}
						keyboardType="number-pad"
						maxLength={6}
						style={styles.flex}
					/>
				</View>
				<View style={styles.primaryRow}>
					<View style={styles.flex}>
						<Text style={styles.primaryTitle}>Primary place</Text>
						<Text style={styles.primarySub}>Shown first on your profile</Text>
					</View>
					<AppToggle value={primary} onValueChange={setPrimary} accessibilityLabel="Primary place" />
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: {
		gap: 14,
		paddingBottom: 8,
	},
	flex: {
		flex: 1,
	},
	pair: {
		flexDirection: 'row',
		gap: 12,
	},
	primaryRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	primaryTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	primarySub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})

export default HospitalSheet
