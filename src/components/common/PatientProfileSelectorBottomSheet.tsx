import React, { useState, useEffect } from 'react'
import {
	View,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	Image,
	Alert,
} from 'react-native'
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import AppBottomSheet from './AppBottomSheet'
import { AppTypography } from './AppTypography'
import { AppButton } from './AppButton'
import { getFamilyMembers } from '../../features/profile/patient/PatientProfileService'

export interface PatientProfile {
	id: string
	publicId?: string
	name: string
	age: string | number
	gender: string
	relationship: string
	avatar?: string
	bloodGroup?: string
}

interface PatientProfileSelectorBottomSheetProps {
	visible: boolean
	onClose: () => void
	selectedProfileId?: string
	onSelectProfile: (profile: PatientProfile) => void
	customProfiles?: PatientProfile[]
}

const FALLBACK_MOCK_PROFILES: PatientProfile[] = [
	{
		id: 'self-1',
		name: 'Patient Account Holder',
		age: '',
		gender: '',
		relationship: 'Self',
		bloodGroup: '',
	},
]

const calculateAge = (dobString: string): string => {
	try {
		const dob = new Date(dobString)
		const diffMs = Date.now() - dob.getTime()
		const ageDate = new Date(diffMs)
		return String(Math.abs(ageDate.getUTCFullYear() - 1970))
	} catch {
		return ''
	}
}

export const PatientProfileSelectorBottomSheet: React.FC<PatientProfileSelectorBottomSheetProps> = ({
	visible,
	onClose,
	selectedProfileId,
	onSelectProfile,
	customProfiles,
}) => {
	const [profiles, setProfiles] = useState<PatientProfile[]>(customProfiles || [])

	useEffect(() => {
		if (customProfiles) {
			setProfiles(customProfiles)
			return
		}

		const loadProfiles = async () => {
			try {
				let list: PatientProfile[] = []

				// Try calling backend API first
				try {
					const apiMembers = await getFamilyMembers()
					if (apiMembers && apiMembers.length > 0) {
						// Store it locally for cache / offline availability
						await AsyncStorage.setItem('family_members', JSON.stringify(apiMembers))

						// Map them to PatientProfile array
						const selfObj = apiMembers.find(m => m.is_self || m.relation === 'SELF' || m.relationship === 'Self')
						const familyObjs = apiMembers.filter(m => !(m.is_self || m.relation === 'SELF' || m.relationship === 'Self'))

						if (selfObj) {
							list.push({
								id: selfObj.publicId || selfObj.public_id || String(selfObj.id),
								publicId: selfObj.publicId || selfObj.public_id,
								name: selfObj.name,
								age: selfObj.age || '',
								gender: selfObj.gender || '',
								relationship: 'Self',
								avatar: selfObj.avatar_s3_key || undefined,
								bloodGroup: selfObj.blood_group || undefined,
							})
						} else {
							// fallback Self from user profile in AsyncStorage or mock
							const userRaw = await AsyncStorage.getItem('user')
							if (userRaw) {
								const userData = JSON.parse(userRaw)
								list.push({
									id: userData.publicId || userData.public_id || userData.id || 'self-1',
									publicId: userData.publicId || userData.public_id,
									name: userData.name || userData.full_name || 'Self',
									age: userData.age || '',
									gender: userData.gender || '',
									relationship: 'Self',
									avatar: userData.avatar || userData.photo_url || undefined,
									bloodGroup: userData.bloodGroup || userData.blood_group || undefined,
								})
							} else {
								list.push(FALLBACK_MOCK_PROFILES[0])
							}
						}

						// Add mapped family profiles
						const mappedFamily: PatientProfile[] = familyObjs.map((item) => ({
							id: item.publicId || item.public_id || String(item.id),
							publicId: item.publicId || item.public_id,
							name: item.name,
							age: item.age || '',
							gender: item.gender || '',
							relationship: item.relation || item.relationship || 'Family Member',
							avatar: item.avatar_s3_key || undefined,
							bloodGroup: item.blood_group || undefined,
						}))

						list = [...list, ...mappedFamily]
						setProfiles(list)
						return
					}
				} catch (apiErr) {
					console.error('Failed to fetch family members from API, trying AsyncStorage cache', apiErr)
				}

				// If API failed or returned empty list, fall back to AsyncStorage cached profiles
				const userRaw = await AsyncStorage.getItem('user')
				const familyRaw = await AsyncStorage.getItem('family_members')

				// Add Self profile from user context if exists
				if (userRaw) {
					try {
						const userData = JSON.parse(userRaw)
						list.push({
							id: userData.id || 'self-1',
							name: userData.name || userData.full_name || 'Self',
							age: userData.age || '45',
							gender: userData.gender || 'Male',
							relationship: 'Self',
							avatar: userData.avatar || userData.photo_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
							bloodGroup: userData.bloodGroup || userData.blood_group || 'O+',
						})
					} catch {
						list.push(FALLBACK_MOCK_PROFILES[0])
					}
				} else {
					list.push(FALLBACK_MOCK_PROFILES[0])
				}

				// Add Family members if in AsyncStorage
				if (familyRaw) {
					try {
						const parsed = JSON.parse(familyRaw)
						let familyList: any[] = []

						if (Array.isArray(parsed)) {
							familyList = parsed
						} else if (parsed && typeof parsed === 'object') {
							if (Array.isArray(parsed.data)) {
								familyList = parsed.data
							} else if (Array.isArray(parsed.family_members)) {
								familyList = parsed.family_members
							} else if (Array.isArray(parsed.members)) {
								familyList = parsed.members
							}
						}

						if (familyList.length > 0) {
							// Map backend fields to UI fields
							const mappedList = familyList.map((item: any, idx: number) => ({
								id: String(item.id || `family-${idx}`),
								name: item.name || item.full_name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'Family Member',
								age: item.age || (item.date_of_birth ? calculateAge(item.date_of_birth) : '30'),
								gender: item.gender || 'Female',
								relationship: item.relation || item.relationship || 'Family Member',
								avatar: item.avatar || item.avatar_s3_key || item.photo_url || undefined,
								bloodGroup: item.blood_group || item.bloodGroup || undefined,
							}))
							list = [...list, ...mappedList]
						} else {
							list = [...list, ...FALLBACK_MOCK_PROFILES.slice(1)]
						}
					} catch (parseErr) {
						console.error('Failed to parse family members JSON', parseErr)
						list = [...list, ...FALLBACK_MOCK_PROFILES.slice(1)]
					}
				} else {
					list = [...list, ...FALLBACK_MOCK_PROFILES.slice(1)]
				}

				setProfiles(list)
			} catch (e) {
				console.error('Failed to load patient profiles', e)
				setProfiles(FALLBACK_MOCK_PROFILES)
			}
		}

		if (visible) {
			loadProfiles()
		}
	}, [visible, customProfiles])

	const handleAddMember = () => {
		Alert.alert(
			'Add Family Member',
			'This will open the add new family member registration form. To integrate, link with account manager.'
		)
	}

	return (
		<AppBottomSheet visible={visible} title="Select Patient Profile" onClose={onClose} maxHeightRatio={0.75}>
			<View style={styles.wrapper}>
				<AppTypography variant="caption" style={styles.subHeading}>
					Choose who this booking / service is for:
				</AppTypography>

				<ScrollView showsVerticalScrollIndicator={false} style={styles.scrollList} contentContainerStyle={styles.scrollContent}>
					{profiles.map((profile) => {
						const isSelected = selectedProfileId === profile.id || 
							(!selectedProfileId && profile.relationship === 'Self')
						return (
							<TouchableOpacity
								key={profile.id}
								style={[styles.profileCard, isSelected && styles.profileCardSelected]}
								onPress={() => {
									onSelectProfile(profile)
									onClose()
								}}
								activeOpacity={0.8}
							>
								<View style={styles.avatarWrapper}>
									{profile.avatar ? (
										<Image source={{ uri: profile.avatar }} style={styles.avatarImg} />
									) : (
										<View style={styles.avatarFallback}>
											<AppTypography variant="caption" style={styles.avatarText}>
												{profile.name.charAt(0)}
											</AppTypography>
										</View>
									)}
								</View>

								<View style={styles.infoCol}>
									<View style={styles.nameRow}>
										<AppTypography variant="h4" style={styles.name}>
											{profile.name}
										</AppTypography>
										<View style={[styles.badge, profile.relationship === 'Self' ? styles.badgeSelf : styles.badgeFamily]}>
											<AppTypography variant="caption" style={[styles.badgeText, profile.relationship === 'Self' ? styles.badgeTextSelf : styles.badgeTextFamily]}>
												{profile.relationship}
											</AppTypography>
										</View>
									</View>
									<AppTypography variant="caption" style={styles.meta}>
										{profile.age} Yrs • {profile.gender} {profile.bloodGroup ? `• BG: ${profile.bloodGroup}` : ''}
									</AppTypography>
								</View>

								<View style={styles.radioWrapper}>
									<Ionicons
										name={isSelected ? 'radio-button-on' : 'radio-button-off'}
										size={22}
										color={isSelected ? '#1F5F68' : '#78909C'}
									/>
								</View>
							</TouchableOpacity>
						)
					})}
				</ScrollView>

				<TouchableOpacity
					style={styles.addBtn}
					onPress={handleAddMember}
					activeOpacity={0.7}
				>
					<Ionicons name="add-circle-outline" size={20} color="#1F5F68" />
					<AppTypography variant="caption" style={styles.addBtnText}>
						Add New Family Member
					</AppTypography>
				</TouchableOpacity>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		paddingTop: 8,
		paddingBottom: 16,
	},
	subHeading: {
		fontSize: 12,
		color: '#546E7A',
		marginBottom: 16,
	},
	scrollList: {
		maxHeight: 320,
	},
	scrollContent: {
		gap: 12,
		paddingBottom: 8,
	},
	profileCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 14,
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#ECEFF1',
	},
	profileCardSelected: {
		backgroundColor: '#F0F9F9',
		borderColor: '#1F5F68',
	},
	avatarWrapper: {
		marginRight: 12,
	},
	avatarImg: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#ECEFF1',
	},
	avatarFallback: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: '#E6F3F4',
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatarText: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1F5F68',
	},
	infoCol: {
		flex: 1,
		justifyContent: 'center',
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 2,
	},
	name: {
		fontSize: 14.5,
		fontWeight: '700',
		color: '#1A2E35',
	},
	badge: {
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 8,
	},
	badgeSelf: {
		backgroundColor: '#E6F3F4',
	},
	badgeFamily: {
		backgroundColor: '#ECEFF1',
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700',
	},
	badgeTextSelf: {
		color: '#1F5F68',
	},
	badgeTextFamily: {
		color: '#546E7A',
	},
	meta: {
		fontSize: 11.5,
		color: '#78909C',
	},
	radioWrapper: {
		paddingHorizontal: 4,
	},
	addBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		paddingVertical: 12,
		marginTop: 16,
		borderWidth: 1,
		borderColor: '#D4EFEF',
		borderRadius: 12,
		backgroundColor: '#F0F9F9',
	},
	addBtnText: {
		fontSize: 13,
		fontWeight: '700',
		color: '#1F5F68',
	},
})
