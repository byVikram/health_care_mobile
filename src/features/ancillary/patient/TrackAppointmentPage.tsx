import React, { useState } from 'react'
import { Linking, Share, StyleSheet, View, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { ROUTES } from '../../../navigation/routes'
import AppScreenHeader from '../../../components/common/layout/AppScreenHeader'
import StatusModal from '../../../components/common/feedback/StatusModal'
import NurseMapTracker from '../components/NurseMapTracker'
import HomeCareVisitView, { currentVisitOf, type StatusTimeline, type TrackingVisit } from './HomeCareVisitView'
import { showComingSoon } from '../../../utils/toast'
import RateAncillaryReviewModal from '../components/RateAncillaryReviewModal'
import ServiceMatchingPage from './ServiceMatchingPage'
import {
	AncillaryBooking,
	AncillaryReviewData,
	fetchAncillaryReviewByBooking,
	submitAncillaryReview,
	cancelCareRequestPatientBackend,
} from '../ancillaryService'
import CancellationDetailsModal from './CancellationDetailsModal'
import { useVisitPolicy } from '../hooks/useVisitPolicy'
import { dayLabel, inr, providerNoun, timeLabel } from './ancillaryBookingCopy'
import { MissedVisitBanner } from '../components/MissedVisitBanner'
import { CancelVisitsSheet } from '../components/CancelVisitsSheet'
import { lockedReason } from './scheduledVisitView'
import { useVisitEdits } from './useVisitEdits'
import ApiService, { showStatusModal } from '../../../services/apiService'
import { openAuthedSocket, type AuthedSocketHandle } from '../../../utils/authedSocket'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

// ---------------------------------------------------------------------------
// Types -- mirror the real backend response from
// GET /api/ancillary/patient/requests/{id}/status (see
// dispatch_service.get_service_request_status), which is also what every
// WebSocket CARE_REQUEST_STATUS_CHANGE payload carries. Every field is
// optional/nullable because the backend only fills them in once real data
// exists (e.g. no provider fields until a provider is actually assigned).
// ---------------------------------------------------------------------------
export interface AncillaryProviderInfo {
	id: string
	name: string
	role: string | null
	specialization: string | null
	licenseNumber: string | null
	qualifications: string | null
	experienceYears: number | null
	rating: number | null
	totalVisits: number | null
	avatar: string | null
	phone: string | null
	currentLat: number | null
	currentLng: number | null
	heading?: number
}

export interface AncillaryProviderLocation {
	latitude: number
	longitude: number
	heading?: number
}

export interface AncillaryTrackingResponse {
	requestId?: string
	status?: string
	bookingType?: string
	/** The websocket order push spells it this way. */
	booking_type?: string
	serviceName?: string
	procedureDetails?: string
	assignedProvider?: AncillaryProviderInfo | null
	patientPublicId?: string | null
	patientName?: string
	patientPhone?: string
	patientAge?: number
	patientGender?: string
	patientRelationship?: string
	patientAvatar?: string | null
	providerLocation?: AncillaryProviderLocation | null
	streetAddress?: string
	createdAt?: string
	verificationOtp?: string | null
	completionPin?: string | null
	totalAmount?: number
	etaMinutes?: number | null
	tipAmount?: number
	payment_method?: string | null
	/** Structured visit address ({street_address, label}); the legacy `address` field stays a plain string. */
	address_detail?: { street_address?: string; label?: string | null } | null
	totals?: { per_visit: number; visits_count: number; total: number }
	/** Home-care speciality (key = catalogue slug), used for "nurse" / "physiotherapist" wording. */
	specialty?: { key?: string | null; label?: string | null } | string | null
	/** One entry per visit, with the patient's start / completion codes and the live task checklist. */
	visits?: TrackingVisit[]
	/** The order's status strip, decided by the server. */
	timeline?: StatusTimeline
}

// Mirrors the canonical status vocabulary defined by the backend
// (app/models/ancillary.py AncillaryRequestStatus / *_STATUSES groups).
const ASSIGNED_STATUSES = new Set([
	'ASSIGNED',
	'NURSE_ASSIGNED',
	'EN_ROUTE',
	'ARRIVED',
	'IN_PROGRESS',
	'VERIFICATION_PENDING',
	'COMPLETED',
	// The provider came and the patient was not available: the order is over, so it is never searched for again.
	'NO_SHOW',
])

const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELLED_BY_PATIENT', 'CANCELLED_BY_PROVIDER', 'EXPIRED', 'FAILED'])
const POLL_MS = 2000
const POLL_WITH_SOCKET_MS = 10000

/** A "Later" order: its visits are shown before any provider is assigned (they are assigned an hour before each visit). */
const isScheduledOrder = (d?: { bookingType?: string; booking_type?: string } | null) =>
	String(d?.bookingType ?? d?.booking_type ?? '').toUpperCase() === 'SCHEDULED'

/** A websocket order push carries visits without the codes / tasks the status endpoint adds: keep what we already had. */
const mergeVisits = (prev?: TrackingVisit[], next?: TrackingVisit[]) =>
	next && prev
		? next.map((v) => ({ ...(prev.find((o) => o.visit_public_id === v.visit_public_id) ?? {}), ...v }))
		: (next ?? prev)

const hasConfirmedProvider = (prov?: AncillaryProviderInfo | null, st?: string): boolean => {
	const statusUpper = String(st || '').toUpperCase()
	return Boolean(prov?.id) && ASSIGNED_STATUSES.has(statusUpper)
}

export default function TrackAppointmentPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()

	const bookingData = route.params?.bookingData || {}
	const bookingId = String(route.params?.bookingId || bookingData.id || bookingData.requestId || '')

	// Review state
	const [reviewData, setReviewData] = useState<AncillaryReviewData | null>(() => bookingData.review || null)
	const [reviewModalVisible, setReviewModalVisible] = useState(false)
	const [isSubmittingReview, setIsSubmittingReview] = useState(false)
	const [cancelModalVisible, setCancelModalVisible] = useState(false)
	const [isCancelling, setIsCancelling] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status?: 'success' | 'error' | 'info'
		title: string
		description: string
	} | null>(null)

	const initialHasConfirmed = hasConfirmedProvider(
		bookingData.assignedProvider || bookingData.provider,
		bookingData.status
	)

	// True until the first HTTP status fetch resolves and verifies real backend provider
	// assignment. If bookingData passed in already contains a confirmed assigned provider,
	// we skip the spinner and render immediately.
	const [isInitializing, setIsInitializing] = useState<boolean>(() => !initialHasConfirmed)

	const [liveStatus, setLiveStatus] = useState<string>(() => String(bookingData.status || '').toUpperCase())
	const liveStatusRef = React.useRef(liveStatus)
	React.useEffect(() => {
		liveStatusRef.current = liveStatus
	}, [liveStatus])

	// Latest full status payload: visits (+ codes, tasks), totals, payment, address detail.
	const [liveOrder, setLiveOrder] = useState<AncillaryTrackingResponse | null>(null)
	const [liveProvider, setLiveProvider] = useState<AncillaryProviderInfo | null>(
		bookingData.assignedProvider || bookingData.provider || null
	)
	const [liveOtp, setLiveOtp] = useState<string>(() => String(bookingData.verificationOtp || bookingData.otp || ''))
	const [liveCompletionPin, setLiveCompletionPin] = useState<string>(() => String(bookingData.completionPin || ''))
	const [liveEtaMinutes, setLiveEtaMinutes] = useState<number | null>(() =>
		typeof bookingData.etaMinutes === 'number' ? bookingData.etaMinutes : null
	)
	const [liveAddress, setLiveAddress] = useState<string>(
		() =>
			bookingData.streetAddress ||
			bookingData.address ||
			bookingData.patientAddress ||
			bookingData.appointment?.address ||
			''
	)
	const [liveDateTime, setLiveDateTime] = useState<string>(
		() =>
			bookingData.createdAt ||
			(bookingData.appointmentDate
				? `${bookingData.appointmentDate} • ${bookingData.appointmentTime || ''}`
				: '') ||
			bookingData.dateTime ||
			bookingData.appointment?.dateTime ||
			''
	)
	const [liveServiceTitle, setLiveServiceTitle] = useState<string>(
		() => bookingData.serviceName || bookingData.service || bookingData.appointment?.service || ''
	)

	// Dynamic, backend-driven provider -- never a fabricated placeholder
	// object. `null` genuinely means "no assigned provider data available".
	const provider: AncillaryProviderInfo | null =
		liveProvider || bookingData.assignedProvider || bookingData.provider || null

	const isAssigned = hasConfirmedProvider(provider, liveStatus)
	const visitPolicy = useVisitPolicy()
	// A scheduled visit is cancelled on its own (a reason, within the server's cutoff), not the whole booking.
	const [visitCancelOpen, setVisitCancelOpen] = useState(false)
	const { cancelling: visitCancelling, cancelVisits } = useVisitEdits(bookingId, async () => {})
	const specialty = liveOrder?.specialty
	const scheduledNoun = providerNoun(typeof specialty === 'string' ? specialty : (specialty?.key ?? ''))
	const isScheduled = isScheduledOrder(liveOrder) || isScheduledOrder(bookingData)
	// The visit this screen is about (the same rule HomeCareVisitView uses), and -- for a scheduled order, where every
	// visit has its own provider -- that visit's provider, never the order-level one (the next open visit's).
	const focusedVisit = currentVisitOf(liveOrder?.visits ?? [], route.params?.visitId)
	const visitProvider = focusedVisit?.provider
	const shownProvider: AncillaryProviderInfo | null = isScheduled
		? visitProvider
			? {
					id: visitProvider.provider_public_id,
					name: visitProvider.name,
					role: null,
					specialization: null,
					licenseNumber: null,
					qualifications: null,
					experienceYears: visitProvider.experience_years ?? null,
					rating: null,
					totalVisits: null,
					avatar: visitProvider.avatar_url ?? null,
					phone: visitProvider.phone ?? null,
					currentLat: null,
					currentLng: null,
				}
			: null
		: provider

	// The long-lived socket/poll effect below only re-runs on bookingId, so its closures would
	// otherwise keep the first render's provider/title/address. Read them through this ref.
	const liveRef = React.useRef({ provider: liveProvider, title: liveServiceTitle, address: liveAddress })
	liveRef.current = { provider: liveProvider, title: liveServiceTitle, address: liveAddress }
	// Once an order is known to be scheduled it stays so, whatever shape the next update comes in.
	const scheduledRef = React.useRef(isScheduledOrder(bookingData))

	React.useEffect(() => {
		let socket: AuthedSocketHandle | null = null
		let isMounted = true
		let fetchInFlight = false
		let redirected = false
		let lastFetchAt = 0

		const redirectToMatching = (serviceName: string, addressText: string, id: string = bookingId) => {
			if (!isMounted || redirected) return
			redirected = true
			navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId: id,
				serviceName,
				addressText,
				bookingPayload: bookingData,
			})
		}

		const updateStatusFromData = (data: AncillaryTrackingResponse) => {
			if (!data || !isMounted) return
			const st = String(data.status || '').toUpperCase()
			const currentProv = data.assignedProvider !== undefined ? data.assignedProvider : liveRef.current.provider
			if (isScheduledOrder(data)) scheduledRef.current = true

			if (
				!hasConfirmedProvider(currentProv, st) &&
				st !== 'COMPLETED' &&
				st !== 'NO_SHOW' &&
				!CANCELLED_STATUSES.has(st) &&
				!scheduledRef.current
			) {
				redirectToMatching(
					data.serviceName || liveRef.current.title,
					data.streetAddress || liveRef.current.address
				)
				return
			}

			setLiveOrder((prev) => ({ ...(prev || {}), ...data, visits: mergeVisits(prev?.visits, data.visits) }))
			if (st) {
				setLiveStatus(st)
				liveStatusRef.current = st
			}
			if (data.assignedProvider !== undefined) setLiveProvider(data.assignedProvider ?? null)
			if (data.verificationOtp) setLiveOtp(String(data.verificationOtp))
			else if ((data as any).otp) setLiveOtp(String((data as any).otp))
			if (data.completionPin) setLiveCompletionPin(String(data.completionPin))
			else if ((data as any).pin) setLiveCompletionPin(String((data as any).pin))
			if (data.streetAddress) setLiveAddress(data.streetAddress)
			else if ((data as any).address) setLiveAddress((data as any).address)
			else if ((data as any).patientAddress) setLiveAddress((data as any).patientAddress)
			if (data.createdAt) setLiveDateTime(data.createdAt)
			else if ((data as any).appointmentDate)
				setLiveDateTime(`${(data as any).appointmentDate} • ${(data as any).appointmentTime || ''}`)
			if (data.serviceName) setLiveServiceTitle(data.serviceName)
			if (typeof data.etaMinutes === 'number') setLiveEtaMinutes(data.etaMinutes)
			else if (data.etaMinutes === null) setLiveEtaMinutes(null)
		}

		// Connect Real-Time WebSocket (authenticated + auto-reconnecting; see utils/authedSocket)
		socket = openAuthedSocket(API_ENDPOINTS.ANCILLARY.WS_PATIENT_REQUEST(bookingId), (payload) => {
			if (payload.type === 'CARE_REQUEST_STATUS_CHANGE' && payload.data) {
				updateStatusFromData(payload.data)
			}
		})

		// Fetch Status via HTTP
		const fetchStatus = async () => {
			if (fetchInFlight) return // a slow response must not stack up behind the 2s poll
			fetchInFlight = true
			lastFetchAt = Date.now()
			try {
				// Polled every ~2s: a failure must not pop the global error dialog on every tick.
				const res = await ApiService.get<any>(API_ENDPOINTS.ANCILLARY.REQUEST_STATUS(bookingId), {
					skipGlobalError: true,
				})
				if (!isMounted) return
				const data: AncillaryTrackingResponse = res.data?.data || res.data
				const st = String(data?.status || '').toUpperCase()
				const prov = data?.assignedProvider || null

				if (isScheduledOrder(data)) scheduledRef.current = true
				if (
					!hasConfirmedProvider(prov, st) &&
					st !== 'COMPLETED' &&
					st !== 'NO_SHOW' &&
					!CANCELLED_STATUSES.has(st) &&
					!scheduledRef.current
				) {
					// Provider is NOT assigned yet according to backend.
					// Route back to the existing provider search/selection page.
					redirectToMatching(
						data?.serviceName || liveRef.current.title,
						data?.streetAddress || liveRef.current.address
					)
					return
				}

				updateStatusFromData(data)
			} catch (e) {
				// Deliberately no error state: this runs every ~2s (and the socket also pushes updates), so a
				// transient failure self-heals on the next tick and surfacing it would flicker the UI.
				console.log('[TrackAppointmentPage] Status fetch notice:', e)
			} finally {
				fetchInFlight = false
				if (isMounted) {
					setIsInitializing(false)
				}
			}
		}

		if (bookingId && bookingId !== 'BK-ACTIVE') {
			void fetchStatus()
		} else {
			redirectToMatching(liveRef.current.title, liveRef.current.address, '')
			setIsInitializing(false)
		}

		// Background polling until COMPLETED: every 2 seconds on its own, but only as a safety net (every 10 seconds)
		// while the socket is connected and pushing the changes.
		const pollInterval = setInterval(() => {
			if (
				isMounted &&
				bookingId &&
				bookingId !== 'BK-ACTIVE' &&
				liveStatusRef.current !== 'COMPLETED' &&
				!CANCELLED_STATUSES.has(liveStatusRef.current)
			) {
				const wait = socket?.isConnected() ? POLL_WITH_SOCKET_MS : POLL_MS
				if (Date.now() - lastFetchAt >= wait - 100) void fetchStatus()
			}
		}, POLL_MS)

		return () => {
			isMounted = false
			clearInterval(pollInterval)
			socket?.close()
		}
	}, [bookingId])

	const otp = liveOtp
	const completionPin = liveCompletionPin
	const etaMinutes = liveEtaMinutes
	const isCancelled = CANCELLED_STATUSES.has(liveStatus)
	// The provider reached the address and the patient was not available (the visit asked about, else the order's first).
	const missedVisit =
		focusedVisit?.status === 'NO_SHOW'
			? focusedVisit
			: liveStatus === 'NO_SHOW'
				? (liveOrder?.visits ?? []).find((v) => v.status === 'NO_SHOW')
				: undefined
	const isMissed = !!missedVisit || liveStatus === 'NO_SHOW'
	const isTravelling = ['EN_ROUTE', 'ARRIVED', 'ASSIGNED', 'NURSE_ASSIGNED'].includes(liveStatus)
	const isCompleted = liveStatus === 'COMPLETED'

	React.useEffect(() => {
		const loadBookingReview = async () => {
			if (!bookingId || !isCompleted) return
			if (reviewData) return
			try {
				const res = await fetchAncillaryReviewByBooking(bookingId)
				if (res) {
					setReviewData(res)
				}
			} catch (e) {
				// Non-fatal: the review is optional, so the completed screen simply renders without it.
				console.warn('[TrackAppointmentPage] Booking review load failed:', e)
			}
		}
		void loadBookingReview()
	}, [bookingId, isCompleted])

	React.useEffect(() => {
		if (!isInitializing && !isAssigned && !isCompleted && !isScheduled && !isMissed && !isCancelled) {
			navigation.replace(ROUTES.STACK.ANCILLARY_SERVICE_MATCHING, {
				bookingId,
				serviceName: liveServiceTitle || bookingData.serviceName,
				addressText: liveAddress || bookingData.streetAddress,
				bookingPayload: bookingData,
			})
		}
	}, [
		isInitializing,
		isAssigned,
		isCompleted,
		isScheduled,
		isCancelled,
		bookingId,
		liveServiceTitle,
		liveAddress,
		navigation,
	])

	const handleCallProvider = () => {
		if (!shownProvider?.phone) return
		Linking.openURL(`tel:${shownProvider.phone}`)
	}

	const handleCancelRequestWithReason = async (reason: string) => {
		setIsCancelling(true)
		try {
			await cancelCareRequestPatientBackend(bookingId, reason)
		} catch {
			// Still open on the server: stay here so the patient can try again.
			showStatusModal({
				status: 'error',
				title: 'Could not cancel the request',
				description: 'Please try again.',
				submitText: 'OK',
			})
			return
		} finally {
			setIsCancelling(false)
		}
		setCancelModalVisible(false)
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.MAIN.TABS)
		}
	}

	const handleMessage = () => {
		navigation.navigate(ROUTES.STACK.NOTIFICATION)
	}

	const handleSubmitReview = async (stars: number, comment: string) => {
		if (!provider?.id) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Unable to Submit Review',
				description:
					'We could not find the assigned provider for this booking, so a review cannot be submitted.',
			})
			return
		}
		setIsSubmittingReview(true)
		try {
			const saved = await submitAncillaryReview({
				bookingId,
				providerId: provider.id,
				providerName: provider.name,
				serviceName: liveServiceTitle,
				rating: stars,
				comment,
				patientName: '',
			})
			setReviewData(saved)
			setReviewModalVisible(false)
			setStatusModal({
				visible: true,
				title: 'Thank You!',
				description: `Your feedback for ${provider.name} has been recorded.`,
			})
		} catch (error: any) {
			const errorMsg =
				error?.response?.data?.detail ||
				error?.response?.data?.message ||
				error?.message ||
				'Unable to submit review. Please try again.'
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Review Submission Failed',
				description: errorMsg,
			})
		} finally {
			setIsSubmittingReview(false)
		}
	}

	const modalBookingObj: AncillaryBooking = {
		id: bookingId,
		serviceName: liveServiceTitle,
		serviceKey: bookingData.serviceKey || '',
		serviceLabel: liveServiceTitle,
		status: 'completed',
		date: liveDateTime,
		provider: {
			id: provider?.id,
			name: provider?.name || '',
			designation: provider?.role || provider?.specialization || '',
			avatar: provider?.avatar || '',
		},
		hasReview: !!reviewData,
		rating: reviewData?.rating,
		review: reviewData || undefined,
	}

	if (isInitializing || (!isAssigned && !isScheduled && !isCancelled)) {
		return (
			<View style={styles.container}>
				<AppScreenHeader
					solid
					title="Track Appointment"
					onBack={() => {
						if (navigation.canGoBack()) navigation.goBack()
						else navigation.navigate(ROUTES.MAIN.TABS)
					}}
				/>
				<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
					<ActivityIndicator size="large" color="#2B6F71" />
				</View>
			</View>
		)
	}

	const providerFirst = (provider?.name ?? '').trim().split(/\s+/)[0] || 'your provider'
	const bookedAtTime = liveDateTime.includes('•') ? liveDateTime.split('•')[1].trim() : null
	const serviceSub =
		liveOrder?.procedureDetails &&
		liveOrder.procedureDetails !== liveServiceTitle &&
		liveOrder.procedureDetails.length <= 80
			? liveOrder.procedureDetails
			: null

	const handleShare = () => {
		void Share.share({
			message: `Home care visit${liveServiceTitle ? ` · ${liveServiceTitle}` : ''} — order ${bookingId}${
				provider?.name ? `, with ${provider.name}` : ''
			}`,
		})
	}

	const handleHelp = () => showComingSoon('Support chat is coming soon.')

	return (
		<View style={styles.container}>
			<HomeCareVisitView
				orderRef={bookingId}
				status={liveStatus}
				timeline={liveOrder?.timeline}
				provider={shownProvider}
				visits={liveOrder?.visits ?? []}
				focusVisitId={route.params?.visitId}
				scheduled={
					isScheduled
						? {
								noun: scheduledNoun,
								leadMinutes: visitPolicy.assign_lead_minutes,
								canCancel: !!focusedVisit && focusedVisit.can_cancel !== false,
							}
						: undefined
				}
				serviceName={liveServiceTitle}
				serviceSub={serviceSub}
				patientName={liveOrder?.patientName}
				patientRelation={liveOrder?.patientRelationship}
				addressLabel={liveOrder?.address_detail?.label}
				address={liveAddress}
				bookedAt={bookedAtTime}
				totals={liveOrder?.totals}
				tipAmount={liveOrder?.tipAmount}
				payAfterVisit={(liveOrder?.payment_method ?? 'PAY_AFTER_VISIT') === 'PAY_AFTER_VISIT'}
				startCode={otp}
				completionCode={completionPin}
				etaMinutes={etaMinutes}
				isCompleted={isCompleted}
				isCancelled={isCancelled}
				isMissed={isMissed}
				missedNotice={
					missedVisit ? (
						<MissedVisitBanner
							visitId={missedVisit.visit_public_id}
							title="this visit"
							noun={scheduledNoun}
						/>
					) : undefined
				}
				map={
					isTravelling ? (
						<NurseMapTracker
							providerAvatar={provider?.avatar || undefined}
							etaText={etaMinutes != null ? `${providerFirst} · ~${etaMinutes} min` : undefined}
						/>
					) : null
				}
				review={{ data: reviewData, canRate: !!shownProvider?.id, onOpen: () => setReviewModalVisible(true) }}
				onBack={() => {
					if (navigation.canGoBack()) navigation.goBack()
					else navigation.navigate(ROUTES.MAIN.TABS)
				}}
				onShare={handleShare}
				onHelp={handleHelp}
				onCall={handleCallProvider}
				onMessage={handleMessage}
				onCancel={() => (isScheduled ? setVisitCancelOpen(true) : setCancelModalVisible(true))}
			/>

			{/* Review Bottom Sheet */}
			<RateAncillaryReviewModal
				visible={reviewModalVisible}
				onClose={() => setReviewModalVisible(false)}
				booking={modalBookingObj}
				existingReview={reviewData}
				onSubmit={handleSubmitReview}
				isSubmitting={isSubmittingReview}
			/>

			{/* Status Feedback Confirmation */}
			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status || 'success'}
					title={statusModal.title}
					description={statusModal.description}
					submitText={statusModal.status === 'error' ? 'OK' : 'Done'}
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}

			{isScheduled && !!focusedVisit && (
				<CancelVisitsSheet
					visible={visitCancelOpen}
					rows={[
						{
							id: focusedVisit.visit_public_id,
							title: `Visit ${focusedVisit.index ?? 1} · ${focusedVisit.date ? dayLabel(focusedVisit.date) : ''}`,
							sub: focusedVisit.start_time ? timeLabel(focusedVisit.start_time) : '',
							fee: inr(liveOrder?.totals?.per_visit ?? 0),
							canCancel: focusedVisit.can_cancel !== false,
							lockedNote: lockedReason(
								focusedVisit.status,
								!!shownProvider,
								scheduledNoun,
								visitPolicy.cancel_cutoff_minutes
							),
						},
					]}
					initialId={focusedVisit.visit_public_id}
					busy={visitCancelling}
					onClose={() => setVisitCancelOpen(false)}
					onConfirm={async (ids, reason) => {
						if (!(await cancelVisits(ids, reason))) return
						setVisitCancelOpen(false)
						// Booking details refreshes when it comes back into focus.
						if (navigation.canGoBack()) navigation.goBack()
						else navigation.replace(ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS, { requestId: bookingId })
					}}
				/>
			)}

			<CancellationDetailsModal
				visible={cancelModalVisible}
				onClose={() => setCancelModalVisible(false)}
				onConfirmCancel={handleCancelRequestWithReason}
				isCancelling={isCancelling}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#FFFFFF',
	},
})
