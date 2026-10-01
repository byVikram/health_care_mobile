// Add / edit a saved address: "Use my current location", flat / street / landmark / city / PIN, contact at
// the address, "Save as" (Home / Work / Other with a custom name) and a default toggle. Edit mode adds
// "Delete this address" (soft delete).

import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import { z } from 'zod'
import {
	AppChipGroup,
	AppConfirmSheet,
	AppFormCard,
	AppFormField,
	AppSaveFooter,
	AppToggle,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import type { AppStackParamList } from '../../../navigation/types'
import { ROUTES } from '../../../navigation/routes'
import { getCurrentLocation } from '../../../services/locationService'
import {
	addPatientAddress,
	deletePatientAddress,
	getPatientAddresses,
	updatePatientAddress,
	type PatientAddressInput,
} from './PatientProfileService'
import { isValidIndianMobile } from '../config/profileOptions'
import { useProfileForm } from '../hooks/useProfileForm'
import { ProfileScreen } from '../shared/components/ProfileScreen'

const PRESET_LABELS = ['Home', 'Work', 'Other']

interface AddressDraft {
	flat: string
	area: string
	landmark: string
	city: string
	pincode: string
	contactName: string
	contactPhone: string
	/** 'Home' | 'Work' | 'Other' */
	tag: string
	customLabel: string
	isDefault: boolean
	latitude?: number
	longitude?: number
}

const EMPTY: AddressDraft = {
	flat: '',
	area: '',
	landmark: '',
	city: '',
	pincode: '',
	contactName: '',
	contactPhone: '',
	tag: 'Home',
	customLabel: '',
	isDefault: false,
}

const schema = z
	.object({
		flat: z.string().trim().min(1, 'Enter the flat / house number and building'),
		area: z.string().trim().min(2, 'Enter the street and area'),
		city: z.string().trim().min(2, 'Enter the city'),
		pincode: z
			.string()
			.trim()
			.regex(/^\d{6}$/, 'Enter a 6-digit PIN code'),
		contactName: z.string().trim().min(2, 'Who should the nurse ask for?'),
		contactPhone: z.string().refine(isValidIndianMobile, 'Enter a valid 10-digit mobile number'),
		tag: z.string(),
		customLabel: z.string(),
	})
	.passthrough()
	.refine((v) => v.tag !== 'Other' || v.customLabel.trim().length > 0, {
		path: ['customLabel'],
		message: 'Name this address, e.g. Parents’ home',
	})

const toInput = (d: AddressDraft): PatientAddressInput => ({
	label: d.tag === 'Other' ? d.customLabel.trim() : d.tag,
	flat: d.flat.trim(),
	area: d.area.trim(),
	landmark: d.landmark.trim(),
	city: d.city.trim(),
	pincode: d.pincode.trim(),
	contact_name: d.contactName.trim(),
	contact_phone: d.contactPhone.trim(),
	is_default: d.isDefault,
	...(d.latitude != null && d.longitude != null ? { latitude: d.latitude, longitude: d.longitude } : {}),
})

export default function AddressFormPage() {
	const navigation = useNavigation()
	const { params } = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.PATIENT_ADDRESS_FORM>>()
	const addressId = params?.addressId
	const [locating, setLocating] = useState(false)
	const [confirmDelete, setConfirmDelete] = useState(false)
	const [wasDefault, setWasDefault] = useState(false)

	const load = useCallback(async (): Promise<AddressDraft> => {
		const list = await getPatientAddresses()
		if (!addressId) return { ...EMPTY, isDefault: list.length === 0 }
		const a = list.find((x) => x.id === addressId)
		if (!a) throw new Error('This address no longer exists')
		setWasDefault(a.is_default)
		const preset = PRESET_LABELS.slice(0, 2).find((p) => p.toLowerCase() === a.label.toLowerCase())
		return {
			flat: a.flat || (a.area || a.landmark ? '' : a.address_line),
			area: a.area || '',
			landmark: a.landmark || '',
			city: a.city || '',
			pincode: a.pincode || '',
			contactName: a.contact_name || '',
			contactPhone: a.contact_phone || '',
			tag: preset ?? 'Other',
			customLabel: preset ? '' : a.label,
			isDefault: a.is_default,
			latitude: a.latitude,
			longitude: a.longitude,
		}
	}, [addressId])

	const save = useCallback(
		async (draft: AddressDraft) => {
			if (addressId) await updatePatientAddress(addressId, toInput(draft))
			else await addPatientAddress(toInput(draft))
			navigation.goBack()
			return draft
		},
		[addressId, navigation]
	)

	const form = useProfileForm<AddressDraft>({
		load,
		save,
		schema,
		successMessage: addressId ? 'Address updated' : 'Address saved',
	})
	const { draft, set, errors } = form

	const useLocation = async () => {
		if (locating) return
		setLocating(true)
		try {
			const c = await getCurrentLocation()
			let patch: Partial<AddressDraft> = { latitude: c.latitude, longitude: c.longitude }
			try {
				const [geo] = await Location.reverseGeocodeAsync(c)
				if (geo) {
					patch = {
						...patch,
						area:
							[geo.street, geo.district || geo.subregion].filter(Boolean).join(', ') || draft?.area || '',
						city: geo.city || draft?.city || '',
						pincode: geo.postalCode || draft?.pincode || '',
					}
				}
			} catch {
				// Coordinates alone still help the visiting nurse; the patient types the rest.
			}
			form.setDraft((cur) => (cur ? { ...cur, ...patch } : cur))
			Toast.show({
				type: 'success',
				text1: 'Location added',
				text2: 'Check the address and add your flat number.',
			})
		} catch (e) {
			const denied = e instanceof Error && /denied/i.test(e.message)
			Toast.show({
				type: 'error',
				text1: denied ? 'Location permission is off' : "Couldn't get your location",
				text2: denied ? 'Allow location access, or type the address.' : 'Please type the address instead.',
			})
		} finally {
			setLocating(false)
		}
	}

	const remove = async () => {
		if (!addressId) return
		await deletePatientAddress(addressId)
		setConfirmDelete(false)
		Toast.show({ type: 'success', text1: 'Address deleted' })
		navigation.goBack()
	}

	return (
		<ProfileScreen
			title={addressId ? 'Edit address' : 'Add address'}
			subtitle="Saved addresses"
			loading={form.loading}
			loadError={form.loadError}
			onRetry={form.reload}
			saveError={form.saveError}
			onDismissSaveError={form.clearSaveError}
			footer={
				<AppSaveFooter
					onSave={form.submit}
					dirty={form.dirty || !addressId}
					saving={form.saving}
					invalid={Object.keys(errors).length > 0}
					label={addressId ? 'Save changes' : 'Save address'}
				/>
			}
			overlays={
				<AppConfirmSheet
					visible={confirmDelete}
					onClose={() => setConfirmDelete(false)}
					title="Delete this address?"
					message="Upcoming bookings at this address are not affected."
					confirmLabel="Delete"
					cancelLabel="Keep"
					onConfirm={remove}
				/>
			}
		>
			{draft && (
				<>
					<View style={styles.locateCard}>
						<TouchableOpacity
							style={styles.locate}
							onPress={useLocation}
							disabled={locating}
							accessibilityRole="button"
						>
							<MaterialCommunityIcons name="crosshairs-gps" size={20} color={APP_COLORS.primary} />
							<Text style={styles.locateText}>
								{locating ? 'Finding you…' : 'Use my current location'}
							</Text>
						</TouchableOpacity>
						<Text style={styles.locateHint}>
							{draft.latitude != null
								? 'Location added. Nurses and phlebotomists will be guided to this spot.'
								: 'Adds your map location so nurses and phlebotomists find you easily.'}
						</Text>
					</View>

					<AppFormCard title="Address">
						<AppFormField
							label="Flat / house no. and building"
							required
							value={draft.flat}
							onChangeText={(v) => set('flat', v)}
							placeholder="e.g. 4B, Sunrise Apartments"
							maxLength={200}
							errorText={errors.flat}
						/>
						<AppFormField
							label="Street and area"
							required
							value={draft.area}
							onChangeText={(v) => set('area', v)}
							placeholder="e.g. 2nd Cross, Jayanagar"
							maxLength={255}
							errorText={errors.area}
						/>
						<AppFormField
							label="Landmark"
							optional
							value={draft.landmark}
							onChangeText={(v) => set('landmark', v)}
							placeholder="e.g. Opposite City Park"
							maxLength={255}
						/>
						<View style={styles.pair}>
							<AppFormField
								label="City"
								required
								value={draft.city}
								onChangeText={(v) => set('city', v)}
								placeholder="City"
								maxLength={100}
								errorText={errors.city}
								style={styles.flex}
							/>
							<AppFormField
								label="PIN code"
								required
								value={draft.pincode}
								onChangeText={(v) => set('pincode', v.replace(/\D/g, ''))}
								placeholder="6 digits"
								keyboardType="number-pad"
								maxLength={6}
								errorText={errors.pincode}
								style={styles.flex}
							/>
						</View>
					</AppFormCard>

					<AppFormCard title="Contact at this address">
						<AppFormField
							label="Contact name"
							required
							value={draft.contactName}
							onChangeText={(v) => set('contactName', v)}
							placeholder="Who should the nurse ask for?"
							maxLength={100}
							errorText={errors.contactName}
						/>
						<AppFormField
							label="Phone number"
							required
							value={draft.contactPhone}
							onChangeText={(v) => set('contactPhone', v)}
							placeholder="+91"
							keyboardType="phone-pad"
							maxLength={15}
							errorText={errors.contactPhone}
						/>
					</AppFormCard>

					<AppFormCard title="Save as">
						<AppChipGroup
							options={PRESET_LABELS}
							values={[draft.tag]}
							onChange={(v) => set('tag', v[0] ?? 'Home')}
							single
							accessibilityLabel="Save address as"
						/>
						{draft.tag === 'Other' && (
							<AppFormField
								label="Name this address"
								required
								value={draft.customLabel}
								onChangeText={(v) => set('customLabel', v)}
								placeholder="e.g. Parents’ home, Office"
								maxLength={50}
								errorText={errors.customLabel}
							/>
						)}
						<View style={styles.defaultRow}>
							<View style={styles.flex}>
								<Text style={styles.defaultTitle}>Set as default address</Text>
								<Text style={styles.defaultSub}>
									{wasDefault
										? 'This is your default. Make another address the default to change it.'
										: 'Picked first for new bookings'}
								</Text>
							</View>
							<AppToggle
								value={draft.isDefault}
								onValueChange={(v) => set('isDefault', v)}
								disabled={wasDefault}
								accessibilityLabel="Set as default address"
							/>
						</View>
					</AppFormCard>

					{addressId && (
						<TouchableOpacity
							style={styles.delete}
							onPress={() => setConfirmDelete(true)}
							accessibilityRole="button"
						>
							<MaterialCommunityIcons name="trash-can-outline" size={18} color={APP_COLORS.danger} />
							<Text style={styles.deleteText}>Delete this address</Text>
						</TouchableOpacity>
					)}
				</>
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	flex: {
		flex: 1,
	},
	locateCard: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		gap: 8,
	},
	locate: {
		height: 48,
		borderWidth: 1.5,
		borderColor: APP_COLORS.primary,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	locateText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	locateHint: {
		fontSize: 12,
		lineHeight: 17,
		color: APP_COLORS.inkMuted,
	},
	pair: {
		flexDirection: 'row',
		gap: 12,
	},
	defaultRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	defaultTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	defaultSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	delete: {
		marginHorizontal: 16,
		height: 48,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
	},
	deleteText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
})
