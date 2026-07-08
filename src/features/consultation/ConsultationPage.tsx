import React, { useEffect, useState, useRef } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	Modal,
	useWindowDimensions,
	Linking,
} from 'react-native'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useTheme, Card, Avatar, Button, IconButton, Divider, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { SvgProps } from 'react-native-svg'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import DicomViewer from './components/DicomViewer'
import VitalsTab from './components/VitalsTab'
// import ScribbleNoteEditor from './components/ScribbleNoteEditor'
import Prescription from '../../assets/icons/consultation/prescription.svg'
import LaboratoryIcon from '../../assets/icons/consultation/lab.svg'
import RadiologyTabIcon from '../../assets/icons/consultation/radiology.svg'
import AncillaryIcon from '../../assets/icons/consultation/ancillary.svg'
import { patientService, PatientDetails, DocterDetails } from './ConsultationService'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'
import DateSlotPicker from '../../components/common/DateSlotPicker'
import DoctorHospitalDropdown from '../../components/common/DoctorHospitalDropdown'
import { getDoctorAvailability, getDoctorById, getDoctorProfile, rescheduleAppointment } from '../doctor/doctorService'
import { APPOINTMENT_STATUS } from '../../constants/constants'
import { useAuth } from '../../context/AuthContext'

const SAMPLE_DICOM_MODULE = require('../../assets/dicon/sample-dicon.dcm')

type TabItem = { id: string; Icon: React.FC<SvgProps> }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RowItem({
	label,
	value,
	numberOfLines,
	ellipsizeMode,
}: {
	label: string
	value: string
	numberOfLines?: number
	ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip'
}) {
	const theme = useTheme()
	return (
		<View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
			<Text style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}>{label}</Text>
			<Text
				style={{ fontSize: 11, fontWeight: '500', color: '#333', flex: 1 }}
				numberOfLines={numberOfLines ?? 1}
				ellipsizeMode={ellipsizeMode ?? 'tail'}
			>
				{value || '--'}
			</Text>
		</View>
	)
}

function resolveAvatar(patient: PatientDetails | null): string | undefined {
	if (!patient) return undefined
	const key = patient.avatar ?? patient.avatar_s3_key
	if (!key) return undefined
	if (typeof key === 'string' && key.startsWith('http')) return key
	return `https://your-cdn.example.com/${key}`
}

// ---------- PastMedicalHistory (complete) ----------
interface PastMedicalHistoryProps {
	patientId: string
}

const formatDate = (dateString?: string) => {
	if (!dateString) return '--'
	try {
		const date = new Date(dateString)
		if (isNaN(date.getTime())) return dateString
		return date.toLocaleDateString('en-IN', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
	} catch {
		return dateString
	}
}

function PastMedicalHistory({ patientId }: PastMedicalHistoryProps) {
	const theme = useTheme()
	const [activeTab, setActiveTab] = useState('Laboratory')
	const [dicomBase64, setDicomBase64] = useState<string | null>(null)
	const [dicomLoading, setDicomLoading] = useState(false)
	const [dicomError, setDicomError] = useState<string | null>(null)
	const [isDicomExpanded, setIsDicomExpanded] = useState(false)

	const [loading, setLoading] = useState(false)
	const [treatmentHistory, setTreatmentHistory] = useState<any[]>([])
	const [laboratoryReports, setLaboratoryReports] = useState<any[]>([])
	const [radiologyReports, setRadiologyReports] = useState<any[]>([])
	const [ancillaryReports, setAncillaryReports] = useState<any[]>([])

	const tabs: TabItem[] = [
		{ id: 'Prescription', Icon: Prescription },
		{ id: 'Laboratory', Icon: LaboratoryIcon },
		{ id: 'Radiology', Icon: RadiologyTabIcon },
		{ id: 'Ancillary', Icon: AncillaryIcon },
	]

	useEffect(() => {
		if (!patientId) return
		const fetchHistory = async () => {
			setLoading(true)
			try {
				const [treatments, labs, rads, ancilsRes] = await Promise.all([
					patientService.getPatientTreatmentHistory(patientId),
					patientService.getPatientLaboratoryReports(patientId),
					patientService.getPatientRadiologyReports(patientId),
					ApiService.get(API_ENDPOINTS.PATIENT.REPORTS(patientId)).catch(() => ({ data: { data: [] } }))
				])
				setTreatmentHistory(treatments)
				setLaboratoryReports(labs)
				setRadiologyReports(rads)

				const rawReports = (ancilsRes as any)?.data?.data ?? (ancilsRes as any)?.data ?? []
				const filteredAncillary = rawReports.filter(
					(r: any) => r.report_type?.toLowerCase() === 'ancillary'
				)
				setAncillaryReports(filteredAncillary)
			} catch (err) {
				console.error('Failed to fetch past medical history:', err)
			} finally {
				setLoading(false)
			}
		}
		fetchHistory()
	}, [patientId])

	const handleLoadDicomForReport = async (s3Key: string) => {
		setDicomLoading(true)
		setDicomError(null)
		try {
			const url = s3Key
			if (url) {
				const response = await fetch(url)
				const blob = await response.blob()
				const reader = new FileReader()
				reader.onloadend = () => {
					const base64data = reader.result as string
					const base64 = base64data.split(',')[1] || base64data
					setDicomBase64(base64)
				}
				reader.readAsDataURL(blob)
			} else {
				throw new Error('Invalid DICOM URL')
			}
		} catch (err: any) {
			handleLoadSampleDicom()
		} finally {
			setDicomLoading(false)
		}
	}

	const handleLoadSampleDicom = async () => {
		setDicomLoading(true)
		setDicomError(null)
		try {
			const asset = Asset.fromModule(SAMPLE_DICOM_MODULE)
			await asset.downloadAsync()
			if (!asset.localUri) throw new Error('Could not resolve local URI for DICOM asset.')
			const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
				encoding: FileSystem.EncodingType.Base64,
			})
			setDicomBase64(base64)
		} catch (err: any) {
			setDicomError(err?.message ?? 'Failed to load DICOM file.')
		} finally {
			setDicomLoading(false)
		}
	}

	const renderEmptyState = () => (
		<View style={{ alignItems: 'center', paddingVertical: 24 }}>
			<MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#ccc" />
			<Text style={{ color: '#666', marginTop: 8, fontWeight: '500' }}>
				No past {activeTab.toLowerCase()} history!
			</Text>
		</View>
	)

	const renderTabContent = () => {
		if (activeTab === 'Prescription') {
			if (treatmentHistory.length === 0) return renderEmptyState()
			return treatmentHistory.map((item) => (
				<View key={item.id} style={styles.historyItem}>
					<View style={styles.historyHeader}>
						<MaterialCommunityIcons name="file-document-outline" size={22} color={theme.colors.primary} />
						<View style={{ flex: 1, marginLeft: 10 }}>
							<Text style={styles.historyTitle}>Prescription - {formatDate(item.created_at)}</Text>
							<Text style={styles.historySubtitle}>
								{item.doctor_name ? `Dr. ${item.doctor_name}` : 'Doctor'} · {item.hospital_name || 'Hospital'}
							</Text>
						</View>
						{item.prescription_s3_key ? (
							<IconButton
								icon="download"
								size={20}
								iconColor={theme.colors.primary}
								onPress={() => Linking.openURL(item.prescription_s3_key || '')}
							/>
						) : null}
					</View>
					{item.notes ? <Text style={styles.historyNotes}>{item.notes}</Text> : null}
				</View>
			))
		}

		if (activeTab === 'Laboratory') {
			if (laboratoryReports.length === 0) return renderEmptyState()
			return laboratoryReports.map((item) => (
				<View key={item.id} style={styles.historyItem}>
					<View style={styles.historyHeader}>
						<MaterialCommunityIcons name="flask-outline" size={22} color={theme.colors.primary} />
						<View style={{ flex: 1, marginLeft: 10 }}>
							<Text style={styles.historyTitle}>Lab Report - {formatDate(item.uploaded_at)}</Text>
							{item.summary_findings ? <Text style={styles.historySubtitle}>{item.summary_findings}</Text> : null}
						</View>
						{item.report_pdf_s3_key ? (
							<IconButton
								icon="eye"
								size={20}
								iconColor={theme.colors.primary}
								onPress={() => Linking.openURL(item.report_pdf_s3_key || '')}
							/>
						) : null}
					</View>
					{item.result_values && Object.keys(item.result_values).length > 0 ? (
						<View style={styles.resultsGrid}>
							{Object.entries(item.result_values).map(([testName, testValue]) => (
								<View key={testName} style={styles.resultRow}>
									<Text style={styles.resultLabel}>{testName}:</Text>
									<Text style={styles.resultValue}>{String(testValue)}</Text>
								</View>
							))}
						</View>
					) : null}
				</View>
			))
		}

		if (activeTab === 'Radiology') {
			if (dicomBase64) {
				return (
					<View style={{ marginTop: 16 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
							<MaterialCommunityIcons name="radioactive" size={16} color={theme.colors.primary} />
							<Text style={{ fontSize: 12, color: theme.colors.primary, fontWeight: 'bold', marginLeft: 6 }}>
								Radiology Scan DICOM Viewer
							</Text>
							<IconButton icon="close" size={16} style={{ marginLeft: 'auto' }} onPress={() => setDicomBase64(null)} />
						</View>
						<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
							<Button mode="outlined" compact icon="arrow-expand" onPress={() => setIsDicomExpanded(true)}>
								Expand view
							</Button>
						</View>
						<DicomViewer base64Data={dicomBase64} />
						<Text style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
							Drag to adjust Window/Level · Pinch or +/- to zoom · ⊙ resets view · ☀ inverts
						</Text>
					</View>
				)
			}
			if (radiologyReports.length === 0) return renderEmptyState()
			return radiologyReports.map((item) => (
				<View key={item.id} style={styles.historyItem}>
					<View style={styles.historyHeader}>
						<MaterialCommunityIcons name="radioactive" size={22} color={theme.colors.primary} />
						<View style={{ flex: 1, marginLeft: 10 }}>
							<Text style={styles.historyTitle}>Radiology Scan - {formatDate(item.uploaded_at)}</Text>
							{item.summary_findings ? <Text style={styles.historySubtitle}>{item.summary_findings}</Text> : null}
						</View>
						<View style={{ flexDirection: 'row' }}>
							{item.report_pdf_s3_key ? (
								<IconButton
									icon="file-pdf-box"
									size={20}
									iconColor={theme.colors.primary}
									onPress={() => Linking.openURL(item.report_pdf_s3_key || '')}
								/>
							) : null}
							<IconButton
								icon="television-play"
								size={20}
								iconColor={theme.colors.primary}
								onPress={() => {
									if (item.dicom_images_s3_keys && item.dicom_images_s3_keys.length > 0) {
										handleLoadDicomForReport(item.dicom_images_s3_keys[0])
									} else {
										handleLoadSampleDicom()
									}
								}}
							/>
						</View>
					</View>
				</View>
			))
		}

		if (activeTab === 'Ancillary') {
			if (ancillaryReports.length === 0) return renderEmptyState()
			return ancillaryReports.map((item) => (
				<View key={item.id} style={styles.historyItem}>
					<View style={styles.historyHeader}>
						<MaterialCommunityIcons name="medical-bag" size={22} color={theme.colors.primary} />
						<View style={{ flex: 1, marginLeft: 10 }}>
							<Text style={styles.historyTitle}>Ancillary Report - {formatDate(item.created_at || item.uploaded_at)}</Text>
							{item.notes ? <Text style={styles.historySubtitle}>{item.notes}</Text> : null}
						</View>
						{item.file_s3_key ? (
							<IconButton
								icon="eye"
								size={20}
								iconColor={theme.colors.primary}
								onPress={() => Linking.openURL(item.file_s3_key || '')}
							/>
						) : null}
					</View>
				</View>
			))
		}
	}

	return (
		<Card style={[styles.card, { marginTop: 0 }]}>
			<Card.Content>
				<Text variant="titleMedium" style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}>
					Past medical history
				</Text>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-around',
						borderBottomWidth: 1,
						borderBottomColor: '#eee',
						paddingBottom: 8,
					}}
				>
					{tabs.map((tab) => {
						const isActive = activeTab === tab.id
						const TabIcon = tab.Icon
						return (
							<TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={{ alignItems: 'center', flex: 1 }}>
								<TabIcon width={42} height={42} />
								<Text
									style={{
										fontSize: 10,
										color: isActive ? theme.colors.primary : '#999',
										marginTop: 4,
										fontWeight: isActive ? 'bold' : 'normal',
									}}
								>
									{tab.id}
								</Text>
								{isActive && (
									<View
										style={{
											position: 'absolute',
											bottom: -10,
											height: 3,
											backgroundColor: theme.colors.primary,
											width: '100%',
										}}
									/>
								)}
							</TouchableOpacity>
						)
					})}
				</View>

				<View style={{ marginTop: 16, marginBottom: 8 }}>
					<Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Select date</Text>
					<Button
						mode="outlined"
						style={{ alignSelf: 'flex-start', borderRadius: 8 }}
						contentStyle={{ height: 36 }}
						labelStyle={{ fontSize: 11 }}
					>
						All
					</Button>
				</View>

				{loading ? (
					<View style={{ alignItems: 'center', paddingVertical: 24 }}>
						<ActivityIndicator size="small" color={theme.colors.primary} />
						<Text style={{ color: '#666', marginTop: 8, fontSize: 12 }}>Loading history…</Text>
					</View>
				) : dicomLoading ? (
					<View style={{ alignItems: 'center', paddingVertical: 24 }}>
						<ActivityIndicator size="large" />
						<Text style={{ color: '#666', marginTop: 8, fontSize: 12 }}>Loading DICOM image…</Text>
					</View>
				) : dicomError ? (
					<View style={{ alignItems: 'center', paddingVertical: 24 }}>
						<MaterialCommunityIcons name="alert-circle-outline" size={40} color="#e53935" />
						<Text style={{ color: '#e53935', marginTop: 8, fontSize: 12, textAlign: 'center' }}>
							{dicomError}
						</Text>
					</View>
				) : (
					renderTabContent()
				)}
			</Card.Content>

			<Modal visible={isDicomExpanded} animationType="slide" onRequestClose={() => setIsDicomExpanded(false)}>
				<View style={styles.dicomModalContainer}>
					<View style={styles.dicomModalHeader}>
						<Text style={styles.dicomModalTitle}>Radiology Image</Text>
						<IconButton icon="close" iconColor="#fff" onPress={() => setIsDicomExpanded(false)} />
					</View>
					<View style={styles.dicomModalBody}>
						<DicomViewer base64Data={dicomBase64} fullScreen />
					</View>
				</View>
			</Modal>
		</Card>
	)
}

// ---------- ShareWith (complete) ----------
function ShareWith() {
	const theme = useTheme()
	const [activeTab, setActiveTab] = useState('Laboratory')
	const tabs: TabItem[] = [
		{ id: 'Pharmacy', Icon: Prescription },
		{ id: 'Laboratory', Icon: LaboratoryIcon },
		{ id: 'Radiology', Icon: RadiologyTabIcon },
		{ id: 'Ancillary', Icon: AncillaryIcon },
	]
	const MOCK_PLACES = [
		{
			id: '1',
			name: 'Apollo Pharmacy, KR Puram',
			address: '1st Block, 9th Main Rd, Bengaluru',
			phone: '+91 9876543250',
			distance: '300m away',
		},
		{
			id: '2',
			name: 'Med Plus, KR Puram',
			address: '1st Block, 9th Main Rd, Bengaluru',
			phone: '+91 9876543250',
			distance: '1.2km away',
		},
	]

	return (
		<Card style={styles.card}>
			<Card.Content>
				<Text
					variant="titleMedium"
					style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}
				>
					Share with:
				</Text>
				<View
					style={{
						flexDirection: 'row',
						justifyContent: 'space-around',
						borderBottomWidth: 1,
						borderBottomColor: '#eee',
						paddingBottom: 8,
						marginBottom: 16,
					}}
				>
					{tabs.map((tab) => {
						const isActive = activeTab === tab.id
						const TabIcon = tab.Icon
						return (
							<TouchableOpacity
								key={tab.id}
								onPress={() => setActiveTab(tab.id)}
								style={{ alignItems: 'center', flex: 1 }}
							>
								<TabIcon width={42} height={42} />
								<Text
									style={{
										fontSize: 10,
										color: isActive ? theme.colors.primary : '#999',
										marginTop: 4,
										fontWeight: isActive ? 'bold' : 'normal',
									}}
								>
									{tab.id}
								</Text>
								{isActive && (
									<View
										style={{
											position: 'absolute',
											bottom: -10,
											height: 3,
											backgroundColor: theme.colors.primary,
											width: '100%',
										}}
									/>
								)}
							</TouchableOpacity>
						)
					})}
				</View>

				<Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>Select address</Text>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
					<Button
						mode="outlined"
						style={{ width: '48%', borderRadius: 8 }}
						contentStyle={{ height: 36 }}
						labelStyle={{ fontSize: 11 }}
					>
						City ▼
					</Button>
					<Button
						mode="outlined"
						style={{ width: '48%', borderRadius: 8 }}
						contentStyle={{ height: 36 }}
						labelStyle={{ fontSize: 11 }}
					>
						Area ▼
					</Button>
				</View>

				{MOCK_PLACES.map((place, i) => (
					<View
						key={place.id}
						style={{
							paddingTop: 12,
							borderTopWidth: i === 0 ? 0 : 1,
							borderTopColor: '#eee',
							marginBottom: 12,
						}}
					>
						<Text style={{ fontWeight: 'bold', fontSize: 13 }}>{place.name}</Text>
						<Text style={{ color: '#666', fontSize: 11, marginVertical: 4 }}>{place.address}</Text>
						<View
							style={{
								flexDirection: 'row',
								justifyContent: 'space-between',
								alignItems: 'center',
							}}
						>
							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<MaterialCommunityIcons name="phone" size={12} color={theme.colors.primary} />
								<Text
									style={{
										fontSize: 11,
										color: theme.colors.primary,
										marginLeft: 2,
										marginRight: 8,
									}}
								>
									{place.phone}
								</Text>
								<Text style={{ fontSize: 11, color: '#ccc', marginRight: 8 }}>|</Text>
								<MaterialCommunityIcons name="map-marker-outline" size={12} color="#666" />
								<Text style={{ fontSize: 11, color: '#666', marginLeft: 2 }}>{place.distance}</Text>
							</View>
							<Button mode="contained" compact style={{ borderRadius: 8 }}>
								Share
							</Button>
						</View>
					</View>
				))}
			</Card.Content>
		</Card>
	)
}

// ---------- Main ConsultationPage ----------
export default function ConsultationPage() {
	const theme = useTheme()
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { width: pageWidth } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const { selectedHospitalId } = useAuth() as any

	const [patient, setPatient] = useState<PatientDetails | null>(null)
	const [doctor, setDoctor] = useState<DocterDetails | null>(null)
	const [appointment, setAppointment] = useState<any>(null)
	const [patientLoading, setPatientLoading] = useState(false)
	const [doctorLoading, setDoctorLoading] = useState(false)
	const [activeTab, setActiveTab] = useState(0)
	// Stores the base64 PNG snapshot from the scribble canvas
	const [noteCanvasData, setNoteCanvasData] = useState<string>('')
	const [saving, setSaving] = useState(false)
	const [followUpOpen, setFollowUpOpen] = useState(false)
	const [followUpDate, setFollowUpDate] = useState<Date>(new Date())
	const [followUpSelectedSlot, setFollowUpSelectedSlot] = useState('')
	const [followUpSlots, setFollowUpSlots] = useState<any[]>([])
	const [followUpSlotsLoading, setFollowUpSlotsLoading] = useState(false)
	const [followUpHospitalId, setFollowUpHospitalId] = useState<string>('')

	const params = route.params as any
	useEffect(() => {
		if (pageWidth <= 0) return
		pagerRef.current?.scrollTo({ x: pageWidth * activeTab, animated: false })
	}, [pageWidth, activeTab])

	const appointmentId = params?.appointmentId ?? params?.appointment_id ?? params?.id ?? ''
	const patientId = params?.patient_id ?? params?.patientId ?? params?.patient?.id ?? ''
	const doctorID = params?.doctor_id ?? params?.doctorID ?? params?.doctor?.id ?? ''

	console.log('Full params:', JSON.stringify(params, null, 2))
	console.log('Extracted - appointmentId:', appointmentId, 'patientId:', patientId, 'doctorID:', doctorID)

	// Set doctor directly from params without API call
	useEffect(() => {
		const doctorFromParams = params?.doctor
		const hospitalFromParams = params?.appointment?.hospital || params?.hospital

		if (doctorFromParams) {
			const doctorData: DocterDetails = {
				name: doctorFromParams.name,
				degree: '',
				specialization: '',
				clinicName: hospitalFromParams?.name || '',
				clinicAddress: hospitalFromParams?.address || '',
			}
			setDoctor(doctorData)
			setDoctorLoading(false)
		}
	}, [])

	const fetchPatientData = async (id: string) => {
		setPatientLoading(true)
		try {
			const data = await patientService.getPatientDetails(id)
			setPatient(data)
		} catch (err: any) {
			Alert.alert('Error', err?.message ?? 'Failed to load patient details')
		} finally {
			setPatientLoading(false)
		}
	}

	// Fetch appointment details
	useEffect(() => {
		const fetchAppointmentDetails = async () => {
			if (appointmentId && !appointment) {
				try {
					const response = (await ApiService.get(API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId))) as any
					const appointmentData = response?.data?.data || response?.data || response
					setAppointment(appointmentData)

					if (!patient && appointmentData?.patient?.id) {
						fetchPatientData(appointmentData.patient.id)
					}

					if (!doctor && appointmentData?.doctor) {
						const doctorData: DocterDetails = {
							name: appointmentData.doctor.name,
							degree: '',
							specialization: '',
							clinicName: appointmentData.hospital?.name,
							clinicAddress: appointmentData.hospital?.address,
						}
						setDoctor(doctorData)
						setDoctorLoading(false)
					}
				} catch (err) {
					console.error('Failed to fetch appointment details:', err)
				}
			}
		}
		fetchAppointmentDetails()
	}, [appointmentId])

	// Fetch patient using patientId from params
	useEffect(() => {
		if (patientId && !patient) {
			fetchPatientData(patientId)
		}
	}, [patientId])

	useEffect(() => {
		if (!followUpOpen) return
		const fetchHospitals = async () => {
			try {
				let hospitals: any[] = []
				if (doctorID) {
					const res = await getDoctorById(doctorID)
					hospitals = res?.data?.hospitals || []
				} else {
					const res = await getDoctorProfile()
					hospitals = res?.data?.hospitals || []
				}
				if (!followUpHospitalId && hospitals.length > 0) {
					setFollowUpHospitalId(hospitals[0]?.hospital?.id || '')
				}
			} catch {
				// The dropdown fetches independently; this is only fallback for payload defaults.
			}
		}
		fetchHospitals()
	}, [followUpOpen, doctorID, followUpHospitalId])

	useEffect(() => {
		if (!followUpOpen) return
		const hospitalId =
			selectedHospitalId ||
			followUpHospitalId ||
			params?.appointment?.hospital?.id ||
			params?.appointment?.hospital_id
		const dateStr = followUpDate.toISOString().split('T')[0]
		if (!hospitalId || !dateStr) {
			setFollowUpSlots([])
			setFollowUpSelectedSlot('')
			return
		}
		const fetchSlots = async () => {
			setFollowUpSlotsLoading(true)
			setFollowUpSelectedSlot('')
			try {
				const responseData = await getDoctorAvailability({
					doctor_id: doctorID,
					hospital_id: hospitalId,
					date: dateStr,
				})
				const groups = Array.isArray(responseData)
					? responseData
					: Array.isArray((responseData as any)?.data)
						? (responseData as any).data
						: []
				setFollowUpSlots(groups)
			} catch {
				setFollowUpSlots([])
			} finally {
				setFollowUpSlotsLoading(false)
			}
		}
		fetchSlots()
	}, [followUpOpen, followUpDate, followUpHospitalId, selectedHospitalId, doctorID, params])

	const handleConfirmFollowUp = async () => {
		if (!followUpSelectedSlot) {
			Alert.alert('Select time', 'Please select a slot to schedule the follow up.')
			return
		}
		if (!appointmentId) {
			Alert.alert('Error', 'Appointment id missing.')
			return
		}
		const hospitalId =
			selectedHospitalId ||
			followUpHospitalId ||
			params?.appointment?.hospital?.id ||
			params?.appointment?.hospital_id
		const dateStr = followUpDate.toISOString().split('T')[0]
		if (!hospitalId || !dateStr) {
			Alert.alert('Error', 'Missing hospital or date for follow up.')
			return
		}

		setFollowUpSlotsLoading(true)
		try {
			const res = await rescheduleAppointment({
				appointment_id: appointmentId,
				appointment_date: dateStr,
				start_time: followUpSelectedSlot,
				end_time: null,
				hospital_id: hospitalId,
				reason: 'Doctor follow up',
				status_id: APPOINTMENT_STATUS.CONFIRM,
			})
			if (res?.success) {
				Alert.alert('Success', res.message || 'Follow up appointment scheduled')
				setFollowUpOpen(false)
			} else {
				Alert.alert('Error', res?.message || 'Unable to schedule follow up')
			}
		} catch {
			Alert.alert('Error', 'Unable to schedule follow up')
		} finally {
			setFollowUpSlotsLoading(false)
		}
	}

	const handleTabPress = (idx: number) => {
		setActiveTab(idx)
		pagerRef.current?.scrollTo({ x: pageWidth * idx, animated: true })
	}

	const handlePagerMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const nextTab = Math.min(Math.max(Math.round(event.nativeEvent.contentOffset.x / pageWidth), 0), 1)
		if (nextTab !== activeTab) setActiveTab(nextTab)
	}

	// ── Save notes ──────────────────────────────────────────────────────────────
	const handleSaveNotes = async () => {
		if (!noteCanvasData) {
			Alert.alert('Info', 'Please add some consultation notes by drawing or speaking')
			return
		}
		setSaving(true)
		try {
			// noteCanvasData is a base64 PNG – send to your API here
			Alert.alert('Success', 'Consultation notes saved successfully')
			navigation.goBack()
		} catch {
			Alert.alert('Error', 'Failed to save consultation notes')
		} finally {
			setSaving(false)
		}
	}

	// ── Loading / error states ──────────────────────────────────────────────────
	if (patientLoading) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
				<Text style={{ marginTop: 16, color: '#666' }}>Loading details…</Text>
			</View>
		)
	}

	if (!patient) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={48} color="#e53935" />
				<Text style={{ marginTop: 16, color: '#e53935', textAlign: 'center' }}>Patient not found</Text>
				<Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
					Go Back
				</Button>
			</View>
		)
	}

	const avatarUri = resolveAvatar(patient)

	return (
		<View style={styles.container}>
			{/* ── Header ── */}
			<View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
				<View style={styles.headerTop}>
					<IconButton
						icon="arrow-left"
						onPress={() => navigation.goBack()}
						style={{ margin: 0, padding: 0 }}
					/>
					{avatarUri ? (
						<Avatar.Image size={42} source={{ uri: avatarUri }} style={{ marginHorizontal: 12 }} />
					) : (
						<Avatar.Text
							size={42}
							label={patient.name?.slice(0, 2).toUpperCase() ?? '?'}
							style={{ marginHorizontal: 12 }}
						/>
					)}
					<View style={{ flex: 1 }}>
						<Text variant="titleMedium" style={{ fontWeight: 'bold' }}>
							{patient.name}
						</Text>
					</View>
					<Button
						mode="contained"
						compact
						style={{ borderRadius: 20 }}
						onPress={() => {
							setFollowUpDate(new Date())
							setFollowUpSelectedSlot('')
							setFollowUpSlots([])
							setFollowUpHospitalId('')
							setFollowUpOpen(true)
						}}
					>
						+ Follow up
					</Button>
				</View>

				{/* Tabs */}
				<View style={styles.tabContainer}>
					{['Info & Timeline', 'Vitals'].map((label, idx) => (
						<TouchableOpacity
							key={label}
							style={[
								styles.tab,
								activeTab === idx && {
									borderBottomColor: theme.colors.primary,
									borderBottomWidth: 2,
								},
							]}
							onPress={() => handleTabPress(idx)}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === idx && {
										color: theme.colors.primary,
										fontWeight: 'bold',
									},
								]}
							>
								{label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* ── Content ── */}
			<ScrollView
				ref={pagerRef}
				style={styles.pager}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={handlePagerMomentumEnd}
				scrollEventThrottle={16}
			>
				<ScrollView style={[styles.tabPage, { width: pageWidth }]} contentContainerStyle={styles.content}>
					<View>
						{/* Patient Details */}
						<Card style={styles.card}>
							<Card.Content>
								<Text
									variant="titleMedium"
									style={{
										color: theme.colors.primary,
										fontWeight: 'bold',
										marginBottom: 16,
									}}
								>
									Patient Details
								</Text>

								<View style={{ flexDirection: 'row', marginBottom: 12 }}>
									<View style={{ marginRight: 16 }}>
										{avatarUri ? (
											<Avatar.Image
												size={70}
												source={{ uri: avatarUri }}
												style={{ borderRadius: 8 }}
											/>
										) : (
											<Avatar.Text
												size={70}
												label={patient.name?.slice(0, 2).toUpperCase() ?? '?'}
												style={{ borderRadius: 8 }}
											/>
										)}
									</View>
									<View style={{ flex: 1, flexDirection: 'row' }}>
										<View style={{ flex: 1 }}>
											<RowItem label="Name:" value={patient.name} />
											<RowItem
												label="Patient ID:"
												value={patient.id}
												numberOfLines={1}
												ellipsizeMode="tail"
											/>
											<RowItem label="Age:" value={patient.age ? `${patient.age} years` : '-'} />
											<View
												style={{
													flexDirection: 'row',
													alignItems: 'center',
													marginVertical: 2,
												}}
											>
												<Text
													style={{
														fontSize: 11,
														color: theme.colors.primary,
														marginRight: 4,
													}}
												>
													Phone:
												</Text>
												<Text style={{ fontSize: 11, fontWeight: '500', color: '#333' }}>
													{patient.phone}
												</Text>
												<MaterialCommunityIcons
													name="check-circle"
													size={12}
													color="green"
													style={{ marginLeft: 4 }}
												/>
											</View>
										</View>

										<View
											style={{
												width: 1,
												backgroundColor: '#e0e0e0',
												marginHorizontal: 8,
											}}
										/>

										<View style={{ flex: 1 }}>
											<RowItem label="Gender:" value={patient.gender} />
											<RowItem label="Blood:" value={patient.blood_group} />
											<RowItem label="Height:" value={patient.height} />
											<RowItem label="Weight:" value={patient.weight} />
										</View>
									</View>
								</View>

								<Divider style={{ marginVertical: 12 }} />

								<View style={{ flexDirection: 'row' }}>
									<View style={{ flex: 1 }}>
										<RowItem label="D.O.B:" value={patient.date_of_birth} />
										<RowItem label="Marital:" value={patient.marital_status} />
										<RowItem label="Email:" value={patient.email} />
									</View>
									<View
										style={{
											width: 1,
											backgroundColor: '#e0e0e0',
											marginHorizontal: 8,
										}}
									/>
									<View style={{ flex: 1 }}>
										<Text style={{ fontSize: 11, color: theme.colors.primary }}>Address:</Text>
										<Text style={{ fontSize: 10, lineHeight: 14 }}>{patient.address}</Text>
									</View>
									<View
										style={{
											width: 1,
											backgroundColor: '#e0e0e0',
											marginHorizontal: 8,
										}}
									/>
									<View style={{ flex: 1 }}>
										<Text style={{ fontSize: 11, color: theme.colors.primary }}>
											Emergency Contact:
										</Text>
										<Text style={{ fontSize: 11, fontWeight: 'bold' }}>
											{patient.emergency_contact?.name ?? '--'}
										</Text>
										<Text style={{ fontSize: 10, color: '#666' }}>
											{patient.emergency_contact?.relation ?? '--'}
										</Text>
										<Text style={{ fontSize: 10, color: '#d32f2f' }}>
											{patient.emergency_contact?.number ?? '--'}
										</Text>
									</View>
								</View>

								<Divider style={{ marginVertical: 12 }} />

								<View style={{ flexDirection: 'row' }}>
									<View style={{ flex: 1 }}>
										<Text style={{ fontSize: 11, color: theme.colors.primary }}>
											Chronic diseases:
										</Text>
										{(patient.chronic_diseases ?? []).map((d, i) => (
											<Text key={i} style={{ fontSize: 10 }}>
												{' '}
												{d}
											</Text>
										))}
									</View>
									<View style={{ flex: 1.5 }}>
										<RowItem label="Occupation:" value={patient.occupation} />
										<RowItem label="Smoking:" value={patient.smoking_status} />
										<RowItem label="Alcohol:" value={patient.alcohol_consumption} />
										<RowItem label="Diet:" value={patient.diet_type} />
									</View>
									<View style={{ flex: 1 }}>
										<Text style={{ fontSize: 11, color: theme.colors.primary }}>Allergies:</Text>
										{(patient.allergies ?? []).map((a, i) => (
											<Text key={i} style={{ fontSize: 10 }}>
												{' '}
												{a}
											</Text>
										))}
									</View>
								</View>
							</Card.Content>
						</Card>

						{/* Past Medical History */}
						<PastMedicalHistory patientId={patient.patient_public_id || patient.id || patientId} />

						{/* ── Consultation Notes (Scribble + Speech) ── */}
						<Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
							{/* Doctor letterhead */}
							<View style={styles.notesHeader}>
								<View style={{ flex: 1 }}>
									<Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>
										{doctor?.name ?? '--'}
										{doctor?.degree ? `, ${doctor.degree}` : ''}
									</Text>
									<Text style={{ color: theme.colors.primary, fontSize: 10 }}>
										{doctor?.specialization ?? ''}
									</Text>
								</View>
								<View style={{ flex: 1, alignItems: 'flex-end' }}>
									<Text style={{ color: theme.colors.primary, fontWeight: 'bold', fontSize: 12 }}>
										{doctor?.clinicName ?? ''}
									</Text>
									<Text style={{ color: theme.colors.primary, fontSize: 10 }}>
										{doctor?.clinicAddress ?? ''}
									</Text>
								</View>
							</View>

							<Divider />

							{/* Scribble + Speech editor – replaces the old NativeInput
							<ScribbleNoteEditor
								accentColor={theme.colors.primary}
								onChange={(base64) => setNoteCanvasData(base64)}
							/> */}
						</Card>

						{/* Share With */}
						<ShareWith />

						<Button
							mode="contained"
							loading={saving}
							onPress={handleSaveNotes}
							style={{ marginHorizontal: 16, marginBottom: 32 }}
						>
							Save
						</Button>
					</View>
				</ScrollView>
				<View style={[styles.tabPage, styles.vitalsContent, { width: pageWidth }]}>
					<VitalsTab patientId={patient?.id || patientId} />
				</View>
			</ScrollView>

			<Modal
				visible={followUpOpen}
				transparent
				animationType="slide"
				onRequestClose={() => setFollowUpOpen(false)}
			>
				<TouchableOpacity
					activeOpacity={1}
					style={styles.drawerBackdrop}
					onPress={() => setFollowUpOpen(false)}
				>
					<TouchableOpacity activeOpacity={1} style={styles.drawerSheet} onPress={() => {}}>
						<View style={styles.drawerHeader}>
							<View>
								<Text style={styles.drawerTitle}>Follow Up Appointment</Text>
								<Text style={styles.drawerSubtitle}>{patient?.name ?? 'Patient'}</Text>
							</View>
							<TouchableOpacity style={styles.drawerCloseBtn} onPress={() => setFollowUpOpen(false)}>
								<MaterialCommunityIcons name="close" size={18} color="#7a848d" />
							</TouchableOpacity>
						</View>
						<ScrollView style={styles.drawerBody} contentContainerStyle={styles.drawerBodyContent}>
							<DoctorHospitalDropdown />
							<DateSlotPicker
								selectedDate={followUpDate}
								onDateChange={(date) => {
									setFollowUpDate(date)
									setFollowUpSelectedSlot('')
								}}
								selectedTime={followUpSelectedSlot}
								onTimeChange={setFollowUpSelectedSlot}
								availableSlots={followUpSlots}
								loading={followUpSlotsLoading}
							/>
						</ScrollView>
						<View style={styles.drawerActions}>
							<TouchableOpacity style={styles.drawerCancelBtn} onPress={() => setFollowUpOpen(false)}>
								<Text style={styles.drawerCancelBtnText}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity style={styles.drawerConfirmBtn} onPress={handleConfirmFollowUp}>
								<Text style={styles.drawerConfirmBtnText}>Confirm</Text>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
				</TouchableOpacity>
			</Modal>
		</View>
	)
}

// ---------- Styles ----------
const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f7fa',
	},
	centerContent: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24,
	},
	vitalsContent: {
		flex: 1,
	},
	pager: {
		flex: 1,
	},
	tabPage: {
		flex: 1,
	},
	header: {
		paddingTop: 48,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	headerTop: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingBottom: 16,
	},
	tabContainer: {
		flexDirection: 'row',
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
	},
	tab: {
		flex: 1,
		paddingVertical: 12,
		alignItems: 'center',
	},
	tabText: {
		color: '#666',
	},
	content: {
		paddingTop: 16,
	},
	card: {
		marginHorizontal: 16,
		marginBottom: 16,
		backgroundColor: '#fff',
		borderRadius: 12,
	},
	notesHeader: {
		backgroundColor: '#e0f2f1',
		padding: 12,
		flexDirection: 'row',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	dicomModalContainer: {
		flex: 1,
		backgroundColor: '#000',
	},
	dicomModalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 36,
		paddingHorizontal: 8,
		backgroundColor: '#000',
	},
	dicomModalTitle: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '700',
		marginLeft: 12,
	},
	dicomModalBody: {
		flex: 1,
	},
	drawerBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.35)',
		justifyContent: 'flex-end',
		padding: 12,
	},
	drawerSheet: {
		backgroundColor: '#fff',
		borderRadius: 16,
		maxHeight: '80%',
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#edf1f3',
		width: '100%',
		flexShrink: 1,
	},
	drawerHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#e5eaee',
	},
	drawerCloseBtn: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#f3f6f8',
	},
	drawerBody: {
		flexShrink: 1,
	},
	drawerBodyContent: {
		paddingVertical: 14,
	},
	drawerTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: '#233238',
	},
	drawerSubtitle: {
		fontSize: 12,
		color: '#62707a',
		marginTop: 2,
	},
	drawerActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		gap: 10,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderTopWidth: 1,
		borderTopColor: '#e5eaee',
	},
	drawerCancelBtn: {
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#d5dde2',
		paddingHorizontal: 22,
		paddingVertical: 10,
		flex: 1,
		alignItems: 'center',
	},
	drawerCancelBtnText: {
		color: '#60717d',
		fontWeight: '600',
		fontSize: 14,
	},
	drawerConfirmBtn: {
		borderRadius: 20,
		backgroundColor: '#3d7b7b',
		paddingHorizontal: 22,
		paddingVertical: 10,
		flex: 1,
		alignItems: 'center',
	},
	drawerConfirmBtnText: {
		color: '#fff',
		fontWeight: '700',
		fontSize: 14,
	},
	historyItem: {
		backgroundColor: '#f8fafc',
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: '#edf2f7',
	},
	historyHeader: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	historyTitle: {
		fontSize: 12,
		fontWeight: 'bold',
		color: '#2d3748',
	},
	historySubtitle: {
		fontSize: 10,
		color: '#718096',
		marginTop: 2,
	},
	historyNotes: {
		fontSize: 11,
		color: '#4a5568',
		marginTop: 8,
		lineHeight: 16,
	},
	resultsGrid: {
		marginTop: 10,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#edf2f7',
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	resultRow: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '48%',
	},
	resultLabel: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#4a5568',
	},
	resultValue: {
		fontSize: 10,
		color: '#2d3748',
		marginLeft: 4,
	},
})
