// "Choose your location" bottom sheet (Patient Dashboard design, "1 · Home — new icons"): opens from the Home
// header's location row. A search field, "Use current location" (GPS), then either the search RESULTS or, with an
// empty field, the patient's SAVED addresses and RECENT places. Picking anything saves it as the app's current
// location (AuthContext) and closes the sheet.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppBottomSheet } from '../layout/AppBottomSheet'
import { AppPathIcon } from '../display/AppIcon'
import AppSearchBar from '../inputs/AppSearchBar'
import { APP_COLORS } from '../../../config/theme'
import { useAuth } from '../../../context/AuthContext'
import { isPatientRole } from '../../../constants/constants'
import {
	getAddressFromCoords,
	getCoordsFromAddress,
	getCurrentLocation,
	getCurrentLocationIfPermitted,
	searchPlaces,
	type PlaceResult,
} from '../../../services/locationService'
import { getPatientAddresses, type PatientAddress } from '../../../features/profile/patient/PatientProfileService'

const ICONS = {
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	gps: 'M12 19a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M2 12h3M19 12h3',
	pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	home: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
	recent: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
}

const RECENT_KEY = 'recent_locations'
const RECENT_MAX = 3
const MIN_QUERY = 3
const SEARCH_DEBOUNCE_MS = 400

/** "Chickpet, Bengaluru, Karnataka" -> "Chickpet". */
const firstPart = (s: string) => s.split(',')[0].trim()

const loadRecent = async (): Promise<PlaceResult[]> => {
	try {
		const raw = await AsyncStorage.getItem(RECENT_KEY)
		const list = raw ? (JSON.parse(raw) as PlaceResult[]) : []
		return Array.isArray(list) ? list.slice(0, RECENT_MAX) : []
	} catch {
		return []
	}
}

const rememberRecent = async (place: PlaceResult) => {
	try {
		const list = (await loadRecent()).filter((p) => !(p.name === place.name && p.area === place.area))
		await AsyncStorage.setItem(RECENT_KEY, JSON.stringify([place, ...list].slice(0, RECENT_MAX)))
	} catch {
		// Recents are a convenience; failing to save one must not block choosing the place.
	}
}

type RowProps = {
	icon: string
	tileBg: string
	tileInk: string
	title: string
	subtitle?: string
	onPress: () => void
	busy?: boolean
}

function LocationRow({ icon, tileBg, tileInk, title, subtitle, onPress, busy }: RowProps) {
	return (
		<TouchableOpacity
			style={styles.row}
			onPress={onPress}
			activeOpacity={0.7}
			disabled={busy}
			accessibilityRole="button"
			accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
		>
			<View style={[styles.tile, { backgroundColor: tileBg }]} importantForAccessibility="no-hide-descendants">
				{busy ? (
					<ActivityIndicator size="small" color={tileInk} />
				) : (
					<AppPathIcon d={icon} size={20} strokeWidth={2} color={tileInk} />
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
		</TouchableOpacity>
	)
}

export type LocationSheetProps = {
	visible: boolean
	onClose: () => void
}

export function LocationSheet({ visible, onClose }: LocationSheetProps) {
	const { role, setCurrentLocation } = useAuth()
	const isPatient = isPatientRole(role)

	const [query, setQuery] = useState('')
	const [results, setResults] = useState<PlaceResult[]>([])
	const [searching, setSearching] = useState(false)
	const [saved, setSaved] = useState<PatientAddress[]>([])
	const [recent, setRecent] = useState<PlaceResult[]>([])
	const [gpsLabel, setGpsLabel] = useState('')
	const [gpsBusy, setGpsBusy] = useState(false)
	const [gpsError, setGpsError] = useState('')
	const [picking, setPicking] = useState(false)
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
		void loadRecent().then((list) => live && setRecent(list))
		if (isPatient) {
			getPatientAddresses()
				.then((list) => live && setSaved(list))
				.catch(() => live && setSaved([]))
		}
		getCurrentLocationIfPermitted()
			.then(async (pos) => {
				if (!pos || !live) return
				const a = await getAddressFromCoords(pos.latitude, pos.longitude)
				const label = [a.area, a.city].filter(Boolean).join(', ') || a.fullAddress || ''
				if (live && label) setGpsLabel(label)
			})
			.catch(() => undefined)
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
			void searchPlaces(text, controller.signal).then((list) => {
				if (controller.signal.aborted || !mounted.current) return
				setResults(list)
				setSearching(false)
			})
		}, SEARCH_DEBOUNCE_MS)
		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [query])

	const choose = useCallback(
		async (address: string, latitude: number, longitude: number) => {
			await setCurrentLocation({ address, latitude, longitude })
			onClose()
		},
		[setCurrentLocation, onClose]
	)

	const useCurrent = async () => {
		setGpsError('')
		setGpsBusy(true)
		try {
			const pos = await getCurrentLocation({ promptForSettings: true })
			const a = await getAddressFromCoords(pos.latitude, pos.longitude)
			const label = [a.area, a.city].filter(Boolean).join(', ') || a.fullAddress || 'Current location'
			await choose(label, pos.latitude, pos.longitude)
		} catch {
			if (mounted.current) setGpsError("Couldn't get your location. Check that Location is turned on.")
		} finally {
			if (mounted.current) setGpsBusy(false)
		}
	}

	const pickPlace = (place: PlaceResult) => {
		void rememberRecent(place)
		const town = firstPart(place.area)
		void choose(town ? `${place.name}, ${town}` : place.name, place.latitude, place.longitude)
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
			// Without coordinates the label still shows; features that need a position (useBookingLocation) check for
			// finite numbers and ask for the device location instead.
			await choose(`${a.label} · ${a.city || firstPart(a.address_line)}`, lat ?? Number.NaN, lng ?? Number.NaN)
		} finally {
			if (mounted.current) setPicking(false)
		}
	}

	const text = query.trim()
	const hasQuery = text.length > 0

	return (
		<AppBottomSheet
			visible={visible}
			title="Choose your location"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			maxHeightRatio={0.92}
		>
			<AppSearchBar
				context="location"
				value={query}
				onChangeText={setQuery}
				showMicrophone={false}
				trailing={searching ? <ActivityIndicator size="small" color={APP_COLORS.primary} /> : undefined}
				style={styles.searchBar}
			/>

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
				onPress={() => void useCurrent()}
				busy={gpsBusy}
			/>

			{hasQuery ? (
				<>
					<Text style={styles.section}>RESULTS</Text>
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
					{!searching && results.length === 0 && (
						<Text style={styles.empty}>
							{text.length < MIN_QUERY ? 'Keep typing to search places' : 'No places found'}
						</Text>
					)}
				</>
			) : (
				<>
					{saved.length > 0 && (
						<>
							<Text style={styles.section}>SAVED</Text>
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
								/>
							))}
						</>
					)}
					{recent.length > 0 && (
						<>
							<Text style={styles.section}>RECENT</Text>
							{recent.map((p, i) => (
								<LocationRow
									key={`${p.name}-${i}`}
									icon={ICONS.recent}
									tileBg={APP_COLORS.pageBg}
									tileInk={APP_COLORS.primary}
									title={p.name}
									subtitle={p.area}
									onPress={() => pickPlace(p)}
								/>
							))}
						</>
					)}
				</>
			)}
		</AppBottomSheet>
	)
}

export default LocationSheet

const styles = StyleSheet.create({
	searchBar: {
		marginBottom: 8,
	},
	row: {
		minHeight: 60,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	tile: {
		width: 40,
		height: 40,
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
		marginTop: 14,
		fontSize: 12,
		fontWeight: '800',
		letterSpacing: 0.72,
		color: APP_COLORS.inkMuted,
	},
	empty: {
		paddingVertical: 16,
		fontSize: 14,
		color: APP_COLORS.inkMuted,
	},
})
