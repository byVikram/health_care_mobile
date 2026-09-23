import React from 'react'
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'
import { AncillaryPackageListItem } from '../ancillaryService'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'

interface PackageSectionCardProps {
	item: AncillaryPackageListItem
	onPress: (item: AncillaryPackageListItem) => void
}

/**
 * Row-style card for the "Packages" section of the service catalog screen,
 * matching the layout of the individual-service cards (ServiceCatalogCard):
 * title + "N Services Included" + price on the left with a "View details"
 * link, and an image with an overlapping "ADD +" button on the right.
 * Package booking isn't wired yet, so both "View details" and "ADD +" open
 * the same package-details sheet via onPress.
 */
export const PackageSectionCard: React.FC<PackageSectionCardProps> = ({ item, onPress }) => {
	const count = item.procedureCount ?? 0
	const imageSource = getAncillaryImageSource(item.imageUrl)

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
					<Image source={imageSource} style={styles.image} resizeMode="cover" />
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
		color: '#1F5F68',
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
