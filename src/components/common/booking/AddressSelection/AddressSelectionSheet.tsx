import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppTypography } from '../../AppTypography'
import { AppButton } from '../../AppButton'
import { AppInput } from '../../AppInput'
import { AppBottomSheet } from '../../AppBottomSheet'
import {
	PatientAddress,
	createPatientAddress,
	getPatientAddresses,
} from '../../../../features/profile/patient/PatientProfileService'
import AddressCardItem from './AddressCardItem'

export interface AddressRowRenderContext {
	address: PatientAddress
	selected: boolean
	onPress: () => void
}

interface AddressSelectionSheetProps {
	selectedAddressId: string | null
	/** Hands back the full selected `PatientAddress` (not just its id) so the
	 *  caller can carry the address text/coordinates forward without a
	 *  second fetch. */
	onSelectAddress: (address: PatientAddress) => void
	/** Overrides the default row visual (`AddressCardItem`) — e.g. Ancillary
	 *  renders its own icon-left / dashed-current-location row style here to
	 *  keep its screen's exact current look. */
	renderAddressRow?: (ctx: AddressRowRenderContext) => React.ReactNode
	/** Rendered above the fetched address list — e.g. Ancillary's own
	 *  "Use Current Location" pseudo-option, which isn't a real
	 *  `PatientAddress` and so is left entirely to the caller. */
	leadingItem?: React.ReactNode
	/** Shows the "Add New Address" button + form. Defaults to `true`
	 *  (Laboratory's original behavior). */
	allowAddNew?: boolean
	loadingLabel?: string
	emptyStateLabel?: string
	addButtonLabel?: string
	addSheetTitle?: string
}

const EMPTY_FORM = { label: '', addressLine: '', city: '', state: '', pincode: '' }

export const AddressSelectionSheet: React.FC<AddressSelectionSheetProps> = ({
	selectedAddressId,
	onSelectAddress,
	renderAddressRow,
	leadingItem,
	allowAddNew = true,
	loadingLabel = 'Loading your saved addresses…',
	emptyStateLabel = 'No saved addresses yet. Add the address our sample-collection agent should visit.',
	addButtonLabel = 'Add New Address',
	addSheetTitle = 'Add Collection Address',
}) => {
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [loading, setLoading] = useState(true)
	const [showAddSheet, setShowAddSheet] = useState(false)
	const [form, setForm] = useState(EMPTY_FORM)
	const [saving, setSaving] = useState(false)

	// Read via refs (not the effect's own closure) so `loadAddresses` keeps a
	// stable identity — it must only ever run on mount and after explicitly
	// saving a new address, never as a side effect of the caller's selection
	// or callback identity changing on every render.
	const selectedAddressIdRef = useRef(selectedAddressId)
	useEffect(() => {
		selectedAddressIdRef.current = selectedAddressId
	}, [selectedAddressId])

	const onSelectAddressRef = useRef(onSelectAddress)
	useEffect(() => {
		onSelectAddressRef.current = onSelectAddress
	})

	const loadAddresses = useCallback(async () => {
		try {
			setLoading(true)
			const list = await getPatientAddresses()
			setAddresses(list)
			if (list.length > 0) {
				const alreadySelected = list.some((a) => a.id === selectedAddressIdRef.current)
				if (!alreadySelected) {
					const def = list.find((a) => a.is_default)
					onSelectAddressRef.current(def ?? list[0])
				}
			}
		} catch (err: any) {
			// Silent — the patient can still add a fresh address below.
			console.error('[AddressSelectionSheet] Failed to load addresses:', err?.message || err)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadAddresses()
	}, [loadAddresses])

	const handleSaveAddress = async () => {
		if (!form.label.trim() || !form.addressLine.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
			Toast.show({ type: 'error', text1: 'Missing details', text2: 'Please fill in all address fields.' })
			return
		}
		setSaving(true)
		try {
			await createPatientAddress({
				label: form.label.trim(),
				address_line: form.addressLine.trim(),
				city: form.city.trim(),
				state: form.state.trim(),
				pincode: form.pincode.trim(),
				is_default: addresses.length === 0,
			})
			Toast.show({ type: 'success', text1: 'Address added' })
			setForm(EMPTY_FORM)
			setShowAddSheet(false)
			await loadAddresses()
		} catch (err: any) {
			Toast.show({ type: 'error', text1: 'Could not save address', text2: err?.message || 'Please try again.' })
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<View style={styles.loadingRow}>
				<ActivityIndicator size="small" color="#0C7C7C" />
				<AppTypography variant="caption" color="#64748B" style={styles.loadingText}>
					{loadingLabel}
				</AppTypography>
			</View>
		)
	}

	return (
		<View>
			{leadingItem}

			{addresses.length === 0 ? (
				<View style={styles.emptyState}>
					<MaterialCommunityIcons name="map-marker-plus-outline" size={24} color="#94A3B8" />
					<AppTypography variant="caption" color="#64748B" style={styles.emptyText} align="center">
						{emptyStateLabel}
					</AppTypography>
				</View>
			) : (
				<View style={styles.addressList}>
					{addresses.map((addr) => {
						const isSelected = addr.id === selectedAddressId
						const onPress = () => onSelectAddress(addr)
						if (renderAddressRow) {
							return <React.Fragment key={addr.id}>{renderAddressRow({ address: addr, selected: isSelected, onPress })}</React.Fragment>
						}
						return (
							<AddressCardItem
								key={addr.id}
								label={addr.label}
								description={`${addr.address_line}, ${addr.city}, ${addr.state} - ${addr.pincode}`}
								selected={isSelected}
								onPress={onPress}
								badgeText={addr.is_default ? 'Default' : undefined}
							/>
						)
					})}
				</View>
			)}

			{allowAddNew && (
				<TouchableOpacity style={styles.addButton} onPress={() => setShowAddSheet(true)} activeOpacity={0.8}>
					<MaterialCommunityIcons name="plus" size={16} color="#0C7C7C" />
					<AppTypography variant="caption" style={styles.addButtonText}>
						{addButtonLabel}
					</AppTypography>
				</TouchableOpacity>
			)}

			{allowAddNew && (
				<AppBottomSheet
					visible={showAddSheet}
					title={addSheetTitle}
					onClose={() => {
						if (!saving) setShowAddSheet(false)
					}}
					footer={
						<AppButton variant="primary" onPress={handleSaveAddress} loading={saving} disabled={saving} style={styles.saveButton}>
							Save Address
						</AppButton>
					}
				>
					<AppInput
						label="Label (e.g. Home, Work)"
						placeholder="Address label"
						value={form.label}
						onChangeText={(v) => setForm((f) => ({ ...f, label: v }))}
						fieldSize="form"
					/>
					<AppInput
						label="Street / Address Line"
						placeholder="Building, street name, locality"
						value={form.addressLine}
						onChangeText={(v) => setForm((f) => ({ ...f, addressLine: v }))}
						fieldSize="form"
					/>
					<AppInput
						label="City"
						placeholder="City"
						value={form.city}
						onChangeText={(v) => setForm((f) => ({ ...f, city: v }))}
						fieldSize="form"
					/>
					<View style={styles.rowFields}>
						<View style={styles.rowFieldHalf}>
							<AppInput
								label="State"
								placeholder="State"
								value={form.state}
								onChangeText={(v) => setForm((f) => ({ ...f, state: v }))}
								fieldSize="form"
							/>
						</View>
						<View style={styles.rowFieldHalf}>
							<AppInput
								label="Pincode"
								placeholder="Pincode"
								value={form.pincode}
								onChangeText={(v) => setForm((f) => ({ ...f, pincode: v.replace(/\D/g, '') }))}
								keyboardType="numeric"
								maxLength={6}
								fieldSize="form"
							/>
						</View>
					</View>
				</AppBottomSheet>
			)}
		</View>
	)
}

export default AddressSelectionSheet

const styles = StyleSheet.create({
	loadingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 12,
	},
	loadingText: {
		flexShrink: 1,
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 20,
		paddingHorizontal: 8,
		gap: 8,
	},
	emptyText: {
		lineHeight: 17,
	},
	addressList: {
		gap: 10,
	},
	addButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginTop: 12,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.2)',
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
	},
	addButtonText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	saveButton: {
		width: '100%',
	},
	rowFields: {
		flexDirection: 'row',
		gap: 12,
	},
	rowFieldHalf: {
		flex: 1,
	},
})
