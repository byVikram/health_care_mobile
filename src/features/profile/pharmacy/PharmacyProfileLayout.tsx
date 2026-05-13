import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	Image,
	Alert,
	ActivityIndicator,
	Animated,
	Easing,
	ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import * as ImagePicker from 'expo-image-picker'

import HealthProfileField from '../patient/HealthProfileField'
import type { ProfileFieldConfig } from '../patient/profileFieldsConfig'
import { getMultiValues } from '../patient/profileFieldsConfig'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

type PharmacyTab = 'Personal' | 'Pharmacy' | 'Services'

type PharmacyFieldConfig = ProfileFieldConfig & {
	section?: string
}

type PharmacyTabConfig = {
	tab: PharmacyTab
	fields: PharmacyFieldConfig[]
}

type PharmacyProfileResponse = {
	success: boolean
	message?: string
	data?: any
}

const TEAL = '#1a8c8c'

const PHARMACY_TABS: PharmacyTabConfig[] = [
	{
		tab: 'Personal',
		fields: [
			{
				key: 'ownerName',
				apiKey: 'owner_name',
				label: 'Owner name',
				type: 'text',
				placeholder: 'Enter owner name',
				required: true,
				section: 'personal',
			},
			{
				key: 'contactNumber',
				apiKey: 'contact_number',
				label: 'Contact Number',
				type: 'phone',
				placeholder: '+91 XXXXX XXXXX',
				verified: true,
				required: true,
				section: 'personal',
			},
			{
				key: 'email',
				apiKey: 'email',
				label: 'Email id',
				type: 'email',
				placeholder: 'example@email.com',
				section: 'personal',
			},
			{
				key: 'gender',
				apiKey: 'gender',
				label: 'Gender',
				type: 'select',
				options: ['Male', 'Female', 'Non-binary', 'Prefer not to say'],
				section: 'personal',
			},
			{
				key: 'dateOfBirth',
				apiKey: 'date_of_birth',
				label: 'Date of birth',
				type: 'date',
				placeholder: 'DD / MM / YYYY',
				section: 'personal',
			},
			{
				key: 'location',
				apiKey: 'location',
				label: 'Location',
				type: 'text',
				placeholder: 'City, State',
				section: 'personal',
			},
		],
	},
	{
		tab: 'Pharmacy',
		fields: [
			{
				key: 'pharmacyName',
				apiKey: 'pharmacy_name',
				label: 'Pharmacy name',
				type: 'text',
				placeholder: 'Enter pharmacy name',
				required: true,
				section: 'pharmacy',
			},
			{
				key: 'licenseNumber',
				apiKey: 'license_number',
				label: 'Drug license number',
				type: 'text',
				placeholder: 'Enter license number',
				required: true,
				section: 'pharmacy',
			},
			{
				key: 'gstNumber',
				apiKey: 'gst_number',
				label: 'GST number',
				type: 'text',
				placeholder: 'Enter GST number',
				section: 'pharmacy',
			},
			{
				key: 'pharmacyType',
				apiKey: 'pharmacy_type',
				label: 'Pharmacy type',
				type: 'select',
				options: ['Retail', 'Wholesale', 'Hospital pharmacy', 'Online pharmacy'],
				section: 'pharmacy',
			},
			{
				key: 'address',
				apiKey: 'address',
				label: 'Address',
				type: 'text',
				placeholder: 'Building, street, area',
				required: true,
				section: 'pharmacy',
			},
			{
				key: 'city',
				apiKey: 'city',
				label: 'City',
				type: 'text',
				placeholder: 'Enter city',
				section: 'pharmacy',
			},
			{
				key: 'state',
				apiKey: 'state',
				label: 'State',
				type: 'text',
				placeholder: 'Enter state',
				section: 'pharmacy',
			},
			{
				key: 'pincode',
				apiKey: 'pincode',
				label: 'Pincode',
				type: 'number',
				placeholder: 'Enter pincode',
				section: 'pharmacy',
			},
		],
	},
	{
		tab: 'Services',
		fields: [
			{
				key: 'operatingHours',
				apiKey: 'operating_hours',
				label: 'Operating hours',
				type: 'text',
				placeholder: 'e.g. 9 AM - 9 PM',
				section: 'services',
			},
			{
				key: 'deliveryAvailable',
				apiKey: 'delivery_available',
				label: 'Home delivery',
				type: 'select',
				options: ['Available', 'Not available'],
				section: 'services',
			},
			{
				key: 'openDays',
				apiKey: 'open_days',
				label: 'Open days',
				type: 'multi',
				addLabel: 'Add Open days',
				placeholder: 'e.g. Monday to Saturday',
				section: 'services',
			},
			{
				key: 'services',
				apiKey: 'services',
				label: 'Services',
				type: 'multi',
				addLabel: 'Add Services',
				placeholder: 'e.g. Prescription medicines',
				section: 'services',
			},
			{
				key: 'paymentModes',
				apiKey: 'payment_modes',
				label: 'Payment modes',
				type: 'multi',
				addLabel: 'Add Payment modes',
				placeholder: 'e.g. UPI, Cash, Card',
				section: 'services',
			},
		],
	},
]

type SkeletonProps = {
	width: number | string
	height: number
	borderRadius?: number
	style?: ViewStyle
}

function AppSkeleton({ width, height, borderRadius = 6, style }: SkeletonProps) {
	const opacity = useRef(new Animated.Value(0.3)).current

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 1,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: false,
				}),
				Animated.timing(opacity, {
					toValue: 0.3,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: false,
				}),
			])
		)
		loop.start()
		return () => loop.stop()
	}, [opacity])

	return (
		<Animated.View
			style={[
				{
					width: width as any,
					height,
					borderRadius,
					backgroundColor: '#e0e8ea',
				},
				{ opacity },
				style,
			]}
		/>
	)
}

function PharmacyProfileLayoutSkeleton() {
	const insets = useSafeAreaInsets()

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<AppSkeleton width={190} height={18} />
				<AppSkeleton width={40} height={18} />
			</View>
			<View style={styles.progressBarBg}>
				<AppSkeleton width="45%" height={3} />
			</View>
			<View style={styles.tabRow}>
				<AppSkeleton width="30%" height={36} borderRadius={22} />
				<AppSkeleton width="30%" height={36} borderRadius={22} />
				<AppSkeleton width="30%" height={36} borderRadius={22} />
			</View>
			<View style={styles.nameAvatarRow}>
				<View>
					<AppSkeleton width={90} height={12} />
					<AppSkeleton width={150} height={20} style={{ marginTop: 6 }} />
				</View>
				<AppSkeleton width={60} height={60} borderRadius={10} />
			</View>
			<View style={styles.divider} />
			{Array.from({ length: 9 }).map((_, index) => (
				<View key={index} style={styles.fieldRow}>
					<View>
						<AppSkeleton width={110} height={12} />
						<AppSkeleton width={150} height={14} style={{ marginTop: 6 }} />
					</View>
					<AppSkeleton width={30} height={14} />
				</View>
			))}
		</View>
	)
}

function readValue(source: any, keys: string[]) {
	for (const key of keys) {
		const value = source?.[key]
		if (value !== undefined && value !== null && value !== '') return value
	}
	return undefined
}

function normalizeValue(value: any): string | undefined {
	if (value === undefined || value === null || value === '') return undefined
	if (Array.isArray(value)) return JSON.stringify(value.map((item) => String(item)))
	if (typeof value === 'boolean') return value ? 'Available' : 'Not available'
	return String(value)
}

function setMappedValue(target: Record<string, string>, key: string, value: any) {
	const normalized = normalizeValue(value)
	if (normalized) target[key] = normalized
}

function mapApiDataToLocalState(apiData: any): Record<string, string> {
	const root = apiData?.profile ?? apiData?.pharmacy_profile ?? apiData ?? {}
	const personal = root.personal ?? root.personal_details ?? root.owner ?? root.user ?? root
	const pharmacy = root.pharmacy ?? root.pharmacy_details ?? root.business ?? root.store ?? root
	const services = root.services_details ?? root.service_details ?? root.services_info ?? root

	const local: Record<string, string> = {}

	setMappedValue(local, 'ownerName', readValue(personal, ['owner_name', 'name', 'full_name', 'ownerName']))
	setMappedValue(local, 'contactNumber', readValue(personal, ['contact_number', 'phone_number', 'phone', 'mobile']))
	setMappedValue(local, 'email', readValue(personal, ['email', 'email_id']))
	setMappedValue(local, 'gender', readValue(personal, ['gender']))
	setMappedValue(local, 'dateOfBirth', readValue(personal, ['date_of_birth', 'dob']))
	setMappedValue(local, 'location', readValue(personal, ['location']))
	setMappedValue(local, 'photoUrl', readValue(personal, ['avatar', 'avatar_s3_key', 'profile_image', 'photo_url']))

	setMappedValue(local, 'pharmacyName', readValue(pharmacy, ['pharmacy_name', 'name', 'store_name', 'business_name']))
	setMappedValue(local, 'licenseNumber', readValue(pharmacy, ['license_number', 'drug_license_number', 'registration_number']))
	setMappedValue(local, 'gstNumber', readValue(pharmacy, ['gst_number', 'gstin']))
	setMappedValue(local, 'pharmacyType', readValue(pharmacy, ['pharmacy_type', 'type']))
	setMappedValue(local, 'address', readValue(pharmacy, ['address', 'full_address']))
	setMappedValue(local, 'city', readValue(pharmacy, ['city']))
	setMappedValue(local, 'state', readValue(pharmacy, ['state']))
	setMappedValue(local, 'pincode', readValue(pharmacy, ['pincode', 'pin_code', 'postal_code']))

	setMappedValue(local, 'operatingHours', readValue(services, ['operating_hours', 'working_hours', 'hours']))
	setMappedValue(local, 'deliveryAvailable', readValue(services, ['delivery_available', 'home_delivery']))
	setMappedValue(local, 'openDays', readValue(services, ['open_days', 'available_days']))
	setMappedValue(local, 'services', readValue(services, ['services', 'service_offerings']))
	setMappedValue(local, 'paymentModes', readValue(services, ['payment_modes', 'payment_methods']))

	return local
}

function buildApiPayload(data: Record<string, string>) {
	const payload: Record<string, any> = {}

	PHARMACY_TABS.forEach((tab) => {
		tab.fields.forEach((field) => {
			const value = data[field.key]
			if (!value) return

			payload[field.apiKey] = field.type === 'multi' ? getMultiValues(value) : value
		})
	})

	if (data.photoUrl) {
		payload.avatar = data.photoUrl
	}

	return payload
}

async function getPharmacyDetails(): Promise<PharmacyProfileResponse> {
	const res = await ApiService.get<PharmacyProfileResponse>(API_ENDPOINTS.PHARMACY.DETAILS)
	return res.data
}

async function updatePharmacyProfile(localData: Record<string, string>): Promise<PharmacyProfileResponse> {
	const res = await ApiService.patch<PharmacyProfileResponse>(API_ENDPOINTS.PHARMACY.DETAILS, buildApiPayload(localData))
	return res.data
}

function calcCompletion(data: Record<string, string>) {
	let total = 0
	let filled = 0

	PHARMACY_TABS.forEach((tab) =>
		tab.fields.forEach((field) => {
			total += 1
			if (data[field.key]) filled += 1
		})
	)

	return total === 0 ? 0 : Math.round((filled / total) * 100)
}

function validateProfile(data: Record<string, string>) {
	const missing = PHARMACY_TABS.flatMap((tab) => tab.fields)
		.filter((field) => field.required && !data[field.key]?.trim())
		.map((field) => field.label)

	if (missing.length > 0) {
		return `${missing.join(', ')} ${missing.length === 1 ? 'is' : 'are'} required.`
	}

	const email = data.email?.trim()
	if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'

	const pincode = data.pincode?.trim()
	if (pincode && !/^\d{6}$/.test(pincode)) return 'Enter a valid 6 digit pincode.'

	return null
}

export default function PharmacyProfileLayout() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()

	const [activeTab, setActiveTab] = useState<PharmacyTab>('Personal')
	const [data, setData] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	const currentTabConfig = useMemo(
		() => PHARMACY_TABS.find((tabConfig) => tabConfig.tab === activeTab) ?? PHARMACY_TABS[0],
		[activeTab]
	)

	const fetchProfile = async () => {
		try {
			setLoading(true)
			const res = await getPharmacyDetails()

			if (res.success !== false && res.data) {
				setData(mapApiDataToLocalState(res.data))
			} else {
				Alert.alert('Error', res.message ?? 'Could not load profile.')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong while loading your profile.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchProfile()
	}, [])

	const handleChange = (key: string, value: string) => {
		setData((prev) => ({ ...prev, [key]: value }))
	}

	const completion = calcCompletion(data)

	const handleSave = async () => {
		const validationError = validateProfile(data)
		if (validationError) {
			Alert.alert('Check profile details', validationError)
			return
		}

		try {
			setSaving(true)
			const res = await updatePharmacyProfile(data)

			if (res.success !== false) {
				if (res.data) {
					setData(mapApiDataToLocalState(res.data))
				} else {
					await fetchProfile()
				}
				Alert.alert('Saved', 'Profile updated successfully.')
			} else {
				Alert.alert('Error', res.message ?? 'Failed to save profile.')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong while saving your profile.')
		} finally {
			setSaving(false)
		}
	}

	const handleImage = (uri: string) => {
		setData((prev) => ({
			...prev,
			photoUrl: uri,
		}))
	}

	const openCamera = async () => {
		const permission = await ImagePicker.requestCameraPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission required', 'Camera access is needed.')
			return
		}

		const result = await ImagePicker.launchCameraAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.7,
		})

		if (!result.canceled) {
			handleImage(result.assets[0].uri)
		}
	}

	const openGallery = async () => {
		const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission required', 'Gallery access is needed.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			quality: 0.7,
		})

		if (!result.canceled) {
			handleImage(result.assets[0].uri)
		}
	}

	const onUploadPhoto = () => {
		Alert.alert('Upload Photo', 'Choose an option', [
			{ text: 'Camera', onPress: openCamera },
			{ text: 'Gallery', onPress: openGallery },
			{ text: 'Cancel', style: 'cancel' },
		])
	}

	const renderTab = (tabCfg: PharmacyTabConfig) => (
		<>
			{tabCfg.tab === 'Personal' && (
				<>
					<View style={styles.nameAvatarRow}>
						<View style={styles.profileNameBlock}>
							<Text style={styles.fieldSmallLabel}>Pharmacy name</Text>
							<Text style={styles.nameValue}>{data.pharmacyName || data.ownerName || '-'}</Text>
						</View>

						<View style={styles.avatarCol}>
							<TouchableOpacity onPress={onUploadPhoto} activeOpacity={0.75}>
								{data.photoUrl ? (
									<Image source={{ uri: data.photoUrl }} style={styles.avatarImg} />
								) : (
									<View style={styles.avatarPlaceholder}>
										<MaterialCommunityIcons name="medical-bag" size={30} color="#9aabb0" />
									</View>
								)}
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.divider} />
				</>
			)}

			{tabCfg.fields.map((field) => (
				<HealthProfileField
					key={field.key}
					config={field}
					value={data[field.key]}
					onChange={handleChange}
				/>
			))}
		</>
	)

	if (loading) return <PharmacyProfileLayoutSkeleton />

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
					<MaterialCommunityIcons name="chevron-left" size={22} color={TEAL} />
					<Text style={styles.backTxt}>Your pharmacy profile</Text>
					<Text style={styles.progressTxt}>({completion}%)</Text>
				</TouchableOpacity>

				<TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.75}>
					{saving ? (
						<ActivityIndicator size="small" color={TEAL} />
					) : (
						<Text style={styles.saveTxt}>Save</Text>
					)}
				</TouchableOpacity>
			</View>

			<View style={styles.progressBarBg}>
				<View style={[styles.progressBarFill, { width: `${completion}%` }]} />
			</View>

			<View style={styles.tabRow}>
				{PHARMACY_TABS.map(({ tab }) => (
					<TouchableOpacity
						key={tab}
						onPress={() => setActiveTab(tab)}
						style={[styles.tab, activeTab === tab && styles.tabActive]}
						activeOpacity={0.75}
					>
						<Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]} numberOfLines={1}>
							{tab}
						</Text>
					</TouchableOpacity>
				))}
			</View>

			<ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
				{renderTab(currentTabConfig)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 0.5,
		borderBottomColor: '#e8ecee',
	},
	backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, paddingRight: 10 },
	backTxt: { fontSize: 14, color: TEAL, fontWeight: '600' },
	progressTxt: { fontSize: 13, color: TEAL, marginLeft: 4 },
	saveTxt: { fontSize: 14, color: TEAL, fontWeight: '700' },
	progressBarBg: { height: 3, backgroundColor: '#e0ecee' },
	progressBarFill: { height: '100%', backgroundColor: TEAL },
	tabRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
	tab: {
		flex: 1,
		paddingVertical: 9,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: '#c5d0d3',
		alignItems: 'center',
		minHeight: 36,
		justifyContent: 'center',
	},
	tabActive: { backgroundColor: '#1a6e6e', borderColor: '#1a6e6e' },
	tabTxt: { fontSize: 13, fontWeight: '500', color: '#5a6c72' },
	tabTxtActive: { color: '#fff' },
	scroll: { flex: 1 },
	nameAvatarRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 12,
	},
	profileNameBlock: { flex: 1, paddingRight: 16 },
	fieldSmallLabel: { fontSize: 12, color: '#9aabb0', marginBottom: 3 },
	nameValue: { fontSize: 18, fontWeight: '700', color: '#1a2226' },
	avatarCol: { alignItems: 'center', gap: 5 },
	avatarPlaceholder: {
		width: 60,
		height: 60,
		borderRadius: 10,
		backgroundColor: '#dde8ea',
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarImg: { width: 60, height: 60, borderRadius: 10 },
	divider: {
		height: 0.5,
		backgroundColor: '#e8ecee',
		marginHorizontal: 16,
		marginBottom: 2,
	},
	fieldRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		padding: 16,
	},
})
