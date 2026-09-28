import React from 'react'
import { View, StyleSheet, Image, TouchableOpacity, ImageSourcePropType } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../display/AppTypography'

export interface PackageListItem {
	id: string
	label: string
	description?: string | null
	imageUrl?: string | null
	packagePrice: number
	procedureCount: number
}

interface PackageSectionCardProps {
	item: PackageListItem
	onPress: (item: PackageListItem) => void
	/** Resolves a raw `imageUrl` string into a displayable `ImageSourcePropType`
	 *  (e.g. a domain-specific bundled-asset registry). Kept out of this shared
	 *  component so `common/booking` has no dependency on any feature folder —
	 *  pass your feature's own resolver (e.g. Ancillary's `getAncillaryImageSource`)
	 *  to reproduce that feature's current image behavior. When omitted (or when
	 *  it returns nothing), a generic placeholder icon is shown instead. */
	resolveImageSource?: (raw?: string | null) => ImageSourcePropType | undefined
}

/**
 * Row-style card for a "Packages" section on a service catalog screen,
 * matching the layout of the individual-service cards (`ServiceCatalogCard`):
 * title + "N Services Included" + price on the left with a "View details"
 * link, and an image with an overlapping "ADD +" button on the right.
 */
export const PackageSectionCard: React.FC<PackageSectionCardProps> = ({ item, onPress, resolveImageSource }) => {
	const count = item.procedureCount ?? 0
	const imageSource = resolveImageSource?.(item.imageUrl)

	const handlePress = () => onPress(item)

	return (
		<TouchableOpacity style={styles.cardContainer} onPress={handlePress} activeOpacity={0.9}>
			{/* Left Column: Package Details */}
			<View style={styles.leftCol}>
				<View style={styles.packageBadge}>
					<Ionicons name="layers-outline" size={11} color="#0C5F60" />
					<AppTypography variant="caption" style={styles.packageBadgeText}>
						PACKAGE
					</AppTypography>
				</View>

				<AppTypography variant="h3" style={styles.title} numberOfLines={2}>
					{item.label}
				</AppTypography>

				<View style={styles.includedRow}>
					<Ionicons name="checkmark-circle-outline" size={13} color="#10B981" />
					<AppTypography variant="caption" style={styles.includedText}>
						{`${count} ${count === 1 ? 'Service' : 'Services'} Included`}
					</AppTypography>
				</View>

				<View style={styles.priceRow}>
					<AppTypography variant="h3" style={styles.priceText}>
						{`₹${item.packagePrice}`}
					</AppTypography>
				</View>

				<TouchableOpacity style={styles.viewDetailsBtn} onPress={handlePress} activeOpacity={0.7}>
					<AppTypography variant="caption" style={styles.viewDetailsText}>
						View details
					</AppTypography>
				</TouchableOpacity>
			</View>

			{/* Right Column: Image Box + Overlapping ADD Button */}
			<View style={styles.rightCol}>
				<View style={styles.imageBox}>
					{imageSource ? (
						<Image source={imageSource} style={styles.image} resizeMode="cover" />
					) : (
						<View style={styles.fallbackWrap}>
							<MaterialCommunityIcons name="flask-outline" size={28} color="#0C7C7C" />
						</View>
					)}
				</View>

				<View style={styles.actionButtonWrapper}>
					<TouchableOpacity style={styles.addBtn} onPress={handlePress} activeOpacity={0.85}>
						<AppTypography variant="caption" style={styles.addBtnText}>
							ADD +
						</AppTypography>
					</TouchableOpacity>
				</View>
			</View>
		</TouchableOpacity>
	)
}

export default PackageSectionCard

const styles = StyleSheet.create({
	cardContainer: {
		flexDirection: 'row',
		paddingVertical: 14,
		paddingHorizontal: 0,
		borderBottomWidth: 1,
		borderBottomColor: '#E2E8F0',
		backgroundColor: '#FFFFFF',
		alignItems: 'flex-start',
	},
	leftCol: {
		flex: 1,
		paddingRight: 12,
		gap: 4,
	},
	packageBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		gap: 4,
		backgroundColor: 'rgba(12, 124, 124, 0.12)',
		borderRadius: 4,
		paddingHorizontal: 6,
		paddingVertical: 2,
		marginBottom: 2,
	},
	packageBadgeText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0C5F60',
		letterSpacing: 0.4,
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#181C1D',
		lineHeight: 20,
	},
	includedRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	includedText: {
		fontSize: 12.5,
		fontWeight: '500',
		color: '#0C7C7C',
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
	},
	priceText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#181C1D',
	},
	viewDetailsBtn: {
		marginTop: 3,
		alignSelf: 'flex-start',
	},
	viewDetailsText: {
		fontSize: 12.5,
		fontWeight: '600',
		color: '#0C7C7C',
	},

	rightCol: {
		width: 96,
		alignItems: 'center',
		position: 'relative',
	},
	imageBox: {
		width: 96,
		height: 72,
		borderRadius: 10,
		overflow: 'hidden',
		backgroundColor: '#F1F4F4',
		position: 'relative',
	},
	image: {
		width: '100%',
		height: '100%',
	},
	fallbackWrap: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
	},
	actionButtonWrapper: {
		marginTop: -12,
		zIndex: 20,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 3,
		elevation: 3,
	},
	addBtn: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1.5,
		borderColor: '#0C7C7C',
		borderRadius: 6,
		paddingHorizontal: 14,
		paddingVertical: 4.5,
		alignItems: 'center',
		justifyContent: 'center',
		minWidth: 70,
	},
	addBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#0C7C7C',
		letterSpacing: 0.2,
	},
})
