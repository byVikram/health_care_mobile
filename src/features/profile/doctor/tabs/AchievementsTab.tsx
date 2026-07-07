import React, { useMemo, useState } from 'react'
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	Switch,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { AppInput, AppTypography } from '../../../../components/common'

const TEAL = '#00857d'
const TEXT = '#111f28'
const MUTED = '#5f6f77'
const BACKGROUND = '#f5f7f7'

type AchievementInfo = {
	title: string
	description: string
	icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	iconColor: string
	iconBackground: string
}

const ACHIEVEMENT_OPTIONS: AchievementInfo[] = [
	{
		title: 'Awards & Recognition',
		description:
			'Honors from hospitals, medical associations, or community leadership recognitions.',
		icon: 'trophy-outline',
		iconColor: '#7477c7',
		iconBackground: '#eef0ff',
	},
	{
		title: 'Certifications',
		description:
			'Board certifications, specialized training, and active medical licenses or fellowships.',
		icon: 'shield-check-outline',
		iconColor: '#009c89',
		iconBackground: '#d9fff5',
	},
	{
		title: 'Research & Publications',
		description:
			'Published papers, medical journals, clinical trials, or keynote presentations.',
		icon: 'book-open-variant',
		iconColor: '#b76045',
		iconBackground: '#ffe9df',
	},
	{
		title: 'Conferences & Speaking',
		description:
			'Keynote speeches, panel discussions, and international medical conferences.',
		icon: 'presentation',
		iconColor: '#ffffff',
		iconBackground: TEAL,
	},
]

const FORM_CATEGORIES = [
	'Award',
	'Research',
	'Publication',
	'Conference',
	'Certification',
	'Recognition',
]

type AchievementFormData = {
	id: string
	title: string
	category: string
	description: string
	organization: string
	date: string
	image: string | null
	isPublic: boolean
}

// Achievement APIs are intentionally disabled until the backend contract is finalized.
const MOCK_ACHIEVEMENTS: AchievementFormData[] = [
	{
		id: 'mock-achievement-1',
		title: 'Advanced Cardiac Life Support Certification',
		category: 'Certification',
		description:
			'Completed advanced emergency cardiac care training and renewed clinical certification.',
		organization: 'American Heart Association',
		date: '2024-08-15',
		image: null,
		isPublic: true,
	},
	{
		id: 'mock-achievement-2',
		title: 'Excellence in Patient Care Award',
		category: 'Award',
		description:
			'Recognized for consistently high patient satisfaction and clinical outcomes.',
		organization: 'City Medical Center',
		date: '2023-12-10',
		image: null,
		isPublic: true,
	},
]

function AchievementCard({
	item,
	useGrid,
}: {
	item: AchievementInfo
	useGrid: boolean
}) {
	return (
		<View style={[styles.card, useGrid && styles.cardTablet]}>
			<View
				style={[
					styles.cardIconBox,
					{ backgroundColor: item.iconBackground },
				]}
			>
				<MaterialCommunityIcons
					name={item.icon}
					size={15}
					color={item.iconColor}
				/>
			</View>

			<AppTypography variant="caption" style={styles.cardTitle}>
				{item.title}
			</AppTypography>

			<AppTypography variant="caption" style={styles.cardDescription}>
				{item.description}
			</AppTypography>
		</View>
	)
}

function EmptyState({
	isTablet,
	onAdd,
}: {
	isTablet: boolean
	onAdd: () => void
}) {
	return (
		<View style={styles.emptyState}>
			<Image
				source={require('../../../../assets/achievements/image.png')}
				style={[styles.heroImage, isTablet && styles.heroImageTablet]}
				resizeMode="contain"
			/>

			<AppTypography variant="h3" style={styles.emptyTitle}>
				No achievements added yet
			</AppTypography>

			<AppTypography
				variant="caption"
				style={[
					styles.emptyDescription,
					isTablet && styles.emptyDescriptionTablet,
				]}
			>
				Highlight your awards, certifications, research, and publications
				to build trust with patients and peers.
			</AppTypography>

			<TouchableOpacity
				style={styles.addButton}
				activeOpacity={0.86}
				onPress={onAdd}
			>
				<MaterialCommunityIcons name="plus" size={14} color="#ffffff" />

				<AppTypography variant="caption" style={styles.addButtonText}>
					Add Your First Achievement
				</AppTypography>
			</TouchableOpacity>
		</View>
	)
}

function AchievementTimeline({
	data,
	onAddNew,
	onEdit,
}: {
	data: AchievementFormData[]
	onAddNew: () => void
	onEdit: (item: AchievementFormData) => void
}) {
	return (
		<View style={styles.timelineWrapper}>
			<AppTypography style={styles.timelineTitle}>
				Achievements & Recognition
			</AppTypography>

			<View style={styles.timelineContainer}>
				{data.map((item, index) => (
					<View key={item.id} style={styles.timelineRow}>
						<View style={styles.timelineLeft}>
							<View style={styles.timelineDot} />

							{index !== data.length - 1 && (
								<View style={styles.timelineLine} />
							)}
						</View>

						<View style={styles.timelineCard}>
							<View style={styles.timelineTopRow}>
								<View style={styles.timelineBadge}>
									<AppTypography
										style={styles.timelineBadgeText}
									>
										{item.category}
									</AppTypography>
								</View>

								<TouchableOpacity
									onPress={() => onEdit(item)}
								>
									<MaterialCommunityIcons
										name="pencil-outline"
										size={20}
										color="#7a7a7a"
									/>
								</TouchableOpacity>
							</View>

							<AppTypography style={styles.timelineItemTitle}>
								{item.title}
							</AppTypography>

							<View style={styles.timelineMetaRow}>
								<AppTypography style={styles.timelineMeta}>
									🏛 {item.organization}
								</AppTypography>

								<AppTypography style={styles.timelineMeta}>
									📅 {item.date}
								</AppTypography>
							</View>

							<AppTypography
								style={styles.timelineDescription}
							>
								{item.description}
							</AppTypography>

							{item.image && (
								<Image
									source={{ uri: item.image }}
									style={styles.timelineImage}
								/>
							)}
						</View>
					</View>
				))}

				<View style={styles.addMoreContainer}>
					<MaterialCommunityIcons
						name="plus-circle-outline"
						size={52}
						color="#c2cccc"
					/>

					<AppTypography style={styles.addMoreTitle}>
						Add more milestones
					</AppTypography>

					<AppTypography style={styles.addMoreSubTitle}>
						Keep your profile updated with your latest recognitions
						and academic achievements.
					</AppTypography>

					<TouchableOpacity
						style={styles.configureButton}
						onPress={onAddNew}
					>
						<AppTypography style={styles.configureText}>
							Configure New Entry
						</AppTypography>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	)
}

function AddAchievementForm({
	isTablet,
	isCompact,
	onCancel,
	onBack,
	onSave,
	initialData,
	isSaving,
}: {
	isTablet: boolean
	isCompact: boolean
	onCancel: () => void
	onBack: () => void
	onSave: (data: AchievementFormData) => void
	initialData?: AchievementFormData | null
	isSaving: boolean
}) {
	const [title, setTitle] = useState(
		initialData?.title || ''
	)

	const [organization, setOrganization] = useState(
		initialData?.organization || ''
	)

	const [description, setDescription] = useState(
		initialData?.description || ''
	)

	const [date, setDate] = useState(
		initialData?.date || ''
	)

	const [selectedCategory, setSelectedCategory] =
		useState(initialData?.category || 'Certification')

	const [isPublic, setIsPublic] = useState(
		initialData?.isPublic ?? true
	)

	const [uploadedImage, setUploadedImage] =
		useState<string | null>(initialData?.image || null)

	const handleSubmit = () => {
		const payload: AchievementFormData = {
			id: initialData?.id || Date.now().toString(),
			title: title.trim(),
			category: selectedCategory,
			description: description.trim(),
			organization: organization.trim(),
			date: date.trim(),
			image: uploadedImage,
			isPublic,
		}

		if (!payload.title) {
			Alert.alert('Validation', 'Achievement title is required.')
			return
		}

		if (!payload.category) {
			Alert.alert('Validation', 'Please select an achievement category.')
			return
		}

		if (!payload.organization) {
			Alert.alert('Validation', 'Issuing organization or hospital is required.')
			return
		}

		if (!payload.date) {
			Alert.alert('Validation', 'Date awarded is required.')
			return
		}

		if (!/^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{4}$/.test(payload.date)) {
			Alert.alert('Validation', 'Enter date as YYYY-MM-DD or MM/DD/YYYY.')
			return
		}

		onSave(payload)
	}

	const pickImage = async () => {
		const permissionResult =
			await ImagePicker.requestMediaLibraryPermissionsAsync()

		if (!permissionResult.granted) {
			Alert.alert('Permission needed', 'Permission to access gallery is required.')
			return
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.Images,
			allowsEditing: true,
			quality: 1,
		})

		if (!result.canceled) {
			setUploadedImage(result.assets[0].uri)
		}
	}

	return (
		<View style={[styles.formWrapper, isCompact && styles.formWrapperCompact]}>
			<View style={styles.formHeader}>
				<TouchableOpacity
					style={styles.iconBackButton}
					onPress={onBack}
					activeOpacity={0.8}
					accessibilityRole="button"
					accessibilityLabel="Go back"
				>
					<MaterialCommunityIcons name="chevron-left" size={28} color={TEAL} />
				</TouchableOpacity>

				<View style={styles.formHeadingText}>
					<AppTypography style={styles.formEyebrow}>
						Profile
					</AppTypography>

					<AppTypography style={styles.formTitle}>
						{initialData ? 'Edit Achievement' : 'Add Your Achievement'}
					</AppTypography>
				</View>
			</View>

			<View style={styles.profileCard}>
				<View style={styles.profileRow}>
					<View style={styles.avatar} />

					<View style={{ flex: 1 }}>
						<AppTypography style={styles.doctorName}>
							Dr. Anjali Singh
						</AppTypography>

						<AppTypography style={styles.doctorSpeciality}>
							Chief Surgeon, Cardiology
						</AppTypography>
					</View>
				</View>

				<View style={styles.quoteContainer}>
					<View style={styles.quoteBar} />

					<AppTypography style={styles.quoteText}>
						"Highlighting your professional milestones builds trust
						with patients and peers."
					</AppTypography>
				</View>
			</View>

			{/* <View style={styles.statsCard}>
				<AppTypography style={styles.statsTitle}>
					Current Stats
				</AppTypography>

				<View style={styles.statRow}>
					<AppTypography style={styles.statLabel}>
						Total Achievements
					</AppTypography>

					<AppTypography style={styles.statValue}>
						12
					</AppTypography>
				</View>

				<View style={styles.divider} />

				<View style={styles.statRow}>
					<AppTypography style={styles.statLabel}>
						Verification Status
					</AppTypography>

					<View style={styles.verifiedBadge}>
						<AppTypography style={styles.verifiedText}>
							VERIFIED
						</AppTypography>
					</View>
				</View>
			</View> */}

			<View style={styles.formCard}>
				<AppTypography style={styles.inputLabel}>
					Achievement Title
				</AppTypography>

				<AppInput
					value={title}
					onChangeText={setTitle}
					placeholder="e.g. Outstanding Contribution to Cardiology 2024"
					placeholderTextColor="#98A4AA"
					style={styles.input}
					contentStyle={styles.inputContent}
					outlineStyle={styles.inputOutline}
					outlineColor="#d9e2e2"
					activeOutlineColor={TEAL}
					textColor={TEXT}
					noMargin
					dense
				/>

				<View
					style={[
						styles.responsiveRow,
						isTablet && styles.responsiveRowTablet,
					]}
				>
					<View style={styles.flexOne}>
						<AppTypography style={styles.inputLabel}>
							Achievement Category
						</AppTypography>

						<View style={styles.categoryGrid}>
							{FORM_CATEGORIES.map((item) => {
								const active = selectedCategory === item

								return (
									<TouchableOpacity
										key={item}
										onPress={() => setSelectedCategory(item)}
										style={[
											styles.categoryChip,
											isCompact && styles.categoryChipCompact,
											active && styles.categoryChipActive,
										]}
									>
										<AppTypography
											style={[
												styles.categoryText,
												active && styles.categoryTextActive,
											]}
										>
											{item}
										</AppTypography>
									</TouchableOpacity>
								)
							})}
						</View>
					</View>

					<View
						style={[
							styles.dateContainer,
							isTablet && { marginLeft: 16 },
						]}
					>
						<AppTypography style={styles.inputLabel}>
							Date Awarded
						</AppTypography>

						<AppInput
							value={date}
							onChangeText={setDate}
							placeholder="YYYY-MM-DD"
							placeholderTextColor="#98A4AA"
							style={styles.input}
							contentStyle={styles.inputContent}
							outlineStyle={styles.inputOutline}
							outlineColor="#d9e2e2"
							activeOutlineColor={TEAL}
							textColor={TEXT}
							right={<AppInput.Icon icon="calendar-month-outline" color={TEAL} />}
							noMargin
							dense
						/>
					</View>
				</View>

				<AppTypography style={styles.inputLabel}>
					Issuing Organization / Hospital
				</AppTypography>

				<AppInput
					value={organization}
					onChangeText={setOrganization}
					placeholder="e.g. Royal College of Surgeons"
					placeholderTextColor="#98A4AA"
					style={styles.input}
					contentStyle={styles.inputContent}
					outlineStyle={styles.inputOutline}
					outlineColor="#d9e2e2"
					activeOutlineColor={TEAL}
					textColor={TEXT}
					noMargin
					dense
				/>

				<AppTypography style={styles.inputLabel}>
					Description
				</AppTypography>

				<AppInput
					value={description}
					onChangeText={setDescription}
					multiline
					textAlignVertical="top"
					placeholder="Describe the significance of this achievement..."
					placeholderTextColor="#98A4AA"
					style={styles.textArea}
					contentStyle={styles.textAreaContent}
					outlineStyle={styles.inputOutline}
					outlineColor="#d9e2e2"
					activeOutlineColor={TEAL}
					textColor={TEXT}
					noMargin
					dense
				/>

				<AppTypography style={styles.inputLabel}>
					Verification Document / Photo
				</AppTypography>

				<View style={styles.uploadBox}>
					<TouchableOpacity
						style={styles.uploadTouch}
						onPress={pickImage}
						activeOpacity={0.8}
					>
						{uploadedImage ? (
							<Image
								source={{ uri: uploadedImage }}
								style={styles.uploadedImage}
								resizeMode="cover"
							/>
						) : (
							<>
								<View style={styles.uploadCircle}>
									<MaterialCommunityIcons
										name="file-upload-outline"
										size={24}
										color={TEAL}
									/>
								</View>

								<AppTypography style={styles.uploadText}>
									Click to upload image
								</AppTypography>

								<AppTypography style={styles.uploadSubtext}>
									JPG or PNG
								</AppTypography>
							</>
						)}
					</TouchableOpacity>
				</View>

				<View style={styles.toggleContainer}>
					<View style={{ flex: 1 }}>
						<AppTypography style={styles.toggleTitle}>
							Show on public profile
						</AppTypography>

						<AppTypography style={styles.toggleSubtitle}>
							Visible to patients and potential recruits
						</AppTypography>
					</View>

					<Switch
						value={isPublic}
						onValueChange={setIsPublic}
						trackColor={{ false: '#cfd8dc', true: TEAL }}
					/>
				</View>

				<View style={[styles.buttonRow, isCompact && styles.buttonRowCompact]}>
					<TouchableOpacity
						style={[styles.cancelButton, isCompact && styles.actionButtonCompact]}
						onPress={onCancel}
						disabled={isSaving}
					>
						<AppTypography style={styles.cancelText}>
							Cancel
						</AppTypography>
					</TouchableOpacity>

					<TouchableOpacity
						style={[
							styles.saveButton,
							isCompact && styles.actionButtonCompact,
							isSaving && styles.saveButtonDisabled,
						]}
						onPress={handleSubmit}
						disabled={isSaving}
					>
						<AppTypography style={styles.saveText}>
							{isSaving ? 'Saving...' : 'Save Achievement'}
						</AppTypography>
					</TouchableOpacity>
				</View>
			</View>
		</View>
	)
}

export default function AchievementsTab() {
	const navigation = useNavigation<any>()
	const { width, height } = useWindowDimensions()

	const isTablet = width >= 768
	const isLandscape = width > height
	const isCompact = width < 380

	const [showForm, setShowForm] = useState(false)

	const [achievements, setAchievements] = useState<AchievementFormData[]>(
		MOCK_ACHIEVEMENTS
	)

	const [editingItem, setEditingItem] = useState<AchievementFormData | null>(null)

	const [isSaving, setIsSaving] = useState(false)

	const contentWidth = useMemo(() => {
		if (width >= 1180) return 980
		if (width >= 768) return Math.min(width - 48, 860)
		return width
	}, [width])

	const closeForm = () => {
		setShowForm(false)
		setEditingItem(null)
	}

	const handleBack = () => {
		if (showForm) {
			closeForm()
			return
		}

		if (navigation.canGoBack()) {
			navigation.goBack()
		}
	}

	const handleSave = (data: AchievementFormData) => {
		try {
			setIsSaving(true)
			setAchievements((currentAchievements) => {
				if (!editingItem) return [data, ...currentAchievements]

				return currentAchievements.map((item) =>
					item.id === editingItem.id ? data : item
				)
			})
			closeForm()
			Alert.alert(
				'Success',
				editingItem
					? 'Achievement updated locally.'
					: 'Achievement saved locally.'
			)
		} catch (error) {
			console.log('[AchievementsTab] save error:', error)
			Alert.alert(
				'Error',
				(error as any)?.message || 'Unable to save achievement right now.'
			)
		} finally {
			setIsSaving(false)
		}
	}

	return (
		<View style={styles.screen}>
			<View
				style={[
					styles.phoneShell,
					{ maxWidth: contentWidth },
					isLandscape &&
						isTablet && {
							maxWidth: 1100,
						},
				]}
			>
				<ScrollView
					style={styles.scrollView}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					contentContainerStyle={{
						flexGrow: 1,
						paddingBottom: 0,
					}}
				>
					{showForm ? (
						<KeyboardAvoidingView
							behavior={Platform.OS === 'ios' ? 'padding' : undefined}
							style={styles.keyboardAvoidingView}
						>
							<AddAchievementForm
								isTablet={isTablet}
								isCompact={isCompact}
								initialData={editingItem}
								onBack={handleBack}
								onCancel={closeForm}
								onSave={handleSave}
								isSaving={isSaving}
							/>
						</KeyboardAvoidingView>
					) : achievements.length > 0 ? (
						<AchievementTimeline
							data={achievements}
							onAddNew={() => {
								setEditingItem(null)
								setShowForm(true)
							}}
							onEdit={(item) => {
								setEditingItem(item)
								setShowForm(true)
							}}
						/>
					) : (
						<View
							style={[
								styles.scrollContent,
								isTablet && styles.scrollContentTablet,
							]}
						>
							<EmptyState
								isTablet={isTablet}
								onAdd={() => setShowForm(true)}
							/>

							<View
								style={[
									styles.section,
									isTablet && styles.sectionTablet,
								]}
							>
								<AppTypography
									variant="caption"
									style={styles.sectionTitle}
								>
									What you can add
								</AppTypography>

								<View style={styles.cardList}>
									{ACHIEVEMENT_OPTIONS.map((item) => (
										<AchievementCard
											key={item.title}
											item={item}
											useGrid={isTablet}
										/>
									))}
								</View>
							</View>
						</View>
					)}
				</ScrollView>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: BACKGROUND,
	},

	phoneShell: {
		width: '100%',
		flex: 1,
		alignSelf: 'center',
	},

	scrollView: {
		flex: 1,
	},

	scrollContent: {
		padding: 20,
		paddingTop: 10,
	},

	scrollContentTablet: {
		paddingHorizontal: 32,
		paddingTop: 20,
	},

	emptyState: {
		alignItems: 'center',
	},

	heroImage: {
		width: 180,
		height: 160,
		marginBottom: 18,
	},

	heroImageTablet: {
		width: 240,
		height: 210,
	},

	emptyTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: TEXT,
		textAlign: 'center',
	},

	emptyDescription: {
		fontSize: 14,
		lineHeight: 22,
		textAlign: 'center',
		color: MUTED,
		maxWidth: 300,
		marginTop: 12,
	},

	emptyDescriptionTablet: {
		maxWidth: 480,
	},

	addButton: {
		marginTop: 24,
		height: 48,
		paddingHorizontal: 24,
		borderRadius: 12,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
	},

	addButtonText: {
		color: '#fff',
		fontWeight: '700',
		marginLeft: 8,
	},

	section: {
		marginTop: 44,
	},

	sectionTablet: {
		marginTop: 54,
	},

	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		color: TEXT,
		marginBottom: 18,
	},

	cardList: {
		gap: 16,
	},

	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 18,
		borderWidth: 1,
		borderColor: '#e7eeee',
	},

	cardTablet: {
		width: '48%',
	},

	cardIconBox: {
		width: 42,
		height: 42,
		borderRadius: 10,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 14,
	},

	cardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: TEXT,
		marginBottom: 8,
	},

	cardDescription: {
		fontSize: 13,
		lineHeight: 20,
		color: MUTED,
	},

	formWrapper: {
		padding: 16,
		paddingTop: 12,
		width: '100%',
	},

	formWrapperCompact: {
		paddingHorizontal: 12,
	},

	keyboardAvoidingView: {
		flex: 1,
	},

	loadingContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: BACKGROUND,
	},

	formHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
	},

	iconBackButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#dde8e8',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},

	formHeadingText: {
		flex: 1,
		minWidth: 0,
	},

	formEyebrow: {
		fontSize: 13,
		fontWeight: '700',
		color: TEAL,
	},

	formTitle: {
		fontSize: 24,
		lineHeight: 30,
		fontWeight: '700',
		color: TEXT,
		marginTop: 2,
	},

	profileCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
	},

	profileRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	avatar: {
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: '#d9eaea',
		marginRight: 14,
	},

	doctorName: {
		fontSize: 18,
		fontWeight: '700',
		color: TEXT,
	},

	doctorSpeciality: {
		fontSize: 13,
		color: MUTED,
		marginTop: 2,
	},

	quoteContainer: {
		marginTop: 18,
		flexDirection: 'row',
	},

	quoteBar: {
		width: 3,
		backgroundColor: TEAL,
		borderRadius: 20,
		marginRight: 10,
	},

	quoteText: {
		flex: 1,
		fontSize: 13,
		lineHeight: 20,
		color: MUTED,
	},

	// statsCard: {
	// 	backgroundColor: '#fff',
	// 	borderRadius: 16,
	// 	padding: 16,
	// 	marginBottom: 16,
	// },

	// statsTitle: {
	// 	fontSize: 16,
	// 	fontWeight: '700',
	// 	marginBottom: 14,
	// 	color: TEXT,
	// },

	// statRow: {
	// 	flexDirection: 'row',
	// 	alignItems: 'center',
	// 	justifyContent: 'space-between',
	// 	paddingVertical: 10,
	// },

	// statLabel: {
	// 	fontSize: 14,
	// 	color: MUTED,
	// },

	// statValue: {
	// 	fontSize: 14,
	// 	fontWeight: '700',
	// 	color: TEAL,
	// },

	// verifiedBadge: {
	// 	backgroundColor: '#dff7ef',
	// 	paddingHorizontal: 10,
	// 	paddingVertical: 4,
	// 	borderRadius: 30,
	// },

	// verifiedText: {
	// 	fontSize: 11,
	// 	fontWeight: '700',
	// 	color: TEAL,
	// },

	divider: {
		height: 1,
		backgroundColor: '#edf2f2',
	},

	formCard: {
		backgroundColor: '#fff',
		borderRadius: 16,
		padding: 16,
	},

	inputLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: TEXT,
		marginBottom: 8,
		marginTop: 14,
	},

	input: {
		height: 50,
		backgroundColor: '#fafcfc',
	},
	inputContent: {
		height: 50,
		paddingVertical: 0,
		fontSize: 14,
	},
	inputOutline: {
		borderRadius: 12,
	},

	textArea: {
		height: 130,
		backgroundColor: '#fafcfc',
	},
	textAreaContent: {
		height: 130,
		paddingTop: 14,
		paddingBottom: 14,
		fontSize: 14,
	},

	responsiveRow: {
		flexDirection: 'column',
	},

	responsiveRowTablet: {
		flexDirection: 'row',
		alignItems: 'flex-start',
	},

	flexOne: {
		flex: 1,
	},

	dateContainer: {
		flex: 1,
		marginTop: 10,
		minWidth: 0,
	},

	categoryGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
	},

	categoryChip: {
		width: '31%',
		minWidth: 96,
		paddingVertical: 14,
		paddingHorizontal: 10,
		borderWidth: 1,
		borderColor: '#d9e2e2',
		borderRadius: 12,
		alignItems: 'center',
		backgroundColor: '#fafcfc',
	},

	categoryChipCompact: {
		width: '48%',
		minWidth: 0,
		paddingHorizontal: 8,
	},

	categoryChipActive: {
		borderColor: TEAL,
		backgroundColor: '#eef9f8',
	},

	categoryText: {
		fontSize: 13,
		color: MUTED,
		fontWeight: '600',
	},

	categoryTextActive: {
		color: TEAL,
	},

	uploadBox: {
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: '#cfd9d9',
		borderRadius: 14,
		paddingVertical: 34,
		alignItems: 'center',
		marginTop: 8,
		overflow: 'hidden',
	},

	uploadTouch: {
		width: '100%',
		alignItems: 'center',
		justifyContent: 'center',
	},

	uploadedImage: {
		width: '100%',
		height: 180,
		borderRadius: 12,
	},

	uploadCircle: {
		width: 54,
		height: 54,
		borderRadius: 27,
		backgroundColor: '#dff7ef',
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
	},

	uploadText: {
		fontSize: 14,
		fontWeight: '600',
		color: TEXT,
	},

	uploadSubtext: {
		fontSize: 12,
		color: MUTED,
		marginTop: 4,
	},

	toggleContainer: {
		marginTop: 20,
		padding: 16,
		backgroundColor: '#f5f8f8',
		borderRadius: 14,
		flexDirection: 'row',
		alignItems: 'center',
	},

	toggleTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: TEXT,
	},

	toggleSubtitle: {
		fontSize: 12,
		color: MUTED,
		marginTop: 4,
	},

	buttonRow: {
		marginTop: 24,
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},

	buttonRowCompact: {
		flexDirection: 'column-reverse',
		gap: 12,
	},

	cancelButton: {
		height: 46,
		paddingHorizontal: 24,
		borderRadius: 30,
		borderWidth: 1,
		borderColor: '#d9e2e2',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
	},

	saveButton: {
		height: 46,
		paddingHorizontal: 24,
		borderRadius: 30,
		backgroundColor: TEAL,
		alignItems: 'center',
		justifyContent: 'center',
	},

	saveButtonDisabled: {
		opacity: 0.65,
	},

	actionButtonCompact: {
		width: '100%',
		marginRight: 0,
	},

	cancelText: {
		color: TEXT,
		fontWeight: '600',
	},

	saveText: {
		color: '#fff',
		fontWeight: '700',
	},

	timelineWrapper: {
		padding: 16,
	},

	timelineTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: TEXT,
		marginBottom: 24,
	},

	timelineContainer: {
		paddingLeft: 10,
	},

	timelineRow: {
		flexDirection: 'row',
		marginBottom: 24,
	},

	timelineLeft: {
		width: 40,
		alignItems: 'center',
	},

	timelineDot: {
		width: 18,
		height: 18,
		borderRadius: 9,
		backgroundColor: TEAL,
		marginTop: 12,
	},

	timelineLine: {
		width: 2,
		flex: 1,
		backgroundColor: '#d7e1e1',
		marginTop: 4,
	},

	timelineCard: {
		flex: 1,
		backgroundColor: '#fff',
		borderRadius: 18,
		padding: 16,
		borderWidth: 1,
		borderColor: '#ebeeee',
	},

	timelineTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},

	timelineBadge: {
		backgroundColor: '#eef9f8',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 20,
	},

	timelineBadgeText: {
		fontSize: 11,
		fontWeight: '700',
		color: TEAL,
	},

	timelineItemTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: TEXT,
		marginTop: 12,
	},

	timelineMetaRow: {
		marginTop: 10,
	},

	timelineMeta: {
		fontSize: 13,
		color: MUTED,
		marginBottom: 6,
	},

	timelineDescription: {
		fontSize: 14,
		lineHeight: 22,
		color: MUTED,
		marginTop: 12,
	},

	timelineImage: {
		width: '100%',
		height: 180,
		borderRadius: 14,
		marginTop: 14,
	},

	addMoreContainer: {
		borderWidth: 1,
		borderStyle: 'dashed',
		borderColor: '#cfd9d9',
		borderRadius: 20,
		paddingVertical: 40,
		alignItems: 'center',
		marginLeft: 40,
	},

	addMoreTitle: {
		fontSize: 24,
		fontWeight: '700',
		color: '#9aa5a5',
		marginTop: 16,
	},

	addMoreSubTitle: {
		fontSize: 13,
		lineHeight: 20,
		color: '#a0aaaa',
		textAlign: 'center',
		maxWidth: 300,
		marginTop: 10,
	},

	configureButton: {
		marginTop: 20,
		borderWidth: 1,
		borderColor: TEAL,
		paddingHorizontal: 22,
		paddingVertical: 12,
		borderRadius: 30,
	},

	configureText: {
		color: TEAL,
		fontWeight: '700',
		fontSize: 14,
	},
})
