import React from 'react'
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native'
import { AppTypography } from '../../AppTypography'

export interface BillingRow {
	label: string
	value: string
	labelStyle?: StyleProp<TextStyle>
	valueStyle?: StyleProp<TextStyle>
	/** Renders a divider above this row — e.g. before a final total row. */
	dividerBefore?: boolean
}

export interface BillingSummaryCardNote {
	/** Pre-rendered icon element. */
	icon: React.ReactNode
	text: string
	backgroundColor?: string
	textColor?: string
}

export interface BillingSummaryCardProps {
	/** Rendered inside the card above the rows. Omit if the caller renders
	 *  its own heading outside the card (e.g. Laboratory's section header). */
	title?: string
	rows: BillingRow[]
	/** Rendered inside the card, below a divider, after the rows — e.g.
	 *  Ancillary's inline pricing-disclaimer note. Laboratory's "guarantee"
	 *  box is a visually distinct element outside this card entirely and is
	 *  not represented here — its caller renders it separately. */
	note?: BillingSummaryCardNote
	style?: StyleProp<ViewStyle>
}

export function BillingSummaryCard({ title, rows, note, style }: BillingSummaryCardProps) {
	return (
		<View style={[styles.card, style]}>
			{title ? (
				<AppTypography variant="h3" style={styles.title}>
					{title}
				</AppTypography>
			) : null}

			<View style={styles.rowList}>
				{rows.map((row, i) => (
					<React.Fragment key={i}>
						{row.dividerBefore && <View style={styles.divider} />}
						<View style={styles.row}>
							<AppTypography variant="body" style={[styles.label, row.labelStyle]}>
								{row.label}
							</AppTypography>
							<AppTypography variant="body" style={[styles.value, row.valueStyle]}>
								{row.value}
							</AppTypography>
						</View>
					</React.Fragment>
				))}
			</View>

			{note ? (
				<>
					<View style={styles.divider} />
					<View style={[styles.noteRow, note.backgroundColor ? { backgroundColor: note.backgroundColor } : null]}>
						<View style={styles.noteIcon}>{note.icon}</View>
						<AppTypography
							variant="caption"
							style={[styles.noteText, note.textColor ? { color: note.textColor } : null]}
						>
							{note.text}
						</AppTypography>
					</View>
				</>
			) : null}
		</View>
	)
}

export default BillingSummaryCard

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#E8ECEC',
		elevation: 1,
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.04,
		shadowRadius: 4,
	},
	title: {
		fontSize: 16,
		fontWeight: '700',
		color: '#191C1D',
		marginBottom: 14,
	},
	rowList: {
		gap: 10,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	label: {
		fontSize: 13,
		color: '#526062',
	},
	value: {
		fontSize: 14,
		fontWeight: '600',
		color: '#191C1D',
	},
	divider: {
		height: 1,
		backgroundColor: '#E8ECEC',
		marginVertical: 4,
	},
	noteRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		backgroundColor: '#F0F9F9',
		borderRadius: 10,
		padding: 10,
		marginTop: 8,
	},
	noteIcon: {
		marginRight: 8,
		marginTop: 1,
	},
	noteText: {
		flex: 1,
		fontSize: 11,
		color: '#1F5F68',
		lineHeight: 15,
	},
})
