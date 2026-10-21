// src/components/common/booking/AppTicketCard.tsx
//
// Appointment "ticket" card from the Payment and Appointment-confirmed designs: header row (leading avatar,
// title / subtitle, trailing node), a perforated AppDashedDivider (variant 'ticket'), a 2-column field grid
// (WHEN / WHERE / BOOKING ID …), an optional "For {patient}" row and an optional actions row.
//   tint 'mint'  — mint card, mintAccent perforation (Payment, sits inside a white AppSection)
//   tint 'white' — white card, divider-coloured perforation (Confirmed, floats over the page with CARD_SHADOW)

import React from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { APP_COLORS, CARD_SHADOW, TONES } from '../../../config/theme'
import AppAvatar from '../display/AppAvatar'
import { AppDashedDivider } from '../display/AppDashedDivider'

export type AppTicketHeader = {
	/** Usually an AppAvatar. */
	leading?: React.ReactNode
	/** Small caps line above the title (e.g. "AMOUNT TO PAY" over a big amount). */
	eyebrow?: string
	title: string
	subtitle?: string
	/** Defaults to TONES.lilac.ink. */
	subtitleColor?: string
	/** Title font size. Defaults to 16 (Payment uses 17). */
	titleSize?: number
	/** e.g. a "Change" link or a "Confirmed" pill. */
	trailing?: React.ReactNode
}

export type AppTicketField = {
	/** Rendered uppercase. */
	label: string
	value: string
	sub?: string
	/** Span the full row instead of half. */
	full?: boolean
	/** Large 20/26 value (e.g. the time). */
	emphasis?: boolean
	/** Value truncation: half-width fields truncate to one line ('tail' by default); full fields wrap. */
	ellipsize?: 'tail' | 'middle'
}

export type AppTicketCardProps = {
	header: AppTicketHeader
	fields: AppTicketField[]
	/** "For {name} ({relation})" row under the fields. */
	forPatient?: { name: string; relation?: string; avatarUri?: string | null }
	/** Rendered in a padded row at the bottom (e.g. Add to calendar / Directions buttons). */
	actions?: React.ReactNode
	/** Rendered below the fields in a padded block (e.g. a collapsible "2 tests in this order" row). */
	footer?: React.ReactNode
	/** Defaults to 'white'. */
	tint?: 'mint' | 'white'
	/** Adds CARD_SHADOW. Defaults to false. */
	elevated?: boolean
	/** Colour of the surface behind the card (fills the perforation cut-outs). Defaults to APP_COLORS.pageBg. */
	cutoutColor?: string
	/** Perforation colour. Defaults to mintAccent (mint) / divider (white). */
	dividerColor?: string
	style?: StyleProp<ViewStyle>
}

export function AppTicketCard({
	header,
	fields,
	forPatient,
	actions,
	footer,
	tint = 'white',
	elevated = false,
	cutoutColor = APP_COLORS.pageBg,
	dividerColor,
	style,
}: AppTicketCardProps) {
	const bg = tint === 'mint' ? APP_COLORS.mint : APP_COLORS.surface
	const perforation = dividerColor ?? (tint === 'mint' ? APP_COLORS.mintAccent : APP_COLORS.divider)

	return (
		// Shadow lives on the outer view; the inner one clips the perforation cut-outs (overflow hidden
		// would also clip the iOS shadow).
		<View style={[styles.card, { backgroundColor: bg }, elevated && CARD_SHADOW, style]}>
			<View style={styles.inner}>
				<View style={styles.topRow}>
					{header.leading}
					<View style={styles.flex}>
						{!!header.eyebrow && <Text style={styles.eyebrow}>{header.eyebrow}</Text>}
						<Text
							style={[styles.title, header.titleSize != null && { fontSize: header.titleSize }]}
							numberOfLines={1}
						>
							{header.title}
						</Text>
						{!!header.subtitle && (
							<Text
								style={[styles.subtitle, header.subtitleColor ? { color: header.subtitleColor } : null]}
								numberOfLines={1}
							>
								{header.subtitle}
							</Text>
						)}
					</View>
					{header.trailing}
				</View>

				<AppDashedDivider variant="ticket" color={perforation} cutoutColor={cutoutColor} />

				<View style={styles.grid}>
					{fields.map((f) => {
						const lines = f.full && !f.ellipsize ? undefined : 1
						return (
							<View key={f.label} style={f.full ? styles.colFull : styles.col}>
								<Text style={styles.label}>{f.label}</Text>
								<Text
									style={f.emphasis ? styles.valueBig : styles.value}
									numberOfLines={lines}
									ellipsizeMode={f.ellipsize}
								>
									{f.value}
								</Text>
								{!!f.sub && (
									<Text style={styles.sub} numberOfLines={f.full ? undefined : 1}>
										{f.sub}
									</Text>
								)}
							</View>
						)
					})}

					{forPatient && (
						<View style={styles.patientRow}>
							<AppAvatar
								uri={forPatient.avatarUri}
								name={forPatient.name}
								size={24}
								backgroundColor="#FFFFFF"
								initialsColor={APP_COLORS.primary}
								initialsStyle={styles.patientInitials}
							/>
							<Text style={styles.patientText} numberOfLines={1}>
								For <Text style={styles.patientName}>{forPatient.name}</Text>
								{forPatient.relation ? ` (${forPatient.relation})` : ''}
							</Text>
						</View>
					)}
				</View>

				{footer ? <View style={styles.footerBlock}>{footer}</View> : null}

				{actions ? <View style={styles.actionsRow}>{actions}</View> : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
	},
	inner: {
		borderRadius: 16,
		overflow: 'hidden',
	},
	flex: {
		flex: 1,
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		padding: 16,
	},
	title: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	subtitle: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: TONES.lilac.ink,
	},
	eyebrow: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.48,
		textTransform: 'uppercase',
		color: APP_COLORS.primary,
	},
	footerBlock: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 8,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 16,
		rowGap: 12,
		columnGap: 12,
	},
	col: {
		flexBasis: '40%',
		flexGrow: 1,
		minWidth: 0,
	},
	colFull: {
		width: '100%',
	},
	label: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.48,
		textTransform: 'uppercase',
		color: APP_COLORS.primary,
	},
	valueBig: {
		fontSize: 20,
		lineHeight: 26,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	value: {
		fontSize: 15,
		lineHeight: 22,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	sub: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	patientRow: {
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	patientInitials: {
		fontSize: 10,
		fontWeight: '800',
	},
	patientText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.ink,
	},
	patientName: {
		fontWeight: '700',
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
})

export default AppTicketCard
