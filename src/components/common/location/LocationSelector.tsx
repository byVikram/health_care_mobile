import React, { useState } from 'react'
import { StyleSheet, TouchableOpacity, type StyleProp, type TextStyle } from 'react-native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import { AppTypography } from '../display/AppTypography'
import { useAuth } from '../../../context/AuthContext'
import { LocationSheet } from './LocationSheet'
import { offerAppSettings, openLocationServicesSettings } from '../../../services/locationService'

interface LocationSelectorProps {
	location?: string
	color?: string
	/** Extra label style (e.g. the patient Home header's 13/600). */
	textStyle?: StyleProp<TextStyle>
	/** Pin / chevron glyph size. Defaults to 16. */
	iconSize?: number
}

export default function LocationSelector({
	location,
	color = '#f2f4f4',
	textStyle,
	iconSize = 16,
}: LocationSelectorProps) {
	const { currentLocation, locationStatus } = useAuth()
	const [open, setOpen] = useState(false)

	// With no location yet, the row says what the automatic lookup (hooks/useAutoLocation) is doing; a place can still be picked by hand.
	const waiting = !currentLocation?.address
	const statusText = !waiting
		? ''
		: locationStatus === 'detecting'
			? 'Detecting location…'
			: locationStatus === 'denied'
				? 'Enable location'
				: locationStatus === 'off'
					? 'Turn on location'
					: ''
	const displayLocation = currentLocation?.address || statusText || location || 'Select Location'
	// Permission refused or the phone's Location switch off. With no location yet the row asks to enable it; with the last detected
	// one (source 'auto') it stays shown, marked "Location off", and the same prompt offers Settings. A place the patient picked by
	// hand needs no GPS, so it is never marked.
	const accessOff = locationStatus === 'denied' || locationStatus === 'off'
	const staleAuto = !waiting && accessOff && currentLocation?.source === 'auto'
	const needsSettings = (waiting && accessOff) || staleAuto

	const handlePress = () => {
		if (!needsSettings) {
			setOpen(true)
			return
		}
		// Say so and offer the Settings page (Android: the Location switch when that is what is off; iOS: the app's settings) or a manual
		// pick. The system permission dialog is not shown again from here.
		const chooseManually = { cancelText: 'Choose manually', onCancel: () => setOpen(true) }
		const kept = staleAuto ? ` We are showing your last location (${displayLocation}) until then.` : ''
		if (locationStatus === 'off') {
			offerAppSettings({
				title: 'Location is off',
				description: `Turn on your phone’s Location (GPS) to see doctors and services near you.${kept}`,
				submitText: 'Enable location',
				openSettings: () => void openLocationServicesSettings(),
				...chooseManually,
			})
		} else {
			offerAppSettings({
				title: 'Location access is off',
				description: `Allow Location for KarolaHealth in your phone’s App settings to see doctors and services near you.${kept}`,
				submitText: 'Enable location',
				...chooseManually,
			})
		}
	}
	return (
		<>
			<TouchableOpacity
				style={styles.locationRow}
				onPress={handlePress}
				activeOpacity={0.7}
				accessibilityRole="button"
				accessibilityLabel={
					staleAuto
						? `Your last location: ${displayLocation}. Location access is off. Enable location`
						: `Your location: ${displayLocation}. Change`
				}
			>
				<MaterialCommunityIcons
					name={staleAuto ? 'map-marker-off-outline' : 'map-marker-outline'}
					size={iconSize}
					color={color}
				/>
				<AppTypography
					variant="body"
					style={[styles.locationText, { color }, textStyle, staleAuto && styles.locationTextShort]}
					numberOfLines={1}
				>
					{displayLocation}
				</AppTypography>
				{staleAuto && (
					<AppTypography variant="body" style={[styles.offTag, textStyle]} numberOfLines={1}>
						Location off
					</AppTypography>
				)}
				<MaterialCommunityIcons name="chevron-down" size={iconSize} color={color} />
			</TouchableOpacity>
			<LocationSheet visible={open} onClose={() => setOpen(false)} />
		</>
	)
}

const styles = StyleSheet.create({
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	locationText: {
		fontWeight: '500',
		maxWidth: 200,
	},
	locationTextShort: {
		maxWidth: 120,
	},
	offTag: {
		fontWeight: '700',
		fontSize: 11,
		color: '#FFD28A',
	},
})
