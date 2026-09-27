import React from 'react'
import { StyleProp, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../../config/theme'
import { AppTypography } from '../../display/AppTypography'
import { AppDashedDivider } from '../../display/AppDashedDivider'
import { AppIcon } from '../../display/AppIcon'

export interface BillingRow {
	label: string
	value: string
	labelStyle?: StyleProp<TextStyle>
	valueStyle?: StyleProp<TextStyle>
	/** Renders a divider above this row — e.g. before a final total row. */
	dividerBefore?: boolean
	/** 'free' = green value ("Free"); 'total' = large bold label + value. Defaults to 'default'. */
	tone?: 'default' | 'free' | 'total'
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
	/** 'card' (default) = bordered white card with its own padding (booking-summary screens).
	 *  'flat' = no card chrome, KarolaHealth design-language text styles — for use inside an AppSection. */
	variant?: 'card' | 'flat'
	/** Draw row dividers as AppDashedDivider instead of a solid 1px line. */
	dashedDividers?: boolean
	/** Divider colour. Defaults to APP_COLORS.border (dashed) / #E8ECEC (solid). */
	dividerColor?: string
	/** Vertical space above and below each row divider (on top of `rowGap`). Defaults to 4. */
	dividerSpacing?: number | { top: number; bottom: number }
	/** Gap between rows. Defaults to 10. */
	rowGap?: number
	/** Rendered after the rows (e.g. an AppBillStatusLine: paid / pending line + Receipt link). */
	footer?: React.ReactNode
	style?: StyleProp<ViewStyle>
}

/** 'card' keeps the legacy AppTypography (Paper) text; 'flat' uses plain Text with design-language tokens. */
function RowText({ flat, style, children }: { flat: boolean; style: StyleProp<TextStyle>; children: string }) {
	return flat ? (
		<Text style={style}>{children}</Text>
	) : (
		<AppTypography variant="body" style={style}>
			{children}
		</AppTypography>
	)
}

export function BillingSummaryCard({
	title,
	rows,
	note,
	variant = 'card',
	dashedDividers = false,
	dividerColor,
	dividerSpacing = 4,
	rowGap = 10,
	footer,
	style,
}: BillingSummaryCardProps) {
	const flat = variant === 'flat'
	const dividerMargin =
		typeof dividerSpacing === 'number'
			? { marginVertical: dividerSpacing }
			: { marginTop: dividerSpacing.top, marginBottom: dividerSpacing.bottom }

	const renderDivider = () =>
		dashedDividers ? (
			<AppDashedDivider color={dividerColor ?? APP_COLORS.border} style={dividerMargin} />
		) : (
			<View style={[styles.divider, dividerMargin, dividerColor ? { backgroundColor: dividerColor } : null]} />
		)

	return (
		<View style={[flat ? null : styles.card, style]}>
			{title ? (
				<AppTypography variant="h3" style={styles.title}>
					{title}
				</AppTypography>
			) : null}

			<View style={{ gap: rowGap }}>
				{rows.map((row, i) => {
					const tone = row.tone ?? 'default'
					return (
						<React.Fragment key={i}>
							{row.dividerBefore && renderDivider()}
							<View style={[styles.row, tone === 'total' && styles.rowTotal]}>
								<RowText
									flat={flat}
									style={[
										flat ? styles.flatText : styles.label,
										tone === 'total' && styles.totalLabel,
										row.labelStyle,
									]}
								>
									{row.label}
								</RowText>
								<RowText
									flat={flat}
									style={[
										flat ? styles.flatText : styles.value,
										tone === 'free' && styles.freeValue,
										tone === 'total' && styles.totalValue,
										row.valueStyle,
									]}
								>
									{row.value}
								</RowText>
							</View>
						</React.Fragment>
					)
				})}
			</View>

			{footer ? <View style={rows.length ? { marginTop: rowGap } : null}>{footer}</View> : null}

			{note ? (
				<>
					{renderDivider()}
					<View
						style={[
							styles.noteRow,
							note.backgroundColor ? { backgroundColor: note.backgroundColor } : null,
						]}
					>
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

/** Design-language alias of BillingSummaryCard (bill details / payment sections). */
export const AppBillSummary = BillingSummaryCard

export interface AppBillStatusLineProps {
	text: string
	/** Text colour: 'paid' = success, 'pending' = warning, 'default' = ink. Defaults to 'default'. */
	tone?: 'default' | 'paid' | 'pending'
	/** 'sm' = 12/16 bold line with a compact link (Appointment details); 'md' = 14/20 line with a
	 *  44px-tall download link (Appointment confirmed). Defaults to 'sm'. */
	size?: 'sm' | 'md'
	/** Shows the "Receipt" link when given. */
	onReceiptPress?: () => void
	style?: StyleProp<ViewStyle>
}

/** Footer line for AppBillSummary: payment status text + optional Receipt link. */
export function AppBillStatusLine({
	text,
	tone = 'default',
	size = 'sm',
	onReceiptPress,
	style,
}: AppBillStatusLineProps) {
	const md = size === 'md'
	const color = tone === 'paid' ? APP_COLORS.success : tone === 'pending' ? APP_COLORS.warning : APP_COLORS.ink
	return (
		<View style={[styles.statusRow, md && styles.statusRowMd, style]}>
			<Text
				style={[md ? styles.statusTextMd : styles.statusTextSm, { color }]}
				numberOfLines={md ? undefined : 1}
			>
				{text}
			</Text>
			{onReceiptPress ? (
				<TouchableOpacity
					onPress={onReceiptPress}
					style={[styles.receiptLink, md && styles.receiptLinkMd]}
					activeOpacity={md ? 0.7 : undefined}
					accessibilityRole="button"
				>
					{md ? (
						<AppIcon name="download" size={18} color={APP_COLORS.primary} />
					) : (
						<MaterialCommunityIcons name="chevron-down" size={16} color={APP_COLORS.primary} />
					)}
					<Text style={md ? styles.receiptTextMd : styles.receiptTextSm}>Receipt</Text>
				</TouchableOpacity>
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
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	rowTotal: {
		alignItems: 'baseline',
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
	flatText: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	freeValue: {
		color: APP_COLORS.success,
		fontWeight: '600',
	},
	totalLabel: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	totalValue: {
		fontSize: 22,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	divider: {
		height: 1,
		backgroundColor: '#E8ECEC',
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

	// AppBillStatusLine
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
	},
	statusRowMd: {
		gap: 12,
	},
	statusTextSm: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
	},
	statusTextMd: {
		flex: 1,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '600',
	},
	receiptLink: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	receiptLinkMd: {
		minHeight: 44,
	},
	receiptTextSm: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.primary,
	},
	receiptTextMd: {
		fontSize: 14,
		fontWeight: '600',
		color: APP_COLORS.primary,
	},
})
