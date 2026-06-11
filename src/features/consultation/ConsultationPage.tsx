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
	Image,
} from 'react-native'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useTheme, Card, Avatar, Button, IconButton, Divider, Text, Chip } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { SvgProps } from 'react-native-svg'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import DicomViewer from './components/DicomViewer'
import VitalsTab from './components/VitalsTab'
import ScribbleNoteEditor, { TextBlock } from './components/ScribbleNoteEditor'
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

// Helper: RowItem
function RowItem({ label, value, numberOfLines, ellipsizeMode }: any) {
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

// ---------- PastMedicalHistory (unchanged) ----------
function PastMedicalHistory() {
	const theme = useTheme()
	const [activeTab, setActiveTab] = useState('Laboratory')
	const [dicomBase64, setDicomBase64] = useState<string | null>(null)
	const [dicomLoading, setDicomLoading] = useState(false)
	const [dicomError, setDicomError] = useState<string | null>(null)
	const [isDicomExpanded, setIsDicomExpanded] = useState(false)
	const tabs: TabItem[] = [
		{ id: 'Prescription', Icon: Prescription },
		{ id: 'Laboratory', Icon: LaboratoryIcon },
		{ id: 'Radiology', Icon: RadiologyTabIcon },
		{ id: 'Ancillary', Icon: AncillaryIcon },
	]

	useEffect(() => {
		if (activeTab !== 'Radiology' || dicomBase64 || dicomLoading) return
		const loadDicom = async () => {
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
		loadDicom()
	}, [activeTab])

	return (
		<Card style={[styles.card, { marginTop: 0 }]}>
			<Card.Content>
				<Text
					variant="titleMedium"
					style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}
				>
					Past medical history
				</Text>
				<View style={styles.tabRow}>
					{tabs.map((tab) => {
						const isActive = activeTab === tab.id
						const TabIcon = tab.Icon
						return (
							<TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabItem}>
								<TabIcon width={42} height={42} />
								<Text style={[styles.tabLabel, { color: isActive ? theme.colors.primary : '#999' }]}>
									{tab.id}
								</Text>
								{isActive && (
									<View
										style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary }]}
									/>
								)}
							</TouchableOpacity>
						)
					})}
				</View>
				<View style={{ marginTop: 16 }}>
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
				{activeTab === 'Radiology' ? (
					<View style={{ marginTop: 16 }}>
						{dicomLoading ? (
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
							<>
								<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
									<MaterialCommunityIcons name="radioactive" size={16} color={theme.colors.primary} />
									<Text
										style={{
											fontSize: 12,
											color: theme.colors.primary,
											fontWeight: 'bold',
											marginLeft: 6,
										}}
									>
										Radiology Scan DICOM Viewer
									</Text>
								</View>
								<View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 }}>
									<Button
										mode="outlined"
										compact
										icon="arrow-expand"
										onPress={() => setIsDicomExpanded(true)}
									>
										Expand view
									</Button>
								</View>
								<DicomViewer base64Data={dicomBase64} />
								<Text style={{ fontSize: 10, color: '#999', marginTop: 8, textAlign: 'center' }}>
									Drag to adjust Window/Level · Pinch or +/- to zoom · ⊙ resets view · ☀ inverts
								</Text>
							</>
						)}
					</View>
				) : (
					<View style={{ alignItems: 'center', paddingVertical: 24 }}>
						<MaterialCommunityIcons name="emoticon-sad-outline" size={48} color="#ccc" />
						<Text style={{ color: '#666', marginTop: 8, fontWeight: '500' }}>
							No past {activeTab.toLowerCase()} history!
						</Text>
					</View>
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

// ---------- ShareWith (unchanged) ----------
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
				<View style={styles.tabRow}>
					{tabs.map((tab) => {
						const isActive = activeTab === tab.id
						const TabIcon = tab.Icon
						return (
							<TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} style={styles.tabItem}>
								<TabIcon width={42} height={42} />
								<Text style={[styles.tabLabel, { color: isActive ? theme.colors.primary : '#999' }]}>
									{tab.id}
								</Text>
								{isActive && (
									<View
										style={[styles.activeTabIndicator, { backgroundColor: theme.colors.primary }]}
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
						<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
							<View style={{ flexDirection: 'row', alignItems: 'center' }}>
								<MaterialCommunityIcons name="phone" size={12} color={theme.colors.primary} />
								<Text
									style={{ fontSize: 11, color: theme.colors.primary, marginLeft: 2, marginRight: 8 }}
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

// ---------- Compact note section for combined card ----------
interface CompactNoteSectionProps {
	title: string
	icon: React.ReactNode
	accentColor: string
	onDrawingInteraction?: (active: boolean) => void
	onChange?: (base64: string) => void
	onTextChange?: (blocks: TextBlock[]) => void
}

function CompactNoteSection({
	title,
	icon,
	accentColor,
	onDrawingInteraction,
	onChange,
	onTextChange,
}: CompactNoteSectionProps) {
	return (
		<View style={styles.compactNoteSection}>
			<View style={styles.compactNoteHeader}>
				{icon}
				<Text style={[styles.compactNoteTitle, { color: accentColor }]}>{title}</Text>
			</View>
			<ScribbleNoteEditor
				accentColor={accentColor}
				onChange={onChange}
				onTextChange={onTextChange}
				onInteractionChange={onDrawingInteraction}
			/>
		</View>
	)
}

// ---------- Prescription Preview Modal ----------
interface PrescriptionPreviewProps {
	visible: boolean
	onClose: () => void
	patient: PatientDetails | null
	doctor: DocterDetails | null
	consultationData: any
	pharmacyData: any
	laboratoryData: any
	radiologyData: any
}

function PrescriptionPreview({
	visible,
	onClose,
	patient,
	doctor,
	consultationData,
	pharmacyData,
	laboratoryData,
	radiologyData,
}: PrescriptionPreviewProps) {
	const theme = useTheme()
	const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

	const renderContentSection = (title: string, data: { drawing: string; blocks: TextBlock[] }, iconName: string) => {
		const hasText = data.blocks.length > 0
		const hasDrawing = !!data.drawing

		if (!hasText && !hasDrawing) return null

		return (
			<View style={styles.previewSection}>
				<View style={styles.previewSectionHeader}>
					<MaterialCommunityIcons name={iconName as any} size={20} color={theme.colors.primary} />
					<Text style={[styles.previewSectionTitle, { color: theme.colors.primary }]}>{title}</Text>
				</View>
				{hasText && (
					<View style={styles.previewTextBlock}>
						{data.blocks.map((block, idx) => (
							<Text key={idx} style={styles.previewText}>
								• {block.text}
							</Text>
						))}
					</View>
				)}
				{hasDrawing && (
					<View style={styles.previewDrawingContainer}>
						<Image
							source={{ uri: `data:image/png;base64,${data.drawing}` }}
							style={styles.previewDrawing}
							resizeMode="contain"
						/>
					</View>
				)}
			</View>
		)
	}

	return (
		<Modal visible={visible} animationType="slide" onRequestClose={onClose}>
			<View style={styles.previewModalContainer}>
				<View style={styles.previewHeader}>
					<IconButton icon="close" onPress={onClose} />
					<Text style={styles.previewHeaderTitle}>Prescription Preview</Text>
					<View style={{ width: 40 }} />
				</View>
				<ScrollView style={styles.previewScrollView} contentContainerStyle={styles.previewContent}>
					{/* Hospital/Doctor Header */}
					<View style={styles.previewDoctorHeader}>
						<Text style={styles.previewDoctorName}>{doctor?.name || 'Dr. Name'}</Text>
						<Text style={styles.previewDoctorDegree}>{doctor?.degree || ''}</Text>
						<Text style={styles.previewDoctorSpecialty}>{doctor?.specialization || ''}</Text>
						<Text style={styles.previewClinicName}>{doctor?.clinicName || ''}</Text>
						<Text style={styles.previewClinicAddress}>{doctor?.clinicAddress || ''}</Text>
					</View>

					<Divider style={styles.previewDivider} />

					{/* Patient Info */}
					<View style={styles.previewPatientRow}>
						<View>
							<Text style={styles.previewLabel}>Patient Name:</Text>
							<Text style={styles.previewValue}>{patient?.name || '--'}</Text>
						</View>
						<View>
							<Text style={styles.previewLabel}>Age/Gender:</Text>
							<Text style={styles.previewValue}>
								{patient?.age || '--'} yrs / {patient?.gender || '--'}
							</Text>
						</View>
						<View>
							<Text style={styles.previewLabel}>Date:</Text>
							<Text style={styles.previewValue}>{currentDate}</Text>
						</View>
					</View>

					{/* Notes Sections */}
					{renderContentSection('Consultation Notes', consultationData, 'note-text')}
					{renderContentSection('Pharmacy', pharmacyData, 'pill')}
					{renderContentSection('Laboratory', laboratoryData, 'test-tube')}
					{renderContentSection('Radiology', radiologyData, 'radioactive')}

					{/* Footer */}
					<View style={styles.previewFooter}>
						<Text style={styles.previewFooterText}>
							Digitally Signed by Dr. {doctor?.name?.split(' ')[0] || ''}
						</Text>
						<Text style={styles.previewFooterStamp}>Authorized Signature</Text>
					</View>
				</ScrollView>
				<TouchableOpacity style={styles.previewCloseButton} onPress={onClose}>
					<Text style={styles.previewCloseButtonText}>Close Preview</Text>
				</TouchableOpacity>
			</View>
		</Modal>
	)
}

// ─── Main ConsultationPage ───────────────────────────────────────────────────
export default function ConsultationPage() {
	const theme = useTheme()
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { width: pageWidth } = useWindowDimensions()
	const pagerRef = useRef<ScrollView>(null)
	const contentScrollRef = useRef<ScrollView>(null)
	const { selectedHospitalId } = useAuth() as any

	const [patient, setPatient] = useState<PatientDetails | null>(null)
	const [doctor, setDoctor] = useState<DocterDetails | null>(null)
	const [appointment, setAppointment] = useState<any>(null)
	const [patientLoading, setPatientLoading] = useState(false)
	const [activeTab, setActiveTab] = useState(0)
	const [previewVisible, setPreviewVisible] = useState(false)

	// Data for the four note editors
	const [consultationData, setConsultationData] = useState({ drawing: '', blocks: [] as TextBlock[] })
	const [pharmacyData, setPharmacyData] = useState({ drawing: '', blocks: [] as TextBlock[] })
	const [laboratoryData, setLaboratoryData] = useState({ drawing: '', blocks: [] as TextBlock[] })
	const [radiologyData, setRadiologyData] = useState({ drawing: '', blocks: [] as TextBlock[] })

	const [saving, setSaving] = useState(false)
	const [followUpOpen, setFollowUpOpen] = useState(false)
	const [followUpDate, setFollowUpDate] = useState<Date>(new Date())
	const [followUpSelectedSlot, setFollowUpSelectedSlot] = useState('')
	const [followUpSlots, setFollowUpSlots] = useState<any[]>([])
	const [followUpSlotsLoading, setFollowUpSlotsLoading] = useState(false)
	const [followUpHospitalId, setFollowUpHospitalId] = useState<string>('')

	// Lock parent scroll when any editor is drawing
	const [canvasInteracting, setCanvasInteracting] = useState(false)
	const activeDrawingsRef = useRef<Set<string>>(new Set())

	const handleDrawingInteraction = (id: string, active: boolean) => {
		if (active) {
			activeDrawingsRef.current.add(id)
		} else {
			activeDrawingsRef.current.delete(id)
		}
		setCanvasInteracting(activeDrawingsRef.current.size > 0)
	}

	const params = route.params as any

	useEffect(() => {
		if (pageWidth <= 0) return
		pagerRef.current?.scrollTo({ x: pageWidth * activeTab, animated: false })
	}, [pageWidth, activeTab])

	const appointmentId = params?.appointmentId ?? params?.appointment_id ?? params?.id ?? ''
	const patientId = params?.patient_id ?? params?.patientId ?? params?.patient?.id ?? ''
	const doctorID = params?.doctor_id ?? params?.doctorID ?? params?.doctor?.id ?? ''

	useEffect(() => {
		const doctorFromParams = params?.doctor
		const hospitalFromParams = params?.appointment?.hospital || params?.hospital
		if (doctorFromParams) {
			setDoctor({
				name: doctorFromParams.name,
				degree: '',
				specialization: '',
				clinicName: hospitalFromParams?.name || '',
				clinicAddress: hospitalFromParams?.address || '',
			})
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

	useEffect(() => {
		const fetchAppointmentDetails = async () => {
			if (appointmentId && !appointment) {
				try {
					const response = (await ApiService.get(API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId))) as any
					const appointmentData = response?.data?.data || response?.data || response
					setAppointment(appointmentData)
					if (!patient && appointmentData?.patient?.id) fetchPatientData(appointmentData.patient.id)
					if (!doctor && appointmentData?.doctor) {
						setDoctor({
							name: appointmentData.doctor.name,
							degree: '',
							specialization: '',
							clinicName: appointmentData.hospital?.name,
							clinicAddress: appointmentData.hospital?.address,
						})
					}
				} catch (err) {
					console.error('Failed to fetch appointment details:', err)
				}
			}
		}
		fetchAppointmentDetails()
	}, [appointmentId])

	useEffect(() => {
		if (patientId && !patient) fetchPatientData(patientId)
	}, [patientId])

	// Follow‑up logic (same as before)
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
				if (!followUpHospitalId && hospitals.length > 0) setFollowUpHospitalId(hospitals[0]?.hospital?.id || '')
			} catch {}
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
			Alert.alert('Select time', 'Please select a slot.')
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
			Alert.alert('Error', 'Missing hospital or date.')
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
				Alert.alert('Success', res.message || 'Follow up scheduled')
				setFollowUpOpen(false)
			} else Alert.alert('Error', res?.message || 'Unable to schedule follow up')
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

	const handleSaveNotes = async () => {
		const hasAnyData =
			consultationData.drawing ||
			consultationData.blocks.length > 0 ||
			pharmacyData.drawing ||
			pharmacyData.blocks.length > 0 ||
			laboratoryData.drawing ||
			laboratoryData.blocks.length > 0 ||
			radiologyData.drawing ||
			radiologyData.blocks.length > 0
		if (!hasAnyData) {
			Alert.alert('Info', 'Please add at least one note before saving.')
			return
		}
		setSaving(true)
		try {
			// TODO: Replace with actual API call, sending all four note objects
			const payload = {
				consultation: consultationData,
				pharmacy: pharmacyData,
				laboratory: laboratoryData,
				radiology: radiologyData,
			}
			console.log('Saving notes:', payload)
			Alert.alert('Success', 'Consultation notes saved successfully')
			navigation.goBack()
		} catch {
			Alert.alert('Error', 'Failed to save consultation notes')
		} finally {
			setSaving(false)
		}
	}

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
			{/* Header */}
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
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text variant="bodySmall" style={{ color: '#666', fontSize: 11 }}>
								{patient.age} yrs / {patient.gender} |{' '}
							</Text>
							<MaterialCommunityIcons
								name="phone"
								size={10}
								color="#666"
								style={{ marginHorizontal: 2 }}
							/>
							<Text variant="bodySmall" style={{ color: '#666', fontSize: 11 }}>
								{patient.phone}
							</Text>
						</View>
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
				<View style={styles.tabContainer}>
					{['Info & Timeline', 'Vitals'].map((label, idx) => (
						<TouchableOpacity
							key={label}
							style={[
								styles.tab,
								activeTab === idx && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
							]}
							onPress={() => handleTabPress(idx)}
						>
							<Text
								style={[
									styles.tabText,
									activeTab === idx && { color: theme.colors.primary, fontWeight: 'bold' },
								]}
							>
								{label}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Horizontal pager – scroll locked while any editor is drawing */}
			<ScrollView
				ref={pagerRef}
				style={styles.pager}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				scrollEnabled={!canvasInteracting}
				onMomentumScrollEnd={handlePagerMomentumEnd}
				scrollEventThrottle={16}
			>
				{/* Tab 0: Info & Timeline */}
				<ScrollView
					ref={contentScrollRef}
					style={[styles.tabPage, { width: pageWidth }]}
					contentContainerStyle={styles.content}
					scrollEnabled={!canvasInteracting}
				>
					{/* Patient Details Card */}
					<Card style={styles.card}>
						<Card.Content>
							<Text
								variant="titleMedium"
								style={{ color: theme.colors.primary, fontWeight: 'bold', marginBottom: 16 }}
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
										<View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
											<Text style={{ fontSize: 11, color: theme.colors.primary, marginRight: 4 }}>
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
									<View style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }} />
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
								<View style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }} />
								<View style={{ flex: 1 }}>
									<Text style={{ fontSize: 11, color: theme.colors.primary }}>Address:</Text>
									<Text style={{ fontSize: 10, lineHeight: 14 }}>{patient.address}</Text>
								</View>
								<View style={{ width: 1, backgroundColor: '#e0e0e0', marginHorizontal: 8 }} />
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
									<Text style={{ fontSize: 11, color: theme.colors.primary }}>Chronic diseases:</Text>
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

					<PastMedicalHistory />

					{/* Doctor header card */}
					<Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
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
					</Card>

					{/* Combined Notes Card - All four sections in one card with reduced height */}
					<Card style={styles.combinedNotesCard}>
						<Card.Content style={styles.combinedNotesContent}>
							<View style={styles.combinedNotesHeader}>
								<MaterialCommunityIcons name="note-edit" size={22} color={theme.colors.primary} />
								<Text
									variant="titleMedium"
									style={{ color: theme.colors.primary, fontWeight: 'bold', marginLeft: 8 }}
								>
									Clinical Notes
								</Text>
							</View>
							<Divider style={styles.combinedDivider} />

							<CompactNoteSection
								title="Consultation"
								icon={
									<MaterialCommunityIcons name="note-text" size={20} color={theme.colors.primary} />
								}
								accentColor={theme.colors.primary}
								onDrawingInteraction={(active) => handleDrawingInteraction('consultation', active)}
								onChange={(base64) => setConsultationData((prev) => ({ ...prev, drawing: base64 }))}
								onTextChange={(blocks) => setConsultationData((prev) => ({ ...prev, blocks }))}
							/>

							<Divider style={styles.compactDivider} />

							<CompactNoteSection
								title="Pharmacy"
								icon={<MaterialCommunityIcons name="pill" size={20} color={theme.colors.primary} />}
								accentColor={theme.colors.primary}
								onDrawingInteraction={(active) => handleDrawingInteraction('pharmacy', active)}
								onChange={(base64) => setPharmacyData((prev) => ({ ...prev, drawing: base64 }))}
								onTextChange={(blocks) => setPharmacyData((prev) => ({ ...prev, blocks }))}
							/>

							<Divider style={styles.compactDivider} />

							<CompactNoteSection
								title="Laboratory"
								icon={
									<MaterialCommunityIcons name="test-tube" size={20} color={theme.colors.primary} />
								}
								accentColor={theme.colors.primary}
								onDrawingInteraction={(active) => handleDrawingInteraction('laboratory', active)}
								onChange={(base64) => setLaboratoryData((prev) => ({ ...prev, drawing: base64 }))}
								onTextChange={(blocks) => setLaboratoryData((prev) => ({ ...prev, blocks }))}
							/>

							<Divider style={styles.compactDivider} />

							<CompactNoteSection
								title="Radiology"
								icon={
									<MaterialCommunityIcons name="radioactive" size={20} color={theme.colors.primary} />
								}
								accentColor={theme.colors.primary}
								onDrawingInteraction={(active) => handleDrawingInteraction('radiology', active)}
								onChange={(base64) => setRadiologyData((prev) => ({ ...prev, drawing: base64 }))}
								onTextChange={(blocks) => setRadiologyData((prev) => ({ ...prev, blocks }))}
							/>
						</Card.Content>
					</Card>
<View style={styles.actionButtonsRow}>
						<Button
							mode="outlined"
							icon="eye"
							onPress={() => setPreviewVisible(true)}
							style={styles.previewButton}
						>
							Preview Prescription
						</Button>
						<Button mode="contained" loading={saving} onPress={handleSaveNotes} style={styles.saveButton}>
							Save
						</Button>
					</View>
					<ShareWith />

					
				</ScrollView>

				{/* Tab 1: Vitals */}
				<View style={[styles.tabPage, styles.vitalsContent, { width: pageWidth }]}>
					<VitalsTab patientId={patient?.id || patientId} />
				</View>
			</ScrollView>

			{/* Prescription Preview Modal */}
			<PrescriptionPreview
				visible={previewVisible}
				onClose={() => setPreviewVisible(false)}
				patient={patient}
				doctor={doctor}
				consultationData={consultationData}
				pharmacyData={pharmacyData}
				laboratoryData={laboratoryData}
				radiologyData={radiologyData}
			/>

			{/* Follow‑up Modal */}
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

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f5f7fa' },
	centerContent: { justifyContent: 'center', alignItems: 'center', padding: 24 },
	vitalsContent: { flex: 1 },
	pager: { flex: 1 },
	tabPage: { flex: 1 },
	header: {
		paddingTop: 48,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	headerTop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 16 },
	tabContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
	tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
	tabText: { color: '#666' },
	content: { paddingTop: 16, paddingBottom: 40 },
	card: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#fff', borderRadius: 12 },
	notesHeader: {
		backgroundColor: '#e0f2f1',
		padding: 12,
		flexDirection: 'row',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
	},
	// Combined notes card styles
	combinedNotesCard: {
		marginHorizontal: 16,
		marginBottom: 16,
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
	},
	combinedNotesContent: { paddingVertical: 8, paddingHorizontal: 12 },
	combinedNotesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
	combinedDivider: { marginBottom: 8 },
	compactDivider: { marginVertical: 8 },
	// Compact note section styles (reduced height)
	compactNoteSection: { marginVertical: 4 },
	compactNoteHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
	compactNoteTitle: { fontSize: 14, fontWeight: '600', marginLeft: 8 },
	compactEditor: { minHeight: 100, maxHeight: 140 },
	// Action buttons row
	actionButtonsRow: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 32, gap: 12 },
	previewButton: { flex: 1, borderRadius: 8 },
	saveButton: { flex: 1, borderRadius: 8 },
	// Preview Modal Styles
	previewModalContainer: { flex: 1, backgroundColor: '#fff' },
	previewHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 48,
		paddingHorizontal: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	previewHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
	previewScrollView: { flex: 1 },
	previewContent: { padding: 20, paddingBottom: 40 },
	previewDoctorHeader: { alignItems: 'center', marginBottom: 20 },
	previewDoctorName: { fontSize: 20, fontWeight: 'bold', color: '#1a5f5f' },
	previewDoctorDegree: { fontSize: 14, color: '#666', marginTop: 2 },
	previewDoctorSpecialty: { fontSize: 14, color: '#666' },
	previewClinicName: { fontSize: 14, fontWeight: '500', color: '#444', marginTop: 8 },
	previewClinicAddress: { fontSize: 12, color: '#777', textAlign: 'center' },
	previewDivider: { marginVertical: 16 },
	previewPatientRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 20,
		backgroundColor: '#f5f5f5',
		padding: 12,
		borderRadius: 8,
	},
	previewLabel: { fontSize: 12, color: '#888', marginBottom: 2 },
	previewValue: { fontSize: 14, fontWeight: '500', color: '#333' },
	previewSection: { marginBottom: 20, borderLeftWidth: 3, borderLeftColor: '#3d7b7b', paddingLeft: 12 },
	previewSectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
	previewSectionTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
	previewTextBlock: { marginLeft: 8 },
	previewText: { fontSize: 14, color: '#444', marginBottom: 4, lineHeight: 20 },
	previewDrawingContainer: {
		marginTop: 8,
		backgroundColor: '#fafafa',
		borderRadius: 8,
		padding: 8,
		alignItems: 'center',
	},
	previewDrawing: { width: '100%', height: 150, borderRadius: 4 },
	previewFooter: { marginTop: 30, borderTopWidth: 1, borderTopColor: '#ddd', paddingTop: 16, alignItems: 'center' },
	previewFooterText: { fontSize: 12, color: '#888', fontStyle: 'italic' },
	previewFooterStamp: { fontSize: 12, color: '#3d7b7b', marginTop: 8, fontWeight: '500' },
	previewCloseButton: { backgroundColor: '#3d7b7b', padding: 14, margin: 16, borderRadius: 8, alignItems: 'center' },
	previewCloseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
	// Modal styles
	dicomModalContainer: { flex: 1, backgroundColor: '#000' },
	dicomModalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingTop: 36,
		paddingHorizontal: 8,
		backgroundColor: '#000',
	},
	dicomModalTitle: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 12 },
	dicomModalBody: { flex: 1 },
	drawerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end', padding: 12 },
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
	drawerBody: { flexShrink: 1 },
	drawerBodyContent: { paddingVertical: 14 },
	drawerTitle: { fontSize: 16, fontWeight: '700', color: '#233238' },
	drawerSubtitle: { fontSize: 12, color: '#62707a', marginTop: 2 },
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
	drawerCancelBtnText: { color: '#60717d', fontWeight: '600', fontSize: 14 },
	drawerConfirmBtn: {
		borderRadius: 20,
		backgroundColor: '#3d7b7b',
		paddingHorizontal: 22,
		paddingVertical: 10,
		flex: 1,
		alignItems: 'center',
	},
	drawerConfirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

	tabRow: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		borderBottomWidth: 1,
		borderBottomColor: '#eee',
		paddingBottom: 8,
		marginBottom: 16,
	},
	tabItem: { alignItems: 'center', flex: 1 },
	tabLabel: { fontSize: 10, marginTop: 4, fontWeight: 'normal' },
	activeTabIndicator: { position: 'absolute', bottom: -10, height: 3, width: '100%' },
})
