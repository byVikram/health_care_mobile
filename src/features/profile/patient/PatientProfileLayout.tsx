import React, { useEffect, useRef, useState } from 'react'
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

import HealthProfileField from './HealthProfileField'
import { PROFILE_TABS } from './profileFieldsConfig'
import type { TabConfig } from './profileFieldsConfig'
import { getPatientDetails, patchPatientDetails, mapApiDataToLocalState } from './ProfileService'
import PatientQR from '../../../assets/icons/PatientQR.svg'
type Tab = 'Personal' | 'Medical' | 'Life style'
const TEAL = '#1a8c8c'

/* ──────────────── SKELETON ──────────────── */

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
	}, [])

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

/* ──────────────── SKELETON SCREEN ──────────────── */

function PatientProfileLayoutSkeleton() {
	const insets = useSafeAreaInsets()

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			{/* Header */}
			<View style={styles.header}>
				<AppSkeleton width={180} height={18} />
				<AppSkeleton width={40} height={18} />
			</View>

			{/* Progress */}
			<View style={styles.progressBarBg}>
				<AppSkeleton width="50%" height={3} />
			</View>

			{/* Tabs */}
			<View style={styles.tabRow}>
				<AppSkeleton width="30%" height={36} borderRadius={22} />
				<AppSkeleton width="30%" height={36} borderRadius={22} />
				<AppSkeleton width="30%" height={36} borderRadius={22} />
			</View>

			{/* Profile Section */}
			<View style={styles.nameAvatarRow}>
				<View>
					<AppSkeleton width={40} height={12} />
					<AppSkeleton width={120} height={20} style={{ marginTop: 6 }} />
				</View>
				<AppSkeleton width={60} height={60} borderRadius={10} />
			</View>

			<View style={styles.divider} />

			{/* Fields */}
			{Array.from({ length: 9 }).map((_, i) => (
				<View key={i} style={styles.fieldRow}>
					<View>
						<AppSkeleton width={100} height={12} />
						<AppSkeleton width={140} height={14} style={{ marginTop: 6 }} />
					</View>
					<AppSkeleton width={30} height={14} />
				</View>
			))}
		</View>
	)
}

/* ──────────────── HELPER ──────────────── */

function calcCompletion(data: Record<string, string>): number {
	let total = 0
	let filled = 0

	PROFILE_TABS.forEach((t) =>
		t.fields.forEach((f) => {
			total++
			if (data[f.key]) filled++
		})
	)

	return total === 0 ? 0 : Math.round((filled / total) * 100)
}

/* ──────────────── MAIN SCREEN ──────────────── */

export default function PatientProfileLayout() {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()

	const [activeTab, setActiveTab] = useState<Tab>('Personal')
	const [data, setData] = useState<Record<string, string>>({})
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)

	const fetchProfile = async () => {
		try {
			setLoading(true)
			const res = await getPatientDetails()

			if (res.success && res.data) {
				setData(mapApiDataToLocalState(res.data))
			} else {
				Alert.alert('Error', res.message ?? 'Could not load profile.')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchProfile()
	}, [])

	const handleChange = (key: string, value: string) => setData((prev) => ({ ...prev, [key]: value }))

	const completion = calcCompletion(data)

	const handleSave = async () => {
		try {
			setLoading(true)
			const res = await patchPatientDetails(data)

			if (res.success) {
				await fetchProfile()
				Alert.alert('Saved', 'Profile updated successfully.')
			} else {
				Alert.alert('Error', res.message ?? 'Failed to save.')
			}
		} catch {
			Alert.alert('Error', 'Something went wrong.')
		} finally {
			setLoading(false)
		}
	}

	const renderTab = (tabCfg: TabConfig) => (
		<>
			{tabCfg.tab === 'Personal' && (
				<>
					<View style={styles.nameAvatarRow}>
						<View>
							<Text style={styles.fieldSmallLabel}>Name</Text>
							<Text style={styles.nameValue}>{data.name || '—'}</Text>
						</View>

						<View style={styles.avatarCol}>
							<TouchableOpacity onPress={onUploadPhoto}>
								{data.photoUrl ? (
									<Image source={{ uri: data.photoUrl }} style={styles.avatarImg} />
								) : (
									<View style={styles.avatarPlaceholder}>
										<MaterialCommunityIcons name="account" size={32} color="#9aabb0" />
									</View>
								)}
							</TouchableOpacity>
						</View>
					</View>

					<View style={styles.divider} />
				</>
			)}

			{tabCfg.fields.map((field) => (
				<HealthProfileField key={field.key} config={field} value={data[field.key]} onChange={handleChange} />
			))}
		</>
	)

	const currentTabConfig = PROFILE_TABS.find((t) => t.tab === activeTab)!

	if (loading) return <PatientProfileLayoutSkeleton />
	const onUploadPhoto = () => {
		Alert.alert('Upload Photo', 'Choose an option', [
			{ text: 'Camera', onPress: openCamera },
			{ text: 'Gallery', onPress: openGallery },
			{ text: 'Cancel', style: 'cancel' },
		])
	}

	const openCamera = async () => {
		const permission = await ImagePicker.requestCameraPermissionsAsync()

		if (!permission.granted) {
			Alert.alert('Permission required', 'Camera access is needed')
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
			Alert.alert('Permission required', 'Gallery access is needed')
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

	const handleImage = (uri: string) => {
		setData((prev) => ({
			...prev,
			photoUrl: uri,
		}))

		// 🔥 Optional: call API here to upload image
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
					<MaterialCommunityIcons name="chevron-left" size={22} color={TEAL} />
					<Text style={styles.backTxt}>Your health profile</Text>
					<Text style={styles.progressTxt}>({completion}%)</Text>
				</TouchableOpacity>

				<TouchableOpacity onPress={handleSave} disabled={saving}>
					{saving ? (
						<ActivityIndicator size="small" color={TEAL} />
					) : (
						<Text style={styles.saveTxt}>Save</Text>
					)}
				</TouchableOpacity>
			</View>

			{/* Progress */}
			<View style={styles.progressBarBg}>
				<View style={[styles.progressBarFill, { width: `${completion}%` }]} />
			</View>

			{/* Tabs */}
			<View style={styles.tabRow}>
				{PROFILE_TABS.map(({ tab }) => (
					<TouchableOpacity
						key={tab}
						onPress={() => setActiveTab(tab as Tab)}
						style={[styles.tab, activeTab === tab && styles.tabActive]}
					>
						<Text style={[styles.tabTxt, activeTab === tab && styles.tabTxtActive]}>{tab}</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Fields */}
			<ScrollView style={styles.scroll}>{renderTab(currentTabConfig)}</ScrollView>
		</View>
	)
}

/* ──────────────── STYLES (UNCHANGED) ──────────────── */

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
	backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
	},
	qrContainer: {
		marginTop: 10,
		alignItems: 'center',
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
