
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common/AppTypography'
import { AppButton } from '../../../components/common/AppButton'

interface ViewCartFloatingBarProps {
	// Either prop name is accepted so callers can use whichever reads best
	// (selectedCount for a plain count, itemCount when also showing totalAmount).
	selectedCount?: number
	itemCount?: number
	totalAmount?: string
	onViewCart: () => void
}

export const ViewCartFloatingBar: React.FC<ViewCartFloatingBarProps> = ({
	selectedCount,
	itemCount,
	totalAmount,
	onViewCart,
}) => {
	const count = itemCount ?? selectedCount ?? 0
	if (count <= 0) return null

	return (
		<View style={styles.container}>
			<View style={styles.content}>
				<View style={styles.selection}>
					<AppTypography style={styles.countText}>
						{count} Service
						{count > 1 ? 's' : ''} Selected
						{totalAmount ? ` \u00b7 ${totalAmount}` : ``}
					</AppTypography>
				</View>

				<AppButton
					variant="secondary"
					compact
					style={styles.button}
					contentStyle={styles.buttonContent}
					labelStyle={styles.buttonLabel}
					onPress={onViewCart}
				>
					<View style={styles.buttonInner}>
						<AppTypography style={styles.buttonText}>
							Review Booking
						</AppTypography>
					</View>
				</AppButton>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E6EEEE',
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 20
	},

	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},

	selection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 12,
	},

	icon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: '#EAF5F3',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},

	countText: {
		color: '#183F43',
		fontSize: 13,
		fontWeight: '700',
	},

	button: {
		backgroundColor: '#1F5F68',
		borderRadius: 10,
		minHeight: 40,
	},

	buttonContent: {
		minHeight: 40,
		paddingHorizontal: 12,
		paddingVertical: 0,
		justifyContent: 'center',
	},

	buttonLabel: {
		margin: 0,
	},

	buttonInner: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},

	buttonText: {
		color: '#FFFFFF',
		fontSize: 12,
		fontWeight: '700',
	},
})
