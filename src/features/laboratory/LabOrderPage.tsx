// src/features/laboratory/LabOrderPage.tsx
//
// "Lab order" from the Lab Tests Ordering design: status banners (fasting / rescheduled / cancelled), the tests
// in the order, Details (pickup, phlebotomist, patient, address, order id + QR), "Before the pickup", the
// payment summary, the Status timeline, Cancel order, a help row and the Reschedule / Add more tests footer,
// plus the cancel, reschedule and pickup-QR sheets. Same building blocks as the patient appointment details
// (AppDetailRow, AppStatusTimeline, AppBillSummary, AppNumberedSteps, CheckInQrSheet). The order is the one just
// placed, or one opened from the Bookings tab, and is re-read from the server whenever the screen comes into focus,
// the app returns to the foreground, or the patient pulls down, so what is shown follows what the lab does. The
// timeline is drawn from the server's `timeline`; a missed visit, a phlebotomist no-show or a rejected sample shows
// a banner with Book again / Contact support.

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
	ActivityIndicator,
	AppState,
	Linking,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from 'react-native'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppBillStatusLine,
	AppBillSummary,
	AppButton,
	AppDetailRow,
	AppFooterBar,
	AppIconTile,
	AppNavRow,
	AppNumberedSteps,
	AppPathIcon,
	AppScreenHeader,
	AppSection,
	AppStatusTimeline,
	type AppTimelineStep,
	type BillingRow,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { addToCalendar } from '../../utils/calendar'
import { showComingSoon } from '../../utils/toast'
import { contactSupport, useAppConfig } from '../dashboard/useHomeChromeData'
import CheckInQrSheet from '../appointment/components/patient-details/CheckInQrSheet'
import { labBooking, type LabOrder } from './labBookingStore'
import { LabLogo } from './LabLogo'
import { commaDate, inr, longDate, plural, slotStart, stampLabel } from './labFormat'
import { applyApi, orderFromApi } from './labOrder'
import { fetchOrder } from './labService'
import { LabCancelSheet, LabRescheduleSheet, type LabPickup } from './LabOrderSheets'
import { LAB_ICONS } from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

// What the patient is told when the visit could not be completed.
const ATTENTION_TEXT: Record<string, { title: string; body: string }> = {
	missed: {
		title: 'We missed you at your visit',
		body: 'We couldn’t collect your sample because no one was available. You can book again, or call support if this is a mistake.',
	},
	no_show: {
		title: 'Your phlebotomist couldn’t make the visit',
		body: 'We’re sorry. You can book again, or call support and we’ll help.',
	},
	sample_rejected: {
		title: 'Your sample couldn’t be used',
		body: 'The lab couldn’t use it, so it needs to be collected again. You can book again, or call support.',
	},
}
const ATTENTION_FALLBACK = {
	title: 'We couldn’t complete your lab visit',
	body: 'You can book again, or call support and we’ll help.',
}

type ContentProps = {
	order: LabOrder
	onChange: (next: LabOrder) => void
	refreshing: boolean
	onRefresh: () => void
}

function LabOrderContent({ order, onChange, refreshing, onRefresh }: ContentProps) {
	const navigation = useNavigation<Nav>()
	const isHome = order.where === 'home'

	const [cancelOpen, setCancelOpen] = useState(false)
	const [qrOpen, setQrOpen] = useState(false)
	const [resOpen, setResOpen] = useState(false)
	const [rescheduled, setRescheduled] = useState(false)

	const first = order.visits[0]
	const current: LabPickup = { date: first?.date ?? '', time: first?.time ?? '' }
	const savings = order.mrpTotal - order.total
	const cancelled = order.status === 'cancelled'
	const cancelRequested = order.status === 'cancel_requested'
	const rescheduleRequested = order.status === 'reschedule_requested'
	const needsAttention = order.status === 'needs_attention'
	const live = !cancelled && !cancelRequested
	// Still on its way to a visit: not cancelled, not waiting on a cancel, not a visit that could not be completed.
	const active = live && !needsAttention
	const attention = ATTENTION_TEXT[order.attentionReason ?? ''] ?? ATTENTION_FALLBACK
	const supportConfig = useAppConfig()
	const askSupport = () => {
		if (!contactSupport(supportConfig?.support_phone || '', supportConfig?.support_email || '')) showComingSoon()
	}
	const canCancel = !!order.apiId && !!order.canCancel
	const canReschedule = !!order.apiId && !!order.canReschedule
	const placed = order.placedAt.slice(0, 10)

	// "Add more tests" / "Book again" start a fresh booking (this order is already placed).
	const goCatalog = () => {
		labBooking.startOver()
		navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
	}
	const goBookings = () => {
		navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })
		labBooking.reset()
	}
	const addToCal = () => {
		if (!current.date) return showComingSoon()
		const start = slotStart(current.date, current.time)
		void addToCalendar({
			title: isHome ? 'Lab tests · home sample collection' : `Lab tests · ${order.addressTitle}`,
			start,
			end: new Date(start.getTime() + 60 * 60_000),
			location: isHome ? order.addressSub : [order.addressTitle, order.addressSub].filter(Boolean).join(', '),
			notes: `KarolaHealth order ${order.id}. For ${order.patientName}.`,
		})
	}

	const billRows: BillingRow[] = [
		{ label: `Tests (${order.items.length}, MRP)`, value: inr(order.mrpTotal) },
		...(savings > 0 ? [{ label: 'Package discount', value: `\u2212${inr(savings)}`, tone: 'free' as const }] : []),
		{ label: order.method === 'later' ? 'To pay' : 'Paid', value: inr(order.total), tone: 'total', dividerBefore: true },
	]

	const whenLabel = current.date ? `${commaDate(current.date)}, ${current.time}` : ''

	// The progress comes from the server (a cancelled order and a visit that needs attention have none: their banner
	// says what happened). Each step may say when it was reached.
	const timeline: AppTimelineStep[] = (order.timeline ?? []).map((step) => ({
		key: step.key,
		title: step.title,
		state: step.state,
		sub: [step.sub, step.at ? stampLabel(step.at) : null].filter(Boolean).join(' · '),
	}))

	const beforeSteps = [
		{ title: 'Fast from 9 PM tonight', body: 'No food, tea or coffee. Water is fine.', show: order.fasting },
		{ title: 'Take regular medicines', body: 'Unless your doctor told you otherwise.', show: true },
		{ title: 'Keep a photo ID ready', body: 'The phlebotomist checks it before collecting.', show: true },
	]
		.filter((s) => s.show)
		.map(({ title, body }) => ({ title, body }))

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Lab order"
				subtitle={`Order ${order.id}`}
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to bookings"
				rightElement={
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={() => showComingSoon()}
							accessibilityLabel="Share"
						>
							<MaterialCommunityIcons name="share-variant-outline" size={22} color="#FFFFFF" />
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={() => showComingSoon()}
							accessibilityLabel="Help"
						>
							<MaterialCommunityIcons name="help-circle-outline" size={22} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				}
			/>

			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
			>
				{/* Banners */}
				{cancelled && (
					<View style={styles.cancelBanner}>
						<AppIconTile size={40} radius={12} backgroundColor={APP_COLORS.danger}>
							<AppPathIcon d={LAB_ICONS.close} size={20} strokeWidth={2.4} color="#FFFFFF" />
						</AppIconTile>
						<View style={styles.flex}>
							<Text style={styles.cancelEyebrow}>CANCELLED</Text>
							<Text style={styles.cancelTitle}>
								{order.items.length === 1
									? order.items[0].name
									: `Lab order for ${plural(order.items.length, 'test', 'tests')}`}
							</Text>
							<Text style={styles.cancelSub}>
								{order.method === 'later'
									? 'Nothing was charged. You can book again any time.'
									: `Refund of ${inr(order.total)} started to your ${order.methodLabel}. You’ll get an SMS when it lands.`}
							</Text>
						</View>
					</View>
				)}
				{needsAttention && (
					<View style={styles.noteBannerWrap}>
						<View style={[styles.noteBanner, { backgroundColor: APP_COLORS.dangerBg }]}>
							<AppIconTile size={32} radius={10} backgroundColor="#FFFFFF">
								<AppPathIcon d={LAB_ICONS.close} size={18} strokeWidth={2.4} color={APP_COLORS.danger} />
							</AppIconTile>
							<View style={styles.flex}>
								<Text style={[styles.noteTitle, { color: APP_COLORS.danger }]}>{attention.title}</Text>
								<Text style={styles.noteSub}>{attention.body}</Text>
							</View>
						</View>
					</View>
				)}
				{rescheduled && !cancelled && (
					<View style={styles.noteBannerWrap}>
						<View style={[styles.noteBanner, { backgroundColor: APP_COLORS.successBg }]}>
							<AppIconTile size={32} radius={10} backgroundColor="#FFFFFF">
								<AppPathIcon
									d={LAB_ICONS.check}
									size={18}
									strokeWidth={2.4}
									color={APP_COLORS.success}
								/>
							</AppIconTile>
							<View style={styles.flex}>
								<Text style={[styles.noteTitle, { color: APP_COLORS.success }]}>Rescheduled</Text>
								<Text style={styles.noteSub}>
									Your fasting reminder moves with the new pickup time.
								</Text>
							</View>
						</View>
					</View>
				)}
				{(cancelRequested || rescheduleRequested) && (
					<View style={styles.noteBannerWrap}>
						<View style={[styles.noteBanner, { backgroundColor: APP_COLORS.warningBg }]}>
							<AppIconTile size={32} radius={10} backgroundColor="#FFFFFF">
								<AppPathIcon d={LAB_ICONS.clock} size={18} strokeWidth={2} color={APP_COLORS.warning} />
							</AppIconTile>
							<View style={styles.flex}>
								<Text style={[styles.noteTitle, { color: APP_COLORS.warning }]}>
									{cancelRequested ? 'Cancellation requested' : 'Reschedule requested'}
								</Text>
								<Text style={styles.noteSub}>
									{cancelRequested
										? 'The lab has not confirmed yet. We’ll update this order when it does.'
										: 'The lab has not confirmed the new time yet. Your current time stands until it does.'}
								</Text>
							</View>
						</View>
					</View>
				)}
				{active && order.fasting && (
					<View style={styles.noteBannerWrap}>
						<View style={[styles.noteBanner, { backgroundColor: APP_COLORS.warningBg }]}>
							<AppIconTile size={32} radius={10} backgroundColor="#FFFFFF">
								<AppPathIcon d={LAB_ICONS.clock} size={18} strokeWidth={2} color={APP_COLORS.warning} />
							</AppIconTile>
							<View style={styles.flex}>
								<Text style={[styles.noteTitle, { color: APP_COLORS.warning }]}>
									Fast for 10–12 hours
								</Text>
								<Text style={styles.noteSub}>Stop eating by 9 PM tonight. Plain water is fine.</Text>
							</View>
						</View>
					</View>
				)}

				{/* Tests in this order */}
				<AppSection marginTop={8} title="Tests in this order" titleSize="sm" gap={0}>
					{order.items.map((item, i) => (
						<View key={item.id} style={[styles.testRow, i < order.items.length - 1 && styles.rowRule]}>
							<AppIconTile tone={item.kind === 'package' ? 'lilac' : 'mint'} size={40} radius={12}>
								<AppPathIcon
									d={item.kind === 'package' ? LAB_ICONS.order : LAB_ICONS.flask}
									size={20}
									strokeWidth={2}
									color={item.kind === 'package' ? '#6A4BB5' : APP_COLORS.primary}
								/>
							</AppIconTile>
							<View style={styles.flex}>
								<Text style={styles.testName}>{item.name}</Text>
								<Text style={styles.testSub}>{item.sub}</Text>
							</View>
							<Text style={styles.testPrice}>{inr(item.price)}</Text>
						</View>
					))}
				</AppSection>

				{/* Details */}
				<AppSection marginTop={0} title="Details" titleSize="sm" gap={0}>
					<AppDetailRow
						style={styles.detailRow}
						icon="calendar-month-outline"
						label={isHome ? 'SAMPLE PICKUP' : 'LAB VISIT'}
						value={whenLabel}
						sub={
							rescheduled
								? `${current.date ? longDate(current.date) : ''} · rescheduled`
								: isHome
									? 'At your home'
									: order.addressTitle
						}
						action={{ label: 'Add to calendar', onPress: addToCal }}
					/>
					{!!order.labName && (
						<View style={styles.labRow}>
							<LabLogo uri={order.labLogoUrl} size={44} />
							<View style={styles.flex}>
								<Text style={styles.labEyebrow}>LAB</Text>
								<Text style={styles.labName}>{order.labName}</Text>
								<Text style={styles.labSub}>
									{[
										isHome ? 'Home sample collection' : 'Visit the lab',
										order.labTatHours != null ? `Reports in ${order.labTatHours} hrs` : null,
									]
										.filter(Boolean)
										.join(' · ')}
								</Text>
							</View>
						</View>
					)}
					{isHome && (
						<AppDetailRow
							style={styles.detailRow}
							icon="account-outline"
							label="PHLEBOTOMIST"
							value={order.phleboName || 'Not assigned yet'}
							sub={
								order.phleboName
									? (order.phleboNumber ?? '')
									: 'We’ll share their name and number once the lab assigns one'
							}
							action={
								order.phleboNumber && live
									? { label: 'Call', icon: 'phone-outline', onPress: () => void Linking.openURL(`tel:${order.phleboNumber}`) }
									: order.trackingLink && live
										? { label: 'Track', onPress: () => void Linking.openURL(order.trackingLink as string) }
										: undefined
							}
						/>
					)}
					<AppDetailRow
						style={styles.detailRow}
						icon="account-outline"
						label="PATIENT"
						value={order.patientName}
						sub={order.patientRelation}
					/>
					{isHome && (
						<AppDetailRow
							style={styles.detailRow}
							icon="home-outline"
							label="COLLECTION ADDRESS"
							value={order.addressTitle}
							sub={order.addressSub}
							action={{ label: 'Change', onPress: () => showComingSoon() }}
						/>
					)}
					<AppDetailRow
						style={styles.detailRow}
						icon="clipboard-text-outline"
						label="ORDER ID"
						value={order.id}
						sub={`Placed on ${longDate(placed)}`}
						action={{ label: 'Show QR', icon: 'qrcode', onPress: () => setQrOpen(true) }}
						divider={false}
					/>
				</AppSection>

				{/* Before the pickup */}
				{active && (
					<AppSection marginTop={0} title={isHome ? 'Before the pickup' : 'Before your visit'} titleSize="sm">
						<AppNumberedSteps steps={beforeSteps} numberSize={24} gap={10} markerGap={10} textGap={0} />
					</AppSection>
				)}

				{/* Payment */}
				<AppSection marginTop={0} title="Payment" titleSize="sm" gap={10}>
					<AppBillSummary
						variant="flat"
						dashedDividers
						rowGap={10}
						rows={billRows}
						footer={
							<AppBillStatusLine
								text={
									order.method === 'later'
										? `${inr(order.total)} to pay on collection`
										: `Paid via ${order.methodLabel} · ${order.transactionId}`
								}
								tone="paid"
								onReceiptPress={() => showComingSoon()}
							/>
						}
					/>
				</AppSection>

				{/* Status */}
				{timeline.length > 0 && (
					<AppSection marginTop={0} title="Status" titleSize="sm">
						<AppStatusTimeline steps={timeline} />
					</AppSection>
				)}

				{live && canCancel && (
					<View style={styles.cancelRow}>
						<TouchableOpacity
							onPress={() => setCancelOpen(true)}
							style={styles.cancelBtn}
							accessibilityRole="button"
						>
							<Text style={styles.cancelBtnText}>Cancel order</Text>
						</TouchableOpacity>
					</View>
				)}

				<View style={styles.help}>
					<AppNavRow
						title="Need help with this booking?"
						subtitle="Chat with Karolahealth support"
						leading={{
							children: <AppPathIcon d={LAB_ICONS.chat} size={20} strokeWidth={2} color="#6A4BB5" />,
							tone: 'lilac',
							size: 36,
							radius: 10,
						}}
						onPress={askSupport}
						minHeight={60}
						titleStyle={styles.helpTitle}
					/>
				</View>
				<View style={styles.help}>
					<AppNavRow
						title="Sample lab report"
						subtitle="See how your results will look"
						leading={{
							children: (
								<AppPathIcon
									d={LAB_ICONS.document}
									size={20}
									strokeWidth={2}
									color={APP_COLORS.success}
								/>
							),
							backgroundColor: APP_COLORS.successBg,
							size: 36,
							radius: 10,
						}}
						onPress={() => navigation.navigate(ROUTES.STACK.LABORATORY_REPORT)}
						minHeight={60}
						titleStyle={styles.helpTitle}
					/>
				</View>
			</ScrollView>

			<AppFooterBar>
				{active ? (
					<>
						<AppButton
							variant="outline"
							size="lg"
							style={styles.flex}
							icon="calendar-month-outline"
							disabled={!canReschedule}
							onPress={() => setResOpen(true)}
						>
							Reschedule
						</AppButton>
						<AppButton size="lg" style={styles.flex} icon="plus" onPress={goCatalog}>
							Add more tests
						</AppButton>
					</>
				) : needsAttention ? (
					<>
						<AppButton variant="outline" size="lg" style={styles.flex} icon="phone-outline" onPress={askSupport}>
							Contact support
						</AppButton>
						<AppButton size="lg" style={styles.flex} onPress={goCatalog}>
							Book again
						</AppButton>
					</>
				) : (
					<>
						<AppButton variant="outline" size="lg" style={styles.flex} onPress={goBookings}>
							Back to bookings
						</AppButton>
						<AppButton size="lg" style={styles.flex} onPress={goCatalog}>
							Book again
						</AppButton>
					</>
				)}
			</AppFooterBar>

			{!!order.apiId && (
				<>
					<LabCancelSheet
						visible={cancelOpen}
						orderId={order.apiId}
						subtitle={
							order.method === 'later'
								? 'Nothing was charged, so there is nothing to refund'
								: `Your ${inr(order.total)} will be refunded to your ${order.methodLabel}`
						}
						canReschedule={canReschedule}
						onClose={() => setCancelOpen(false)}
						onRescheduleInstead={() => {
							setCancelOpen(false)
							setResOpen(true)
						}}
						onCancelled={(api) => {
							setCancelOpen(false)
							onChange(applyApi(order, api))
						}}
					/>
					<LabRescheduleSheet
						visible={resOpen}
						orderId={order.apiId}
						subtitle={`${isHome ? 'Home sample collection' : 'Lab visit'} · ${plural(order.items.length, 'test', 'tests')}`}
						current={current}
						onClose={() => setResOpen(false)}
						onRescheduled={(api) => {
							setResOpen(false)
							setRescheduled(api.status === 'scheduled')
							onChange(applyApi(order, api))
						}}
					/>
				</>
			)}
			<CheckInQrSheet
				visible={qrOpen}
				bookingId={order.id}
				onClose={() => setQrOpen(false)}
				title="Pickup QR"
				subtitle={isHome ? 'Show this to the phlebotomist' : 'Show this at the lab front desk'}
			/>
		</View>
	)
}

/** The order is re-read from the server on every focus, when the app returns, and on pull-down; with no placed order
 * there is nothing to show. */
export default function LabOrderPage() {
	const navigation = useNavigation<Nav>()
	const route = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.LABORATORY_BOOKING_TRACKING>>()
	const orderId = route.params?.orderId
	// Opened from the Bookings tab: load that order. Right after booking: the snapshot in the booking store.
	const [order, setOrder] = useState<LabOrder | null>(() => (orderId ? null : labBooking.get().order))
	const [failed, setFailed] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const apiId = orderId ?? order?.apiId
	// Nothing more changes on a cancelled order or one whose report is ready, so those are not re-read on their own
	// (pulling down still does).
	const settled = order?.status === 'cancelled' || order?.status === 'report_ready'
	const hasOrder = useRef(order != null)
	hasOrder.current = order != null
	// Only the newest read counts: a slower, older answer must not overwrite a newer one.
	const latest = useRef(0)

	const refresh = useCallback(async () => {
		if (!apiId) return
		const ticket = ++latest.current
		try {
			const api = await fetchOrder(apiId)
			if (ticket !== latest.current) return
			setOrder((prev) => (prev ? applyApi(prev, api) : orderFromApi(api)))
			setFailed(false)
		} catch {
			// A failed re-read keeps what is shown; only a first load with nothing to show is an error.
			if (ticket === latest.current && !hasOrder.current) setFailed(true)
		}
	}, [apiId])

	useFocusEffect(
		useCallback(() => {
			if (!settled) void refresh()
		}, [refresh, settled]),
	)

	// Coming back to the app on this screen (it stays focused while the app is in the background) is also a look.
	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => {
			if (state === 'active' && !settled) void refresh()
		})
		return () => sub.remove()
	}, [refresh, settled])

	// A cancel / reschedule the patient has just made is newer than any read still in flight.
	const change = (next: LabOrder) => {
		latest.current++
		setOrder(next)
	}

	const pullToRefresh = async () => {
		setRefreshing(true)
		await refresh()
		setRefreshing(false)
	}

	useEffect(() => {
		if (!orderId && !order) navigation.replace(ROUTES.STACK.LABORATORY_LIST)
	}, [orderId, order, navigation])
	if (failed) {
		return (
			<View style={styles.loading}>
				<Text style={styles.loadingText}>We couldn’t load this order. Please try again.</Text>
				<AppButton size="md" onPress={() => navigation.goBack()}>
					Go back
				</AppButton>
			</View>
		)
	}
	if (!order) {
		return orderId ? (
			<View style={styles.loading}>
				<ActivityIndicator color={APP_COLORS.primary} />
			</View>
		) : null
	}
	return <LabOrderContent order={order} onChange={change} refreshing={refreshing} onRefresh={pullToRefresh} />
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	// The detail rows have no padding of their own: a little air above and below, so the lab and phlebotomist rows are not crowded.
	detailRow: { paddingVertical: 6 },
	labRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	labEyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	labName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	labSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: APP_COLORS.pageBg },
	loadingText: { fontSize: 14, color: APP_COLORS.inkMuted, textAlign: 'center' },
	content: { gap: 8, paddingBottom: 16 },
	flex: { flex: 1, minWidth: 0 },
	headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: -10 },
	headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

	cancelBanner: {
		marginHorizontal: 16,
		marginTop: 16,
		padding: 16,
		borderRadius: 14,
		backgroundColor: APP_COLORS.dangerBg,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	cancelEyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.66, color: APP_COLORS.danger },
	cancelTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	cancelSub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	noteBannerWrap: { marginHorizontal: 16, marginTop: 16 },
	noteBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
	noteTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
	noteSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.ink },

	testRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
	rowRule: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.divider },
	testName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	testSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	testPrice: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },

	cancelRow: { paddingTop: 4, paddingHorizontal: 16, alignItems: 'center' },
	cancelBtn: { height: 44, paddingHorizontal: 12, justifyContent: 'center' },
	cancelBtnText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.danger },
	help: {
		marginHorizontal: 16,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
})
