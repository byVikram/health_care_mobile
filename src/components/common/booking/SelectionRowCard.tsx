import React from 'react'
import { StyleProp, StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native'
import { AppTypography } from '../AppTypography'

interface SelectionRowCardProps {
	/** A pre-rendered icon element (e.g. `<Ionicons name="flash" size={20}
	 *  color={selected ? '#FFFFFF' : '#0C7C7C'} />`) — kept as a node rather
	 *  than an icon-set + name pair so this component has no dependency on
	 *  any one icon library. Callers own the selected-state color. */
	icon: React.ReactNode
	title: string
	subtitle?: string
	badgeText?: string
	selected: boolean
	onPress: () => void
	style?: StyleProp<ViewStyle>
	accessibilityLabel?: string
}

export default function SelectionRowCard({
	icon,
	title,
	subtitle,
	badgeText,
	selected,
	onPress,
	style,
	accessibilityLabel,
}: SelectionRowCardProps) {
	return (
		<TouchableOpacity
			style={[styles.card, selected && styles.cardSelected, style]}
			onPress={onPress}
			activeOpacity={0.85}
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			accessibilityLabel={accessibilityLabel ?? `${title}${subtitle ? `. ${subtitle}` : ''}`}
		>
			<View style={[styles.iconWrap, selected && styles.iconWrapSelected]}>{icon}</View>

			<View style={styles.textCol}>
				<View style={styles.headerRow}>
					<AppTypography variant="subtitle" style={[styles.title, selected && styles.titleSelected]}>
						{title}
					</AppTypography>
					{badgeText ? (
						<View style={styles.badge}>
							<AppTypography variant="caption" style={styles.badgeText}>
								{badgeText.toUpperCase()}
							</AppTypography>
						</View>
					) : null}
				</View>
				{subtitle ? (
					<AppTypography variant="caption" style={styles.subtitle}>
						{subtitle}
					</AppTypography>
				) : null}
			</View>

			<View style={[styles.radio, selected && styles.radioSelected]}>
				{selected && <View style={styles.radioInner} />}
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1.5,
		borderColor: '#E2E8F0',
		borderRadius: 14,
		padding: 14,
	},
	cardSelected: {
		borderColor: '#0C7C7C',
		backgroundColor: '#F0FDFA',
	},
	iconWrap: {
		width: 42,
		height: 42,
		borderRadius: 12,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},
	iconWrapSelected: {
		backgroundColor: '#0C7C7C',
	},
	textCol: {
		flex: 1,
		paddingRight: 6,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 3,
		flexWrap: 'wrap',
	},
	title: {
		fontSize: 14.5,
		fontWeight: '600',
		color: '#1E293B',
	},
	titleSelected: {
		fontWeight: '700',
		color: '#0F172A',
	},
	badge: {
		backgroundColor: '#CCFBF1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	badgeText: {
		fontSize: 9.5,
		fontWeight: '800',
		color: '#0F766E',
		letterSpacing: 0.5,
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16.5,
		color: '#64748B',
	},
	radio: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#FFFFFF',
	},
	radioSelected: {
		borderColor: '#0C7C7C',
	},
	radioInner: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#0C7C7C',
	},
})
