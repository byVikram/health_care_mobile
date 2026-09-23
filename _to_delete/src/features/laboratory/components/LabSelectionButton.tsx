import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

interface LabSelectionButtonProps {
	selected: boolean
	onPress: () => void
	/** Accessible label for the item being added, e.g. the test/package name. */
	itemLabel: string
	/** 'compact' sits inside a card footer (Test/Package cards). 'full' fills
	 *  its container width (Package Details sheet footer). */
	variant?: 'compact' | 'full'
	addLabel?: string
	addedLabel?: string
}

export const LabSelectionButton: React.FC<LabSelectionButtonProps> = ({
	selected,
	onPress,
	itemLabel,
	variant = 'compact',
	addLabel = 'Add',
	addedLabel = 'Added',
}) => {
	const isFull = variant === 'full'

	return (
		<TouchableOpacity
			style={[styles.button, isFull && styles.buttonFull, selected && styles.buttonSelected]}
			onPress={onPress}
			activeOpacity={0.8}
			accessibilityRole="button"
			accessibilityLabel={selected ? `Remove ${itemLabel} from booking` : `Select ${itemLabel}`}
			accessibilityState={{ selected }}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
		>
			<View style={styles.inner}>
				<MaterialCommunityIcons
					name={selected ? 'check' : 'plus'}
					size={isFull ? 18 : 15}
					color={selected ? '#FFFFFF' : '#0C7C7C'}
				/>
				<Text style={[styles.label, isFull && styles.labelFull, selected && styles.labelSelected]}>
					{selected ? addedLabel : addLabel}
				</Text>
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	button: {
		flexShrink: 0,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1.5,
		borderColor: '#0C7C7C',
		backgroundColor: '#FFFFFF',
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonFull: {
		width: '100%',
		paddingVertical: 13,
	},
	buttonSelected: {
		backgroundColor: '#0C7C7C',
	},
	inner: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 5,
	},
	label: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	labelFull: {
		fontSize: 14,
	},
	labelSelected: {
		color: '#FFFFFF',
	},
})

export default LabSelectionButton
