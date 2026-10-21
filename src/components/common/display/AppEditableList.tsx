// src/components/common/display/AppEditableList.tsx
//
// Editable list from the profile designs (current medicines, emergency contacts, qualifications,
// hospitals, achievements): rows with a 40px tone tile, 15/20 700 title, 12/16 muted subtitle, optional
// status tag, and 40px outlined edit (primary) / remove (danger) buttons; a divider between rows; then a
// 44px dashed "Add …" button (1.5px dashed primary on mint). Shows `emptyText` when there are no rows.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, type StyleProp, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppIconTile } from './AppIconTile'
import { AppTag, type AppTagTone } from './AppTag'
import { APP_COLORS, type ToneKey } from '../../../config/theme'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type AppEditableListItem = {
	key: string
	title: string
	subtitle?: string
	tag?: { label: string; tone: AppTagTone } | null
}

export type AppEditableListProps = {
	items: AppEditableListItem[]
	icon: IconName
	tone?: ToneKey
	onEdit?: (index: number) => void
	onRemove?: (index: number) => void
	/** Row tap (e.g. open a detail screen); defaults to onEdit. */
	onPressItem?: (index: number) => void
	addLabel?: string
	onAdd?: () => void
	emptyText?: string
	style?: StyleProp<ViewStyle>
}

export function AppEditableList({
	items,
	icon,
	tone = 'mint',
	onEdit,
	onRemove,
	onPressItem,
	addLabel,
	onAdd,
	emptyText,
	style,
}: AppEditableListProps) {
	const pressRow = onPressItem ?? onEdit
	return (
		<View style={style}>
			{items.length === 0 && !!emptyText && <Text style={styles.empty}>{emptyText}</Text>}
			{items.map((item, index) => (
				// The row is a plain View: the tappable area and the edit / remove buttons are siblings. Nesting buttons
				// inside a button is invalid HTML on web (React warns, and the inner tap can be swallowed).
				<View key={item.key} style={styles.row}>
					<TouchableOpacity
						style={styles.main}
						onPress={pressRow ? () => pressRow(index) : undefined}
						disabled={!pressRow}
						activeOpacity={0.8}
						accessibilityRole={pressRow ? 'button' : undefined}
					>
						<AppIconTile icon={icon} tone={tone} size={40} />
						<View style={styles.text}>
							<Text style={styles.title} numberOfLines={2}>
								{item.title}
							</Text>
							{!!item.subtitle && (
								<Text style={styles.subtitle} numberOfLines={2}>
									{item.subtitle}
								</Text>
							)}
							{!!item.tag && (
								<AppTag
									label={item.tag.label}
									tone={item.tag.tone}
									size="xs"
									shape="rounded"
									uppercase={false}
									style={styles.tag}
								/>
							)}
						</View>
					</TouchableOpacity>
					{onEdit ? (
						<TouchableOpacity
							style={styles.iconBtn}
							onPress={() => onEdit(index)}
							accessibilityRole="button"
							accessibilityLabel={`Edit ${item.title}`}
						>
							<MaterialCommunityIcons name="pencil-outline" size={20} color={APP_COLORS.primary} />
						</TouchableOpacity>
					) : null}
					{onRemove ? (
						<TouchableOpacity
							style={styles.iconBtn}
							onPress={() => onRemove(index)}
							accessibilityRole="button"
							accessibilityLabel={`Remove ${item.title}`}
						>
							<MaterialCommunityIcons name="trash-can-outline" size={20} color={APP_COLORS.danger} />
						</TouchableOpacity>
					) : null}
				</View>
			))}
			{onAdd && !!addLabel ? (
				<TouchableOpacity style={styles.add} onPress={onAdd} accessibilityRole="button">
					<MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
					<Text style={styles.addText}>{addLabel}</Text>
				</TouchableOpacity>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	empty: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		paddingVertical: 4,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	// the tappable icon + text area; the edit / remove buttons sit next to it
	main: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	text: {
		flex: 1,
		minWidth: 0,
	},
	title: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	tag: {
		alignSelf: 'flex-start',
		marginTop: 3,
	},
	iconBtn: {
		width: 40,
		height: 40,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	add: {
		marginTop: 10,
		height: 44,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		borderRadius: 10,
		backgroundColor: APP_COLORS.mint,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	addText: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
})

export default AppEditableList
