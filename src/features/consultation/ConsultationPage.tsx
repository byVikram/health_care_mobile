import React, { useEffect, useState, useRef } from 'react'
import {
	View,
	StyleSheet,
	ScrollView,
	TouchableOpacity,
	Alert,
	ActivityIndicator,
	TextInput as NativeInput,
	Modal,
	Platform,
} from 'react-native'
import { useTheme, Card, Avatar, Button, IconButton, Divider, Text, Snackbar } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { SvgProps } from 'react-native-svg'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
// import * as SpeechRecognition from 'expo-speech-recognition';
// import Voice from '@react-native-voice/voice'
import { Audio } from 'expo-av'
import DicomViewer from './components/DicomViewer'
import VitalsTab from './components/VitalsTab'
import Prescription from '../../assets/icons/consultation/prescription.svg'
import LaboratoryIcon from '../../assets/icons/consultation/lab.svg'
import RadiologyTabIcon from '../../assets/icons/consultation/radiology.svg'
import AncillaryIcon from '../../assets/icons/consultation/ancillary.svg'
import { patientService, PatientDetails, doctorService, DocterDetails } from './ConsultationService'
import ApiService from '../../services/apiService'
import { API_ENDPOINTS } from '../../constants/apiUrls'

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
								<Text
									style={{
										color: '#e53935',
										marginTop: 8,
										fontSize: 12,
										textAlign: 'center',
									}}
								>
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
								<Text
									style={{
										fontSize: 10,
										color: '#999',
										marginTop: 8,
										textAlign: 'center',
									}}
								>
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
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 ,}}>
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
					
					{/* <Button
						mode="outlined"
						style={{ flex: 1, borderRadius: 8 }}
						contentStyle={{ height: 32 }}
						labelStyle={{ fontSize: 10 }}
					>
						Locality ▼
					</Button> */}
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

	const [patient, setPatient] = useState<PatientDetails | null>(null)
	const [doctor, setDoctor] = useState<DocterDetails | null>(null)
	const [appointment, setAppointment] = useState<any>(null)
	const [patientLoading, setPatientLoading] = useState(false)
	const [doctorLoading, setDoctorLoading] = useState(false)
	const [activeTab, setActiveTab] = useState(0)
	const [notes, setNotes] = useState('')
	const [saving, setSaving] = useState(false)
	const [finalText, setFinalText] = useState('') // confirmed text
	const [liveText, setLiveText] = useState('') // current speaking text

	// Voice recognition states
	const [isListening, setIsListening] = useState(false)
	const [snackbarVisible, setSnackbarVisible] = useState(false)
	const [snackbarMessage, setSnackbarMessage] = useState('')
	const [permissionsGranted, setPermissionsGranted] = useState(false)

	const params = route.params as any

	// Try to get IDs from params first
	const appointmentId = params?.appointmentId ?? params?.appointment_id ?? params?.id ?? ''
	const patientId = params?.patient_id ?? params?.patientId ?? params?.patient?.id ?? ''
	const doctorID = params?.doctor_id ?? params?.doctorID ?? params?.doctor?.id ?? ''

	console.log('Full params:', JSON.stringify(params, null, 2))
	console.log('Extracted - appointmentId:', appointmentId, 'patientId:', patientId, 'doctorID:', doctorID)

	// Request microphone permissions on component mount
	useEffect(() => {
		try {
			if (!Voice) {
				console.warn('Voice module not available')
				return
			}

			Voice.onSpeechStart = () => {
				console.log('Started listening')
			}

			// 🎤 LIVE text (updates while speaking)
			Voice.onSpeechPartialResults = (event) => {
				if (event?.value?.length) {
					setLiveText(event.value[0])
				}
			}

			// ✅ FINAL text (append when speech chunk ends)
			Voice.onSpeechResults = (event) => {
				if (event?.value?.length) {
					setFinalText((prev) => prev + ' ' + event.value[0])
					setLiveText('') // clear live
				}
			}

			// ❗ KEEP LISTENING after pause
			Voice.onSpeechEnd = async () => {
				console.log('Speech ended → restarting...')
				if (isListening) {
					try {
						await Voice.start('en-US') // 🔥 restart automatically
					} catch (e) {
						console.log('Restart error:', e)
					}
				}
			}

			Voice.onSpeechError = (e) => {
				console.log('Voice error:', e)
			}

			return () => {
				try {
					if (Voice?.destroy) {
						Voice.destroy().catch((e) => console.log('Destroy error:', e))
					}
					if (Voice?.removeAllListeners) {
						Voice.removeAllListeners()
					}
				} catch (e) {
					console.log('Cleanup error:', e)
				}
			}
		} catch (e) {
			console.log('Voice setup error:', e)
			return () => {}
		}
	}, [isListening])
	// Set doctor directly from params without API call
	useEffect(() => {
		// Get doctor data from params (passed from DoctorAppointments)
		const doctorFromParams = params?.doctor
		const hospitalFromParams = params?.appointment?.hospital || params?.hospital

		if (doctorFromParams) {
			console.log('Setting doctor from params:', doctorFromParams)
			const doctorData: DocterDetails = {
				name: doctorFromParams.name,
				degree: '', // If not available, keep empty
				specialization: '', // If not available, keep empty
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

	// Fetch appointment details to get complete data
	useEffect(() => {
		const fetchAppointmentDetails = async () => {
			if (appointmentId && !appointment) {
				try {
					console.log('Fetching appointment details for ID:', appointmentId)
					const response = (await ApiService.get(API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId))) as any

					const appointmentData = response?.data?.data || response?.data || response
					console.log('Parsed appointment data:', appointmentData)

					setAppointment(appointmentData)

					// Set patient if not already set
					if (!patient && appointmentData?.patient?.id) {
						fetchPatientData(appointmentData.patient.id)
					}

					// Set doctor from appointment data if not already set from params
					if (!doctor && appointmentData?.doctor) {
						const doctorData: DocterDetails = {
							name: appointmentData.doctor.name,
							degree: '', // Will be empty if not in API response
							specialization: '', // Will be empty if not in API response
							clinicName: appointmentData.hospital?.name,
							clinicAddress: appointmentData.hospital?.address,
						}
						console.log('Setting doctor from appointment API:', doctorData)
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

	const startListening = async () => {
		try {
			if (!Voice?.start) {
				console.warn('Voice.start not available')
				return
			}
			setIsListening(true)
			await Voice.start('en-US')
		} catch (e) {
			console.log('Start listening error:', e)
			setIsListening(false)
		}
	}

	const stopListening = async () => {
		try {
			if (!Voice?.stop) {
				console.warn('Voice.stop not available')
				setIsListening(false)
				return
			}
			setIsListening(false)
			await Voice.stop()
		} catch (e) {
			console.log('Stop listening error:', e)
			setIsListening(false)
		}
	}

	const toggleVoiceInput = async () => {
		if (isListening) {
			await stopListening()
		} else {
			await startListening()
		}
	}
	// ── Save notes ──────────────────────────────────────────────────────────────
	const handleSaveNotes = async () => {
		if (!notes.trim()) {
			Alert.alert('Info', 'Please add some consultation notes')
			return
		}
		setSaving(true)
		try {
			Alert.alert('Success', 'Consultation notes saved successfully')
			navigation.goBack()
		} catch {
			Alert.alert('Error', 'Failed to save consultation notes')
		} finally {
			setSaving(false)
		}
	}

	// ── Loading / error states ──────────────────────────────────────────────────
	const loading = patientLoading

	if (loading) {
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
					<Button mode="contained" compact style={{ borderRadius: 20 }}>
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
							onPress={() => setActiveTab(idx)}
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
			{activeTab === 0 ? (
				<ScrollView contentContainerStyle={styles.content}>
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
						<PastMedicalHistory />

						{/* Consultation Notes */}
						<Card style={[styles.card, { borderColor: theme.colors.primary, borderWidth: 1 }]}>
							<View style={styles.notesHeader}>
								<View style={{ flex: 1 }}>
									<Text
										style={{
											color: theme.colors.primary,
											fontWeight: 'bold',
											fontSize: 12,
										}}
									>
										{doctor?.name ?? '--'}
										{doctor?.degree ? `, ${doctor.degree}` : ''}
									</Text>
									<Text style={{ color: theme.colors.primary, fontSize: 10 }}>
										{doctor?.specialization ?? ''}
									</Text>
								</View>
								<View style={{ flex: 1, alignItems: 'flex-end' }}>
									<Text
										style={{
											color: theme.colors.primary,
											fontWeight: 'bold',
											fontSize: 12,
										}}
									>
										{doctor?.clinicName ?? ''}
									</Text>
									<Text style={{ color: theme.colors.primary, fontSize: 10 }}>
										{doctor?.clinicAddress ?? ''}
									</Text>
								</View>
							</View>
							<Divider />
							<View style={styles.editorToolbar}>
								{(
									['undo', 'redo', 'format-text', 'camera-outline', 'format-list-bulleted'] as const
								).map((icon) => (
									<MaterialCommunityIcons
										key={icon}
										name={icon}
										size={18}
										color="#666"
										style={{ marginHorizontal: 6 }}
									/>
								))}

								{/* Microphone button with voice recording state */}
								<TouchableOpacity onPress={toggleVoiceInput}>
									<MaterialCommunityIcons
										name={isListening ? 'microphone' : 'microphone-outline'}
										size={18}
										color={isListening ? '#e53935' : '#666'}
										style={{ marginHorizontal: 6 }}
									/>
								</TouchableOpacity>

								{/* Recording indicator */}
								{isListening && (
									<View style={styles.recordingIndicator}>
										<View style={styles.recordingDot} />
										<Text style={styles.recordingText}>Recording...</Text>
									</View>
								)}
							</View>
							<Divider />
							<NativeInput
								placeholder="Type or tap the microphone to speak your consultation notes..."
								multiline
								textAlignVertical="top"
								value={notes}
								onChangeText={setNotes}
								style={styles.textArea}
							/>
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
			) : (
				<View style={styles.vitalsContent}>
					<VitalsTab patientId={patient?.id || patientId} />
				</View>
			)}

			{/* Snackbar for feedback messages */}
			<Snackbar
				visible={snackbarVisible}
				onDismiss={() => setSnackbarVisible(false)}
				duration={3000}
				action={{
					label: 'OK',
					onPress: () => setSnackbarVisible(false),
				}}
			>
				{snackbarMessage}
			</Snackbar>
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
	editorToolbar: {
		flexDirection: 'row',
		padding: 8,
		backgroundColor: '#fafafa',
		alignItems: 'center',
	},
	textArea: {
		height: 160,
		padding: 12,
		fontSize: 14,
		color: '#333',
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
	recordingIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		marginLeft: 8,
	},
	recordingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#e53935',
		marginRight: 4,
	},
	recordingText: {
		fontSize: 10,
		color: '#e53935',
	},
})
