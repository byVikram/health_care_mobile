// src/features/ancillary/staff/visit/ProviderCompleteVisitPage.tsx
//
// "4 · Complete visit" (ancillary-provider design): the provider enters THIS visit's 4-digit completion code
// (shown in the patient's app on the booking -- every visit of a recurring order has its own), which
// confirms the visit happened and records the fee as collected (pay after each visit). Summary: time spent,
// tasks done, what was recorded, payment; then "Up next" with Navigate and "Back to today".
import React, { useCallback, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import {
	AppButton,
	AppFooterBar,
	AppInfoBanner,
	AppOtpInput,
	AppScreenHeader,
	AppSection,
} from '../../../../components/common'
import { APP_COLORS, TONES, formatInr } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import type { AppNavigationParamList } from '../../../../navigation/types'
import { openDirections } from '../../../../utils/maps'
import { extractApiErrorMessage } from '../../ancillaryService'
import { completeVisit, getProviderVisit, type ProviderVisitDetail } from '../../providerVisitService'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { nextVisitWhen, visitSubtitle, visitTitle } from '../today/todayView'
import { durationLabel, firstName, isCompleted, recordedSummary } from './visitView'

type Route = RouteProp<AppNavigationParamList, typeof ROUTES.STACK.PROVIDER_VISIT_COMPLETE>

const CODE_LENGTH = 4

export default function ProviderCompleteVisitPage() {
	const navigation = useNavigation<any>()
	const { visitId } = useRoute<Route>().params

	const [visit, setVisit] = useState<ProviderVisitDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [code, setCode] = useState('')
	const [codeError, setCodeError] = useState<string | null>(null)
	const [submitting, setSubmitting] = useState(false)

	const load = useCallback(async () => {
		try {
			setVisit(await getProviderVisit(visitId))
			setLoadError(null)
		} catch (e) {
			setLoadError(extractApiErrorMessage(e, 'Could not load this visit.'))
		} finally {
			setLoading(false)
		}
	}, [visitId])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)

	const copy = getProviderSpecialityCopy(visit?.service.specialty)

	const backToToday = () => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })

	const submit = async () => {
		if (code.length !== CODE_LENGTH || submitting) return
		setSubmitting(true)
		setCodeError(null)
		try {
			setVisit(await completeVisit(visitId, code))
		} catch (e) {
			setCodeError(extractApiErrorMessage(e, `Could not complete the ${copy.noun}. Please try again.`))
		} finally {
			setSubmitting(false)
		}
	}

	const header = (
		<AppScreenHeader
			variant="bar"
			title={copy.completeTitle}
			subtitle={visit ? visitTitle(visit, copy.noun) : undefined}
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
							subtitle={loadError ?? undefined}
							action={{ label: 'Retry', onPress: () => void load() }}
						/>
					)}
				</View>
			</View>
		)
	}

	const done = isCompleted(visit)
	const first = firstName(visit.patient.name)
	const tasksDone = visit.tasks.filter((t) => t.done).length
	const upNext = visit.up_next
	const ready = code.length === CODE_LENGTH

	const summary: { label: string; value: string }[] = [
		{ label: 'Time spent', value: durationLabel(visit.started_at, visit.completed_at) },
		...(visit.tasks.length ? [{ label: 'Tasks done', value: `${tasksDone} of ${visit.tasks.length}` }] : []),
		{ label: 'Recorded', value: recordedSummary(visit) },
		{
			label: 'Payment',
			value: done
				? `${formatInr(visit.payment.amount)} collected`
				: `Collect ${formatInr(visit.payment.amount)} · pay after ${copy.noun}`,
		},
	]

	return (
		<View style={styles.page}>
			{header}
			<ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
				{done ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone="success"
							size="prominent"
							icon="check"
							title={copy.completedTitle}
							subtitle={`${copy.completedNote} ${
								visit.visits_count > 1
									? `${copy.noun.charAt(0).toUpperCase()}${copy.noun.slice(1)} ${visit.index} of ${visit.visits_count} is done.`
									: ''
							}`.trim()}
						/>
					</View>
				) : (
					<AppSection>
						<View style={styles.codeCard}>
							<Text style={styles.codeTitle}>{`Ask ${first} for the completion code`}</Text>
							<Text style={styles.codeSub}>
								{visit.visits_count > 1
									? `It’s shown in their app on this ${copy.noun} (${visit.index} of ${visit.visits_count}). ${copy.completionHint}`
									: `It’s shown in their app on the booking. ${copy.completionHint}`}
							</Text>
						</View>
						<AppOtpInput
							length={CODE_LENGTH}
							value={code}
							onChange={(v) => {
								setCode(v)
								if (codeError) setCodeError(null)
							}}
							autoFocus
							error={!!codeError}
							disabled={submitting}
							accessibilityLabel="Completion code"
							style={styles.otp}
						/>
						{codeError ? <Text style={styles.error}>{codeError}</Text> : null}
					</AppSection>
				)}

				<AppSection title="Summary" titleSize="sm">
					{summary.map((row, i) => (
						<View key={row.label} style={[styles.sumRow, i < summary.length - 1 && styles.sumDivider]}>
							<Text style={styles.sumLabel}>{row.label}</Text>
							<Text style={styles.sumValue}>{row.value}</Text>
						</View>
					))}
				</AppSection>

				{done && upNext ? (
					<AppSection title="Up next" titleSize="sm">
						<View style={styles.nextRow}>
							<View style={styles.nextText}>
								<Text
									style={styles.nextTitle}
								>{`${nextVisitWhen(upNext)} · ${visitTitle(upNext)}`}</Text>
								<Text style={styles.nextSub}>{visitSubtitle(upNext)}</Text>
							</View>
							<AppButton
								variant="outline"
								size="sm"
								icon="navigation-variant-outline"
								onPress={() =>
									void openDirections(
										upNext.address.latitude,
										upNext.address.longitude,
										upNext.address.street_address
									)
								}
							>
								Navigate
							</AppButton>
						</View>
					</AppSection>
				) : null}
			</ScrollView>

			<AppFooterBar>
				{done ? (
					<AppButton size="lg" style={styles.flex} onPress={backToToday}>
						Back to today
					</AppButton>
				) : (
					<AppButton
						size="lg"
						icon={ready ? 'check' : undefined}
						style={styles.flex}
						onPress={() => void submit()}
						loading={submitting}
						disabled={!ready || submitting}
						softDisabled
					>
						{ready ? copy.completeButton : 'Enter the 4-digit code'}
					</AppButton>
				)}
			</AppFooterBar>
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
	},
	scroll: {
		paddingBottom: 16,
	},
	padded: {
		paddingHorizontal: 16,
		marginTop: 16,
	},
	codeCard: {
		padding: 12,
		borderRadius: 12,
		backgroundColor: TONES.sky.bg,
		gap: 2,
	},
	codeTitle: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: '800',
		color: TONES.sky.ink,
	},
	codeSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.ink,
	},
	otp: {
		alignSelf: 'center',
		marginTop: 4,
	},
	error: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: APP_COLORS.danger,
		textAlign: 'center',
	},
	sumRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 12,
		paddingVertical: 8,
	},
	sumDivider: {
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	sumLabel: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
	sumValue: {
		flexShrink: 1,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
		textAlign: 'right',
	},
	nextRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	nextText: {
		flex: 1,
		minWidth: 0,
	},
	nextTitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	nextSub: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
	flex: {
		flex: 1,
	},
})
