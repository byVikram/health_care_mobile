// src/components/common/display/ProviderDetailsCard.tsx
import React from 'react'
import { Image, ImageSourcePropType, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const DEFAULT_PROVIDER_IMAGE = require('../../../assets/Laboratory/lab1.jpg')
const DEFAULT_PROVIDER_NAME = 'Lifeline Labs'
const DEFAULT_PROVIDER_SUBTITLE = 'Booking Lab Tests At'
const DEFAULT_PROVIDER_ADDRESS = '23, 1st Main, 5th Block, Koramangala, Bengaluru, 560034'
const DEFAULT_PROVIDER_PHONE = '080 4567 8900'
const DEFAULT_PROVIDER_HOURS: ProviderHoursRow[] = [
	{ label: 'Mon - Sat', value: '7:00 AM - 8:00 PM' },
	{ label: 'Sun', value: '7:00 AM - 1:00 PM' },
]

export interface ProviderHoursRow {
	label: string
	value: string
}

export interface ProviderDetailsCardProps {
	/** Provider display name, e.g. "Lifeline Labs" */
	name: string
	/** Small label above the provider name, e.g. "Booking Lab Tests At" */
	subtitle?: string
	/** Small icon shown next to the name (defaults per-provider type via `kind`) */
	icon?: string
	/** Resolved image URL (S3) for the provider logo/photo */
	imageUri?: string | null
	/** Local fallback image (require(...)) used when imageUri is not available */
	imageSource?: ImageSourcePropType
	address?: string | null
	/** City shown alongside / instead of address when address is unavailable */
	city?: string | null
	phone?: string | null
	/** Pre-formatted operating hours rows, e.g. [{label:'Mon - Sat', value:'7:00 AM - 8:00 PM'}] */
	hours?: ProviderHoursRow[]
	/** Convenience flag — renders a single "Open 24x7" hours row */
	is24x7?: boolean
	/** Brand accent color used for icons/links (defaults to teal) */
	accentColor?: string
	/** Called when "View on Map" is pressed. Falls back to opening a maps search for `address`. */
	onViewMap?: () => void
	/** Called when the phone row is pressed. Falls back to opening the dialer. */
	onCallPress?: () => void
}

/**
 * Reusable provider details block shown immediately below the page header on every
 * booking flow. The layout intentionally mirrors the supplied mobile reference:
 * identity/address/phone on the left, provider image and timings on the right.
 */
export default function ProviderDetailsCard({
	name,
	subtitle = DEFAULT_PROVIDER_SUBTITLE,
	icon = 'flask-plus',
	imageUri,
	imageSource,
	address,
	city,
	phone,
	hours,
	is24x7,
	accentColor = '#2B6F71',
	onViewMap,
	onCallPress,
}: ProviderDetailsCardProps) {
	const resolvedName = name || DEFAULT_PROVIDER_NAME
	const resolvedAddress = address || city || DEFAULT_PROVIDER_ADDRESS
	const resolvedPhone = phone || DEFAULT_PROVIDER_PHONE

	const handleViewMap = () => {
		if (onViewMap) {
			onViewMap()
			return
		}
		const query = encodeURIComponent(resolvedAddress)
		Linking.openURL(`https://maps.google.com/?q=${query}`).catch(() => {})
	}

	const handleCallPress = () => {
		if (onCallPress) {
			onCallPress()
			return
		}
		const cleaned = resolvedPhone.replace(/\s/g, '')
		Linking.openURL(`tel:${cleaned}`).catch(() => {})
	}

	const hourRows: ProviderHoursRow[] = hours?.length
		? hours
		: is24x7
			? [{ label: 'Daily', value: 'Open 24x7' }]
			: DEFAULT_PROVIDER_HOURS

	const imageSrc: ImageSourcePropType = imageUri ? { uri: imageUri } : imageSource || DEFAULT_PROVIDER_IMAGE

	return (
		<View style={styles.card}>
			<View style={styles.contentRow}>
				<View style={styles.leftCol}>
					<View style={styles.identityRow}>
						<View style={[styles.iconCircle, { backgroundColor: `${accentColor}1A` }]}>
							<MaterialCommunityIcons name={icon as any} size={28} color={accentColor} />
						</View>
						<View style={styles.titleBlock}>
							<Text style={[styles.subtitle, { color: accentColor }]} numberOfLines={1}>
								{subtitle}
							</Text>
							<Text style={styles.name} numberOfLines={1}>
								{resolvedName}
							</Text>
						</View>
					</View>

					<View style={styles.detailRow}>
						<MaterialCommunityIcons name="map-marker-outline" size={15} color={accentColor} style={styles.detailIcon} />
						<View style={styles.addressBlock}>
							<Text style={styles.addressText} numberOfLines={3}>
								{resolvedAddress}
							</Text>
							<TouchableOpacity onPress={handleViewMap} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
								<Text style={[styles.mapLink, { color: accentColor }]}>View on Map &gt;</Text>
							</TouchableOpacity>
						</View>
					</View>

					<TouchableOpacity style={styles.detailRow} onPress={handleCallPress} activeOpacity={0.7}>
						<MaterialCommunityIcons name="phone-outline" size={15} color={accentColor} style={styles.detailIcon} />
						<Text style={styles.phoneText}>{resolvedPhone}</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.rightCol}>
					<Image source={imageSrc} style={styles.providerImage} resizeMode="cover" />

					<View style={styles.hoursBlock}>
						<MaterialCommunityIcons name="clock-outline" size={15} color={accentColor} style={styles.hoursIcon} />
						<View style={styles.hoursTextBlock}>
							{hourRows.map((row, idx) => (
								<View key={`${row.label}-${idx}`} style={styles.hoursPair}>
									<Text style={styles.hoursLabel}>{row.label}</Text>
									<Text style={styles.hoursValue}>{row.value}</Text>
								</View>
							))}
						</View>
					</View>
				</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		paddingHorizontal: 18,
		paddingTop: 22,
		paddingBottom: 22,
		marginBottom: 16,
		marginHorizontal: -16,
	},
	contentRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		gap: 14,
	},
	leftCol: {
		flex: 1,
		minWidth: 0,
		paddingLeft: 4,
	},
	rightCol: {
		width: 128,
		alignItems: 'stretch',
	},
	identityRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 22,
	},
	iconCircle: {
		width: 46,
		height: 46,
		borderRadius: 23,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	titleBlock: {
		flex: 1,
		minWidth: 0,
	},
	subtitle: {
		fontSize: 9,
		fontWeight: '700',
		marginBottom: 5,
	},
	name: {
		fontSize: 21,
		lineHeight: 25,
		fontWeight: '800',
		color: '#0F172A',
	},
	detailRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 14,
	},
	detailIcon: {
		width: 18,
		marginTop: 1,
		marginRight: 10,
	},
	addressBlock: {
		flex: 1,
		minWidth: 0,
	},
	addressText: {
		fontSize: 10,
		lineHeight: 15,
		color: '#0F172A',
		fontWeight: '500',
	},
	mapLink: {
		fontSize: 10,
		lineHeight: 14,
		fontWeight: '800',
		marginTop: 9,
	},
	phoneText: {
		fontSize: 11,
		lineHeight: 16,
		color: '#0F172A',
		fontWeight: '600',
	},
	providerImage: {
		width: 128,
		height: 86,
		borderRadius: 6,
		backgroundColor: '#E2E8F0',
	},
	hoursBlock: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 18,
	},
	hoursIcon: {
		width: 17,
		marginTop: 2,
		marginRight: 8,
	},
	hoursTextBlock: {
		flex: 1,
		gap: 7,
	},
	hoursPair: {
		gap: 2,
	},
	hoursLabel: {
		fontSize: 10,
		lineHeight: 13,
		color: '#0F172A',
		fontWeight: '600',
	},
	hoursValue: {
		fontSize: 10,
		lineHeight: 13,
		color: '#0F172A',
		fontWeight: '500',
	},
})
