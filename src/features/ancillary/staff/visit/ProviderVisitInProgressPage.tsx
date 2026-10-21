// src/features/ancillary/staff/visit/ProviderVisitInProgressPage.tsx
//
// "3 · Visit in progress" (ancillary-provider design): elapsed timer, patient, the visit's task checklist
// with progress, then what the speciality records --
//   'vitals'         BP / pulse / temperature / SpO2
//   'pain_score'     pain after the session (0-10, with last visit's score) + the procedure's measurement
//   'family_updates' quick updates sent to the family (in-app notification), with the ones already sent
// -- notes, Add photo (coming soon) and Report an issue. Everything is saved to the visit as the provider
// goes (PATCH /progress, debounced). "Complete visit" unlocks once every task is ticked.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import Toast from 'react-native-toast-message'
import {
	AppButton,
	AppCheckList,
	AppChip,
	AppFooterBar,
	AppInfoBanner,
	AppMetricInput,
	AppPersonRow,
	AppProgressBar,
	AppScaleSelector,
	AppScreenHeader,
	AppSection,
	AppTimerBadge,
	NotesInput,
} from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { ROUTES } from '../../../../navigation/routes'
import type { AppNavigationParamList } from '../../../../navigation/types'
import { callPhone } from '../../../../utils/maps'
import { showComingSoon } from '../../../../utils/toast'
import { extractApiErrorMessage } from '../../ancillaryService'
import {
	getProviderVisit,
	sendVisitUpdate,
	updateVisitProgress,
	type ProviderVisitDetail,
	type ProviderVisitTask,
	type VisitProgressInput,
} from '../../providerVisitService'
import { getProviderSpecialityCopy } from '../providerSpecialityCopy'
import { visitTitle } from '../today/todayView'
import { ReportIssueSheet } from './ReportIssueSheet'
import { isInProgress, patientLine } from './visitView'

type Route = RouteProp<AppNavigationParamList, typeof ROUTES.STACK.PROVIDER_VISIT_IN_PROGRESS>

const SAVE_DEBOUNCE_MS = 800

/** "72" -> 72, "120/80" stays text, "" -> null (clears the key). */
const toRecordValue = (text: string): string | number | null => {
	const t = text.trim()
	if (!t) return null
	const n = Number(t)
	return Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(t) ? n : t
}

const asText = (v: unknown) => (v == null ? '' : String(v))

export default function ProviderVisitInProgressPage() {
	const navigation = useNavigation<any>()
	const { visitId } = useRoute<Route>().params

	const [visit, setVisit] = useState<ProviderVisitDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [tasks, setTasks] = useState<ProviderVisitTask[]>([])
	const [fields, setFields] = useState<Record<string, string>>({})
	const [pain, setPain] = useState<number | null>(null)
	const [notes, setNotes] = useState('')
	const [picked, setPicked] = useState<string[]>([])
	const [sending, setSending] = useState(false)
	const [issueOpen, setIssueOpen] = useState(false)
	const [finishing, setFinishing] = useState(false)

	const loadedRef = useRef(false)
	const pendingRef = useRef<VisitProgressInput>({})
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const applyVisit = (v: ProviderVisitDetail) => {
		setVisit(v)
		// The booked service's own steps win; the speciality's default checklist is only a fallback.
		setTasks(
			v.tasks.length
				? v.tasks
				: getProviderSpecialityCopy(v.service.specialty).defaultTasks.map((label) => ({ label, done: false }))
		)
		setFields({
			bp: asText(v.record.bp),
			pulse: asText(v.record.pulse),
			temp_f: asText(v.record.temp_f),
			spo2: asText(v.record.spo2),
			measurement: asText(v.record.measurement),
		})
		setPain(typeof v.record.pain_score === 'number' ? v.record.pain_score : null)
		setNotes(v.notes ?? '')
	}

	const load = useCallback(async () => {
		try {
			const v = await getProviderVisit(visitId)
			// Only seed the editable state on first load, so a refocus never wipes what's being typed.
			if (!loadedRef.current) {
				applyVisit(v)
				loadedRef.current = true
			} else {
				setVisit(v)
			}
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

	/** Sends every queued change in one PATCH. */
	const flush = useCallback(async () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
		const body = pendingRef.current
		if (!Object.keys(body).length) return true
		pendingRef.current = {}
		try {
			setVisit(await updateVisitProgress(visitId, body))
			return true
		} catch (e) {
			// Put it back so the next save (or Complete) retries it.
			pendingRef.current = {
				...body,
				...pendingRef.current,
				record: { ...(body.record ?? {}), ...(pendingRef.current.record ?? {}) },
			}
			Toast.show({
				type: 'error',
				text1: 'Not saved yet',
				text2: extractApiErrorMessage(e, 'Check your connection.'),
			})
			return false
		}
	}, [visitId])

	const queue = (change: VisitProgressInput, immediate = false) => {
		const prev = pendingRef.current
		pendingRef.current = {
			...prev,
			...change,
			...(change.record || prev.record ? { record: { ...(prev.record ?? {}), ...(change.record ?? {}) } } : {}),
		}
		if (timerRef.current) clearTimeout(timerRef.current)
		if (immediate) void flush()
		else timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
	}

	// Save whatever is queued when leaving the screen.
	useEffect(
		() => () => {
			void flush()
		},
		[flush]
	)

	const toggleTask = (key: string, checked: boolean) => {
		const next = tasks.map((t, i) => (String(i) === key ? { ...t, done: checked } : t))
		setTasks(next)
		queue({ tasks: next }, true)
	}

	const setField = (key: string, text: string) => {
		setFields((f) => ({ ...f, [key]: text }))
		queue({ record: { [key]: toRecordValue(text) } })
	}

	const choosePain = (n: number) => {
		setPain(n)
		queue({ record: { pain_score: n } }, true)
	}

	const setMeasurement = (text: string) => {
		setFields((f) => ({ ...f, measurement: text }))
		const value = toRecordValue(text)
		queue({
			record: {
				measurement: value,
				measurement_label: value == null ? null : (visit?.service.measurement_label ?? null),
			},
		})
	}

	const changeNotes = (text: string) => {
		setNotes(text)
		queue({ notes: text })
	}

	const sendUpdate = async () => {
		if (!picked.length || sending) return
		setSending(true)
		try {
			const update = await sendVisitUpdate(visitId, picked)
			setVisit((v) => (v ? { ...v, updates: [...v.updates, update] } : v))
			setPicked([])
			Toast.show({ type: 'success', text1: 'Update sent', text2: update.message })
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not send the update',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setSending(false)
		}
	}

	const goComplete = async () => {
		if (finishing) return
		setFinishing(true)
		const saved = await flush()
		setFinishing(false)
		if (saved) navigation.navigate(ROUTES.STACK.PROVIDER_VISIT_COMPLETE, { visitId })
	}

	const copy = getProviderSpecialityCopy(visit?.service.specialty)

	const header = (
		<AppScreenHeader
			variant="bar"
			title={copy.inProgressTitle}
			subtitle={visit ? visitTitle(visit, copy.noun) : undefined}
			onBack={() => navigation.goBack()}
			rightElement={visit ? <AppTimerBadge startedAt={visit.started_at} /> : undefined}
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

	const active = isInProgress(visit)
	const doneCount = tasks.filter((t) => t.done).length
	const left = tasks.length - doneCount
	const allDone = left === 0
	// What is recorded: the backend's record type for the speciality, else the speciality's default.
	const type = visit.service.record_type ?? copy.recorded.type
	const lastPain = visit.care.last_session?.record.pain_score
	const lastMeasurement = visit.care.last_session?.record.measurement
	const name = visit.patient.name ?? 'Patient'

	return (
		<View style={styles.page}>
			{header}
			<ScrollView
				contentContainerStyle={styles.scroll}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{!active ? (
					<View style={styles.padded}>
						<AppInfoBanner
							tone={visit.status === 'COMPLETED' ? 'success' : 'warning'}
							title={
								visit.status === 'COMPLETED'
									? `This ${copy.noun} is completed`
									: `This ${copy.noun} isn’t in progress`
							}
							subtitle={
								visit.status === 'COMPLETED'
									? undefined
									: 'Start it with the patient’s start code first.'
							}
						/>
					</View>
				) : null}

				<AppSection>
					<AppPersonRow
						name={name}
						subtitle={patientLine(visit)}
						avatarUri={visit.patient.avatar_url}
						onMessage={() => showComingSoon('Chat with patients is coming soon.')}
						onCall={() => void callPhone(visit.patient.phone)}
						canCall={!!visit.patient.phone}
					/>
				</AppSection>

				{tasks.length ? (
					<AppSection
						title={copy.tasksTitle}
						titleSize="sm"
						right={
							<Text style={styles.countText}>
								{doneCount} of {tasks.length}
							</Text>
						}
					>
						<AppProgressBar
							value={(doneCount / tasks.length) * 100}
							height={6}
							accessibilityLabel={`${doneCount} of ${tasks.length} done`}
						/>
						<AppCheckList
							items={tasks.map((t, i) => ({ key: String(i), label: t.label, checked: t.done }))}
							onToggle={toggleTask}
							disabled={!active}
						/>
					</AppSection>
				) : null}

				{type === 'vitals' ? (
					<AppSection title={copy.recorded.title || 'Vitals'} titleSize="sm">
						<View style={styles.grid}>
							{copy.recorded.fields.map((f) => (
								<AppMetricInput
									key={f.key}
									label={f.label}
									placeholder={f.placeholder}
									keyboardType={f.keyboard}
									value={fields[f.key] ?? ''}
									onChangeText={(t) => setField(f.key, t)}
									editable={active}
									style={styles.gridCell}
								/>
							))}
						</View>
					</AppSection>
				) : null}

				{type === 'pain_score' ? (
					<AppSection title={copy.recorded.title || 'Progress'} titleSize="sm">
						<Text style={styles.fieldLabel}>
							{copy.recorded.painLabel}
							{typeof lastPain === 'number' ? (
								<Text style={styles.fieldHint}>{` · last time ${lastPain}`}</Text>
							) : null}
						</Text>
						<AppScaleSelector
							value={pain}
							onChange={choosePain}
							minLabel="No pain"
							maxLabel="Worst pain"
							disabled={!active}
							accessibilityLabel={copy.recorded.painLabel}
						/>
						{visit.service.measurement_label ? (
							<AppMetricInput
								label={`${visit.service.measurement_label}${lastMeasurement != null ? ` · last time ${lastMeasurement}` : ''}`}
								placeholder="e.g. 80"
								value={fields.measurement ?? ''}
								onChangeText={setMeasurement}
								editable={active}
							/>
						) : null}
						{copy.recorded.homePlanButton ? (
							<AppButton
								variant="outline"
								size="sm"
								icon="share-variant-outline"
								style={styles.alignStart}
								onPress={() => showComingSoon('Sharing a home exercise plan is coming soon.')}
							>
								Share home exercise plan
							</AppButton>
						) : null}
					</AppSection>
				) : null}

				{type === 'family_updates' ? (
					<AppSection title={copy.recorded.title || 'Update the family'} titleSize="sm">
						<Text style={styles.fieldHint}>
							{visit.patient.family_contact_name ?? visit.patient.name ?? 'The family'} gets this in the
							app
						</Text>
						<View style={styles.chips}>
							{copy.recorded.quickUpdates.map((q) => (
								<AppChip
									key={q}
									label={q}
									selected={picked.includes(q)}
									onPress={() =>
										setPicked((p) => (p.includes(q) ? p.filter((x) => x !== q) : [...p, q]))
									}
									variant="soft"
									shape="pill"
									size="sm"
									disabled={!active || sending}
								/>
							))}
						</View>
						<AppButton
							size="md"
							icon="send-outline"
							onPress={() => void sendUpdate()}
							loading={sending}
							disabled={!picked.length || sending || !active}
							softDisabled
						>
							{picked.length ? `Send update (${picked.length})` : 'Pick what to share'}
						</AppButton>
						{visit.updates.map((u) => (
							<Text key={u.id} style={styles.sentLine}>
								Sent · {u.message}
							</Text>
						))}
					</AppSection>
				) : null}

				<AppSection title="Notes" titleSize="sm">
					<NotesInput
						value={notes}
						onChangeValue={changeNotes}
						placeholder={copy.notesPlaceholder}
						maxLength={4000}
					/>
					<View style={styles.noteActions}>
						<AppButton
							variant="outline"
							size="sm"
							icon="plus"
							onPress={() => showComingSoon('Adding photos is coming soon.')}
						>
							Add photo
						</AppButton>
						<AppButton
							variant="outline"
							size="sm"
							icon="alert-circle-outline"
							onPress={() => setIssueOpen(true)}
						>
							Report an issue
						</AppButton>
					</View>
				</AppSection>
			</ScrollView>

			{active ? (
				<AppFooterBar direction="column" gap={6}>
					<Text style={styles.footHint}>
						{allDone
							? 'All done. The patient will confirm with a code.'
							: `${left} step${left === 1 ? '' : 's'} left before you can complete`}
					</Text>
					<AppButton
						size="lg"
						onPress={() => void goComplete()}
						loading={finishing}
						disabled={!allDone || finishing}
						softDisabled
					>
						{copy.completeTitle}
					</AppButton>
				</AppFooterBar>
			) : null}

			<ReportIssueSheet visible={issueOpen} visitId={visitId} onClose={() => setIssueOpen(false)} />
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
		marginTop: 8,
	},
	countText: {
		fontSize: 12,
		fontWeight: '700',
		color: APP_COLORS.inkMuted,
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},
	gridCell: {
		width: '47%',
		flexGrow: 1,
	},
	fieldLabel: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},
	fieldHint: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '400',
		color: APP_COLORS.inkMuted,
	},
	alignStart: {
		alignSelf: 'flex-start',
	},
	chips: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	sentLine: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.success,
	},
	noteActions: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	footHint: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})
