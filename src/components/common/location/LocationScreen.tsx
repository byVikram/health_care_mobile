import React, { useState, useRef, useCallback } from 'react'
import {
	View,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator,
	FlatList,
	Keyboard,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useAuth } from '../../../context/AuthContext'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import { getCurrentLocation, getAddressFromCoords } from '../../../services/locationService'
import AppScreenHeader from '../layout/AppScreenHeader'
import { AppInput } from '../inputs/AppInput'
import { AppTypography } from '../display/AppTypography'
import { AppButton } from '../buttons/AppButton'

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface LatLng {
	latitude: number
	longitude: number
}

interface NominatimResult {
	place_id: number
	display_name: string
	lat: string
	lon: string
	address: {
		road?: string
		suburb?: string
		city?: string
		town?: string
		state?: string
		country?: string
	}
}

// ─────────────────────────────────────────────────────────────
// Nominatim search (OpenStreetMap — 100% free, no API key)
// ─────────────────────────────────────────────────────────────

const searchNominatim = async (query: string): Promise<NominatimResult[]> => {
	const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=10`

	const res = await fetch(url, {
		headers: {
			'User-Agent': 'MyHealthApp/1.0 (contact@myhealthapp.com)',
			'Accept-Language': 'en',
		},
	})

	return res.json()
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export default function LocationScreen() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation()
	const { setCurrentLocation } = useAuth()

	// ── State ────────────────────────────────────────────────
	const [gpsLoading, setGpsLoading] = useState(false)
	const [address, setAddress] = useState('')
	const [coords, setCoords] = useState<LatLng | null>(null)

	const [searchText, setSearchText] = useState('')
	const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
	const [searchLoading, setSearchLoading] = useState(false)

	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

	// ── Helpers ──────────────────────────────────────────────
	interface AddressResponse {
		area?: string
		city?: string
		district?: string
		state?: string
		country?: string
		fullAddress?: string
	}

	const resolveReadableAddress = (value: string | AddressResponse | null | undefined) => {
		if (typeof value === 'string') return value
		return value?.fullAddress ?? ''
	}

	const applyLocation = (position: LatLng, readable: string | AddressResponse | null | undefined) => {
		setCoords(position)
		setAddress(resolveReadableAddress(readable))
		setSuggestions([])
		setSearchText(resolveReadableAddress(readable))
	}

	// ── GPS ──────────────────────────────────────────────────
	const handleEnableLocation = async () => {
		Keyboard.dismiss()
		try {
			setGpsLoading(true)
			const position = await getCurrentLocation({ promptForSettings: true })
			const readable = await getAddressFromCoords(position.latitude, position.longitude)
			applyLocation(position, readable)
		} catch (err: any) {
			console.warn('GPS error:', err?.message ?? err)
		} finally {
			setGpsLoading(false)
		}
	}

	// ── Nominatim search ─────────────────────────────────────
	const handleSearchChange = useCallback((text: string) => {
		setSearchText(text)
		setAddress('')
		setCoords(null)

		if (debounceTimer.current) clearTimeout(debounceTimer.current)

		if (text.trim().length < 3) {
			setSuggestions([])
			return
		}

		debounceTimer.current = setTimeout(async () => {
			try {
				setSearchLoading(true)
				const results = await searchNominatim(text)
				setSuggestions(results)
			} catch {
				setSuggestions([])
			} finally {
				setSearchLoading(false)
			}
		}, 500)
	}, [])

	const handleSelectSuggestion = (item: NominatimResult) => {
		Keyboard.dismiss()
		const position: LatLng = {
			latitude: parseFloat(item.lat),
			longitude: parseFloat(item.lon),
		}

		const { road, suburb, city, town, state } = item.address
		const readable = [road, suburb, city ?? town, state].filter(Boolean).join(', ') || item.display_name

		applyLocation(position, readable)
	}

	// ── Confirm ──────────────────────────────────────────────
	const handleConfirm = () => {
		if (address && coords) {
			setCurrentLocation({
				address,
				latitude: coords.latitude,
				longitude: coords.longitude,
			})
			navigation.goBack()
		}
	}

	// ─────────────────────────────────────────────────────────
	// Render
	// ─────────────────────────────────────────────────────────

	const renderSuggestionItem = ({ item }: { item: NominatimResult }) => {
		const { road, suburb, city, town, state } = item.address
		const main = road ?? suburb ?? city ?? town ?? 'Location'
		const sub = [city ?? town, state].filter(Boolean).join(', ')

		const isSelected = coords?.latitude === parseFloat(item.lat) && coords?.longitude === parseFloat(item.lon)

		return (
			<TouchableOpacity
				style={[styles.resultItem, isSelected && styles.resultItemSelected]}
				onPress={() => handleSelectSuggestion(item)}
				activeOpacity={0.7}
			>
				<View style={styles.iconContainer}>
					<MaterialCommunityIcons name="map-marker-outline" size={24} color="#64748b" />
				</View>
				<View style={styles.resultTexts}>
					<AppTypography variant="body" style={styles.resultMain} numberOfLines={1}>
						{main}
					</AppTypography>
					{sub.length > 0 && (
						<AppTypography variant="caption" style={styles.resultSub} numberOfLines={1}>
							{sub}
						</AppTypography>
					)}
				</View>
				<MaterialCommunityIcons name="chevron-right" size={20} color="#cbd5e1" />
			</TouchableOpacity>
		)
	}

	return (
		<View style={styles.root}>
			<AppScreenHeader title="Select Location" />

			<View style={styles.content}>
				<View style={styles.searchContainer}>
					<AppInput
						placeholder="Search for area, street or landmark"
						value={searchText}
						onChangeText={handleSearchChange}
						isSearch
						autoFocus
					/>
					{searchLoading && (
						<ActivityIndicator size="small" color="#0c7c7c" style={{ position: 'absolute', right: 24, top: 32 }} />
					)}
				</View>

				{suggestions.length === 0 && !address && (
					<TouchableOpacity style={styles.currentLocationBtn} onPress={handleEnableLocation} activeOpacity={0.7}>
						<View style={styles.currentLocationIconContainer}>
							<MaterialCommunityIcons name="crosshairs-gps" size={24} color="#0c7c7c" />
						</View>
						<View style={styles.resultTexts}>
							<AppTypography variant="body" style={styles.currentLocationMain}>
								Use Current Location
							</AppTypography>
							{gpsLoading && (
								<AppTypography variant="caption" style={styles.currentLocationSub}>
									Fetching your location...
								</AppTypography>
							)}
						</View>
					</TouchableOpacity>
				)}

				<FlatList
					data={suggestions}
					keyExtractor={(item) => item.place_id.toString()}
					renderItem={renderSuggestionItem}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={styles.listContainer}
				/>
			</View>

			<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 16, 24) }]}>
				<AppButton variant="primary" disabled={!address || !coords} onPress={handleConfirm}>
					Confirm Location
				</AppButton>
			</View>
		</View>
	)
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#f8fafc', // Very subtle off-white/gray background
	},
	content: {
		flex: 1,
	},
	searchContainer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8,
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	listContainer: {
		paddingTop: 8,
		paddingBottom: 24,
	},
	currentLocationBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	currentLocationIconContainer: {
		width: 40,
		alignItems: 'flex-start',
	},
	currentLocationMain: {
		color: '#0c7c7c',
		fontWeight: '600',
	},
	currentLocationSub: {
		color: '#64748b',
		marginTop: 2,
	},
	resultItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 16,
		backgroundColor: '#ffffff',
		borderBottomWidth: 1,
		borderBottomColor: '#f1f5f9',
	},
	resultItemSelected: {
		backgroundColor: '#f0fdfa', // Subtle teal background for selection
	},
	iconContainer: {
		width: 40,
		alignItems: 'flex-start',
	},
	resultTexts: {
		flex: 1,
		justifyContent: 'center',
	},
	resultMain: {
		fontWeight: '500',
		color: '#1e293b',
	},
	resultSub: {
		color: '#64748b',
		marginTop: 4,
	},
	footer: {
		paddingHorizontal: 16,
		paddingTop: 16,
		backgroundColor: '#ffffff',
		borderTopWidth: 1,
		borderTopColor: '#f1f5f9',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 10,
	},
})