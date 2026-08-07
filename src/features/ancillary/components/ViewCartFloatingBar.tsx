import React from 'react'
import { StyleSheet, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

interface ViewCartFloatingBarProps {
	selectedCount: number
	onViewCart: () => void
}

export const ViewCartFloatingBar: React.FC<ViewCartFloatingBarProps> = ({
	selectedCount,
	onViewCart,
}) => {
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	if (selectedCount <= 0) return null

	return (
		<View style={[styles.wrapper, isTablet && styles.wrapperTablet]}>
			<View style={styles.contentRow}>
				<View style={styles.infoCol}>
					<View style={styles.iconCircle}>
						<MaterialCommunityIcons name="medical-bag" size={20} color="#FFFFFF" />
					</View>
					<View style={styles.textCol}>
						<AppTypography variant="h4" style={styles.countText}>
							{selectedCount} Service{selectedCount > 1 ? 's' : ''} Selected
						</AppTypography>
						<AppTypography variant="caption" style={styles.subText}>
							Tap to review booking summary
						</AppTypography>
					</View>
				</View>

				<AppButton
					variant="secondary"
					compact={true}
					style={styles.viewCartBtn}
					labelStyle={styles.viewCartLabel}
					contentStyle={styles.viewCartContent}
					onPress={onViewCart}
				>
					View Booking ({selectedCount})
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		position: 'absolute',
		bottom: 20,
		left: 16,
		right: 16,
		backgroundColor: '#1F5F68',
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 12,
		elevation: 6,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 10,
		zIndex: 100,
	},
	wrapperTablet: {
		maxWidth: 640,
		left: 'auto',
		right: 'auto',
		alignSelf: 'center',
		width: '100%',
		borderRadius: 20,
		paddingHorizontal: 20,
		paddingVertical: 14,
	},
	contentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	infoCol: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},
	iconCircle: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: 'rgba(255, 255, 255, 0.2)',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	textCol: {
		flex: 1,
	},
	countText: {
		color: '#FFFFFF',
		fontSize: 14,
		fontWeight: '700',
		lineHeight: 18,
	},
	subText: {
		color: 'rgba(255, 255, 255, 0.8)',
		fontSize: 11,
		lineHeight: 14,
	},
	viewCartBtn: {
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		height: 36,
		justifyContent: 'center',
	},
	viewCartContent: {
		height: 36,
		paddingHorizontal: 12,
		paddingVertical: 0,
		justifyContent: 'center',
		alignItems: 'center',
	},
	viewCartLabel: {
		color: '#1F5F68',
		fontSize: 12,
		fontWeight: '700',
		marginVertical: 0,
		marginHorizontal: 0,
	},
})
