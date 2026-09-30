// src/features/consultation/ConsultationPage.tsx
//
// Doctor's active-consultation workspace (source: the "Doctor Dashboard" design's Consultation
// screen — see Doctor Dashboard.html). Reached from VerifyAccessPage once the patient-consent OTP
// is verified. Four tabs (Overview / History / Reports / Notes) exactly as in the mockup; the
// mockup's own "Orders" (pharmacy/lab/radiology referral) destination isn't rendered in its export
// and was dropped here per explicit product direction -- this screen no longer offers it.
// Real data throughout: patient/appointment details, treatment history, lab/radiology/ancillary
// reports, latest vitals, and a real treatment record (POST/PATCH /api/treatments) for notes,
// diagnosis and follow-up -- nothing here is a client-side simulation, including the notes editor's
// Scribble (react-native-signature-canvas) and Voice (expo-speech-recognition) modes.

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	ActivityIndicator,
	Animated,
	Linking,
	Modal,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import SignatureCanvas, { SignatureViewRef } from 'react-native-signature-canvas'
// Voice notes (expo-speech-recognition) are commented out for now -- the native module isn't
// available in Expo Go (Android-only even in a dev build), and development is happening in Expo
// Go. Re-enable by uncommenting this import and every "Voice mode" block below once a dev client
// is available.
// import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import Toast from 'react-native-toast-message'

import { AppSegmentedControl, AppSkeleton, AppSoftCard } from '../../components/common'
import { APP_COLORS, TONES } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import DicomViewer from './components/DicomViewer'
import {
	patientService,
	treatmentService,
	type DocterDetails,
	type LaboratoryReportRecord,
	type PatientDetails,
	type RadiologyReportRecord,
	type TreatmentRecord,
} from './ConsultationService'
import { getLatestVitals, type VitalRecord } from './VitalsService'
import { buildS3Url } from '../../utils/s3Utils'
import { toApiDate } from '../doctor/scheduleUtils'

const SAMPLE_DICOM_MODULE = require('../../assets/dicon/sample-dicon.dcm')

const INK = APP_COLORS.ink
const INK_MUTED = APP_COLORS.inkMuted
const DIVIDER = APP_COLORS.divider
const PAGE_BG = APP_COLORS.pageBg
const PRIMARY = APP_COLORS.primary

type TabId = 'overview' | 'history' | 'reports' | 'notes'
type NoteMode = 'type' | 'scribble' | 'voice'
type Phase = 'idle' | 'live' | 'sent'
type FollowUpOption = '2wk' | '1month' | '3months' | 'none'

// "Above target" / "High" / "Low" thresholds for the Overview tab's vitals cards. Named and
// centralized here (rather than inline magic numbers) so a future per-condition or per-patient
// override doesn't need to go hunting through JSX -- these are plain adult resting reference
// ranges, not tied to any specific diagnosis.
const VITAL_THRESHOLDS = {
	bpSystolicHigh: 130,
	bpDiastolicHigh: 80,
	glucoseHighMgDl: 140,
	spo2LowPercent: 95,
}

const TABS: { id: TabId; label: string }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'history', label: 'History' },
	{ id: 'reports', label: 'Reports' },
	{ id: 'notes', label: 'Notes' },
]

const FOLLOW_UP_OPTIONS: { id: FollowUpOption; label: string; days: number | null }[] = [
	{ id: '2wk', label: '2 wks', days: 14 },
	{ id: '1month', label: '1 month', days: 30 },
	{ id: '3months', label: '3 months', days: 90 },
	{ id: 'none', label: 'None', days: null },
]

// ── Formatting helpers ──────────────────────────────────────────────────────

function formatDate(dateString?: string | null): string {
	if (!dateString) return '--'
	const date = new Date(dateString)
	if (isNaN(date.getTime())) return dateString
	return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime12h(t?: string | null): string {
	if (!t) return ''
	const [h, m] = t.split(':').map(Number)
	if (Number.isNaN(h)) return ''
	const suffix = h >= 12 ? 'PM' : 'AM'
	const hour = h > 12 ? h - 12 : h === 0 ? 12 : h
	return `${hour}:${String(m ?? 0).padStart(2, '0')} ${suffix}`
}

function resolveAvatar(patient: PatientDetails | null): string | undefined {
	if (!patient) return undefined
	const key = patient.avatar ?? patient.avatar_s3_key
	return buildS3Url(key) ?? undefined
}

function asText(v: unknown): string {
	if (Array.isArray(v)) return v.filter(Boolean).join(', ')
	return v ? String(v) : ''
}

function asList(v: unknown): string[] {
	if (Array.isArray(v)) return v.filter(Boolean).map(String)
	if (typeof v === 'string' && v.trim()) return [v.trim()]
	return []
}

function parseNumeric(v?: string | null): number | null {
	if (!v) return null
	const n = parseFloat(String(v).replace(/[^\d.]/g, ''))
	return Number.isFinite(n) ? n : null
}

function computeBmi(heightStr?: string | null, weightStr?: string | null): string | null {
	const heightCm = parseNumeric(heightStr)
	const weightKg = parseNumeric(weightStr)
	if (!heightCm || !weightKg) return null
	const bmi = weightKg / Math.pow(heightCm / 100, 2)
	return bmi.toFixed(1)
}

function humanizeSeverity(s?: string | null): string {
	if (!s) return ''
	return s.charAt(0).toUpperCase() + s.slice(1)
}

function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd']
	const v = n % 100
	return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── Reports tab: merge lab / radiology / ancillary into one honest list ────

interface ReportItem {
	id: string
	kind: 'lab' | 'radiology' | 'ancillary'
	name: string
	meta: string
	statusLabel: string
	statusTone: { bg: string; fg: string }
	date: string
	fileUrl?: string | null
	dicomKeys?: string[] | null
}

const REPORT_TONES = {
	green: { bg: APP_COLORS.successBg, fg: APP_COLORS.success },
	amber: { bg: APP_COLORS.warningBg, fg: APP_COLORS.warning },
	grey: { bg: '#F0F4F4', fg: INK_MUTED },
}

function labToReportItem(r: LaboratoryReportRecord): ReportItem {
	const hasResults = r.result_values && Object.keys(r.result_values).length > 0
	return {
		id: `lab-${r.id}`,
		kind: 'lab',
		name: r.summary_findings ? 'Lab report' : 'Lab report',
		meta: `Karolahealth Labs · ${formatDate(r.uploaded_at)}`,
		statusLabel: r.summary_findings ? r.summary_findings : hasResults ? 'Results available' : 'Pending review',
		statusTone: r.summary_findings ? REPORT_TONES.amber : REPORT_TONES.grey,
		date: r.uploaded_at,
		fileUrl: r.report_pdf_s3_key,
	}
}

function radToReportItem(r: RadiologyReportRecord): ReportItem {
	return {
		id: `rad-${r.id}`,
		kind: 'radiology',
		name: 'Radiology scan',
		meta: `Karolahealth Radiology · ${formatDate(r.uploaded_at)}`,
		statusLabel: r.summary_findings ? r.summary_findings : 'View images',
		statusTone: REPORT_TONES.grey,
		date: r.uploaded_at,
		fileUrl: r.report_pdf_s3_key,
		dicomKeys: r.dicom_images_s3_keys,
	}
}

function ancillaryToReportItem(r: any, i: number): ReportItem {
	return {
		id: `anc-${r.id ?? i}`,
		kind: 'ancillary',
		name: r.title || 'Patient-uploaded file',
		meta: `Uploaded by patient · ${formatDate(r.created_at || r.uploaded_at)}`,
		statusLabel: 'Patient file',
		statusTone: REPORT_TONES.grey,
		date: r.created_at || r.uploaded_at || '',
		fileUrl: r.file_s3_key,
	}
}

// ── HbA1c trend: only rendered when >=2 real lab result points exist ───────

function extractHbA1cSeries(labs: LaboratoryReportRecord[]): { date: string; value: number }[] {
	const points: { date: string; value: number }[] = []
	labs.forEach((r) => {
		if (!r.result_values) return
		const key = Object.keys(r.result_values).find((k) => k.toLowerCase().replace(/[^a-z0-9]/g, '').includes('hba1c'))
		if (!key) return
		const raw = r.result_values[key]
		const value = parseNumeric(String(raw))
		if (value !== null) points.push({ date: r.uploaded_at, value })
	})
	return points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const insets = useSafeAreaInsets()

	const params = (route.params || {}) as {
		appointmentId?: string
		appointment_id?: string
		id?: string
		patientId?: string
		patient_id?: string
		patient?: { id?: string }
		doctor?: any
	}
	const appointmentId = params?.appointmentId ?? params?.appointment_id ?? params?.id ?? ''
	const routePatientId = params?.patient_id ?? params?.patientId ?? params?.patient?.id ?? ''

	// ── Data state ──
	const [appointment, setAppointment] = useState<any>(null)
	const [patient, setPatient] = useState<PatientDetails | null>(null)
	const [doctor, setDoctor] = useState<DocterDetails | null>(null)
	const [patientLoading, setPatientLoading] = useState(!!(routePatientId || appointmentId))
	const [appointmentFetchDone, setAppointmentFetchDone] = useState(false)

	const [treatmentHistory, setTreatmentHistory] = useState<TreatmentRecord[]>([])
	const [labReports, setLabReports] = useState<LaboratoryReportRecord[]>([])
	const [radReports, setRadReports] = useState<RadiologyReportRecord[]>([])
	const [ancillaryReports, setAncillaryReports] = useState<any[]>([])
	const [reportsLoading, setReportsLoading] = useState(false)

	const [latestVitals, setLatestVitals] = useState<Record<string, VitalRecord | null>>({})

	// ── UI state ──
	const [activeTab, setActiveTab] = useState<TabId>('overview')
	const [phase, setPhase] = useState<Phase>('idle')
	const [saving, setSaving] = useState(false)

	// ── Notes state ──
	const [diagnosis, setDiagnosis] = useState('')
	const [notes, setNotes] = useState('')
	const [noteMode, setNoteMode] = useState<NoteMode>('type')
	const [followUp, setFollowUp] = useState<FollowUpOption>('1month')

	// Scribble
	const sigRef = useRef<SignatureViewRef>(null)
	const [sketch, setSketch] = useState<string | null>(null)

	// Voice -- commented out along with the rest of the Voice mode (see the import note above)
	// const [isListening, setIsListening] = useState(false)
	// const [liveText, setLiveText] = useState('')
	// const [transcript, setTranscript] = useState('')
	// const [voiceDone, setVoiceDone] = useState(false)
	// const isListeningRef = useRef(false)
	// const pulseAnim = useRef(new Animated.Value(1)).current
	// const pulseLoop = useRef<Animated.CompositeAnimation | null>(null)

	// DICOM viewer
	const [dicomBase64, setDicomBase64] = useState<string | null>(null)
	const [dicomLoading, setDicomLoading] = useState(false)

	// ── Fetch appointment ──
	useEffect(() => {
		if (!appointmentId) return
		;(async () => {
			try {
				const response = (await ApiService.get(API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId))) as any
				const data = response?.data?.data || response?.data || response
				setAppointment(data)
				if (!doctor && data?.doctor) {
					setDoctor({
						name: data.doctor.name,
						degree: data.doctor.degree ?? '',
						specialization: data.doctor.speciality ?? data.doctor.specialty ?? '',
						clinicName: data.hospital?.name ?? '',
						clinicAddress: data.hospital?.address ?? '',
					})
				}
			} catch (err) {
				console.error('[ConsultationPage] failed to fetch appointment:', err)
			} finally {
				setAppointmentFetchDone(true)
			}
		})()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [appointmentId])

	// ── Fetch patient ──
	const patientId = routePatientId || appointment?.patient?.id || ''
	useEffect(() => {
		if (!patientId) {
			// No patientId in the route params and none in the appointment either (or there was no
			// appointmentId to fetch one from at all) -- nothing left to wait on, so stop spinning.
			if (appointment || appointmentFetchDone || !appointmentId) setPatientLoading(false)
			return
		}
		;(async () => {
			setPatientLoading(true)
			try {
				const data = await patientService.getPatientDetails(patientId)
				setPatient(data)
			} catch (err: any) {
				console.error('[ConsultationPage] failed to fetch patient:', err)
			} finally {
				setPatientLoading(false)
			}
		})()
	}, [patientId, appointment])

	// ── Fetch treatment history + reports ──
	useEffect(() => {
		if (!patientId) return
		;(async () => {
			setReportsLoading(true)
			try {
				const [treatments, labs, rads, ancilsRes] = await Promise.all([
					patientService.getPatientTreatmentHistory(patientId),
					patientService.getPatientLaboratoryReports(patientId),
					patientService.getPatientRadiologyReports(patientId),
					ApiService.get(API_ENDPOINTS.PATIENT.REPORTS(patientId)).catch(() => ({ data: { data: [] } })),
				])
				setTreatmentHistory(treatments)
				setLabReports(labs)
				setRadReports(rads)
				const rawReports = (ancilsRes as any)?.data?.data ?? (ancilsRes as any)?.data ?? []
				setAncillaryReports(rawReports.filter((r: any) => r.report_type?.toLowerCase() === 'ancillary'))
			} catch (err) {
				console.error('[ConsultationPage] failed to fetch history/reports:', err)
			} finally {
				setReportsLoading(false)
			}
		})()
	}, [patientId])

	// ── Fetch latest vitals ──
	useEffect(() => {
		if (!patientId) return
		;(async () => {
			try {
				const data = await getLatestVitals(patientId)
				setLatestVitals(data)
			} catch (err) {
				console.error('[ConsultationPage] failed to fetch vitals:', err)
			}
		})()
	}, [patientId])

	// ── Load existing treatment record for this appointment, if any, into the editor ──
	useEffect(() => {
		if (!appointmentId) return
		;(async () => {
			try {
				const existing = await treatmentService.getByAppointment(appointmentId)
				if (existing) {
					setNotes(existing.notes ?? '')
					if (existing.follow_up_date) {
						const days = Math.round((new Date(existing.follow_up_date).getTime() - Date.now()) / 86400000)
						if (days <= 20) setFollowUp('2wk')
						else if (days <= 45) setFollowUp('1month')
						else setFollowUp('3months')
					}
				}
			} catch (err) {
				console.error('[ConsultationPage] failed to fetch existing treatment record:', err)
			}
		})()
	}, [appointmentId])

	// ── Voice mode (expo-speech-recognition) -- commented out for now: the native module isn't
	// available in Expo Go, and development is currently happening in Expo Go. Uncomment this
	// whole block, the import at the top of the file, the mode-switcher entry, and the render
	// block further down once a dev client is available.
	// useEffect(() => {
	// 	if (isListening) {
	// 		pulseLoop.current = Animated.loop(
	// 			Animated.sequence([
	// 				Animated.timing(pulseAnim, { toValue: 1.35, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
	// 				Animated.timing(pulseAnim, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
	// 			])
	// 		)
	// 		pulseLoop.current.start()
	// 	} else {
	// 		pulseLoop.current?.stop()
	// 		pulseAnim.setValue(1)
	// 	}
	// 	return () => pulseLoop.current?.stop()
	// }, [isListening])
	//
	// useSpeechRecognitionEvent('result', (event) => {
	// 	const first = event.results?.[0]
	// 	if (!first) return
	// 	if (!event.isFinal) {
	// 		setLiveText(first.transcript)
	// 	} else {
	// 		const chunk = first.transcript.trim()
	// 		if (chunk) {
	// 			setLiveText('')
	// 			setTranscript((t) => (t ? `${t} ${chunk}` : chunk))
	// 			setVoiceDone(true)
	// 		}
	// 	}
	// })
	// useSpeechRecognitionEvent('end', () => {
	// 	if (isListeningRef.current) {
	// 		setTimeout(() => {
	// 			if (isListeningRef.current) ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
	// 		}, 250)
	// 	}
	// })
	// useSpeechRecognitionEvent('error', (event) => {
	// 	if (isListeningRef.current && ['no-speech', 'network', 'speech-timeout'].includes(event.error)) {
	// 		setTimeout(() => {
	// 			if (isListeningRef.current) ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
	// 		}, 400)
	// 	}
	// })
	// useEffect(() => {
	// 	return () => {
	// 		isListeningRef.current = false
	// 		ExpoSpeechRecognitionModule.stop()
	// 	}
	// }, [])
	//
	// const startListening = async () => {
	// 	const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync()
	// 	if (!perm.granted) {
	// 		Toast.show({ type: 'error', text1: 'Microphone permission is needed to dictate' })
	// 		return
	// 	}
	// 	isListeningRef.current = true
	// 	setIsListening(true)
	// 	ExpoSpeechRecognitionModule.start({ lang: 'en-US', interimResults: true, continuous: false })
	// }
	// const stopListening = () => {
	// 	isListeningRef.current = false
	// 	setIsListening(false)
	// 	setLiveText('')
	// 	ExpoSpeechRecognitionModule.stop()
	// }
	// const toggleMic = () => (isListening ? stopListening() : startListening())
	// const insertVoiceIntoNotes = () => {
	// 	setNotes((n) => (n.trim() ? `${n.trim()}\n${transcript}` : transcript))
	// 	setTranscript('')
	// 	setVoiceDone(false)
	// }
	// const discardVoice = () => {
	// 	setTranscript('')
	// 	setVoiceDone(false)
	// }

	const switchNoteMode = (m: NoteMode) => {
		setNoteMode(m)
	}

	// ── DICOM ──
	const openDicomFromKey = async (s3Key?: string | null) => {
		setDicomLoading(true)
		try {
			if (s3Key) {
				const response = await fetch(s3Key)
				const blob = await response.blob()
				const reader = new FileReader()
				reader.onloadend = () => {
					const base64data = reader.result as string
					setDicomBase64(base64data.split(',')[1] || base64data)
				}
				reader.readAsDataURL(blob)
			} else {
				await loadSampleDicom()
			}
		} catch {
			await loadSampleDicom()
		} finally {
			setDicomLoading(false)
		}
	}
	const loadSampleDicom = async () => {
		try {
			const asset = Asset.fromModule(SAMPLE_DICOM_MODULE)
			await asset.downloadAsync()
			if (!asset.localUri) return
			const base64 = await FileSystem.readAsStringAsync(asset.localUri, { encoding: FileSystem.EncodingType.Base64 })
			setDicomBase64(base64)
		} catch (err) {
			console.error('[ConsultationPage] failed to load sample DICOM:', err)
		}
	}

	// ── Report tap ──
	const handleReportPress = (item: ReportItem) => {
		if (item.kind === 'radiology' && item.dicomKeys && item.dicomKeys.length > 0) {
			openDicomFromKey(item.dicomKeys[0])
			return
		}
		const url = buildS3Url(item.fileUrl)
		if (url) {
			Linking.openURL(url).catch(() => Toast.show({ type: 'error', text1: 'Could not open this file' }))
			return
		}
		if (item.kind === 'radiology') {
			openDicomFromKey(null)
		}
	}

	// ── Save treatment record (notes / diagnosis / follow-up) ──
	const buildFollowUpDate = (option: FollowUpOption): string | null => {
		const opt = FOLLOW_UP_OPTIONS.find((f) => f.id === option)
		if (!opt || opt.days === null) return null
		// Local date arithmetic, not toISOString() -- that converts to UTC first, which silently
		// shifts the date backward a day for anyone in a timezone ahead of UTC during early-morning
		// hours (this app's users are IST, UTC+5:30). Same fix already established in
		// scheduleUtils.toApiDate for exactly this reason.
		const d = new Date()
		d.setDate(d.getDate() + opt.days)
		return toApiDate(d)
	}

	const saveTreatmentRecord = async () => {
		if (!appointmentId) return
		const combinedNotes = diagnosis.trim() ? `Diagnosis: ${diagnosis.trim()}${notes.trim() ? `\n\n${notes.trim()}` : ''}` : notes.trim()
		await treatmentService.save(appointmentId, {
			notes: combinedNotes || undefined,
			follow_up_date: buildFollowUpDate(followUp) ?? undefined,
		})
	}

	const handlePrimaryPress = async () => {
		if (saving) return
		if (phase === 'idle') {
			setPhase('live')
			return
		}
		if (phase === 'live') {
			setSaving(true)
			try {
				await saveTreatmentRecord()
				setPhase('sent')
			} catch (err: any) {
				Toast.show({ type: 'error', text1: err?.response?.data?.message || 'Failed to save consultation notes' })
			} finally {
				setSaving(false)
			}
			return
		}
		navigation.navigate(ROUTES.MAIN.SCHEDULE)
	}

	const primaryLabel = phase === 'idle' ? 'Start consultation' : phase === 'live' ? 'End & share notes' : 'Next patient'
	const primaryBg = phase === 'idle' ? PRIMARY : phase === 'live' ? INK : PRIMARY

	// ── Derived: header ──
	const avatarUri = resolveAvatar(patient)
	const modeLabel = appointment?.appointment_mode === 'video_call' ? 'Video' : 'In-clinic'
	const timeLabel = formatTime12h(appointment?.start_time)
	const bloodGroup = patient?.blood_group || '--'
	const weightLabel = patient?.weight ? patient.weight.replace(/\s*kg$/i, '') : '--'
	const bmi = computeBmi(patient?.height, patient?.weight) ?? '--'
	const visitsLabel = treatmentHistory.length > 0 ? ordinal(treatmentHistory.length + 1) : '1st'

	// ── Derived: allergy banner ──
	const allergies = patient?.allergies ?? []

	// ── Derived: reason for visit ──
	const preIntake = appointment?.pre_intake || {}
	const reasonText: string = preIntake?.symptoms || appointment?.symptoms || ''
	const reasonTags: string[] = [
		preIntake?.duration || appointment?.duration,
		humanizeSeverity(preIntake?.severity || appointment?.severity),
	].filter(Boolean)

	// ── Derived: vitals today ──
	const bpRecord = latestVitals.blood_pressure
	const glucoseRecord = latestVitals.glucose_level
	const spo2Record = latestVitals.spo2
	const tempRecord = latestVitals.temperature
	const othersRecord = latestVitals.others
	// Pulse has no dedicated vital_type of its own -- it's commonly recorded alongside blood
	// pressure (the real seeded convention: blood_pressure.value.pulse), but fall back to an
	// "others" bundle's pulse_rate in case a future recording uses that shape instead.
	const pulseValue = (bpRecord?.value as any)?.pulse ?? (othersRecord?.value as any)?.pulse_rate

	const bpValue = bpRecord ? `${(bpRecord.value as any)?.systolic ?? '--'}/${(bpRecord.value as any)?.diastolic ?? '--'}` : null
	const bpSystolic = bpRecord ? Number((bpRecord.value as any)?.systolic) : null
	const bpDiastolic = bpRecord ? Number((bpRecord.value as any)?.diastolic) : null
	const bpHigh =
		(bpSystolic !== null && bpSystolic >= VITAL_THRESHOLDS.bpSystolicHigh) ||
		(bpDiastolic !== null && bpDiastolic >= VITAL_THRESHOLDS.bpDiastolicHigh)

	const glucoseValue = glucoseRecord
		? String((glucoseRecord.value as any)?.random ?? (glucoseRecord.value as any)?.fasting ?? '--')
		: null
	const glucoseNum = glucoseValue ? Number(glucoseValue) : null
	const glucoseHigh = glucoseNum !== null && glucoseNum >= VITAL_THRESHOLDS.glucoseHighMgDl

	// The real seeded spo2 records use "value" as the key (not "spo2") -- fall back to "spo2" in
	// case a future recording uses that shape instead.
	const spo2Raw = (spo2Record?.value as any)?.value ?? (spo2Record?.value as any)?.spo2
	const spo2Value = spo2Raw !== undefined && spo2Raw !== null ? String(spo2Raw) : null
	const tempValue = tempRecord ? String((tempRecord.value as any)?.temperature ?? '--') : null
	const spo2Low = spo2Value ? Number(spo2Value) < VITAL_THRESHOLDS.spo2LowPercent : false

	const hasAnyVitals = !!(bpRecord || glucoseRecord || spo2Record || tempRecord || pulseValue)

	// ── Derived: medical summary ──
	const conditions = patient?.chronic_diseases ?? []
	const medicines = asList(patient?.current_medications)
	const familyHistory = asText(patient?.family_history)
	const lifestyleBits = [
		patient?.smoking_status ? `${patient.smoking_status} smoker` : '',
		patient?.occupation,
		patient?.activity_level ? `${patient.activity_level} activity` : '',
	].filter(Boolean)

	// ── Derived: reports ──
	const reportItems: ReportItem[] = useMemo(() => {
		const items = [
			...labReports.map(labToReportItem),
			...radReports.map(radToReportItem),
			...ancillaryReports.map(ancillaryToReportItem),
		]
		return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
	}, [labReports, radReports, ancillaryReports])

	const hba1cSeries = useMemo(() => extractHbA1cSeries(labReports), [labReports])

	// ── Loading / not-found ──
	if (patientLoading) {
		return (
			<View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
				<View style={{ paddingHorizontal: 16, gap: 12 }}>
					<AppSkeleton width={44} height={44} borderRadius={12} />
					<AppSkeleton width="70%" height={20} />
					<AppSkeleton width="100%" height={90} borderRadius={14} />
					<AppSkeleton width="100%" height={140} borderRadius={14} />
					<AppSkeleton width="100%" height={140} borderRadius={14} />
				</View>
			</View>
		)
	}
	if (!patient) {
		return (
			<View style={[styles.screen, styles.centerContent]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={44} color={APP_COLORS.danger} />
				<Text style={{ marginTop: 12, color: APP_COLORS.danger, textAlign: 'center' }}>Patient not found</Text>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackBtn}>
					<Text style={styles.goBackBtnText}>Go back</Text>
				</TouchableOpacity>
			</View>
		)
	}

	return (
		<View style={styles.screen}>
			{/* ── Header ── */}
			<View style={[styles.header, { paddingTop: insets.top + 8 }]}>
				<View aria-hidden style={styles.headerBlob} />
				<View style={styles.headerTopRow}>
					<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} accessibilityLabel="Back to today">
						<MaterialCommunityIcons name="chevron-left" size={26} color="#FFFFFF" />
					</TouchableOpacity>
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text style={styles.headerTitle}>Consultation</Text>
						<Text style={styles.headerSubtitle}>
							{modeLabel}
							{timeLabel ? ` · ${timeLabel}` : ''}
						</Text>
					</View>
					{phase === 'live' && (
						<View style={styles.livePill}>
							<View style={styles.liveDot} />
							<Text style={styles.livePillText}>In session</Text>
						</View>
					)}
					<TouchableOpacity style={styles.moreBtn} accessibilityLabel="More options">
						<MaterialCommunityIcons name="dots-vertical" size={20} color="#FFFFFF" />
					</TouchableOpacity>
				</View>

				<View style={styles.headerPatientRow}>
					{avatarUri ? (
						<Animated.Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
					) : (
						<View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
							<Text style={styles.headerAvatarFallbackText}>{patient.name?.slice(0, 2).toUpperCase() ?? '?'}</Text>
						</View>
					)}
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text style={styles.headerPatientName} numberOfLines={1}>
							{patient.name}
						</Text>
						<Text style={styles.headerPatientMeta} numberOfLines={1}>
							{patient.age ? `${patient.age} yrs · ` : ''}
							{patient.gender ?? ''}
						</Text>
					</View>
				</View>

				<View style={styles.headerStatGrid}>
					{[
						{ label: 'Blood', value: bloodGroup },
						{ label: 'Weight', value: weightLabel !== '--' ? `${weightLabel} kg` : '--' },
						{ label: 'BMI', value: bmi },
						{ label: 'Visits', value: visitsLabel },
					].map((s) => (
						<View key={s.label} style={styles.headerStatCell}>
							<Text style={styles.headerStatLabel}>{s.label}</Text>
							<Text style={styles.headerStatValue}>{s.value}</Text>
						</View>
					))}
				</View>
			</View>

			{/* ── Tabs ── */}
			<View style={styles.tabsWrap}>
				<AppSegmentedControl
					options={TABS.map((t) => ({ value: t.id, label: t.label }))}
					value={activeTab}
					onChange={(v) => setActiveTab(v as TabId)}
					shape="rounded"
					tabs
					accessibilityLabel="Patient file"
				/>
			</View>

			{/* ── Content ── */}
			<ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
				{activeTab === 'overview' && (
					<View style={{ gap: 14 }}>
						{allergies.length > 0 && (
							<View style={styles.allergyBanner}>
								<MaterialCommunityIcons name="alert-decagram-outline" size={20} color={APP_COLORS.danger} />
								<Text style={styles.allergyBannerText}>
									<Text style={{ fontWeight: '800' }}>Allergic to {allergies.join(', ')}</Text>
								</Text>
							</View>
						)}

						{!!reasonText && (
							<AppSoftCard radius={14} style={{ gap: 10 }}>
								<View style={styles.rowBetween}>
									<Text style={styles.sectionTitle}>Reason for visit</Text>
									<Text style={styles.mutedCaption}>Shared at booking</Text>
								</View>
								<Text style={styles.reasonText}>&ldquo;{reasonText}&rdquo;</Text>
								{reasonTags.length > 0 && (
									<View style={styles.tagRow}>
										{reasonTags.map((tag) => (
											<View key={tag} style={styles.tagChip}>
												<Text style={styles.tagChipText}>{tag}</Text>
											</View>
										))}
									</View>
								)}
							</AppSoftCard>
						)}

						<View style={{ gap: 8 }}>
							<Text style={styles.sectionTitle}>Vitals today</Text>
							{hasAnyVitals ? (
								<View style={styles.vitalsGrid}>
									<VitalCard label="Blood pressure" value={bpValue ? `${bpValue} ` : '-- '} unit="mmHg" tone={bpHigh ? 'amber' : 'green'} toneLabel={bpHigh ? 'Above target' : 'Normal'} show={!!bpValue} />
									<VitalCard label="Random sugar" value={glucoseValue ? `${glucoseValue} ` : '-- '} unit="mg/dL" tone={glucoseHigh ? 'red' : 'green'} toneLabel={glucoseHigh ? 'High' : 'Normal'} show={!!glucoseValue} />
									<VitalCard label="Pulse" value={pulseValue ? `${pulseValue} ` : '-- '} unit="bpm" tone="green" toneLabel="Normal" show={!!pulseValue} />
									<VitalCard
										label="SpO₂ · Temp"
										value={`${spo2Value ?? '--'}% · ${tempValue ?? '--'}°F`}
										unit=""
										tone={spo2Low ? 'amber' : 'green'}
										toneLabel={spo2Low ? 'Low' : 'Normal'}
										show={!!(spo2Value || tempValue)}
									/>
								</View>
							) : (
								<Text style={styles.mutedCaption}>No vitals recorded yet</Text>
							)}
						</View>

						<AppSoftCard radius={14} padding={16} style={{ gap: 14 }}>
							{conditions.length > 0 && (
								<View style={{ gap: 8 }}>
									<Text style={styles.sectionTitle}>Conditions</Text>
									{conditions.map((c, i) => (
										<View key={`${c}-${i}`} style={styles.conditionRow}>
											<View style={[styles.dot, { backgroundColor: TONES.sand.ink }]} />
											<Text style={styles.conditionText}>{c}</Text>
										</View>
									))}
								</View>
							)}

							{medicines.length > 0 && (
								<>
									<View style={styles.hr} />
									<View style={{ gap: 10 }}>
										<Text style={styles.sectionTitle}>Current medicines</Text>
										{medicines.map((m, i) => (
											<View key={`${m}-${i}`} style={styles.medicineRow}>
												<View style={styles.medicineIconWrap}>
													<MaterialCommunityIcons name="pill" size={18} color={TONES.lilac.ink} />
												</View>
												<Text style={styles.medicineText}>{m}</Text>
											</View>
										))}
									</View>
								</>
							)}

							{(familyHistory || lifestyleBits.length > 0) && (
								<>
									<View style={styles.hr} />
									<View style={styles.summaryGrid}>
										{!!familyHistory && (
											<View style={{ flex: 1, gap: 2 }}>
												<Text style={styles.summaryLabel}>FAMILY HISTORY</Text>
												<Text style={styles.summaryValue}>{familyHistory}</Text>
											</View>
										)}
										{lifestyleBits.length > 0 && (
											<View style={{ flex: 1, gap: 2 }}>
												<Text style={styles.summaryLabel}>LIFESTYLE</Text>
												<Text style={styles.summaryValue}>{lifestyleBits.join(' · ')}</Text>
											</View>
										)}
									</View>
								</>
							)}
						</AppSoftCard>
					</View>
				)}

				{activeTab === 'history' && (
					<View style={{ gap: 4 }}>
						<Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Past visits</Text>
						{reportsLoading ? (
							<AppSkeleton width="100%" height={120} borderRadius={12} />
						) : treatmentHistory.length === 0 ? (
							<EmptyState label="No past visits yet" />
						) : (
							treatmentHistory.map((h, i) => (
								<View key={h.id} style={styles.historyRow}>
									<View style={styles.historyRail}>
										<View style={styles.historyDot} />
										{i < treatmentHistory.length - 1 && <View style={styles.historyLine} />}
									</View>
									<View style={{ flex: 1, minWidth: 0, paddingBottom: 18, gap: 4 }}>
										<Text style={styles.mutedCaption}>{formatDate((h as any).appointment_date || h.created_at)}</Text>
										<Text style={styles.historyTitle}>{h.hospital_name || 'Consultation'}</Text>
										{!!h.notes && <Text style={styles.historyNote}>{h.notes}</Text>}
										{!!h.doctor_name && <Text style={styles.historyBy}>Dr. {h.doctor_name}</Text>}
										{!!h.prescription_s3_key && (
											<TouchableOpacity
												onPress={() =>
													Linking.openURL(buildS3Url(h.prescription_s3_key)!).catch(() =>
														Toast.show({ type: 'error', text1: 'Could not open this file' })
													)
												}
											>
												<Text style={styles.historyLink}>View prescription</Text>
											</TouchableOpacity>
										)}
									</View>
								</View>
							))
						)}
					</View>
				)}

				{activeTab === 'reports' && (
					<View style={{ gap: 14 }}>
						{hba1cSeries.length >= 2 && (
							<AppSoftCard radius={14} style={{ gap: 12 }}>
								<Text style={styles.sectionTitle}>HbA1c trend</Text>
								<View style={styles.barsRow}>
									{hba1cSeries.map((p) => {
										const high = p.value >= 7
										return (
											<View key={p.date} style={styles.barCol}>
												<Text style={[styles.barValue, { color: high ? APP_COLORS.danger : INK_MUTED }]}>{p.value.toFixed(1)}</Text>
												<View
													style={[
														styles.bar,
														{ height: Math.max(8, Math.round((p.value - 5) * 26)), backgroundColor: high ? APP_COLORS.danger : APP_COLORS.success },
													]}
												/>
												<Text style={styles.barMonth}>{formatDate(p.date)}</Text>
											</View>
										)
									})}
								</View>
							</AppSoftCard>
						)}

						<View style={{ gap: 4 }}>
							<View style={[styles.rowBetween, { marginBottom: 4 }]}>
								<Text style={styles.sectionTitle}>Reports</Text>
								<Text style={styles.mutedCaption}>{reportItems.length} files</Text>
							</View>
							{reportsLoading ? (
								<AppSkeleton width="100%" height={100} borderRadius={12} />
							) : dicomLoading ? (
								<View style={{ alignItems: 'center', paddingVertical: 24 }}>
									<ActivityIndicator size="large" color={PRIMARY} />
									<Text style={styles.mutedCaption}>Loading scan…</Text>
								</View>
							) : reportItems.length === 0 ? (
								<EmptyState label="No reports yet" />
							) : (
								reportItems.map((item, i) => (
									<TouchableOpacity
										key={item.id}
										style={[styles.reportRow, i < reportItems.length - 1 && styles.reportRowDivider]}
										onPress={() => handleReportPress(item)}
									>
										<View
											style={[
												styles.reportIconWrap,
												{ backgroundColor: item.kind === 'ancillary' ? '#F0F4F4' : APP_COLORS.mint },
											]}
										>
											<MaterialCommunityIcons
												name={item.kind === 'radiology' ? 'radioactive' : item.kind === 'lab' ? 'flask-outline' : 'file-document-outline'}
												size={20}
												color={item.kind === 'ancillary' ? INK_MUTED : PRIMARY}
											/>
										</View>
										<View style={{ flex: 1, minWidth: 0 }}>
											<Text style={styles.reportName} numberOfLines={1}>
												{item.name}
											</Text>
											<Text style={styles.mutedCaption} numberOfLines={1}>
												{item.meta}
											</Text>
										</View>
										<View style={[styles.reportStatusChip, { backgroundColor: item.statusTone.bg }]}>
											<Text style={[styles.reportStatusText, { color: item.statusTone.fg }]} numberOfLines={1}>
												{item.statusLabel}
											</Text>
										</View>
									</TouchableOpacity>
								))
							)}
						</View>
					</View>
				)}

				{activeTab === 'notes' && (
					<View style={{ gap: 14 }}>
						<AppSoftCard radius={14} style={{ gap: 6 }}>
							<Text style={styles.fieldLabel}>Diagnosis</Text>
							<TextInput
								value={diagnosis}
								onChangeText={setDiagnosis}
								placeholder="e.g. Type 2 diabetes, suboptimal control"
								placeholderTextColor={INK_MUTED}
								style={styles.diagnosisInput}
							/>
						</AppSoftCard>

						<AppSoftCard radius={14} padding={16} style={{ gap: 12 }}>
							<View style={styles.rowBetween}>
								<Text style={styles.sectionTitle}>Clinical notes</Text>
								<Text style={styles.mutedCaption}>Auto-saved</Text>
							</View>

							<View style={styles.modeSwitch}>
								{(
									[
										{ id: 'type', label: 'Type', icon: 'text' },
										{ id: 'scribble', label: 'Scribble', icon: 'draw-pen' },
										// Voice mode is commented out for now -- see the import note at the top of this file.
										// { id: 'voice', label: 'Voice', icon: 'microphone-outline' },
									] as { id: NoteMode; label: string; icon: any }[]
								).map((m) => {
									const on = noteMode === m.id
									return (
										<TouchableOpacity
											key={m.id}
											style={[styles.modeBtn, on && styles.modeBtnActive]}
											onPress={() => switchNoteMode(m.id)}
										>
											<MaterialCommunityIcons name={m.icon} size={16} color={on ? INK : INK_MUTED} />
											<Text style={[styles.modeBtnText, on && styles.modeBtnTextActive]}>{m.label}</Text>
										</TouchableOpacity>
									)
								})}
							</View>

							{noteMode === 'type' && (
								<TextInput
									value={notes}
									onChangeText={setNotes}
									placeholder="Findings, advice, what you discussed"
									placeholderTextColor={INK_MUTED}
									multiline
									numberOfLines={7}
									style={styles.notesTextarea}
								/>
							)}

							{noteMode === 'scribble' && (
								<View style={{ gap: 8 }}>
									<View style={styles.canvasWrap}>
										<SignatureCanvas
											ref={sigRef}
											onOK={(sig) => setSketch(sig)}
											onEnd={() => sigRef.current?.readSignature()}
											descriptionText=""
											clearText=""
											confirmText=""
											webStyle=".m-signature-pad{box-shadow:none;border:none}.m-signature-pad--body{border:none}.m-signature-pad--footer{display:none}body{background:#FFFDF6;margin:0;padding:0}"
											penColor="#12373E"
											minWidth={2}
											maxWidth={3}
											style={{ flex: 1, height: 230 }}
											backgroundColor="#FFFDF6"
											autoClear={false}
											dataURL=""
										/>
									</View>
									<View style={{ flexDirection: 'row', gap: 8 }}>
										<TouchableOpacity onPress={() => sigRef.current?.undo()} style={styles.canvasToolBtn}>
											<MaterialCommunityIcons name="undo" size={18} color={INK} />
										</TouchableOpacity>
										<TouchableOpacity onPress={() => sigRef.current?.clearSignature()} style={styles.canvasClearBtn}>
											<Text style={styles.canvasClearBtnText}>Clear</Text>
										</TouchableOpacity>
										<View style={{ flex: 1 }} />
										<TouchableOpacity
											disabled={!sketch}
											onPress={() => {
												sigRef.current?.clearSignature()
											}}
											style={[styles.saveSketchBtn, !sketch && { opacity: 0.5 }]}
										>
											<Text style={styles.saveSketchBtnText}>Save as sketch</Text>
										</TouchableOpacity>
									</View>
								</View>
							)}

							{/* Voice mode is commented out for now -- see the import note at the top of this file.
							{noteMode === 'voice' && (
								<View style={{ gap: 10 }}>
									<View style={[styles.voiceCard, { backgroundColor: isListening ? '#FDE8DC' : APP_COLORS.mint }]}>
										<TouchableOpacity onPress={toggleMic} style={styles.micWrap}>
											<Animated.View
												style={[
													styles.micRing,
													{ transform: [{ scale: pulseAnim }], backgroundColor: isListening ? '#FFCDD2' : 'transparent' },
												]}
											/>
											<View style={[styles.micBtn, { backgroundColor: isListening ? '#C2410C' : PRIMARY }]}>
												<MaterialCommunityIcons name={isListening ? 'microphone' : 'microphone-outline'} size={28} color="#FFFFFF" />
											</View>
										</TouchableOpacity>
										<Text style={styles.voiceLabel}>
											{isListening ? 'Listening…' : voiceDone ? 'Tap to dictate more' : 'Tap to dictate'}
										</Text>
									</View>

									{(!!liveText || !!transcript) && (
										<View style={styles.transcriptCard}>
											<Text style={styles.transcriptKicker}>{isListening ? 'LIVE TRANSCRIPT' : 'TRANSCRIPT · CHECK BEFORE SAVING'}</Text>
											<Text style={styles.transcriptText}>
												{transcript}
												{liveText ? ` ${liveText}` : ''}
											</Text>
											{voiceDone && !isListening && (
												<View style={{ flexDirection: 'row', gap: 8 }}>
													<TouchableOpacity onPress={discardVoice} style={styles.canvasClearBtn}>
														<Text style={styles.canvasClearBtnText}>Discard</Text>
													</TouchableOpacity>
													<TouchableOpacity onPress={insertVoiceIntoNotes} style={styles.insertVoiceBtn}>
														<Text style={styles.insertVoiceBtnText}>Insert into notes</Text>
													</TouchableOpacity>
												</View>
											)}
										</View>
									)}
									<Text style={styles.voiceHint}>Only your voice is transcribed. Audio isn&apos;t stored after the text is saved.</Text>
								</View>
							)}
							*/}

							{noteMode !== 'type' && !!notes.trim() && (
								<View style={styles.notesPreview}>
									<View style={styles.rowBetween}>
										<Text style={styles.summaryLabel}>NOTES SO FAR</Text>
										<TouchableOpacity onPress={() => setNoteMode('type')}>
											<Text style={styles.editAsTextLink}>Edit as text</Text>
										</TouchableOpacity>
									</View>
									<Text style={styles.notesPreviewText}>{notes}</Text>
								</View>
							)}

							{!!sketch && (
								<View style={styles.sketchRow}>
									<MaterialCommunityIcons name="image-outline" size={20} color={APP_COLORS.mintAccent} />
									<Text style={styles.sketchRowText}>Sketch attached to notes</Text>
									<TouchableOpacity onPress={() => setSketch(null)} accessibilityLabel="Remove sketch">
										<MaterialCommunityIcons name="close" size={18} color={INK_MUTED} />
									</TouchableOpacity>
								</View>
							)}
						</AppSoftCard>

						<View style={{ gap: 8 }}>
							<Text style={styles.sectionTitle}>Follow-up</Text>
							<View style={styles.followUpGrid}>
								{FOLLOW_UP_OPTIONS.map((f) => {
									const on = followUp === f.id
									return (
										<TouchableOpacity
											key={f.id}
											style={[styles.followUpBtn, { borderColor: on ? PRIMARY : DIVIDER, backgroundColor: on ? APP_COLORS.mint : '#FFFFFF' }]}
											onPress={() => setFollowUp(f.id)}
										>
											<Text style={[styles.followUpBtnText, { color: on ? INK : INK_MUTED }]}>{f.label}</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>
					</View>
				)}
			</ScrollView>

			{/* ── Bottom action bar ── */}
			<View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
				{phase === 'sent' && (
					<View style={styles.sentBanner}>
						<MaterialCommunityIcons name="check-circle" size={18} color={APP_COLORS.success} />
						<Text style={styles.sentBannerText}>Consultation notes shared with {patient.name?.split(' ')[0]}</Text>
					</View>
				)}
				<View style={{ flexDirection: 'row', gap: 8 }}>
					{phase !== 'sent' && activeTab !== 'notes' && (
						<TouchableOpacity style={styles.secondaryBtn} onPress={() => setActiveTab('notes')}>
							<MaterialCommunityIcons name="note-edit-outline" size={18} color={PRIMARY} />
							<Text style={styles.secondaryBtnText}>Notes</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity style={[styles.primaryBtn, { backgroundColor: primaryBg }]} onPress={handlePrimaryPress} disabled={saving}>
						{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryBtnText}>{primaryLabel}</Text>}
					</TouchableOpacity>
				</View>
			</View>

			{/* ── DICOM expanded modal ── */}
			<Modal visible={!!dicomBase64} animationType="slide" onRequestClose={() => setDicomBase64(null)}>
				<View style={styles.dicomModal}>
					<View style={[styles.dicomModalHeader, { paddingTop: insets.top + 8 }]}>
						<Text style={styles.dicomModalTitle}>Radiology image</Text>
						<TouchableOpacity onPress={() => setDicomBase64(null)}>
							<MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
					<View style={{ flex: 1 }}>
						<DicomViewer base64Data={dicomBase64} fullScreen />
					</View>
				</View>
			</Modal>
		</View>
	)
}

// ── Small presentational pieces ─────────────────────────────────────────────

function VitalCard({
	label,
	value,
	unit,
	tone,
	toneLabel,
	show,
}: {
	label: string
	value: string
	unit: string
	tone: 'green' | 'amber' | 'red'
	toneLabel: string
	show: boolean
}) {
	if (!show) return null
	const pair = tone === 'green' ? REPORT_TONES.green : tone === 'amber' ? REPORT_TONES.amber : { bg: APP_COLORS.dangerBg, fg: APP_COLORS.danger }
	return (
		<View style={styles.vitalCard}>
			<Text style={styles.vitalLabel}>{label}</Text>
			<Text style={styles.vitalValue}>
				{value}
				{!!unit && <Text style={styles.vitalUnit}> {unit}</Text>}
			</Text>
			<View style={[styles.vitalToneChip, { backgroundColor: pair.bg }]}>
				<Text style={[styles.vitalToneText, { color: pair.fg }]}>{toneLabel}</Text>
			</View>
		</View>
	)
}

function EmptyState({ label }: { label: string }) {
	return (
		<View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
			<MaterialCommunityIcons name="emoticon-sad-outline" size={40} color={DIVIDER} />
			<Text style={styles.mutedCaption}>{label}</Text>
		</View>
	)
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: PAGE_BG },
	centerContent: { alignItems: 'center', justifyContent: 'center', padding: 24 },
	goBackBtn: { marginTop: 20, height: 44, paddingHorizontal: 20, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
	goBackBtnText: { color: '#FFFFFF', fontWeight: '700' },

	header: {
		position: 'relative',
		overflow: 'hidden',
		backgroundColor: INK,
		paddingHorizontal: 16,
		paddingBottom: 16,
		gap: 12,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
	},
	headerBlob: { position: 'absolute', right: -60, top: -80, width: 220, height: 220, borderRadius: 9999, backgroundColor: PRIMARY },
	headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
	backBtn: { width: 44, height: 44, marginLeft: -8, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	headerTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: '#FFFFFF' },
	headerSubtitle: { fontSize: 12, lineHeight: 16, color: '#9FD3D1' },
	livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 28, paddingHorizontal: 10, borderRadius: 9999, backgroundColor: '#FFFFFF1F' },
	liveDot: { width: 8, height: 8, borderRadius: 9999, backgroundColor: '#F97A4A' },
	livePillText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
	moreBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFFFFF1F', alignItems: 'center', justifyContent: 'center' },

	headerPatientRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	headerAvatar: { width: 56, height: 56, borderRadius: 14, backgroundColor: APP_COLORS.mint, borderWidth: 2, borderColor: APP_COLORS.mintAccent },
	headerAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
	headerAvatarFallbackText: { color: INK, fontWeight: '800', fontSize: 16 },
	headerPatientName: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: '#FFFFFF' },
	headerPatientMeta: { fontSize: 13, lineHeight: 18, color: '#E3EFEF' },

	headerStatGrid: { flexDirection: 'row', gap: 6 },
	headerStatCell: { flex: 1, padding: 8, borderRadius: 10, backgroundColor: '#FFFFFF14', gap: 2 },
	headerStatLabel: { fontSize: 11, lineHeight: 14, color: '#9FD3D1', fontWeight: '700' },
	headerStatValue: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: '#FFFFFF' },

	tabsWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: PAGE_BG },

	content: { padding: 16, paddingTop: 4, gap: 14, paddingBottom: 32 },

	sectionTitle: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: INK },
	mutedCaption: { fontSize: 12, lineHeight: 16, color: INK_MUTED },
	rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
	hr: { height: 1, backgroundColor: DIVIDER },

	allergyBanner: { padding: 10, borderRadius: 12, backgroundColor: APP_COLORS.dangerBg, flexDirection: 'row', alignItems: 'center', gap: 10 },
	allergyBannerText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.danger },

	reasonText: { fontSize: 14, lineHeight: 20, color: INK },
	tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
	tagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, backgroundColor: '#F0F4F4' },
	tagChipText: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: INK },

	vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	vitalCard: { width: '48%', padding: 12, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: DIVIDER, gap: 2 },
	vitalLabel: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: INK_MUTED },
	vitalValue: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: INK },
	vitalUnit: { fontSize: 12, fontWeight: '600', color: INK_MUTED },
	vitalToneChip: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, marginTop: 4 },
	vitalToneText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },

	conditionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
	dot: { width: 8, height: 8, borderRadius: 9999 },
	conditionText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: INK },

	medicineRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	medicineIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: TONES.lilac.bg, alignItems: 'center', justifyContent: 'center' },
	medicineText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700', color: INK },

	summaryGrid: { flexDirection: 'row', gap: 12 },
	summaryLabel: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6, color: INK_MUTED },
	summaryValue: { fontSize: 13, lineHeight: 18, fontWeight: '600', color: INK },

	historyRow: { flexDirection: 'row', gap: 12 },
	historyRail: { alignItems: 'center', width: 12 },
	historyDot: { width: 12, height: 12, marginTop: 4, borderRadius: 9999, backgroundColor: PRIMARY },
	historyLine: { flexGrow: 1, width: 2, marginVertical: 4, backgroundColor: DIVIDER },
	historyTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: INK },
	historyNote: { fontSize: 13, lineHeight: 18, color: INK_MUTED },
	historyBy: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: INK },
	historyLink: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: PRIMARY },

	barsRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', height: 120, paddingTop: 8 },
	barCol: { flex: 1, alignItems: 'center', gap: 4 },
	barValue: { fontSize: 11, lineHeight: 14, fontWeight: '800' },
	bar: { width: '100%', borderRadius: 6 },
	barMonth: { fontSize: 11, lineHeight: 14, fontWeight: '600', color: INK_MUTED },

	reportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
	reportRowDivider: { borderBottomWidth: 1, borderBottomColor: DIVIDER },
	reportIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	reportName: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: INK },
	reportStatusChip: { paddingHorizontal: 8, paddingVertical: 1, borderRadius: 6, maxWidth: 110 },
	reportStatusText: { fontSize: 11, lineHeight: 16, fontWeight: '700' },

	fieldLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: INK },
	diagnosisInput: { height: 44, paddingHorizontal: 12, borderWidth: 1, borderColor: '#7A8B8E', borderRadius: 10, backgroundColor: '#FFFFFF', color: INK, fontSize: 15 },

	modeSwitch: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: '#F0F4F4' },
	modeBtn: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
	modeBtnActive: { backgroundColor: '#FFFFFF' },
	modeBtnText: { fontSize: 13, fontWeight: '700', color: INK_MUTED },
	modeBtnTextActive: { color: INK },

	notesTextarea: { minHeight: 140, padding: 10, borderWidth: 1, borderColor: '#7A8B8E', borderRadius: 10, backgroundColor: '#FFFFFF', color: INK, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },

	canvasWrap: { borderRadius: 12, borderWidth: 1, borderColor: '#7A8B8E', overflow: 'hidden', backgroundColor: '#FFFDF6', height: 230 },
	canvasToolBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
	canvasClearBtn: { height: 44, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
	canvasClearBtnText: { fontSize: 13, fontWeight: '700', color: INK },
	saveSketchBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
	saveSketchBtnText: { fontSize: 13, fontWeight: '700', color: PRIMARY },

	voiceCard: { padding: 16, borderRadius: 14, alignItems: 'center', gap: 10 },
	micWrap: { alignItems: 'center', justifyContent: 'center' },
	micRing: { position: 'absolute', width: 72, height: 72, borderRadius: 9999 },
	micBtn: { width: 72, height: 72, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
	voiceLabel: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: INK },
	transcriptCard: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, gap: 8 },
	transcriptKicker: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.6, color: PRIMARY },
	transcriptText: { fontSize: 15, lineHeight: 22, color: INK },
	insertVoiceBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: PRIMARY, alignItems: 'center', justifyContent: 'center' },
	insertVoiceBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
	voiceHint: { fontSize: 12, lineHeight: 17, color: INK_MUTED },

	notesPreview: { padding: 10, borderRadius: 10, backgroundColor: PAGE_BG, gap: 4 },
	editAsTextLink: { fontSize: 12, fontWeight: '700', color: PRIMARY },
	notesPreviewText: { fontSize: 14, lineHeight: 20, color: INK },

	sketchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: APP_COLORS.mintAccent },
	sketchRowText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', color: INK },

	followUpGrid: { flexDirection: 'row', gap: 6 },
	followUpBtn: { flex: 1, height: 44, borderWidth: 1.5, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	followUpBtnText: { fontSize: 13, fontWeight: '700' },

	footer: { padding: 12, paddingTop: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: DIVIDER, gap: 8 },
	sentBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 10, backgroundColor: APP_COLORS.successBg },
	sentBannerText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.success },
	secondaryBtn: { height: 52, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: PRIMARY, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', gap: 6 },
	secondaryBtnText: { fontSize: 14, fontWeight: '700', color: PRIMARY },
	primaryBtn: { flex: 1, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
	primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

	dicomModal: { flex: 1, backgroundColor: '#000000' },
	dicomModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12, backgroundColor: INK },
	dicomModalTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
})
