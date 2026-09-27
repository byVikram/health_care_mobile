// src/components/common/booking/AddressSelection/AppAddressSheet.tsx
//
// "Where should the nurse come?" sheet from the home-visit Review & pay design, on AppBottomSheet
// appearance="modern":
//   list view — saved addresses: 48px home tile (APP_COLORS.mint + 2px primary ring when selected, else
//               pageBg), label 16/22 700, address 13/18 muted, AppRadio; loading skeletons / empty / error+retry.
//               Footer: dashed "Add new address" (48h, 1.5px dashed primary on mint) + "Use this address" CTA.
//   add view  — back chevron, "Add new address": outline "Use my current location" button, Flat / house,
//               Street and area, Landmark (optional) + PIN code, City + State, "Save as" chips
//               (Home / Work / Family / Other); footer "Save and use".
// The modern counterpart of AddressSelectionSheet (an inline, lab-styled list whose add form lives in a
// nested sheet). Pure UI: the caller owns the address list (getPatientAddresses), saving
// (createPatientAddress) and the GPS lookup, so the same sheet works for any home-visit flow.

import React, { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../../config/theme'
import { AppBottomSheet } from '../../layout/AppBottomSheet'
import { AppButton } from '../../buttons/AppButton'
import { AppChip } from '../../inputs/AppChip'
import { AppRadio } from '../../inputs/AppRadio'
import { AppSkeleton } from '../../display/AppSkeleton'

export type AppAddressOption = {
	id: string
	/** e.g. "Home", "Parents' home". */
	label: string
	/** One-line address, e.g. "4B Sunrise Apartments, Jayanagar, Bengaluru - 560041". */
	line: string
}

/** What the add form collected; passed to `onSaveNew`. */
export type AppAddressDraft = {
	flat: string
	area: string
	landmark: string
	pincode: string
	city: string
	state: string
	/** "Save as" tag: Home / Work / Family / Other. */
	label: string
	/** Set when the form was filled from "Use my current location". */
	latitude?: number
	longitude?: number
}

/** Prefill returned by `onUseCurrentLocation` (any subset of the form). */
export type AppAddressPrefill = Partial<Omit<AppAddressDraft, 'label'>>

export const ADDRESS_TAGS = ['Home', 'Work', 'Family', 'Other']

export type AppAddressSheetProps = {
	visible: boolean
	onClose: () => void
	addresses: AppAddressOption[]
	loading?: boolean
	/** Shown instead of the list, with a Retry link when `onRetry` is set. */
	error?: string | null
	onRetry?: () => void
	selectedId?: string | null
	onSelect: (id: string) => void
	/** Defaults to "Where should we come?". */
	title?: string
	/** Defaults to "Pick a saved address or add a new one". */
	subtitle?: string
	/** Defaults to "No saved addresses yet. Add the address for the visit." */
	emptyLabel?: string
	/** Save the add form. Resolve `true` to close the sheet (the caller selects the new address). */
	onSaveNew?: (draft: AppAddressDraft) => Promise<boolean> | boolean
	/** GPS lookup for "Use my current location"; resolve null when it failed (the caller shows why). */
	onUseCurrentLocation?: () => Promise<AppAddressPrefill | null>
}

const EMPTY_DRAFT: AppAddressDraft = {
	flat: '',
	area: '',
	landmark: '',
	pincode: '',
	city: '',
	state: '',
	label: 'Other',
}

function Field({
	label,
	optional,
	value,
	onChangeText,
	placeholder,
	numeric,
	maxLength,
}: {
	label: string
	optional?: boolean
	value: string
	onChangeText: (v: string) => void
	placeholder?: string
	numeric?: boolean
	maxLength?: number
}) {
	return (
		<View style={styles.field}>
			<Text style={styles.fieldLabel}>
				{label}
				{optional ? <Text style={styles.fieldOptional}> (optional)</Text> : null}
			</Text>
			<TextInput
				style={styles.input}
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={APP_COLORS.inkMuted}
				keyboardType={numeric ? 'number-pad' : 'default'}
				maxLength={maxLength}
				accessibilityLabel={label}
			/>
		</View>
	)
}

export function AppAddressSheet({
	visible,
	onClose,
	addresses,
	loading = false,
	error,
	onRetry,
	selectedId,
	onSelect,
	title = 'Where should we come?',
	subtitle = 'Pick a saved address or add a new one',
	emptyLabel = 'No saved addresses yet. Add the address for the visit.',
	onSaveNew,
	onUseCurrentLocation,
}: AppAddressSheetProps) {
	const [view, setView] = useState<'list' | 'add'>('list')
	const [draft, setDraft] = useState<AppAddressDraft>(EMPTY_DRAFT)
	const [saving, setSaving] = useState(false)
	const [locating, setLocating] = useState(false)

	// Reset on open only, so the content doesn't flip while the sheet animates closed.
	useEffect(() => {
		if (visible) setView(addresses.length === 0 && !loading && !error && !!onSaveNew ? 'add' : 'list')
	}, [visible])

	const set = (key: keyof AppAddressDraft) => (v: string) => setDraft((d) => ({ ...d, [key]: v }))

	const openAdd = () => {
		setDraft(EMPTY_DRAFT)
		setView('add')
	}

	const canSave =
		!!onSaveNew &&
		!saving &&
		draft.flat.trim().length > 1 &&
		draft.area.trim().length > 1 &&
		draft.city.trim().length > 1 &&
		/^\d{6}$/.test(draft.pincode.trim())

	const handleSave = async () => {
		if (!onSaveNew || !canSave) return
		setSaving(true)
		try {
			const done = await onSaveNew({
				...draft,
				flat: draft.flat.trim(),
				area: draft.area.trim(),
				landmark: draft.landmark.trim(),
				pincode: draft.pincode.trim(),
				city: draft.city.trim(),
				state: draft.state.trim(),
			})
			if (done) {
				setView('list')
				onClose()
			}
		} finally {
			setSaving(false)
		}
	}

	const handleLocate = async () => {
		if (!onUseCurrentLocation || locating) return
		setLocating(true)
		try {
			const prefill = await onUseCurrentLocation()
			if (prefill) {
				setDraft((d) => ({
					...d,
					area: prefill.area || d.area,
					city: prefill.city || d.city,
					state: prefill.state || d.state,
					pincode: prefill.pincode || d.pincode,
					flat: prefill.flat || d.flat,
					latitude: prefill.latitude,
					longitude: prefill.longitude,
				}))
			}
		} finally {
			setLocating(false)
		}
	}

	const selected = addresses.find((a) => a.id === selectedId)

	const listFooter = (
		<View style={styles.footer}>
			{!!onSaveNew && (
				<TouchableOpacity
					style={styles.addBtn}
					onPress={openAdd}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Add new address"
				>
					<MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
					<Text style={styles.addBtnText}>Add new address</Text>
				</TouchableOpacity>
			)}
			<AppButton size="lg" onPress={onClose} disabled={!selected} softDisabled>
				Use this address
			</AppButton>
		</View>
	)

	const addFooter = (
		<AppButton size="lg" onPress={handleSave} disabled={!canSave} loading={saving} softDisabled>
			Save and use
		</AppButton>
	)

	const renderList = () => {
		if (loading) {
			return (
				<View style={styles.list} accessible accessibilityLabel="Loading saved addresses">
					<AppSkeleton height={60} borderRadius={12} color={APP_COLORS.neutralBg} />
					<AppSkeleton height={60} borderRadius={12} color={APP_COLORS.neutralBg} />
				</View>
			)
		}
		if (error) {
			return (
				<View style={styles.stateBox}>
					<MaterialCommunityIcons name="map-marker-alert-outline" size={24} color={APP_COLORS.danger} />
					<Text style={styles.stateText}>{error}</Text>
					{!!onRetry && (
						<AppButton variant="outline" size="sm" onPress={onRetry}>
							Retry
						</AppButton>
					)}
				</View>
			)
		}
		if (addresses.length === 0) {
			return (
				<View style={styles.stateBox}>
					<MaterialCommunityIcons name="map-marker-plus-outline" size={24} color={APP_COLORS.inkMuted} />
					<Text style={styles.stateText}>{emptyLabel}</Text>
				</View>
			)
		}
		return (
			<View accessibilityRole="radiogroup">
				{addresses.map((a, i) => {
					const on = a.id === selectedId
					return (
						<TouchableOpacity
							key={a.id}
							onPress={() => onSelect(a.id)}
							activeOpacity={0.8}
							accessibilityRole="radio"
							accessibilityState={{ checked: on }}
							accessibilityLabel={`${a.label}, ${a.line}`}
							style={[styles.row, i === addresses.length - 1 && styles.rowLast]}
						>
							<View style={[styles.tile, on && styles.tileOn]}>
								<MaterialCommunityIcons name="home-outline" size={22} color={APP_COLORS.primary} />
							</View>
							<View style={styles.rowText}>
								<Text style={styles.rowTitle} numberOfLines={1}>
									{a.label}
								</Text>
								<Text style={styles.rowSub} numberOfLines={2}>
									{a.line}
								</Text>
							</View>
							<AppRadio checked={on} />
						</TouchableOpacity>
					)
				})}
			</View>
		)
	}

	const renderAdd = () => (
		<View style={styles.form}>
			{!!onUseCurrentLocation && (
				<TouchableOpacity
					style={styles.locateBtn}
					onPress={handleLocate}
					disabled={locating}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Use my current location"
					accessibilityState={{ busy: locating }}
				>
					{locating ? (
						<ActivityIndicator size="small" color={APP_COLORS.primary} />
					) : (
						<MaterialCommunityIcons name="crosshairs-gps" size={18} color={APP_COLORS.primary} />
					)}
					<Text style={styles.locateText}>
						{locating ? 'Finding your location…' : 'Use my current location'}
					</Text>
				</TouchableOpacity>
			)}
			<Field
				label="Flat, house no., building"
				value={draft.flat}
				onChangeText={set('flat')}
				placeholder="e.g. 4B, Sunrise Apartments"
			/>
			<Field
				label="Street and area"
				value={draft.area}
				onChangeText={set('area')}
				placeholder="e.g. 2nd Cross, Jayanagar"
			/>
			<View style={styles.pair}>
				<View style={styles.flex}>
					<Field label="Landmark" optional value={draft.landmark} onChangeText={set('landmark')} />
				</View>
				<View style={styles.flex}>
					<Field
						label="PIN code"
						value={draft.pincode}
						onChangeText={(v) => set('pincode')(v.replace(/\D/g, ''))}
						numeric
						maxLength={6}
					/>
				</View>
			</View>
			<View style={styles.pair}>
				<View style={styles.flex}>
					<Field label="City" value={draft.city} onChangeText={set('city')} />
				</View>
				<View style={styles.flex}>
					<Field label="State" value={draft.state} onChangeText={set('state')} />
				</View>
			</View>
			<View style={styles.field}>
				<Text style={styles.fieldLabel}>Save as</Text>
				<View style={styles.tags} accessibilityRole="radiogroup">
					{ADDRESS_TAGS.map((t) => (
						<AppChip
							key={t}
							label={t}
							selected={draft.label === t}
							onPress={() => setDraft((d) => ({ ...d, label: t }))}
							shape="pill"
							size="md"
							accessibilityRole="radio"
						/>
					))}
				</View>
			</View>
		</View>
	)

	const isAdd = view === 'add'
	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title={isAdd ? 'Add new address' : title}
			subtitle={isAdd ? undefined : subtitle}
			onBack={isAdd && addresses.length > 0 ? () => setView('list') : undefined}
			backAccessibilityLabel="Back to saved addresses"
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.9}
			dismissible={!saving}
			footer={isAdd ? addFooter : listFooter}
		>
			{isAdd ? renderAdd() : renderList()}
		</AppBottomSheet>
	)
}

export default AppAddressSheet

const styles = StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	list: { gap: 8, paddingVertical: 8 },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 72,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	rowLast: { borderBottomWidth: 0 },
	tile: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tileOn: {
		backgroundColor: APP_COLORS.mint,
		borderWidth: 2,
		borderColor: APP_COLORS.primary,
	},
	rowText: { flex: 1, minWidth: 0 },
	rowTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700', color: APP_COLORS.ink },
	rowSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	stateBox: { alignItems: 'center', gap: 8, paddingVertical: 20, paddingHorizontal: 8 },
	stateText: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted, textAlign: 'center' },
	footer: { gap: 8 },
	addBtn: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	addBtnText: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
	form: { gap: 16, paddingTop: 4, paddingBottom: 8 },
	locateBtn: {
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	locateText: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.primary },
	field: { gap: 6 },
	fieldLabel: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: APP_COLORS.ink },
	fieldOptional: { fontWeight: '400', color: APP_COLORS.inkMuted },
	input: {
		height: 48,
		paddingHorizontal: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		borderRadius: 8,
		fontSize: 16,
		color: APP_COLORS.ink,
		backgroundColor: APP_COLORS.surface,
	},
	pair: { flexDirection: 'row', gap: 12 },
	tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
})
