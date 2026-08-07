import React from 'react'
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AppBottomSheet from '../../../components/common/AppBottomSheet'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'
import { ServiceProcedureItem } from './AllServiceCard'

interface ServiceDetailsBottomSheetProps {
	visible: boolean
	service: ServiceProcedureItem | null
	onClose: () => void
	onAddToBooking: (service: ServiceProcedureItem) => void
}

export const ServiceDetailsBottomSheet: React.FC<ServiceDetailsBottomSheetProps> = ({
	visible,
	service,
	onClose,
	onAddToBooking,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	if (!service) return null

	const handleAdd = () => {
		onAddToBooking(service)
		onClose()
	}

	const detailedDesc =
		'Includes sterile medical equipment, thorough vitals assessment, professional sanitization, and step-by-step patient care by certified healthcare professionals.'

	const serviceInstructions =
		'Please ensure a clean, comfortable, and well-lit space for the nurse during the home visit.'

	return (
		<AppBottomSheet visible={visible} title="Service Details" onClose={onClose} maxHeightRatio={0.85}>
			<View style={[styles.container, isTablet && styles.containerTablet]}>
				{/* 1. Service Image */}
				{service.image ? (
					<Image
						source={{ uri: service.image }}
						style={[styles.image, isTablet && styles.imageTablet]}
						resizeMode="cover"
					/>
				) : null}

				{/* 2. Badges Row */}
				<View style={styles.badgeRow}>
					{service.verified && (
						<View style={styles.verifiedBadge}>
							<Ionicons name="checkmark-circle" size={13} color="#1F5F68" />
							<AppTypography variant="caption" style={styles.verifiedText}>
								Verified Provider
							</AppTypography>
						</View>
					)}
					{service.premiumBadgeText && (
						<View style={styles.premiumBadge}>
							<AppTypography variant="caption" style={styles.premiumText}>
								{service.premiumBadgeText}
							</AppTypography>
						</View>
					)}
				</View>

				{/* 3. Service Name */}
				<AppTypography variant="h2" style={styles.title}>
					{service.title}
				</AppTypography>

				{/* 4. Duration & Price Summary Pill */}
				<View style={styles.infoPillRow}>
					<View style={styles.infoPill}>
						<Ionicons name="time-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.infoPillText}>
							{service.duration}
						</AppTypography>
					</View>

					<View style={styles.infoPill}>
						<Ionicons name="pricetag-outline" size={16} color="#1F5F68" />
						<AppTypography variant="caption" style={styles.infoPillText}>
							{service.price}
						</AppTypography>
					</View>
				</View>

				{/* 5. Short & Detailed Description */}
				<View style={styles.section}>
					<AppTypography variant="h4" style={styles.sectionHeading}>
						About Service
					</AppTypography>
					<AppTypography variant="body" style={styles.descriptionText}>
						{service.description}
					</AppTypography>
					<AppTypography variant="caption" style={styles.detailedDescText}>
						{detailedDesc}
					</AppTypography>
				</View>

				{/* 6. Service Instructions / Notes */}
				<View style={styles.instructionsBox}>
					<MaterialCommunityIcons name="information-outline" size={20} color="#1F5F68" style={styles.infoIcon} />
					<View style={styles.instructionsTextCol}>
						<AppTypography variant="caption" style={styles.instructionsTitle}>
							Service Instructions
						</AppTypography>
						<AppTypography variant="caption" style={styles.instructionsText}>
							{serviceInstructions}
						</AppTypography>
					</View>
				</View>

				{/* 7. Primary CTA: Add to Booking */}
				<View style={styles.ctaContainer}>
					<AppButton
						variant="primary"
						formAction
						style={styles.addBtn}
						onPress={handleAdd}
					>
						Add to Booking
					</AppButton>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 8,
		paddingBottom: 16,
	},
	containerTablet: {
		maxWidth: 640,
		alignSelf: 'center',
		width: '100%',
	},
	image: {
		width: '100%',
		height: 140,
		borderRadius: 14,
		marginBottom: 14,
		backgroundColor: '#F1F5F9',
	},
	imageTablet: {
		height: 180,
		borderRadius: 16,
	},
	badgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 10,
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F3F4',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		gap: 3,
	},
	verifiedText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#1F5F68',
	},
	premiumBadge: {
		backgroundColor: '#CFF4F5',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
	},
	premiumText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#0D474D',
		letterSpacing: 0.3,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 12,
		lineHeight: 26,
	},
	infoPillRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 16,
	},
	infoPill: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F0F9F9',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 6,
		borderWidth: 1,
		borderColor: '#D4EFEF',
	},
	infoPillText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#1F5F68',
	},
	section: {
		marginBottom: 16,
	},
	sectionHeading: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 6,
	},
	descriptionText: {
		fontSize: 13,
		color: '#334155',
		lineHeight: 18,
		marginBottom: 6,
	},
	detailedDescText: {
		fontSize: 12,
		color: '#64748B',
		lineHeight: 17,
	},
	instructionsBox: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F8FAFC',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		marginBottom: 20,
	},
	infoIcon: {
		marginRight: 10,
		marginTop: 2,
	},
	instructionsTextCol: {
		flex: 1,
	},
	instructionsTitle: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1F5F68',
		marginBottom: 2,
	},
	instructionsText: {
		fontSize: 11,
		color: '#475569',
		lineHeight: 15,
	},
	ctaContainer: {
		width: '100%',
	},
	addBtn: {
		width: '100%',
		borderRadius: 14,
	},
})
