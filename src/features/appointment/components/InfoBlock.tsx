import React from 'react'
import { StyleSheet, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../../../components/common'

const MUTED = '#64707d'
const TEXT = '#111827'

export type InfoBlockProps = {
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	label: string
	value: string
	capitalize?: boolean
}

export default function InfoBlock({ icon, label, value, capitalize }: InfoBlockProps) {
	return (
		<View style={styles.infoBlock}>
			<View style={styles.infoLabelRow}>
				<MaterialCommunityIcons name={icon} size={13} color={MUTED} />
				<AppTypography style={styles.infoLabel}>{label}</AppTypography>
			</View>
			<AppTypography style={capitalize ? [styles.infoValue, styles.capitalize] : styles.infoValue} numberOfLines={2}>
				{value}
			</AppTypography>
		</View>
	)
}

const styles = StyleSheet.create({
	infoBlock: {
		width: '50%',
		paddingHorizontal: 6,
		marginBottom: 10,
	},
	infoLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 3,
	},
	infoLabel: {
		fontSize: 11,
		lineHeight: 15,
		color: MUTED,
		marginLeft: 4,
	},
	infoValue: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: TEXT,
	},
	capitalize: {
		textTransform: 'capitalize',
	},
})
