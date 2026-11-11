// "Choose your location" sheet (Patient Dashboard design, "1 · Home"): opens from the Home header's location row.
// A search field, "Use current location" (GPS), then either the search results (CITIES, and AREAS & LANDMARKS from
// the place search) or, with an empty field, POPULAR CITIES (3-column grid), the patient's SAVED ADDRESSES and
// ALL CITIES. Picking a city opens "Popular areas in <city>" on top (a second sheet inside this one, so it also
// shows on iOS, where two sibling native modals cannot be up at once). Picking anything saves it as the app's
// current location (AuthContext) and closes both sheets.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { AppPathIcon } from '../display/AppIcon'
import { APP_COLORS } from '../../../config/theme'
import { useAuth } from '../../../context/AuthContext'
import { isPatientRole } from '../../../constants/constants'
import { isPincode } from '../../../utils/pincode'
import { ROUTES } from '../../../navigation/routes'
import { navigate } from '../../../navigation/navigationService'
import {
	getAddressFromCoords,
	getCoordsFromAddress,
	getCurrentLocation,
	getCurrentLocationIfPermitted,
	searchPlaces,
	type PlaceResult,
} from '../../../services/locationService'
import { getPatientAddresses, type PatientAddress } from '../../../features/profile/patient/PatientProfileService'
import { AREAS, CITIES, CITIES_A_TO_Z, POPULAR_CITIES } from './locationCities'

const ICONS = {
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	gps: 'M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2z',
	pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
	city: 'M3 21h18M5 21V8l5-3v16M10 21V3l9 4v14M13 8h3M13 12h3M13 16h3',
	check: 'M5 12l5 5 9-10',
}

const MIN_QUERY = 3
const SEARCH_DEBOUNCE_MS = 400

/** "Chickpet, Bengaluru, Karnataka" -> "Chickpet". */
const firstPart = (s: string) => s.split(',')[0].trim()

/** The label a saved address gets once it is the current location ("Home · Bengaluru"). */
const savedLabel = (a: PatientAddress) => `${a.label} · ${a.city || firstPart(a.address_line)}`

type RowProps = {
	icon: string
	tileBg: string
	tileInk: string
	title: string
	subtitle?: string
	onPress: () => void
	busy?: boolean
	disabled?: boolean
	selected?: boolean
}

function LocationRow({ icon, tileBg, tileInk, title, subtitle, onPress, busy, disabled, selected }: RowProps) {
	return (
		<TouchableOpacity
			style={styles.row}
			onPress={onPress}
			activeOpacity={0.7}
			disabled={busy || disabled}
			accessibilityRole="button"
			accessibilityState={{ selected: !!selected }}
			accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
		>
			<View style={[styles.tile, { backgroundColor: tileBg }]} importantForAccessibility="no-hide-descendants">
				{busy ? (
					<ActivityIndicator size="small" color={tileInk} />
				) : (
					<AppPathIcon d={icon} size={18} strokeWidth={2} color={tileInk} />
				)}
			</View>
			<View style={styles.rowText}>
				<Text style={styles.rowTitle} numberOfLines={1}>
					{title}
				</Text>
				{!!subtitle && (
					<Text style={styles.rowSub} numberOfLines={1}>
						{subtitle}
					</Text>
				)}
			</View>
			{selected && <AppPathIcon d={ICONS.check} size={18} strokeWidth={2.6} color={APP_COLORS.primary} />}
		</TouchableOpacity>
	)
}

export type LocationSheetProps = {
	visible: boolean
	onClose: () => void
}

export function LocationSheet({ visible, onClose }: LocationSheetProps) {
	const { role, currentLocation, setCurrentLocation } = useAuth()
	const isPatient = isPatientRole(role)
	const current = currentLocation?.address ?? ''

	const [query, setQuery] = useState('')
	const [results, setResults] = useState<PlaceResult[]>([])
	const [searching, setSearching] = useState(false)
	const [saved, setSaved] = useState<PatientAddress[]>([])
	const [gpsLabel, setGpsLabel] = useState('')
	const [gpsBusy, setGpsBusy] = useState(false)
	const [gpsError, setGpsError] = useState('')
	const [picking, setPicking] = useState(false)
	// `areaOpen` shows the areas sheet; `areaCity` outlives it so the title keeps its city while the sheet slides out.
	const [areaOpen, setAreaOpen] = useState(false)
	const [areaCity, setAreaCity] = useState('')
	const openAreas = (city: string) => {
		setAreaCity(city)
		setAreaOpen(true)
	}
	const mounted = useRef(true)

	useEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])

	// Each time the sheet opens: clean slate, then load what the empty-field view shows. The GPS peek only runs
	// when permission is already granted (it never prompts), so the row can say where "current location" is.
	useEffect(() => {
		if (!visible) return
		let live = true
		setQuery('')
		setResults([])
		setGpsError('')
		setGpsLabel('')
		setAreaOpen(false)
		const loadSavedAddresses = async () => {
			try {
				const list = await getPatientAddresses()
				if (live) setSaved(list)
			} catch {
				if (live) setSaved([])
			}
		}
		const peekGps = async () => {
			try {
				const pos = await getCurrentLocationIfPermitted()
				if (!pos || !live) return
				const a = await getAddressFromCoords(pos.latitude, pos.longitude)
				const label = [a.area, a.city].filter(Boolean).join(', ') || a.fullAddress || ''
				if (live && label) setGpsLabel(label)
			} catch {
				// No label: the row just says "current location".
			}
		}
		if (isPatient) void loadSavedAddresses()
		void peekGps()
		return () => {
			live = false
		}
	}, [visible, isPatient])

	// Debounced place search; a newer keystroke cancels the request in flight.
	useEffect(() => {
		const text = query.trim()
		if (text.length < MIN_QUERY) {
			setResults([])
			setSearching(false)
			return
		}
		setSearching(true)
		const controller = new AbortController()
		const timer = setTimeout(() => {
			const run = async () => {
				let list: PlaceResult[] = []
				try {
					list = await searchPlaces(text, controller.signal)
				} catch {
					// A failed search shows no results rather than a spinner that never ends.
				}
				if (controller.signal.aborted || !mounted.current) return
				setResults(list)
				setSearching(false)
			}
			void run()
		}, SEARCH_DEBOUNCE_MS)
		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [query])

	const choose = useCallback(
		async (address: string, latitude: number, longitude: number, pincode?: string) => {
			// The pincode decides what is offered nearby (lab tests); a place picked from the search has none, and
			// useCurrentPincode looks it up from the coordinates.
			await setCurrentLocation({ address, latitude, longitude, ...(isPincode(pincode) ? { pincode } : {}) })
			setAreaOpen(false)
			onClose()
		},
		[setCurrentLocation, onClose]
	)

	const pickCurrentLocation = async () => {
		setGpsError('')
		setGpsBusy(true)
		try {
			const pos = await getCurrentLocation({ promptForSettings: true })
			const a = await getAddressFromCoords(pos.latitude, pos.longitude)
			const label = [a.area, a.city].filter(Boolean).join(', ') || a.fullAddress || 'Current location'
			await choose(label, pos.latitude, pos.longitude, a.pincode)
		} catch {
			if (mounted.current) setGpsError("Couldn't get your location. Check that Location is turned on.")
		} finally {
			if (mounted.current) setGpsBusy(false)
		}
	}

	const pickPlace = (place: PlaceResult) => {
		const town = firstPart(place.area)
		void choose(town ? `${place.name}, ${town}` : place.name, place.latitude, place.longitude)
	}

	// "Indiranagar, Bengaluru" (or just "Bengaluru"): the text is looked up for coordinates; without them the label
	// still shows, and features that need a position (useBookingLocation) ask for the device location instead.
	const pickNamed = async (label: string) => {
		setPicking(true)
		try {
			const found = await getCoordsFromAddress(label)
			await choose(label, found?.latitude ?? Number.NaN, found?.longitude ?? Number.NaN)
		} finally {
			if (mounted.current) setPicking(false)
		}
	}

	const pickSaved = async (a: PatientAddress) => {
		setPicking(true)
		try {
			let lat = a.latitude
			let lng = a.longitude
			if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
				const found = await getCoordsFromAddress([a.address_line, a.city, a.state].filter(Boolean).join(', '))
				lat = found?.latitude
				lng = found?.longitude
			}
			await choose(savedLabel(a), lat ?? Number.NaN, lng ?? Number.NaN, a.pincode)
		} finally {
			if (mounted.current) setPicking(false)
		}
	}

	const manageAddresses = () => {
		onClose()
		navigate(ROUTES.STACK.PATIENT_ADDRESSES)
	}

	const text = query.trim()
	const hasQuery = text.length > 0
	const needle = text.toLowerCase()
	const cityMatches = hasQuery ? CITIES.filter((c) => c.name.toLowerCase().includes(needle)) : []
	const noMatch = hasQuery && !searching && cityMatches.length === 0 && results.length === 0
	const areas = AREAS[areaCity] ?? []

	return (
		<AppBottomSheet
			visible={visible}
			title="Choose your location"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.94}
		>
			<View style={styles.field}>
				<AppPathIcon d={ICONS.search} size={20} strokeWidth={2} color={APP_COLORS.inkMuted} />
				<TextInput
					style={styles.input}
					value={query}
					onChangeText={setQuery}
					placeholder="Search city, area or landmark"
					placeholderTextColor={APP_COLORS.border}
					accessibilityLabel="Search city, area or landmark"
					returnKeyType="search"
					autoCorrect={false}
				/>
				{searching && <ActivityIndicator size="small" color={APP_COLORS.primary} />}
			</View>

			<LocationRow
				icon={ICONS.gps}
				tileBg={APP_COLORS.successBg}
				tileInk={APP_COLORS.success}
				title="Use current location"
				subtitle={
					gpsBusy
						? 'Fetching your location...'
						: gpsError || (gpsLabel ? `${gpsLabel} · via GPS` : 'Detect where you are using GPS')
				}
				onPress={() => void pickCurrentLocation()}
				busy={gpsBusy}
			/>

			{hasQuery ? (
				<>
					{cityMatches.length > 0 && (
						<>
							<Text style={styles.section}>CITIES</Text>
							{cityMatches.map((c) => (
								<LocationRow
									key={c.name}
									icon={ICONS.city}
									tileBg={APP_COLORS.pageBg}
									tileInk={APP_COLORS.primary}
									title={c.name}
									subtitle={c.state}
									onPress={() => {
										setQuery('')
										openAreas(c.name)
									}}
								/>
							))}
						</>
					)}
					{results.length > 0 && (
						<>
							<Text style={styles.section}>AREAS & LANDMARKS</Text>
							{results.map((p, i) => (
								<LocationRow
									key={`${p.name}-${p.latitude}-${p.longitude}-${i}`}
									icon={ICONS.pin}
									tileBg={APP_COLORS.pageBg}
									tileInk={APP_COLORS.primary}
									title={p.name}
									subtitle={p.area}
									onPress={() => pickPlace(p)}
								/>
							))}
						</>
					)}
					{noMatch && (
						<Text style={styles.empty}>
							{text.length < MIN_QUERY
								? 'Keep typing to search places'
								: `No match for “${text}”. We may not serve this area yet.`}
						</Text>
					)}
				</>
			) : (
				<>
					<Text style={styles.section}>POPULAR CITIES</Text>
					<View style={styles.grid}>
						{POPULAR_CITIES.map((c) => {
							const on = current === c.name
							return (
								<TouchableOpacity
									key={c.name}
									style={[styles.cityCard, on && styles.cityCardOn]}
									onPress={() => openAreas(c.name)}
									activeOpacity={0.7}
									accessibilityRole="button"
									accessibilityState={{ selected: on }}
									accessibilityLabel={c.name}
								>
									<View
										style={[styles.cityTile, on && styles.cityTileOn]}
										importantForAccessibility="no-hide-descendants"
									>
										<AppPathIcon
											d={ICONS.city}
											size={18}
											strokeWidth={2}
											color={APP_COLORS.primary}
										/>
									</View>
									<Text style={styles.cityName} numberOfLines={1}>
										{c.name}
									</Text>
								</TouchableOpacity>
							)
						})}
					</View>

					{isPatient && saved.length > 0 && (
						<>
							<View style={styles.sectionRow}>
								<Text style={styles.sectionLabel}>SAVED ADDRESSES</Text>
								<TouchableOpacity
									onPress={manageAddresses}
									hitSlop={8}
									accessibilityRole="link"
									accessibilityLabel="Manage saved addresses"
								>
									<Text style={styles.manage}>Manage</Text>
								</TouchableOpacity>
							</View>
							{saved.map((a) => (
								<LocationRow
									key={a.id}
									icon={ICONS.home}
									tileBg={APP_COLORS.pageBg}
									tileInk={APP_COLORS.primary}
									title={a.label}
									subtitle={[a.address_line, a.city].filter(Boolean).join(', ')}
									onPress={() => void pickSaved(a)}
									busy={picking}
									selected={current === savedLabel(a)}
								/>
							))}
						</>
					)}

					<Text style={styles.section}>ALL CITIES</Text>
					{CITIES_A_TO_Z.map((c) => {
						const on = current === c.name
						return (
							<TouchableOpacity
								key={c.name}
								style={styles.cityRow}
								onPress={() => openAreas(c.name)}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityState={{ selected: on }}
								accessibilityLabel={`${c.name}, ${c.state}`}
							>
								<Text style={styles.cityRowText} numberOfLines={1}>
									{c.name}
									<Text style={styles.cityRowState}>{` · ${c.state}`}</Text>
								</Text>
								{on && (
									<AppPathIcon
										d={ICONS.check}
										size={18}
										strokeWidth={2.6}
										color={APP_COLORS.primary}
									/>
								)}
							</TouchableOpacity>
						)
					})}
				</>
			)}

			<AppBottomSheet
				visible={areaOpen}
				title={`Popular areas in ${areaCity}`}
				subtitle="Pick your area to see care nearby"
				onClose={() => setAreaOpen(false)}
				appearance="modern"
				showHeaderDivider={false}
				maxHeightRatio={0.78}
			>
				{areas.map((area) => {
					const label = `${area}, ${areaCity}`
					const on = current === label
					return (
						<TouchableOpacity
							key={area}
							style={styles.areaRow}
							onPress={() => void pickNamed(label)}
							disabled={picking}
							activeOpacity={0.7}
							accessibilityRole="button"
							accessibilityState={{ selected: on }}
							accessibilityLabel={label}
						>
							<Text style={styles.areaName}>{area}</Text>
							{on && (
								<AppPathIcon d={ICONS.check} size={18} strokeWidth={2.8} color={APP_COLORS.primary} />
							)}
						</TouchableOpacity>
					)
				})}
				{areas.length === 0 && (
					<>
						<Text style={styles.empty}>We don’t have areas listed for {areaCity} yet.</Text>
						<LocationRow
							icon={ICONS.city}
							tileBg={APP_COLORS.pageBg}
							tileInk={APP_COLORS.primary}
							title={`Use ${areaCity}`}
							subtitle="Show care across the whole city"
							onPress={() => void pickNamed(areaCity)}
							busy={picking}
						/>
					</>
				)}
			</AppBottomSheet>
		</AppBottomSheet>
	)
}

export default LocationSheet

const styles = StyleSheet.create({
	field: {
		height: 48,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 6,
		paddingHorizontal: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.primary,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
	},
	input: {
		flex: 1,
		minWidth: 0,
		paddingVertical: 0,
		fontSize: 16,
		color: APP_COLORS.ink,
	},
	row: {
		minHeight: 56,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	tile: {
		width: 38,
		height: 38,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rowText: {
		flex: 1,
		minWidth: 0,
	},
	rowTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	rowSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	section: {
		marginTop: 18,
		marginBottom: 8,
		fontSize: 12,
		fontWeight: '800',
		letterSpacing: 0.72,
		color: APP_COLORS.inkMuted,
	},
	sectionRow: {
		marginTop: 18,
		marginBottom: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '800',
		letterSpacing: 0.72,
		color: APP_COLORS.inkMuted,
	},
	manage: {
		fontSize: 12,
		fontWeight: '800',
		color: APP_COLORS.primary,
	},
	empty: {
		paddingVertical: 16,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		color: APP_COLORS.inkMuted,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		rowGap: 8,
	},
	cityCard: {
		width: '32%',
		height: 84,
		paddingHorizontal: 4,
		paddingVertical: 8,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		borderWidth: 1.5,
		borderColor: '#E3EAEB',
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
	},
	cityCardOn: {
		borderColor: APP_COLORS.primary,
		backgroundColor: '#F0F7F7',
	},
	cityTile: {
		width: 34,
		height: 34,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#F0F7F7',
	},
	cityTileOn: {
		backgroundColor: APP_COLORS.surface,
	},
	cityName: {
		fontSize: 13,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	cityRow: {
		minHeight: 46,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	cityRowText: {
		flex: 1,
		minWidth: 0,
		fontSize: 15,
		color: APP_COLORS.ink,
	},
	cityRowState: {
		fontSize: 13,
		color: APP_COLORS.inkMuted,
	},
	areaRow: {
		minHeight: 52,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	areaName: {
		flex: 1,
		minWidth: 0,
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
})
