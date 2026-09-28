import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTypography } from '../../../components/common/AppTypography'

interface ViewCartFloatingBarProps {
	selectedCount?: number
	itemCount?: number
	itemLabel?: string
	totalAmount?: string
	onViewCart: () => void
}

export const ViewCartFloatingBar: React.FC<ViewCartFloatingBarProps> = ({
	selectedCount,
	itemCount,
	itemLabel,
	totalAmount,
	onViewCart,
}) => {
	const insets = useSafeAreaInsets()
	const count = itemCount ?? selectedCount ?? 0
	if (count <= 0) return null

	const noun = itemLabel
		? (count > 1 ? (itemLabel.endsWith('y') ? `${itemLabel.slice(0, -1)}ies` : `${itemLabel}s`) : itemLabel)
		: (count > 1 ? 'Procedures' : 'Procedure')

	return (
		<View style={[styles.container, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
			<View style={styles.content}>
				<View style={styles.selection}>
					<AppTypography style={styles.countText}>
						{count} {noun} Selected
						{totalAmount ? ` • ${totalAmount}` : ''}
					</AppTypography>
				</View>

				<TouchableOpacity
					style={styles.button}
					onPress={onViewCart}
					activeOpacity={0.8}
				>
					<AppTypography style={styles.buttonText}>
						Proceed
					</AppTypography>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		backgroundColor: '#FFFFFF',
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingHorizontal: 20,
		paddingTop: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 10,
	},

	content: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		minHeight: 50,
	},

	selection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 16,
	},

	countText: {
		color: '#0F172A',
		fontSize: 15,
		fontWeight: '700',
	},

	button: {
		backgroundColor: '#2B6F71',
		borderRadius: 12,
		height: 50,
		paddingHorizontal: 28,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 3,
		shadowColor: '#2B6F71',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.2,
		shadowRadius: 5,
	},

	buttonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700',
		letterSpacing: 0.3,
	},
})
