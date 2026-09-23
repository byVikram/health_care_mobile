import React from 'react'
import { Image, StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppTypography } from '../../AppTypography'

export interface SelectedItemBadge {
	/** Pre-rendered icon element — kept as a node so this component has no
	 *  dependency on any one icon library. */
	icon?: React.ReactNode
	text: string
	backgroundColor: string
	textColor: string
}

export interface SelectedItemExpandable {
	expanded: boolean
	onToggle: () => void
	labelExpanded: string
	labelCollapsed: string
	content: React.ReactNode
}

export interface SelectedItemCardProps {
	image?: string
	/** Shown instead of `image` when it's absent (e.g. Laboratory's
	 *  flask/shield icon placeholder). Ignored if `image` is set. */
	imageFallbackIcon?: React.ReactNode
	imageSize?: number
	title: string
	description?: string
	badges?: SelectedItemBadge[]
	durationLabel?: string
	price: string
	priceStyle?: StyleProp<TextStyle>
	/** Omit to hide the remove button entirely. */
	onRemove?: () => void
	expandable?: SelectedItemExpandable
	style?: StyleProp<ViewStyle>
}

export function SelectedItemCard({
	image,
	imageFallbackIcon,
	imageSize = 76,
	title,
	description,
	badges,
	durationLabel,
	price,
	priceStyle,
	onRemove,
	expandable,
	style,
}: SelectedItemCardProps) {
	return (
		<View style={[styles.card, style]}>
			{image ? (
				<Image source={{ uri: image }} style={[styles.image, { width: imageSize, height: imageSize }]} resizeMode="cover" />
			) : imageFallbackIcon ? (
				<View style={[styles.imagePlaceholder, { width: imageSize, height: imageSize }]}>{imageFallbackIcon}</View>
			) : null}

			<View style={styles.content}>
				<View style={styles.headerRow}>
					<AppTypography variant="h4" style={styles.title} numberOfLines={1}>
						{title}
					</AppTypography>
					{onRemove && (
						<TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.7}>
							<Ionicons name="trash-outline" size={18} color="#D32F2F" />
						</TouchableOpacity>
					)}
				</View>

				{badges && badges.length > 0 && (
					<View style={styles.badgeRow}>
						{badges.map((badge, i) => (
							<View key={i} style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
								{badge.icon}
								<Text style={[styles.badgeText, { color: badge.textColor }]}>{badge.text}</Text>
							</View>
						))}
					</View>
				)}

				{description ? (
					<AppTypography variant="caption" style={styles.description} numberOfLines={2}>
						{description}
					</AppTypography>
				) : null}

				{expandable && (
					<>
						<TouchableOpacity
							onPress={expandable.onToggle}
							style={styles.expandTrigger}
							hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
						>
							<Text style={styles.expandTriggerText}>
								{expandable.expanded ? expandable.labelExpanded : expandable.labelCollapsed}
							</Text>
							<Ionicons name={expandable.expanded ? 'chevron-up' : 'chevron-down'} size={14} color="#0C7C7C" />
						</TouchableOpacity>
						{expandable.expanded && <View style={styles.expandContent}>{expandable.content}</View>}
					</>
				)}

				<View style={styles.footerRow}>
					<View style={styles.durationRow}>
						<Ionicons name="time-outline" size={13} color="#64748B" />
						<AppTypography variant="caption" style={styles.durationText}>
							{durationLabel}
						</AppTypography>
					</View>
					<AppTypography variant="body" style={[styles.price, priceStyle]}>
						{price}
					</AppTypography>
				</View>
			</View>
		</View>
	)
}

export default SelectedItemCard

const styles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		backgroundColor: '#FFFFFF',
		borderRadius: 14,
		padding: 12,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 3,
	},
	image: {
		borderRadius: 10,
		backgroundColor: '#F1F5F9',
	},
	imagePlaceholder: {
		borderRadius: 10,
		backgroundColor: '#E6F4F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		flex: 1,
		marginLeft: 12,
		justifyContent: 'space-between',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	title: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191C1D',
		flex: 1,
		lineHeight: 20,
	},
	removeBtn: {
		padding: 4,
		marginLeft: 8,
	},
	badgeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
		marginBottom: 4,
		flexWrap: 'wrap',
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700',
	},
	description: {
		fontSize: 11,
		color: '#5E6B70',
		lineHeight: 15,
	},
	expandTrigger: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4,
	},
	expandTriggerText: {
		fontSize: 11.5,
		fontWeight: '700',
		color: '#0C7C7C',
	},
	expandContent: {
		marginTop: 6,
		paddingTop: 6,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
		gap: 4,
	},
	footerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 6,
	},
	durationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	durationText: {
		fontSize: 11,
		color: '#64748B',
	},
	price: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
	},
})
