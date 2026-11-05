// src/components/common/booking/AppBookingSuccess.tsx
//
// "Booked / Payment successful" screen shared by the booking flows (doctor Appointment confirmed, Lab tests
// "Payment successful"): ink hero with confetti, a pill ("Payment successful · ₹1,998"), a headline and a
// sentence; an elevated AppTicketCard that overlaps the hero; a numbered "what happens next" list; a payment
// line (+ Receipt) and the two footer buttons. The caller supplies all of the content.

import React from 'react'
import { ScrollView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS, TONES } from '../../../config/theme'
import { AppButton } from '../buttons/AppButton'
import { AppIcon } from '../display/AppIcon'
import { AppNumberedSteps, type AppNumberedStep } from '../display/AppNumberedSteps'
import { AppTag } from '../display/AppTag'
import { AppFooterBar } from '../layout/AppFooterBar'
import { AppSection } from '../layout/AppSection'
import { AppBillStatusLine, AppBillSummary } from './BookingSummary/BillingSummaryCard'
import { AppTicketCard, type AppTicketCardProps } from './AppTicketCard'

const DESIGN_WIDTH = 390

// Confetti from the design (positions in 390-wide design px; x is scaled to screen width).
const CONFETTI: { left: number; top: number; size: number; radius: number; color: string; rotate: number }[] = [
	{ left: 40, top: 40, size: 10, radius: 9999, color: APP_COLORS.mintAccent, rotate: 0 },
	{ left: 320, top: 56, size: 12, radius: 3, color: TONES.peach.bg, rotate: 20 },
	{ left: 70, top: 150, size: 8, radius: 2, color: TONES.sand.bg, rotate: 35 },
	{ left: 300, top: 160, size: 10, radius: 9999, color: TONES.lilac.bg, rotate: 0 },
	{ left: 28, top: 100, size: 6, radius: 9999, color: TONES.sky.bg, rotate: 0 },
	{ left: 345, top: 112, size: 8, radius: 2, color: APP_COLORS.mintAccent, rotate: 45 },
	{ left: 250, top: 30, size: 7, radius: 9999, color: TONES.sand.bg, rotate: 0 },
	{ left: 120, top: 24, size: 6, radius: 2, color: TONES.lilac.bg, rotate: 30 },
]

export type AppBookingSuccessProps = {
	/** The confetti dots in the hero. Defaults to true; the minimal-colour appointment screen turns them off. */
	confetti?: boolean
	/** Pill under the check, e.g. "Payment successful · ₹1,998". */
	badge: string
	title: string
	subtitle: string
	ticket: Omit<AppTicketCardProps, 'elevated' | 'style' | 'tint'>
	/** Heading + steps of the "what happens next" block. */
	stepsTitle: string
	steps: AppNumberedStep[]
	/** The payment line under the steps, e.g. "₹1,998 paid via UPI". */
	paymentText: string
	/** Second line of the payment block (e.g. "Transaction TXN123"). */
	paymentSub?: string
	/** Right-hand note on the payment block (e.g. "You saved ₹851"). */
	paymentNote?: string
	onReceiptPress?: () => void
	secondary: { label: string; onPress: () => void }
	primary: { label: string; onPress: () => void }
}

export function AppBookingSuccess({
	badge,
	title,
	subtitle,
	ticket,
	stepsTitle,
	steps,
	paymentText,
	paymentSub,
	paymentNote,
	onReceiptPress,
	secondary,
	primary,
	confetti = true,
}: AppBookingSuccessProps) {
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const scaleX = width / DESIGN_WIDTH

	return (
		<View style={styles.container}>
			<StatusBar barStyle="light-content" backgroundColor={APP_COLORS.ink} />
			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Success hero */}
				<View style={[styles.hero, { paddingTop: 48 + insets.top }]}>
					<View style={styles.heroCircleLeft} />
					<View style={styles.heroCircleRight} />
					{confetti &&
						CONFETTI.map((c, i) => (
							<View
								key={i}
								style={{
									position: 'absolute',
									left: c.left * scaleX,
									top: c.top + insets.top,
									width: c.size,
									height: c.size,
									borderRadius: c.radius,
									backgroundColor: c.color,
									transform: [{ rotate: `${c.rotate}deg` }],
								}}
							/>
						))}

					<View style={styles.successRing}>
						<View style={styles.successCircle}>
							<AppIcon name="check" size={38} color="#FFFFFF" strokeWidth={2.8} />
						</View>
					</View>

					<AppTag
						label={badge}
						shape="pill"
						bg={APP_COLORS.mintAccent}
						ink={APP_COLORS.ink}
						style={styles.successBadge}
						textStyle={styles.pillTextHeavy}
					/>

					<Text style={styles.heroTitle} accessibilityRole="header">
						{title}
					</Text>
					<Text style={styles.heroSubtitle}>{subtitle}</Text>
				</View>

				{/* Ticket card -- overlaps the hero */}
				<AppTicketCard elevated style={styles.card} {...ticket} />

				{/* What happens next */}
				<AppSection title={stepsTitle} marginTop={0} gap={12}>
					<AppNumberedSteps
						steps={steps}
						numberSize={28}
						numberWeight="700"
						connector
						connectorSpacing={4}
						gap={16}
						markerGap={12}
						textGap={2}
						titleStyle={styles.stepTitle}
						bodyStyle={styles.stepBody}
					/>
				</AppSection>

				{/* Payment */}
				<AppBillSummary
					variant="flat"
					rows={[]}
					style={styles.paymentRow}
					footer={
						<View>
							<AppBillStatusLine size="md" text={paymentText} onReceiptPress={onReceiptPress} />
							{!!(paymentSub || paymentNote) && (
								<View style={styles.paymentMeta}>
									{!!paymentSub && <Text style={styles.paymentSub}>{paymentSub}</Text>}
									{!!paymentNote && <Text style={styles.paymentNote}>{paymentNote}</Text>}
								</View>
							)}
						</View>
					}
				/>
			</ScrollView>

			<AppFooterBar>
				<AppButton variant="outline" size="lg" style={styles.flex} onPress={secondary.onPress}>
					{secondary.label}
				</AppButton>
				<AppButton size="lg" style={styles.flex} onPress={primary.onPress}>
					{primary.label}
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1 },
	scrollContent: { gap: 12, paddingBottom: 8 },

	hero: {
		backgroundColor: APP_COLORS.ink,
		paddingHorizontal: 24,
		paddingBottom: 64,
		alignItems: 'center',
		gap: 8,
		overflow: 'hidden',
	},
	heroCircleLeft: {
		position: 'absolute',
		left: -60,
		bottom: -80,
		width: 200,
		height: 200,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
		opacity: 0.7,
	},
	heroCircleRight: {
		position: 'absolute',
		right: -50,
		top: -50,
		width: 160,
		height: 160,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.primary,
	},
	successRing: {
		width: 104,
		height: 104,
		borderRadius: 9999,
		backgroundColor: '#1E7A4E33',
		alignItems: 'center',
		justifyContent: 'center',
	},
	successCircle: {
		width: 76,
		height: 76,
		borderRadius: 9999,
		backgroundColor: APP_COLORS.success,
		borderWidth: 4,
		borderColor: APP_COLORS.mintAccent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	// AppTag pill (4x10, 12/16) centred in the hero at the design's 12px side padding
	successBadge: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 12 },
	pillTextHeavy: { fontWeight: '800' },
	heroTitle: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: '#FFFFFF', textAlign: 'center' },
	heroSubtitle: { maxWidth: 300, fontSize: 15, lineHeight: 22, color: APP_COLORS.mint, textAlign: 'center' },

	card: {
		marginTop: -48 - 12, // -48 overlap; cancels the scroll content's 12px gap
		marginHorizontal: 16,
	},
	stepTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
	stepBody: { fontSize: 14, lineHeight: 20 },
	paymentRow: { backgroundColor: APP_COLORS.surface, paddingVertical: 12, paddingHorizontal: 16 },
	paymentMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
	paymentSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	paymentNote: { fontSize: 13, fontWeight: '700', color: APP_COLORS.success },
})
