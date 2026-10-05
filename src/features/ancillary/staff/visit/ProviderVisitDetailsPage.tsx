// src/features/ancillary/staff/visit/ProviderVisitDetailsPage.tsx
//
// "2 · Visit details" (ancillary-provider design): service + time, patient (message = coming soon, call),
// address with Navigate (which also tells the patient the provider is on the way) and the "Share live
// location" switch, care instructions + facts from the patient profile, "Bring with you" checklist (local),
// payment (collect after the visit) and "Can't make it? Report an issue". Footer: "I've arrived · enter
// start code" (today's startable visit) -> StartCodeSheet -> Visit in progress.
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useFocusEffect, useIsFocused, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import {
	AppButton,
	AppCheckList,
	AppFooterBar,
	AppIconButton,
	AppIconTile,
	AppInfoBanner,
	AppPersonRow,
	AppScreenHeader,
	AppSection,
	AppToggle,
} from '../../../../components/common'
import { APP_COLORS, formatInr } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import type { AppNavigationParamList } from '../../../../navigation/types'
import { parseDateOnly, relativeDayLabel, startsInLabel } from '../../../../utils/date'
import { callPhone, openDirections } from '../../../../utils/maps'
import { showComingSoon } from '../../../../utils/toast'
import { extractApiErrorMessage } from '../../ancillaryService'
import {
	getProviderVisit,
	markVisitOnTheWay,
	updateVisitProgress,
	type ProviderVisitDetail,
} from '../../providerVisitService'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { kmLabel, visitStart, visitTitle } from '../today/todayView'
import { ReportIssueSheet } from './ReportIssueSheet'
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
	const [issueOpen, setIssueOpen] = useState(false)
	const [navigating, setNavigating] = useState(false)

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

	const copy = getProviderSpecialityCopy(visit?.service.specialty)

	const header = (
		<AppScreenHeader
			variant="bar"
			title={copy.detailsTitle}
			subtitle={visit ? `${bookingRef(visit.request_public_id)} · ${timeRange(visit)}` : undefined}
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
	const whenLine = done
		? 'Completed'
		: cancelled
			? unassigned
				? 'Not assigned yet'
				: 'Cancelled'
			: isInProgress(visit)
				? copy.inProgressTitle
				: [timeRange(visit), today ? startsIn : dayLabel].filter(Boolean).join(' · ')
	const collected = visit.payment.status === 'PAYMENT_COLLECTED'

	return (
		<View style={styles.page}>
			{header}
			<ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
				<View style={styles.hero}>
					<AppIconTile icon={copy.icon} tone="mint" size={44} radius={12} iconSize={22} />
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
							icon="navigation-variant-outline"
							onPress={() => void handleNavigate()}
							loading={navigating}
							disabled={navigating}
						>
							Navigate
						</AppButton>
					</View>
					{!done && !cancelled ? (
						<View style={styles.shareRow}>
							<View style={styles.shareText}>
								<Text style={styles.shareTitle}>Share live location with patient</Text>
								<Text style={styles.shareSub}>
									{visit.share_location
										? 'Patient can see you’re on the way'
										: 'Off · patient sees only your ETA'}
								</Text>
							</View>
							<AppToggle
								value={visit.share_location}
								onValueChange={(v) => void toggleShare(v)}
								size="small"
								activeColor={APP_COLORS.primary}
								accessibilityLabel="Share live location with patient"
							/>
						</View>
					) : null}
				</AppSection>

				{visit.care.instructions || facts.length ? (
					<AppSection title="Care instructions" titleSize="sm">
						{visit.care.instructions ? (
							<Text style={styles.instructions}>{visit.care.instructions}</Text>
						) : null}
						{facts.length ? (
							<View>
								{facts.map((f, i) => (
									<View
										key={f.label}
										style={[styles.factRow, i < facts.length - 1 && styles.factDivider]}
									>
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
							name={collected ? 'check-circle-outline' : 'cash'}
							size={16}
							color={APP_COLORS.success}
						/>
						<Text style={styles.payNoteText}>
							{collected
								? `Collected after the ${copy.noun}`
								: `Collect ${formatInr(visit.payment.amount)} after the ${copy.noun} · pay after each ${copy.noun}`}
						</Text>
					</View>
				</AppSection>

				{!done && !cancelled ? (
					<Pressable
						onPress={() => setIssueOpen(true)}
						accessibilityRole="button"
						style={({ pressed }) => [styles.issueLink, pressed && styles.pressed]}
					>
						<Text style={styles.issueText}>Can’t make it? Report an issue</Text>
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
					) : (
						<AppButton
							size="lg"
							icon={startable && today ? 'map-marker-check-outline' : undefined}
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
			<ReportIssueSheet
				visible={issueOpen}
				visitId={visitId}
				initialReason="CANT_MAKE_IT"
				onClose={() => setIssueOpen(false)}
			/>
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
