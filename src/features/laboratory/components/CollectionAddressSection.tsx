import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'
import { AppInput } from '../../../components/common/AppInput'
import { AppBottomSheet } from '../../../components/common/AppBottomSheet'
import {
	PatientAddress,
	createPatientAddress,
	getPatientAddresses,
} from '../../profile/patient/PatientProfileService'

interface CollectionAddressSectionProps {
	selectedAddressId: string | null
	/** Hands back the full selected `PatientAddress` (not just its id) so the
	 *  caller can carry the address text forward into the booking draft
	 *  without a second fetch — see `LabBookingDraft.collectionAddress`. */
	onSelectAddress: (address: PatientAddress) => void
}

const EMPTY_FORM = { label: '', addressLine: '', city: '', state: '', pincode: '' }

/**
 * Collection-address picker for Home Sample Collection, reusing the exact
 * saved-address API (`getPatientAddresses` / `createPatientAddress`) and
 * `PatientAddress` shape the legacy `PlaceLabOrderPage` already booked
 * against — so this isn't a new/invented backend contract. Each address
 * renders as a bordered, rounded radio-selection card — the same
 * `addressCardItem` pattern Nursing Care's own address picker uses (see
 * `BookingDetailsPage.tsx`'s "Edit Visit Address" sheet): a tinted
 * unselected card (`#F8FAFC` / `#E2E8F0` border) that turns teal
 * (`#F0F9F9` / `#0C7C7C` border) when chosen.
 */
export const CollectionAddressSection: React.FC<CollectionAddressSectionProps> = ({
	selectedAddressId,
	onSelectAddress,
}) => {
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [loading, setLoading] = useState(true)
	const [showAddSheet, setShowAddSheet] = useState(false)
	const [form, setForm] = useState(EMPTY_FORM)
	const [saving, setSaving] = useState(false)

	const loadAddresses = useCallback(async () => {
		try {
			setLoading(true)
			const list = await getPatientAddresses()
			setAddresses(list)
			if (list.length > 0) {
				const alreadySelected = list.some((a) => a.id === selectedAddressId)
				if (!alreadySelected) {
					const def = list.find((a) => a.is_default)
					onSelectAddress(def ?? list[0])
				}
			}
		} catch (err: any) {
			// Silent — patient can still add a fresh address below. Matches the
			// legacy address-loading behaviour in PlaceLabOrderPage.
			console.error('[CollectionAddressSection] Failed to load addresses:', err?.message || err)
		} finally {
			setLoading(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
					Loading your saved addresses…
				</AppTypography>
			</View>
		)
	}

	return (
		<View>
			{addresses.length === 0 ? (
				<View style={styles.emptyState}>
					<MaterialCommunityIcons name="map-marker-plus-outline" size={24} color="#94A3B8" />
					<AppTypography variant="caption" color="#64748B" style={styles.emptyText} align="center">
						No saved addresses yet. Add the address our sample-collection agent should visit.
					</AppTypography>
				</View>
			) : (
				<View style={styles.addressList}>
					{addresses.map((addr) => {
						const isSelected = addr.id === selectedAddressId
						return (
							<TouchableOpacity
								key={addr.id}
								style={[styles.addressCard, isSelected && styles.addressCardSelected]}
								onPress={() => onSelectAddress(addr)}
								activeOpacity={0.85}
								accessibilityRole="radio"
								accessibilityState={{ checked: isSelected }}
							>
								<View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
									{isSelected && <View style={styles.radioDot} />}
								</View>
								<View style={styles.addressTextGroup}>
									<View style={styles.addressLabelRow}>
										<Text style={styles.addressLabel} numberOfLines={1}>
											{addr.label}
										</Text>
										{addr.is_default && (
											<View style={styles.defaultBadge}>
												<Text style={styles.defaultBadgeText}>Default</Text>
											</View>
										)}
									</View>
									<Text style={styles.addressLine} numberOfLines={2}>
										{addr.address_line}, {addr.city}, {addr.state} - {addr.pincode}
									</Text>
								</View>
							</TouchableOpacity>
						)
					})}
				</View>
			)}

			<TouchableOpacity style={styles.addButton} onPress={() => setShowAddSheet(true)} activeOpacity={0.8}>
				<MaterialCommunityIcons name="plus" size={16} color="#0C7C7C" />
				<Text style={styles.addButtonText}>Add New Address</Text>
			</TouchableOpacity>

			<AppBottomSheet
				visible={showAddSheet}
				title="Add Collection Address"
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
		</View>
	)
}

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
	addressCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 14,
		backgroundColor: '#F8FAFC',
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		gap: 12,
	},
	addressCardSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#0C7C7C',
	},
	radioCircle: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#E2E8F0',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
	},
	radioCircleSelected: {
		borderColor: '#0C7C7C',
	},
	radioDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0C7C7C',
	},
	addressTextGroup: {
		flex: 1,
		minWidth: 0,
	},
	addressLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 2,
	},
	addressLabel: {
		fontSize: 13,
		fontWeight: '700',
		color: '#181C1D',
		flexShrink: 1,
	},
	defaultBadge: {
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 8,
	},
	defaultBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	addressLine: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 16,
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

export default CollectionAddressSection
