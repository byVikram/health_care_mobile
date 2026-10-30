// src/features/ancillary/patient/HomeCareVisitView.tsx
//
// Patient "Home care visit" screen (patient design frames "4 · Home care visit (start code)" and
// "4a · Visit in progress (completion code)"): teal header with order reference, 5-step status strip, the dark
// START code card until the visit begins and the COMPLETION code card while it is in progress, the provider card,
// live arrival map, visit details, tips, the live "What's happening" checklist, payment, a help row
// and the Cancel / Call footer. Presentational only -- TrackAppointmentPage owns the data, socket and polling.
import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, type ViewStyle } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppCodeDisplay, AppScreenHeader } from '../../../components/common'
import AppRatingStars from '../../../components/common/display/AppRatingStars'
import { AppButton } from '../../../components/common/buttons/AppButton'
import { APP_COLORS, TONES, formatInr } from '../../../config/theme'
import { parseDateOnly, isSameDay } from '../../../utils/date'
import { formatTimeSlot } from '../../../utils/formatters'
import { assignedAtLabel, capitalize, leadText } from './ancillaryBookingCopy'
import type { AncillaryReviewData } from '../ancillaryService'
import type { AncillaryProviderInfo } from './TrackAppointmentPage'

type IconName = keyof typeof MaterialCommunityIcons.glyphMap

export type TrackingVisit = {
	visit_public_id: string
	index?: number
	date?: string | null
	start_time?: string | null
	end_time?: string | null
	status: string
	start_code?: string | null
	completion_code?: string | null
	started_at?: string | null
	tasks?: { label: string; done: boolean }[]
	/** Scheduled visits: the server's verdict on whether the patient can still cancel this visit. */
	can_cancel?: boolean
	/** Scheduled visits: the provider of THIS visit (each visit has its own), absent until one is assigned. */
	provider?: {
		provider_public_id: string
		name: string
		avatar_url?: string | null
		experience_years?: number | null
		phone?: string | null
	} | null
}

/** The visit a screen is about: the one asked for, else the first still open, else the last. */
export const currentVisitOf = (visits: TrackingVisit[], focusVisitId?: string): TrackingVisit | null =>
	visits.find((v) => v.visit_public_id === focusVisitId) ??
	visits.find((v) => !['COMPLETED', 'CANCELLED', 'EXPIRED', 'FAILED'].some((st) => v.status.startsWith(st))) ??
	visits[visits.length - 1] ??
	null

export type HomeCareVisitViewProps = {
	/** Order reference shown in the header ("KH-…"). */
	orderRef: string
	/** Upper-case request status (ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED …). */
	status: string
	provider: AncillaryProviderInfo | null
	visits: TrackingVisit[]
	/** The visit to show (visit_public_id), instead of the first one still open. */
	focusVisitId?: string
	/**
	 * Set for a scheduled ("Later") order. Its visit can be shown before any provider is assigned (they are assigned
	 * `leadMinutes` before the visit), the start code waits for the provider, and the Cancel is for this visit, not the whole booking:
	 * a Cancel that cancels this visit only (`canCancel` = the server still allows it).
	 */
	scheduled?: { noun: string; leadMinutes: number; canCancel: boolean }
	serviceName: string
	serviceSub?: string | null
	patientName?: string | null
	patientRelation?: string | null
	addressLabel?: string | null
	address?: string | null
	/** "25 Sep 2026 • 07:00 PM" style booking time, used for instant visits (which have no slot). */
	bookedAt?: string | null
	totals?: { per_visit: number; visits_count: number; total: number } | null
	tipAmount?: number | null
	payAfterVisit: boolean
	/** Fallbacks for the codes when the per-visit fields are not present yet. */
	startCode?: string | null
	completionCode?: string | null
	etaMinutes?: number | null
	isCompleted: boolean
	isCancelled: boolean
	/** Live map (NurseMapTracker) shown in the arrival card while the provider is travelling. */
	map?: React.ReactNode
	review: { data: AncillaryReviewData | null; canRate: boolean; onOpen: () => void }
	onBack: () => void
	onShare: () => void
	onHelp: () => void
	onCall: () => void
	onMessage: () => void
	onCancel: () => void
}

const STEPS = ['Booked', 'Confirmed', 'On the way', 'In progress', 'Done']

/** Index of the current step (5 = everything done). */
const stepIndex = (status: string): number => {
	if (status === 'COMPLETED') return 5
	if (status === 'IN_PROGRESS' || status === 'VERIFICATION_PENDING') return 3
	if (status === 'EN_ROUTE' || status === 'ARRIVED') return 2
	return 1
}

const providerNoun = (p: AncillaryProviderInfo | null): string => {
	const r = `${p?.role ?? ''} ${p?.specialization ?? ''}`.toLowerCase()
	if (r.includes('nurs')) return 'nurse'
	if (r.includes('physio')) return 'physiotherapist'
	if (r.includes('home')) return 'attendant'
	if (r.includes('rehab')) return 'therapist'
	return 'provider'
}

const initials = (name?: string | null) =>
	(name ?? '')
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((w) => w[0]?.toUpperCase() ?? '')
		.join('') || '·'

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const shortDay = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`
const isToday = (d: Date) => isSameDay(d, new Date())
const dayTitle = (date?: string | null): string | null => {
	const d = parseDateOnly(date)
	if (!d) return null
	return isToday(d) ? `Today, ${shortDay(d)}` : shortDay(d)
}
const timeOnly = (iso?: string | null) => {
	if (!iso) return null
	const d = new Date(iso)
	return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}
const range = (v?: TrackingVisit | null) =>
	[formatTimeSlot(v?.start_time), formatTimeSlot(v?.end_time)].filter(Boolean).join('–')

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
	return (
		<View style={styles.section}>
			{title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
			{children}
		</View>
	)
}

function StatusStrip({ current }: { current: number }) {
	return (
		<View style={styles.strip} accessibilityLabel={`Visit status: ${STEPS[Math.min(current, 4)]}`}>
			{STEPS.map((label, i) => {
				const done = i < current
				const isCurrent = i === current
				return (
					<View key={label} style={styles.stepCol}>
						{i < STEPS.length - 1 ? (
							<View
								style={[
									styles.stepLine,
									{ backgroundColor: done ? APP_COLORS.success : APP_COLORS.divider },
								]}
							/>
						) : null}
						<View
							style={[
								styles.stepDot,
								{
									backgroundColor: done
										? APP_COLORS.success
										: isCurrent
											? APP_COLORS.primary
											: APP_COLORS.divider,
								},
								isCurrent && ({ boxShadow: `0 0 0 4px ${APP_COLORS.mint}` } as ViewStyle),
							]}
						>
							{done ? <MaterialCommunityIcons name="check" size={14} color={APP_COLORS.surface} /> : null}
						</View>
						<Text
							style={[
								styles.stepLabel,
								{
									fontWeight: isCurrent ? '800' : '600',
									color: done || isCurrent ? APP_COLORS.ink : APP_COLORS.inkMuted,
								},
							]}
						>
							{label}
						</Text>
					</View>
				)
			})}
		</View>
	)
}

function DetailRow({
	icon,
	label,
	value,
	sub,
	last,
}: {
	icon: IconName
	label: string
	value: string
	sub?: string | null
	last?: boolean
}) {
	return (
		<View style={[styles.detailRow, !last && styles.detailDivider]}>
			<View style={styles.detailIcon}>
				<MaterialCommunityIcons name={icon} size={20} color={APP_COLORS.primary} />
			</View>
			<View style={styles.flex}>
				<Text style={styles.detailLabel}>{label.toUpperCase()}</Text>
				<Text style={styles.detailValue}>{value}</Text>
				{sub ? <Text style={styles.muted}>{sub}</Text> : null}
			</View>
		</View>
	)
}

export default function HomeCareVisitView(p: HomeCareVisitViewProps) {
	const insets = useSafeAreaInsets()
	const noun = p.scheduled?.noun ?? providerNoun(p.provider)
	const first = (p.provider?.name ?? '').trim().split(/\s+/)[0] || `your ${noun}`
	const current = stepIndex(p.status)
	const inProgress = p.status === 'IN_PROGRESS' || p.status === 'VERIFICATION_PENDING'
	const beforeStart = !p.isCompleted && !p.isCancelled && !inProgress
	const travelling = ['ASSIGNED', 'NURSE_ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(p.status)

	const visits = p.visits
	const currentVisit = currentVisitOf(visits, p.focusVisitId)
	const count = visits.length || p.totals?.visits_count || 1
	const position = currentVisit?.index ?? 1

	// The order-level codes belong to the order's first open visit, so a scheduled visit only ever shows its own.
	const startCode = currentVisit?.start_code || (p.scheduled ? null : p.startCode) || null
	// A scheduled visit nobody has been assigned to yet: say so, and keep the start code back until there is someone to share it with.
	const awaitingProvider = !!p.scheduled && !p.provider && !p.isCompleted && !p.isCancelled
	const assignedAt =
		awaitingProvider && currentVisit?.date && currentVisit.start_time
			? assignedAtLabel(currentVisit.date, currentVisit.start_time, p.scheduled?.leadMinutes ?? 0)
			: ''
	const completionCode = currentVisit?.completion_code || (p.scheduled ? null : p.completionCode) || null
	const tasks = currentVisit?.tasks ?? []
	const startedAt = timeOnly(currentVisit?.started_at)

	const instant = !currentVisit?.date
	const whenTitle = instant
		? 'Instant visit'
		: [dayTitle(currentVisit?.date)?.startsWith('Today') ? 'Today' : null, range(currentVisit)]
				.filter(Boolean)
				.join(', ') ||
			(dayTitle(currentVisit?.date) ?? 'To be confirmed')
	const whenSub = instant
		? p.bookedAt
			? `Booked ${p.bookedAt}`
			: null
		: [shortDay(parseDateOnly(currentVisit?.date) as Date), count > 1 ? `visit ${position} of ${count}` : null]
				.filter(Boolean)
				.join(' · ')

	const arrivalTitle =
		p.status === 'ARRIVED'
			? `${first} has arrived`
			: p.status === 'EN_ROUTE'
				? p.etaMinutes != null
					? `Arriving in ${p.etaMinutes} min`
					: `${first} is on the way`
				: `${first} will head to you soon`
	const arrivalSub =
		p.status === 'EN_ROUTE'
			? `${first} is on the way`
			: p.status === 'ARRIVED'
				? 'Share your start code at the door'
				: 'You’ll be notified when they set off'

	const tip = p.tipAmount && p.tipAmount > 0 ? p.tipAmount : 0
	const paid = visits.length > 0 && visits.every((v) => v.status === 'COMPLETED') && !p.payAfterVisit
	// Each scheduled visit is paid for on its own, so its payment shows one visit's fee, never the whole booking's.
	const total = p.scheduled ? (p.totals?.per_visit ?? null) : (p.totals?.total ?? null)

	return (
		<View style={styles.page}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Home care visit"
				subtitle={`${count > 1 ? `Visit ${position} of ${count} · ` : ''}Order ${p.orderRef}`}
				onBack={p.onBack}
				rightElement={
					<View style={styles.headerActions}>
						<TouchableOpacity
							onPress={p.onShare}
							accessibilityRole="button"
							accessibilityLabel="Share"
							style={styles.headerBtn}
						>
							<MaterialCommunityIcons name="share-variant-outline" size={22} color={APP_COLORS.surface} />
						</TouchableOpacity>
						<TouchableOpacity
							onPress={p.onHelp}
							accessibilityRole="button"
							accessibilityLabel="Help"
							style={styles.headerBtn}
						>
							<MaterialCommunityIcons name="help-circle-outline" size={22} color={APP_COLORS.surface} />
						</TouchableOpacity>
					</View>
				}
			/>

			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				<StatusStrip current={current} />

				{p.isCancelled ? (
					<View style={styles.sideMargin}>
						<View style={[styles.banner, { backgroundColor: APP_COLORS.dangerBg }]}>
							<View style={styles.bannerIcon}>
								<MaterialCommunityIcons
									name="close-circle-outline"
									size={20}
									color={APP_COLORS.danger}
								/>
							</View>
							<View style={styles.flex}>
								<Text style={[styles.bannerTitle, { color: APP_COLORS.danger }]}>Visit cancelled</Text>
								<Text style={styles.bannerSub}>This booking is no longer active.</Text>
							</View>
						</View>
					</View>
				) : null}

				{inProgress ? (
					<View style={styles.sideMargin}>
						<View style={[styles.banner, { backgroundColor: APP_COLORS.successBg }]}>
							<View style={styles.bannerIcon}>
								<MaterialCommunityIcons name="heart-pulse" size={20} color={APP_COLORS.success} />
							</View>
							<View style={styles.flex}>
								<Text style={[styles.bannerTitle, { color: APP_COLORS.success }]}>
									Visit in progress
								</Text>
								<Text style={styles.bannerSub}>
									{startedAt
										? `Started at ${startedAt} with your start code`
										: 'Your visit has started'}
								</Text>
							</View>
						</View>
					</View>
				) : null}

				{p.isCompleted ? (
					<View style={styles.sideMargin}>
						<View style={[styles.banner, { backgroundColor: APP_COLORS.successBg }]}>
							<View style={styles.bannerIcon}>
								<MaterialCommunityIcons
									name="check-circle-outline"
									size={20}
									color={APP_COLORS.success}
								/>
							</View>
							<View style={styles.flex}>
								<Text style={[styles.bannerTitle, { color: APP_COLORS.success }]}>Visit completed</Text>
								<Text style={styles.bannerSub}>
									{p.provider?.name
										? `${p.provider.name} has finished your visit.`
										: 'Your visit is done.'}
								</Text>
							</View>
						</View>
					</View>
				) : null}

				{beforeStart && !awaitingProvider ? (
					<AppCodeDisplay
						style={styles.sideMargin}
						eyebrow="Start code"
						title={`Share when ${first} reaches your door`}
						note="Not on a call or before they arrive"
						code={startCode}
					/>
				) : null}
				{inProgress ? (
					<AppCodeDisplay
						style={styles.sideMargin}
						eyebrow="Completion code"
						title="Share only when the visit is finished"
						note="Report any problem before sharing"
						code={completionCode}
					/>
				) : null}

				{p.isCompleted ? (
					<Section>
						<View style={styles.feedbackHead}>
							<MaterialCommunityIcons name="star" size={22} color={APP_COLORS.star} />
							<View style={styles.flex}>
								<Text style={styles.detailValue}>
									{p.provider?.name
										? `How was your visit with ${p.provider.name}?`
										: 'How was your visit?'}
								</Text>
								<Text style={styles.muted}>Help us maintain care quality by rating your visit.</Text>
							</View>
						</View>
						{p.review.data ? (
							<TouchableOpacity
								style={styles.reviewed}
								onPress={p.review.onOpen}
								accessibilityRole="button"
							>
								<AppRatingStars value={p.review.data.rating} size={14} />
								<Text style={styles.reviewedText}>★ {p.review.data.rating}.0 · View your review</Text>
							</TouchableOpacity>
						) : (
							<AppButton variant="primary" onPress={p.review.onOpen} disabled={!p.review.canRate}>
								Rate & review visit
							</AppButton>
						)}
					</Section>
				) : null}

				{p.provider ? (
					<View style={[styles.section, styles.row]}>
						<View style={styles.avatar}>
							<Text style={styles.avatarText}>{initials(p.provider.name)}</Text>
						</View>
						<View style={styles.flex}>
							<Text style={styles.eyebrow}>{`YOUR ${noun.toUpperCase()}`}</Text>
							<Text style={styles.providerName}>{p.provider.name}</Text>
							<Text style={styles.muted} numberOfLines={1}>
								{[
									p.provider.role,
									p.provider.rating != null ? `★ ${p.provider.rating.toFixed(1)}` : null,
									'verified',
								]
									.filter(Boolean)
									.join(' · ')}
							</Text>
						</View>
						<TouchableOpacity
							style={styles.roundBtn}
							onPress={p.onMessage}
							accessibilityRole="button"
							accessibilityLabel={`Message ${noun}`}
						>
							<MaterialCommunityIcons name="message-text-outline" size={22} color={APP_COLORS.primary} />
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.roundBtn, !p.provider.phone && { opacity: 0.4 }]}
							onPress={p.onCall}
							disabled={!p.provider.phone}
							accessibilityRole="button"
							accessibilityLabel={`Call ${noun}`}
						>
							<MaterialCommunityIcons name="phone-outline" size={22} color={APP_COLORS.primary} />
						</TouchableOpacity>
					</View>
				) : awaitingProvider ? (
					<View style={[styles.section, styles.row]}>
						<View style={styles.avatar}>
							<MaterialCommunityIcons name="account-clock-outline" size={24} color={APP_COLORS.primary} />
						</View>
						<View style={styles.flex}>
							<Text style={styles.eyebrow}>{`YOUR ${noun.toUpperCase()}`}</Text>
							<Text style={styles.providerName}>{`${capitalize(noun)} not assigned yet`}</Text>
							<Text style={styles.muted}>
								{assignedAt
									? `Assigned at ${assignedAt}, ${leadText(p.scheduled?.leadMinutes ?? 0)} before the visit. You’ll get their name, photo and start code then.`
									: `Assigned ${leadText(p.scheduled?.leadMinutes ?? 0)} before the visit. You’ll get their name, photo and start code then.`}
							</Text>
						</View>
					</View>
				) : null}

				{beforeStart && travelling && p.map ? (
					<Section>
						<View style={styles.mapBox}>{p.map}</View>
						<View>
							<Text style={styles.arrivalTitle}>{arrivalTitle}</Text>
							<Text style={styles.muted}>{arrivalSub}</Text>
						</View>
					</Section>
				) : null}

				<Section title="Visit details">
					<View>
						<DetailRow
							icon="medical-bag"
							label="Service"
							value={p.serviceName || 'Home care visit'}
							sub={p.serviceSub}
						/>
						<DetailRow icon="calendar-clock-outline" label="When" value={whenTitle} sub={whenSub} />
						<DetailRow
							icon="account-outline"
							label="Patient"
							value={p.patientName || 'Patient'}
							sub={
								p.patientRelation
									? p.patientRelation.charAt(0).toUpperCase() +
										p.patientRelation.slice(1).toLowerCase()
									: null
							}
						/>
						<DetailRow
							icon="map-marker-outline"
							label="Address"
							value={p.addressLabel || 'Visit address'}
							sub={p.address || null}
							last
						/>
					</View>
				</Section>

				{beforeStart ? (
					<Section title={`Before the ${noun} arrives`}>
						{[
							['Keep prescriptions and reports ready', `The ${noun} checks them before starting.`],
							['A clean, well-lit place', 'Somewhere to sit or lie down comfortably.'],
						].map(([title, sub], i) => (
							<View key={title} style={styles.tip}>
								<View style={styles.tipNum}>
									<Text style={styles.tipNumText}>{i + 1}</Text>
								</View>
								<View style={styles.flex}>
									<Text style={styles.tipTitle}>{title}</Text>
									<Text style={styles.tipSub}>{sub}</Text>
								</View>
							</View>
						))}
					</Section>
				) : null}

				{inProgress && tasks.length > 0 ? (
					<Section title="What’s happening">
						{(() => {
							const activeAt = tasks.findIndex((t) => !t.done)
							return tasks.map((t, i) => {
								const isActive = i === activeAt
								const sub = t.done
									? 'Done'
									: isActive
										? 'In progress'
										: i === tasks.length - 1
											? 'Last step'
											: 'Next'
								return (
									<View key={`${t.label}-${i}`} style={styles.happenRow}>
										<View style={styles.happenRail}>
											{t.done ? (
												<View
													style={[styles.happenDot, { backgroundColor: APP_COLORS.success }]}
												>
													<MaterialCommunityIcons
														name="check"
														size={14}
														color={APP_COLORS.surface}
													/>
												</View>
											) : isActive ? (
												<View style={[styles.happenDot, styles.happenActive]} />
											) : (
												<View style={[styles.happenDot, styles.happenPending]} />
											)}
											{i < tasks.length - 1 ? (
												<View
													style={[
														styles.happenLine,
														{
															backgroundColor: t.done
																? APP_COLORS.success
																: APP_COLORS.divider,
														},
													]}
												/>
											) : null}
										</View>
										<View style={styles.happenText}>
											<Text style={styles.detailValue}>{t.label}</Text>
											<Text style={styles.muted}>{sub}</Text>
										</View>
									</View>
								)
							})
						})()}
					</Section>
				) : null}

				<Section title="Payment">
					{p.totals && p.totals.per_visit > 0 ? (
						<View style={styles.payRow}>
							<Text style={styles.payText}>
								{p.scheduled
									? 'Service fee · this visit'
									: count > 1
										? `${formatInr(p.totals.per_visit)} × ${count} visits`
										: 'Service fee'}
							</Text>
							<Text style={styles.payText}>
								{formatInr(count > 1 && !p.scheduled ? p.totals.per_visit * count : p.totals.per_visit)}
							</Text>
						</View>
					) : null}
					{tip > 0 ? (
						<View style={styles.payRow}>
							<Text style={styles.payText}>Tip</Text>
							<Text style={styles.payText}>{formatInr(tip)}</Text>
						</View>
					) : null}
					<View style={styles.payTotal}>
						<Text style={styles.payTotalLabel}>
							{paid
								? 'Paid'
								: p.payAfterVisit
									? p.scheduled
										? 'To pay after this visit'
										: 'To pay'
									: 'Total'}
						</Text>
						<Text style={styles.payTotalValue}>{formatInr(total != null ? total + tip : null)}</Text>
					</View>
					<Text style={[styles.tipSub, { color: APP_COLORS.success, fontWeight: '700' }]}>
						{p.payAfterVisit ? 'Pay after each visit · nothing to pay now' : 'Payment received'}
					</Text>
				</Section>

				<TouchableOpacity
					style={styles.helpRow}
					onPress={p.onHelp}
					accessibilityRole="button"
					activeOpacity={0.8}
				>
					<View style={styles.helpIcon}>
						<MaterialCommunityIcons name="headset" size={20} color={TONES.lilac.ink} />
					</View>
					<View style={styles.flex}>
						<Text style={styles.helpTitle}>Need help with this booking?</Text>
						<Text style={styles.muted}>Chat with Karolahealth support</Text>
					</View>
					<MaterialCommunityIcons name="chevron-right" size={22} color={APP_COLORS.border} />
				</TouchableOpacity>
			</ScrollView>

			{!p.isCompleted && !p.isCancelled ? (
				<View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
					<TouchableOpacity
						style={[
							styles.footerBtn,
							styles.footerOutline,
							!inProgress && !!p.scheduled && !p.scheduled.canCancel && { opacity: 0.5 },
						]}
						onPress={inProgress ? p.onHelp : p.onCancel}
						disabled={!inProgress && !!p.scheduled && !p.scheduled.canCancel}
						accessibilityRole="button"
					>
						<Text style={[styles.footerText, { color: APP_COLORS.primary }]}>
							{inProgress ? 'Report a problem' : 'Cancel visit'}
						</Text>
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.footerBtn, styles.footerSolid, !p.provider?.phone && { opacity: 0.5 }]}
						onPress={p.onCall}
						disabled={!p.provider?.phone}
						accessibilityRole="button"
					>
						<MaterialCommunityIcons name="phone-outline" size={20} color={APP_COLORS.surface} />
						<Text style={[styles.footerText, { color: APP_COLORS.surface }]}>{`Call ${noun}`}</Text>
					</TouchableOpacity>
				</View>
			) : null}
		</View>
	)
}

const styles = StyleSheet.create({
	page: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	flex: { flex: 1, minWidth: 0 },
	scroll: { gap: 8, paddingBottom: 16 },
	sideMargin: { marginHorizontal: 16 },
	row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: -10 },
	headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },

	strip: {
		flexDirection: 'row',
		marginHorizontal: 16,
		marginTop: 16,
		paddingTop: 14,
		paddingBottom: 12,
		paddingHorizontal: 4,
		borderRadius: 14,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	stepCol: { flex: 1, alignItems: 'center', gap: 6 },
	stepLine: { position: 'absolute', left: '50%', width: '100%', top: 11, height: 2 },
	stepDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	stepLabel: { fontSize: 11, lineHeight: 14, textAlign: 'center' },

	banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
	bannerIcon: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	bannerTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
	bannerSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.ink },

	section: { backgroundColor: APP_COLORS.surface, padding: 16, gap: 10 },
	sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },

	avatar: {
		width: 56,
		height: 56,
		borderRadius: 28,
		backgroundColor: APP_COLORS.mint,
		borderWidth: 2,
		borderColor: APP_COLORS.mintAccent,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: { fontSize: 18, fontWeight: '800', color: APP_COLORS.primary },
	eyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6, color: APP_COLORS.primary },
	providerName: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	roundBtn: {
		width: 44,
		height: 44,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: APP_COLORS.border,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},

	mapBox: { borderRadius: 12, overflow: 'hidden', backgroundColor: APP_COLORS.mint },
	arrivalTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },

	detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 6 },
	detailDivider: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	detailIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	detailLabel: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 0.4, color: APP_COLORS.inkMuted },
	detailValue: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },

	tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
	tipNum: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	tipNumText: { fontSize: 12, fontWeight: '800', color: APP_COLORS.primary },
	tipTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	tipSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },

	happenRow: { flexDirection: 'row', gap: 12 },
	happenRail: { alignItems: 'center' },
	happenDot: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	happenActive: { borderWidth: 3, borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	happenPending: { borderWidth: 2, borderColor: APP_COLORS.divider, backgroundColor: APP_COLORS.surface },
	happenLine: { flexGrow: 1, width: 2, minHeight: 14, marginVertical: 2 },
	happenText: { flex: 1, paddingTop: 2, paddingBottom: 12 },

	payRow: { flexDirection: 'row', justifyContent: 'space-between' },
	payText: { fontSize: 14, lineHeight: 20, color: APP_COLORS.ink },
	payTotal: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'baseline',
		marginTop: 2,
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.border,
		borderStyle: 'dashed',
	},
	payTotalLabel: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
	payTotalValue: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: APP_COLORS.ink },

	helpRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginHorizontal: 16,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: TONES.lilac.bg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	helpTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },

	feedbackHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	reviewed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	reviewedText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink },

	footer: {
		flexDirection: 'row',
		gap: 8,
		paddingTop: 12,
		paddingHorizontal: 16,
		backgroundColor: APP_COLORS.surface,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	footerBtn: {
		flex: 1,
		height: 52,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
	},
	footerOutline: { borderWidth: 1.5, borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.surface },
	footerSolid: { backgroundColor: APP_COLORS.primary },
	footerText: { fontSize: 15, fontWeight: '700' },
})
