// src/features/ancillary/staff/visit/ProviderVisitDetailsPage.tsx
//
// "2 · Visit details" (ancillary-provider design): service + time, patient (message = coming soon, call),
// address with Navigate (which also tells the patient the provider is on the way) and the "Share live
// location" switch, care instructions + facts from the patient profile, "Bring with you" checklist (local),
// payment (collect after the visit) and "Can't make it? Report an issue". Footer: "I've arrived · enter
// start code" (today's startable visit) -> StartCodeSheet -> Visit in progress.
//
// With the home-care no-show policy on (visit.arrival.no_show_enabled) the footer has two steps instead: "I've arrived"
// (sends the phone's location; the server checks it is near the address and starts the wait) and then, once the wait is
// over, "Patient not available" (the patient is asked what happened) next to "Enter start code" for a patient who turns
// up. A reported visit can still be started with the patient's code the same day.
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import {
	AppButton,
	AppCheckList,
	AppFooterBar,
	AppIconButton,
	AppInfoBanner,
	AppPersonRow,
	AppScreenHeader,
	AppSection,
} from '../../../../components/common'
import { APP_COLORS, formatInr } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import type { AppNavigationParamList } from '../../../../navigation/types'
import { parseDateOnly, relativeDayLabel, startsInLabel } from '../../../../utils/date'
import { getCurrentLocation } from '../../../../services/locationService'
import { callPhone, openDirections } from '../../../../utils/maps'
import { showComingSoon } from '../../../../utils/toast'
import { extractApiErrorMessage } from '../../ancillaryService'
import { useNow } from '../../hooks/useNow'
import {
	getProviderVisit,
	markVisitArrived,
	markVisitOnTheWay,
	reportPatientNotAvailable,
	updateVisitProgress,
	type ProviderVisitDetail,
} from '../../providerVisitService'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { kmLabel, visitStart, visitTitle } from '../today/todayView'
import { CancelVisitSheet } from './CancelVisitSheet'
import { StartCodeSheet } from './StartCodeSheet'
import { useLiveLocationShare } from './useLiveLocationShare'
import {
	bookingRef,
	careFacts,
	firstName,
	isCompleted,
	isInProgress,
	isStartable,
	isToday,
	isUnassigned,
	patientLine,
	timeRange,
} from './visitView'

type Route = RouteProp<AppNavigationParamList, typeof ROUTES.STACK.PROVIDER_VISIT_DETAILS>

export default function ProviderVisitDetailsPage() {
	const navigation = useNavigation<any>()
	const { visitId } = useRoute<Route>().params
	const isFocused = useIsFocused()

	const [visit, setVisit] = useState<ProviderVisitDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [packed, setPacked] = useState<Record<string, boolean>>({})
	const [startOpen, setStartOpen] = useState(false)
	const [cancelOpen, setCancelOpen] = useState(false)
	const [navigating, setNavigating] = useState(false)
	const [arriving, setArriving] = useState(false)
	const [reporting, setReporting] = useState(false)
	const now = useNow(15_000)

	const load = useCallback(async () => {
		try {
			setVisit(await getProviderVisit(visitId))
			setError(null)
		} catch (e) {
			setError(extractApiErrorMessage(e, 'Could not load this visit.'))
		} finally {
			setLoading(false)
		}
	}, [visitId])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)

	useLiveLocationShare(isFocused && !!visit && visit.status === 'EN_ROUTE' && visit.share_location)

	const toggleShare = async (next: boolean) => {
		if (!visit) return
		setVisit({ ...visit, share_location: next })
		try {
			setVisit(await updateVisitProgress(visit.visit_public_id, { share_location: next }))
		} catch (e) {
			setVisit((v) => (v ? { ...v, share_location: !next } : v))
			Toast.show({
				type: 'error',
				text1: 'Could not update sharing',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		}
	}

	/** Navigate also marks today's visit "on the way" (patient notified), once. */
	const handleNavigate = async () => {
		if (!visit || navigating) return
		setNavigating(true)
		try {
			if (isToday(visit) && isStartable(visit) && visit.status !== 'EN_ROUTE' && visit.status !== 'ARRIVED') {
				try {
					setVisit(await markVisitOnTheWay(visit.visit_public_id, visit.share_location))
				} catch {
					// Directions still open; the patient just isn't notified.
				}
			}
			await openDirections(visit.address.latitude, visit.address.longitude, visit.address.street_address)
		} finally {
			setNavigating(false)
		}
	}

	/** "I've arrived": the phone's location goes to the server, which checks it is near the address and starts the wait. */
	const handleArrived = async () => {
		if (!visit || arriving) return
		setArriving(true)
		try {
			const { latitude, longitude } = await getCurrentLocation()
			setVisit(await markVisitArrived(visit.visit_public_id, latitude, longitude))
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Couldn’t mark you as arrived',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setArriving(false)
		}
	}

	const reportNoShow = async () => {
		if (!visit || reporting) return
		setReporting(true)
		try {
			setVisit(await reportPatientNotAvailable(visit.visit_public_id))
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Couldn’t report the patient',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
			void load() // the wait may not be over after all: show where it stands
		} finally {
			setReporting(false)
		}
	}

	const copy = getProviderSpecialityCopy(visit?.service.specialty)

	const header = (
		<AppScreenHeader
			variant="bar"
			title={copy.detailsTitle}
			// subtitle={visit ? `${bookingRef(visit.request_public_id)} · ${timeRange(visit)}` : undefined}
			subtitle={visit ? visit.request_public_id : undefined}
			onBack={() => navigation.goBack()}
		/>
	)

	if (!visit) {
		return (
			<View style={styles.page}>
				{header}
				<View style={styles.center}>
					{loading ? (
						<ActivityIndicator color={APP_COLORS.primary} />
					) : (
						<AppInfoBanner
							tone="danger"
							title="Couldn't load this visit"
							subtitle={error ?? undefined}
							action={{ label: 'Retry', onPress: () => void load() }}
						/>
					)}
				</View>
			</View>
		)
	}

	const name = visit.patient.name ?? 'Patient'
	const first = firstName(visit.patient.name)
	const facts = careFacts(visit, copy.noun)
	// The booked service's own list wins; the speciality default is only a fallback.
	const supplies = visit.supplies.length ? visit.supplies : copy.defaultSupplies
	const packedCount = supplies.filter((s) => packed[s]).length
	const unassigned = isUnassigned(visit)
	const today = isToday(visit)
	const startable = isStartable(visit)
	const done = isCompleted(visit)
	const cancelled = visit.status.startsWith('CANCELLED') || visit.status === 'EXPIRED' || unassigned
	const dateObj = parseDateOnly(visit.date)
	const dayLabel = dateObj ? relativeDayLabel(dateObj) : null
	const startsIn = today ? startsInLabel(visitStart(visit))?.replace(/^starts /, '') : null
	const whenLine =
		visit.status === 'NO_SHOW'
			? 'Patient not available'
			: done
				? 'Completed'
				: cancelled
					? unassigned
						? 'Not assigned yet'
						: 'Cancelled'
					: isInProgress(visit)
						? copy.inProgressTitle
						: [timeRange(visit), today ? startsIn : dayLabel].filter(Boolean).join(' · ')
	const collected = visit.payment.status === 'PAYMENT_COLLECTED'
	// The no-show policy: where the provider stands in arriving, waiting and reporting.
	const arrival = visit.arrival
	const policyOn = !!arrival?.no_show_enabled
	const arrived = visit.status === 'ARRIVED'
	const reported = visit.status === 'NO_SHOW'
	const waitEnds = arrival?.wait_ends_at ? new Date(arrival.wait_ends_at) : null
	const minutesLeft = waitEnds
		? Math.max(0, Math.ceil((waitEnds.getTime() - now.getTime()) / 60_000))
		: (arrival?.minutes_left ?? 0)
	const canReport = policyOn && arrived && minutesLeft === 0
	const waitEndsText = waitEnds?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) ?? ''
	const canArrive = policyOn && !!arrival?.can_mark_arrived && startable && today
	const confirmNoShow = () =>
		Alert.alert(
			`Report ${first} as not available?`,
			`${first} will be asked what happened. If they don’t reply, it may be recorded as a missed visit.`,
			[
				{ text: 'Keep waiting', style: 'cancel' },
				{ text: 'Report', style: 'destructive', onPress: () => void reportNoShow() },
			]
		)
	// Instant / prepaid bookings are paid in the app; scheduled orders are collected after each visit.
	const paidOnline = visit.payment.method !== 'PAY_AFTER_VISIT'

	return (
		<View style={styles.page}>
			{header}
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				<View style={styles.hero}>
					<View style={styles.heroText}>
						<Text style={styles.heroTitle}>{visitTitle(visit, copy.noun)}</Text>
						<Text style={styles.heroSub}>{whenLine}</Text>
					</View>
				</View>

				{unassigned ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone="warning"
							title={`No provider is assigned to this ${copy.noun}`}
							subtitle="It isn’t part of your work, so there is nothing to do here."
						/>
					</View>
				) : null}

				{done ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone="success"
							title={copy.completedTitle}
							subtitle={collected ? `${formatInr(visit.payment.amount)} collected` : undefined}
						/>
					</View>
				) : null}

				{reported ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone="warning"
							icon="alert-circle-outline"
							title="Reported as not available"
							subtitle={`${first} has been asked what happened. If they turn up today, enter their start code.`}
						/>
					</View>
				) : null}

				{policyOn && arrived ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone={canReport ? 'warning' : 'sky'}
							icon="timer-sand"
							title={canReport ? `${first} hasn’t come out` : `Waiting for ${first}`}
							subtitle={
								canReport
									? `You’ve waited ${arrival?.wait_minutes ?? ''} minutes. You can report ${first} as not available, or enter their start code if they arrive.`
									: `You can report ${first} as not available at ${waitEndsText} (${minutesLeft} min). Enter the start code if they come out.`
							}
						/>
					</View>
				) : null}

				{canArrive && arrival?.near_address ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone="sky"
							icon="map-marker-check-outline"
							title="You’re at the address"
							subtitle={`Tap I’ve arrived to let ${first} know and start the waiting time.`}
						/>
					</View>
				) : null}

				<AppSection title="Patient" titleSize="sm">
					<AppPersonRow
						name={name}
						subtitle={patientLine(visit)}
						avatarUri={visit.patient.avatar_url}
						onMessage={() => showComingSoon('Chat with patients is coming soon.')}
						onCall={() => void callPhone(visit.patient.phone)}
						canCall={!!visit.patient.phone}
					/>
				</AppSection>

				<AppSection title="Address" titleSize="sm">
					<MapPreview />
					<View style={styles.addressRow}>
						<View style={styles.addressText}>
							<Text style={styles.addressLine}>{visit.address.street_address}</Text>
							<Text style={styles.addressSub}>
								{[
									visit.address.label,
									kmLabel(visit.distance_km),
									visit.eta_minutes != null ? `about ${visit.eta_minutes} min` : null,
								]
									.filter(Boolean)
									.join(' · ')}
							</Text>
						</View>
						<AppButton
							size="sm"
							icon="navigation-outline"
							onPress={() => void handleNavigate()}
							loading={navigating}
							disabled={navigating}
						>
							Navigate
						</AppButton>
					</View>
					{!done && !cancelled ? (
						<Pressable
							onPress={() => void toggleShare(!visit.share_location)}
							accessibilityRole="switch"
							accessibilityState={{ checked: visit.share_location }}
							accessibilityLabel="Share live location with patient"
							style={styles.shareRow}
						>
							<View style={styles.shareText}>
								<Text style={styles.shareTitle}>Share live location with patient</Text>
								<Text style={styles.shareSub}>
									{visit.share_location
										? 'Patient can see you’re on the way'
										: 'Off · patient sees only your ETA'}
								</Text>
							</View>
							<View style={[styles.track, visit.share_location && styles.trackOn]}>
								<View style={[styles.knob, visit.share_location && styles.knobOn]} />
							</View>
						</Pressable>
					) : null}
				</AppSection>

				{visit.care.instructions || facts.length ? (
					<AppSection title="Care instructions" titleSize="sm">
						{visit.care.instructions ? (
							<Text style={styles.instructions}>{visit.care.instructions}</Text>
						) : null}
						{facts.length ? (
							<View>
								{facts.map((f) => (
									<View key={f.label} style={[styles.factRow, styles.factDivider]}>
										<Text style={styles.factLabel}>{f.label}</Text>
										<Text style={styles.factValue}>{f.value}</Text>
									</View>
								))}
							</View>
						) : null}
					</AppSection>
				) : null}

				{supplies.length && !done && !cancelled ? (
					<AppSection
						title="Bring with you"
						titleSize="sm"
						right={
							<Text style={styles.countText}>
								{packedCount} of {supplies.length} packed
							</Text>
						}
					>
						<AppCheckList
							variant="square"
							items={supplies.map((s) => ({ key: s, label: s, checked: !!packed[s] }))}
							onToggle={(key, checked) => setPacked((p) => ({ ...p, [key]: checked }))}
						/>
					</AppSection>
				) : null}

				<AppSection title="Payment" titleSize="sm">
					<View style={styles.payRow}>
						<Text style={styles.payLabel}>Service fee</Text>
						<Text style={styles.payValue}>
							{formatInr(visit.payment.amount)}
							{copy.noun === 'shift' ? ' / shift' : ''}
						</Text>
					</View>
					<View style={styles.payNote}>
						<MaterialCommunityIcons
							name={collected || paidOnline ? 'check' : 'cash'}
							size={16}
							color={APP_COLORS.success}
						/>
						<Text style={styles.payNoteText}>
							{paidOnline
								? 'Paid online · nothing to collect'
								: collected
									? `Collected after the ${copy.noun}`
									: `Collect ${formatInr(visit.payment.amount)} after the ${copy.noun} · pay after each ${copy.noun}`}
						</Text>
					</View>
				</AppSection>

				{!done && !cancelled && !reported ? (
					<Pressable
						onPress={() => setCancelOpen(true)}
						accessibilityRole="button"
						style={({ pressed }) => [styles.issueLink, pressed && styles.pressed]}
					>
						<Text style={styles.issueText}>Can’t make it? Cancel visit</Text>
					</Pressable>
				) : null}
			</ScrollView>

			{!done && !cancelled ? (
				<AppFooterBar>
					<AppIconButton
						icon="phone-outline"
						variant="outline"
						size={44}
						radius={12}
						disabled={!visit.patient.phone}
						accessibilityLabel={`Call ${name}`}
						onPress={() => void callPhone(visit.patient.phone)}
					/>
					{isInProgress(visit) ? (
						<AppButton
							size="lg"
							icon="play-circle-outline"
							style={styles.flex}
							onPress={() => navigation.navigate(ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS, { visitId })}
						>
							{`Continue ${copy.noun}`}
						</AppButton>
					) : reported ? (
						<AppButton size="lg" style={styles.flex} onPress={() => setStartOpen(true)}>
							Enter start code
						</AppButton>
					) : policyOn && arrived ? (
						<>
							<AppButton
								variant="outline"
								size="lg"
								style={styles.flex}
								disabled={!canReport || reporting}
								loading={reporting}
								softDisabled
								onPress={confirmNoShow}
							>
								{canReport ? 'Patient not available' : `Not available · ${minutesLeft} min`}
							</AppButton>
							<AppButton size="lg" style={styles.flex} onPress={() => setStartOpen(true)}>
								Enter start code
							</AppButton>
						</>
					) : canArrive ? (
						<>
							<AppButton
								variant="outline"
								size="lg"
								style={styles.flex}
								onPress={() => setStartOpen(true)}
							>
								Enter start code
							</AppButton>
							<AppButton
								size="lg"
								style={styles.flex}
								loading={arriving}
								disabled={arriving}
								onPress={() => void handleArrived()}
							>
								I’ve arrived
							</AppButton>
						</>
					) : (
						<AppButton
							size="lg"
							style={styles.flex}
							disabled={!startable || !today}
							softDisabled
							onPress={() => setStartOpen(true)}
						>
							{startable && today
								? 'I’ve arrived · enter start code'
								: dayLabel === 'Tomorrow'
									? 'Starts tomorrow'
									: dayLabel
										? `Starts on ${dayLabel}`
										: 'Not available yet'}
						</AppButton>
					)}
				</AppFooterBar>
			) : null}

			<StartCodeSheet
				visible={startOpen}
				visitId={visitId}
				patientFirstName={first}
				copy={copy}
				onClose={() => setStartOpen(false)}
				onStarted={(v) => {
					setStartOpen(false)
					setVisit(v)
					navigation.replace(ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS, { visitId })
				}}
			/>
			<CancelVisitSheet
				visible={cancelOpen}
				visitId={visitId}
				requestId={visit.request_public_id}
				patientName={name}
				patientFirstName={first}
				serviceTitle={visitTitle(visit, copy.noun)}
				instant={!visit.date}
				onClose={() => setCancelOpen(false)}
				onBackToToday={() => {
					setCancelOpen(false)
					navigation.goBack()
				}}
			/>
		</View>
	)
}

/** Static drawn map preview (roads, route line, your position and the destination pin) -- no map SDK. */
function MapPreview() {
	return (
		<View style={styles.map} accessible={false} importantForAccessibility="no-hide-descendants">
			<Svg width="100%" height={120} viewBox="0 0 358 120" preserveAspectRatio="xMidYMid slice">
				<Rect x={-10} y={48} width={378} height={14} fill="#FFFFFF" rotation={-8} origin="179, 55" />
				<Rect x={150} y={-10} width={12} height={140} fill="#FFFFFF" rotation={12} origin="156, 60" />
				<Rect x={30} y={70} width={90} height={10} rx={4} fill="#FFFFFF" fillOpacity={0.7} />
				<Path
					d="M68 86 C 120 60, 180 70, 245 45"
					fill="none"
					stroke={APP_COLORS.primary}
					strokeWidth={3}
					strokeDasharray="6 5"
					strokeLinecap="round"
				/>
				<Circle cx={68} cy={86} r={8} fill="#FFFFFF" />
				<Circle cx={68} cy={86} r={5} fill="#2463A8" />
				<Path
					transform="translate(228 18) scale(1.4167)"
					d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"
					fill={APP_COLORS.dangerBg}
					stroke={APP_COLORS.danger}
					strokeWidth={2.2}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</Svg>
		</View>
	)
}

const styles = StyleSheet.create({
	page: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		padding: 16,
		alignItems: 'stretch',
	},
	scroll: {
		paddingBottom: 16,
	},
	padded: {
		paddingHorizontal: 16,
		marginTop: 8,
	},
	hero: {
		marginTop: 16,
		marginBottom: 8,
		marginHorizontal: 16,
		paddingVertical: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: APP_COLORS.ink,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	heroText: {
		flex: 1,
		minWidth: 0,
	},
	heroTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.surface,
	},
	heroSub: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: APP_COLORS.mintAccent,
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
	},
	addressText: {
		flex: 1,
		minWidth: 0,
	},
	addressLine: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	addressSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	shareRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.pageBg,
	},
	shareText: {
		flex: 1,
		minWidth: 0,
	},
	track: {
		width: 44,
		height: 26,
		borderRadius: 13,
		backgroundColor: APP_COLORS.inkDisabled,
		justifyContent: 'center',
	},
	trackOn: {
		backgroundColor: APP_COLORS.primary,
	},
	knob: {
		position: 'absolute',
		left: 3,
		width: 20,
		height: 20,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.25,
		shadowRadius: 3,
		elevation: 2,
	},
	knobOn: {
		left: 21,
	},
	map: {
		height: 120,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: APP_COLORS.mint,
	},
	shareTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	shareSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	instructions: {
		padding: 12,
		borderRadius: 12,
		backgroundColor: APP_COLORS.warningBg,
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	factRow: {
		flexDirection: 'row',
		gap: 10,
		paddingVertical: 8,
	},
	factDivider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	factLabel: {
		width: 96,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	factValue: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.ink,
	},
	countText: {
		fontSize: 12,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	payRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	payLabel: {
		fontSize: 14,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	payValue: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	payNote: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	payNoteText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.success,
	},
	issueLink: {
		alignSelf: 'center',
		minHeight: 44,
		justifyContent: 'center',
		paddingHorizontal: 12,
		marginTop: 4,
	},
	issueText: {
		fontSize: 14,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
	pressed: {
		opacity: 0.7,
	},
	flex: {
		flex: 1,
	},
})
