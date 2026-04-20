import React, { useMemo, useState } from 'react'
import {
	FlatList,
	Image,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppButton, AppTypography } from '../../../../components/common'
import { useAuth } from '../../../../context/AuthContext'

const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali']

type SelectDropdownProps = {
	label: string
	value?: string
	placeholder: string
	options: string[]
	onSelect: (value: string) => void
	openLogLabel?: string
	isMobile: boolean
	isTablet: boolean
}

type MultiSelectDropdownProps = {
	label: string
	values: string[]
	placeholder: string
	options: string[]
	onChange: (values: string[]) => void
	openLogLabel?: string
	isMobile: boolean
	isTablet: boolean
}

type InputFieldProps = {
	label: string
	value: string
	onChangeText: (value: string) => void
	placeholder: string
	focusLogLabel?: string
	rightIcon?: React.ComponentProps<typeof MaterialCommunityIcons>['name']
	rightIconColor?: string
	keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType']
	autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize']
	maxLength?: number
	leftAccessory?: React.ReactNode
}

function FieldShell({
	label,
	children,
	isMobile,
	isTablet,
}: {
	label: string
	children: React.ReactNode
	isMobile: boolean
	isTablet: boolean
}) {
	return (
		<View style={styles.fieldGroup}>
			<AppTypography
				variant="caption"
				style={[
					styles.fieldLabel,
					isTablet && styles.fieldLabelTablet,
					isMobile && styles.fieldLabelMobile,
				]}
			>
				{label}
			</AppTypography>
			{children}
		</View>
	)
}

function InputField({
	label,
	value,
	onChangeText,
	placeholder,
	focusLogLabel,
	rightIcon,
	rightIconColor = '#6b8790',
	keyboardType = 'default',
	autoCapitalize = 'sentences',
	maxLength,
	leftAccessory,
}: InputFieldProps) {
	const [isFocused, setIsFocused] = useState(false)

	return (
		<View style={styles.fieldGroup}>
			<AppTypography variant="caption" style={styles.fieldLabel}>
				{label}
			</AppTypography>
			<View style={[styles.inputShell, isFocused && styles.inputShellFocused]}>
				{leftAccessory ? <View style={styles.leftAccessory}>{leftAccessory}</View> : null}
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={placeholder}
					placeholderTextColor="#9aacb3"
					style={styles.textInput}
					keyboardType={keyboardType}
					autoCapitalize={autoCapitalize}
					maxLength={maxLength}
					onFocus={() => {
						if (focusLogLabel) {
							console.log(focusLogLabel)
						}
						setIsFocused(true)
					}}
					onBlur={() => setIsFocused(false)}
				/>
				{rightIcon ? <MaterialCommunityIcons name={rightIcon} size={20} color={rightIconColor} /> : null}
			</View>
		</View>
	)
}

function SelectDropdown({
	label,
	value,
	placeholder,
	options,
	onSelect,
	openLogLabel,
	isMobile,
	isTablet,
}: SelectDropdownProps) {
	const [visible, setVisible] = useState(false)

	return (
		<FieldShell label={label} isMobile={isMobile} isTablet={isTablet}>
			<>
				<Pressable
					onPress={() => {
						if (openLogLabel) {
							console.log(openLogLabel)
						}
						setVisible(true)
					}}
					style={styles.inputShell}
				>
					<AppTypography variant="body" style={[styles.selectText, !value && styles.placeholderText]}>
						{value || placeholder}
					</AppTypography>
					<MaterialCommunityIcons name="chevron-down" size={22} color="#6b8790" />
				</Pressable>

				<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
					<Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
						<Pressable
							style={[
								styles.modalCard,
								isMobile && styles.modalCardMobile,
								isTablet && styles.modalCardTablet,
							]}
							onPress={(event) => event.stopPropagation()}
						>
							<View style={styles.modalHeader}>
								<AppTypography variant="h4" style={styles.modalTitle}>
									{label}
								</AppTypography>
								<TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<MaterialCommunityIcons name="close" size={22} color="#45636d" />
								</TouchableOpacity>
							</View>
							<FlatList
								data={options}
								keyExtractor={(item) => item}
								showsVerticalScrollIndicator={false}
								renderItem={({ item }) => {
									const isSelected = item === value
									return (
										<TouchableOpacity
											style={[styles.optionRow, isSelected && styles.optionRowActive]}
											onPress={() => {
												onSelect(item)
												setVisible(false)
											}}
										>
											<AppTypography variant="body" style={[styles.optionText, isSelected && styles.optionTextActive]}>
												{item}
											</AppTypography>
											{isSelected ? (
												<MaterialCommunityIcons name="check-circle" size={20} color="#147d75" />
											) : null}
										</TouchableOpacity>
									)
								}}
							/>
						</Pressable>
					</Pressable>
				</Modal>
			</>
		</FieldShell>
	)
}

function MultiSelectDropdown({
	label,
	values,
	placeholder,
	options,
	onChange,
	openLogLabel,
	isMobile,
	isTablet,
}: MultiSelectDropdownProps) {
	const [visible, setVisible] = useState(false)

	const summaryText = values.length ? values.join(', ') : placeholder

	const toggleValue = (value: string) => {
		if (values.includes(value)) {
			onChange(values.filter((item) => item !== value))
			return
		}

		onChange([...values, value])
	}

	return (
		<FieldShell label={label} isMobile={isMobile} isTablet={isTablet}>
			<>
				<Pressable
					onPress={() => {
						if (openLogLabel) {
							console.log(openLogLabel)
						}
						setVisible(true)
					}}
					style={styles.inputShell}
				>
					<AppTypography
						variant="body"
						numberOfLines={1}
						style={[styles.selectText, !values.length && styles.placeholderText]}
					>
						{summaryText}
					</AppTypography>
					<MaterialCommunityIcons name="chevron-down" size={22} color="#6b8790" />
				</Pressable>

				{values.length ? (
					<View style={styles.tagWrap}>
						{values.map((item) => (
							<View key={item} style={styles.tag}>
								<AppTypography variant="caption" style={styles.tagText}>
									{item}
								</AppTypography>
								<TouchableOpacity
									onPress={() => toggleValue(item)}
									hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
								>
									<MaterialCommunityIcons name="close" size={14} color="#147d75" />
								</TouchableOpacity>
							</View>
						))}
					</View>
				) : null}

				<Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
					<Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
						<Pressable
							style={[
								styles.modalCard,
								isMobile && styles.modalCardMobile,
								isTablet && styles.modalCardTablet,
							]}
							onPress={(event) => event.stopPropagation()}
						>
							<View style={styles.modalHeader}>
								<View>
									<AppTypography variant="h4" style={styles.modalTitle}>
										{label}
									</AppTypography>
									<AppTypography variant="caption" style={styles.modalSubtitle}>
										Select one or more languages
									</AppTypography>
								</View>
								<TouchableOpacity onPress={() => setVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
									<MaterialCommunityIcons name="close" size={22} color="#45636d" />
								</TouchableOpacity>
							</View>
							<FlatList
								data={options}
								keyExtractor={(item) => item}
								showsVerticalScrollIndicator={false}
								renderItem={({ item }) => {
									const isSelected = values.includes(item)
									return (
										<TouchableOpacity
											style={[styles.optionRow, isSelected && styles.optionRowActive]}
											onPress={() => toggleValue(item)}
										>
											<AppTypography variant="body" style={[styles.optionText, isSelected && styles.optionTextActive]}>
												{item}
											</AppTypography>
											<MaterialCommunityIcons
												name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
												size={22}
												color={isSelected ? '#147d75' : '#8ca1a9'}
											/>
										</TouchableOpacity>
									)
								}}
								ListFooterComponent={
									<View style={styles.modalFooter}>
										<AppButton variant="primary" onPress={() => setVisible(false)} style={styles.modalButton}>
											Done
										</AppButton>
									</View>
								}
							/>
						</Pressable>
					</Pressable>
				</Modal>
			</>
		</FieldShell>
	)
}

const formatDateInput = (rawValue: string) => {
	const digits = rawValue.replace(/\D/g, '').slice(0, 8)

	if (digits.length <= 2) return digits
	if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
	return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

export default function PersonalDetailsTab() {
	const { user } = useAuth()
	const { width } = useWindowDimensions()

	const isDesktop = width >= 1024
	const isTablet = width >= 768 && width < 1024
	const isMobile = width < 768
	const useTwoColumns = width >= 768

	const [fullName, setFullName] = useState(user?.name || 'Dr. Sarah Jenkins')
	const [location, setLocation] = useState('Bangalore, Karnataka')
	const [mobileNumber, setMobileNumber] = useState('98765 43210')
	const [email, setEmail] = useState(user?.email || 'sarah.jenkins@cityhospital.com')
	const [gender, setGender] = useState('Female')
	const [dob, setDob] = useState('12-10-1985')
	const [experience, setExperience] = useState('12')
	const [languages, setLanguages] = useState(['English', 'Hindi'])
	const [isSaving, setIsSaving] = useState(false)

	const emailIcon = isValidEmail(email) ? 'check-circle' : 'email-outline'
	const emailIconColor = isValidEmail(email) ? '#15966f' : '#6b8790'

	const layoutStyles = useMemo(() => {
		if (isDesktop) {
			return {
				outerPadding: 24,
				cardPadding: 24,
				gap: 24,
				formMaxWidth: 980,
				headerSpacing: 24,
			}
		}

		if (isTablet) {
			return {
				outerPadding: 20,
				cardPadding: 20,
				gap: 16,
				formMaxWidth: 840,
				headerSpacing: 20,
			}
		}

		return {
			outerPadding: 16,
			cardPadding: 16,
			gap: 14,
			formMaxWidth: 640,
			headerSpacing: 18,
		}
	}, [isDesktop, isTablet])

	const handleSave = () => {
		setIsSaving(true)
		setTimeout(() => setIsSaving(false), 1000)
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.contentContainer,
				{ paddingHorizontal: layoutStyles.outerPadding, paddingBottom: 40, paddingTop: layoutStyles.outerPadding },
			]}
			showsVerticalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
		>
			<View style={[styles.formShell, { maxWidth: layoutStyles.formMaxWidth }]}>
				<View
					style={[
						styles.headerCard,
						{
							padding: layoutStyles.cardPadding,
							marginBottom: layoutStyles.gap,
							flexDirection: isMobile ? 'column' : 'row',
							alignItems: isMobile ? 'flex-start' : 'center',
						},
					]}
				>
					<View style={[styles.avatarWrapper, { marginBottom: isMobile ? 14 : 0, marginRight: isMobile ? 0 : layoutStyles.headerSpacing }]}>
						<Image source={{ uri: user?.avatar || 'https://via.placeholder.com/150' }} style={styles.avatar} />
						<TouchableOpacity style={styles.editIconBadge} activeOpacity={0.85}>
							<MaterialCommunityIcons name="pencil" size={16} color="#fff" />
						</TouchableOpacity>
					</View>

					<View style={styles.headerTextBlock}>
						<AppTypography variant="h3" style={styles.headerTitle}>
							Personal Details
						</AppTypography>
						<AppTypography variant="body" style={styles.headerDescription}>
							Update your basic profile information with a layout that stays balanced on desktop, tablet, and mobile.
						</AppTypography>
					</View>
				</View>

				<View style={[styles.formCard, { padding: layoutStyles.cardPadding }]}>
					<View style={styles.formGrid}>
						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingRight: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<InputField
									label="Full Name"
									value={fullName}
									onChangeText={setFullName}
									placeholder="Enter full name"
									focusLogLabel="Full Name"
									rightIcon="account-outline"
									autoCapitalize="words"
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingLeft: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<InputField
									label="Location"
									value={location}
									onChangeText={setLocation}
									placeholder="Enter city, state"
									focusLogLabel="Location"
									rightIcon="map-marker-outline"
									autoCapitalize="words"
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingRight: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<InputField
									label="Mobile Number"
									value={mobileNumber}
									onChangeText={setMobileNumber}
									placeholder="Enter mobile number"
									focusLogLabel="Mobile Number"
									keyboardType="phone-pad"
									rightIcon="phone-outline"
									leftAccessory={
										<View style={styles.codePill}>
											<AppTypography variant="caption" style={styles.codeText}>
												+91
											</AppTypography>
										</View>
									}
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingLeft: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<InputField
									label="Email ID"
									value={email}
									onChangeText={setEmail}
									placeholder="Enter email"
									focusLogLabel="Email"
									keyboardType="email-address"
									autoCapitalize="none"
									rightIcon={emailIcon}
									rightIconColor={emailIconColor}
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingRight: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<SelectDropdown
									label="Gender"
									value={gender}
									placeholder="Select gender"
									options={GENDER_OPTIONS}
									onSelect={setGender}
									openLogLabel="Gender"
									isMobile={isMobile}
									isTablet={isTablet}
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingLeft: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<InputField
									label="DOB"
									value={dob}
									onChangeText={(value) => setDob(formatDateInput(value))}
									placeholder="DD-MM-YYYY"
									focusLogLabel="DOB"
									keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'numeric'}
									maxLength={10}
									rightIcon="calendar-month-outline"
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingRight: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<InputField
									label="Total Years of Experience"
									value={experience}
									onChangeText={setExperience}
									placeholder="Enter years of experience"
									focusLogLabel="Total Years of Experience"
									keyboardType="numeric"
									rightIcon="briefcase-outline"
								/>
							</View>
						</View>

						<View
							style={[
								styles.fieldColumn,
								{
									width: useTwoColumns ? '50%' : '100%',
									paddingLeft: useTwoColumns ? layoutStyles.gap / 2 : 0,
								},
							]}
						>
							<View style={styles.fieldContainer}>
								<MultiSelectDropdown
									label="Languages Known"
									values={languages}
									placeholder="Select languages"
									options={LANGUAGE_OPTIONS}
									onChange={setLanguages}
									openLogLabel="Languages Known"
									isMobile={isMobile}
									isTablet={isTablet}
								/>
							</View>
						</View>
					</View>

					<View style={[styles.footer, { marginTop: isMobile ? 10 : 16 }]}>
						<AppButton
							variant="primary"
							onPress={handleSave}
							loading={isSaving}
							style={[styles.saveButton, isMobile && styles.saveButtonMobile]}
						>
							Save Details
						</AppButton>
					</View>
				</View>
			</View>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	contentContainer: {
		alignItems: 'center',
	},
	formShell: {
		width: '100%',
	},
	headerCard: {
		backgroundColor: '#ffffff',
		borderRadius: 24,
		borderWidth: 1,
		borderColor: '#e4ecef',
	},
	avatarWrapper: {
		position: 'relative',
	},
	avatar: {
		width: 88,
		height: 88,
		borderRadius: 24,
		backgroundColor: '#e9f3f5',
	},
	editIconBadge: {
		position: 'absolute',
		right: -4,
		bottom: -4,
		width: 30,
		height: 30,
		borderRadius: 15,
		backgroundColor: '#147d75',
		alignItems: 'center',
		justifyContent: 'center',
		borderWidth: 2,
		borderColor: '#fff',
	},
	headerTextBlock: {
		flex: 1,
	},
	headerTitle: {
		color: '#1f3138',
		marginBottom: 6,
	},
	headerDescription: {
		color: '#6b7f88',
		fontSize: 14,
		lineHeight: 22,
	},
	formCard: {
		backgroundColor: '#ffffff',
		borderRadius: 24,
		borderWidth: 1,
		borderColor: '#e4ecef',
	},
	formGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		alignItems: 'flex-start',
	},
	fieldColumn: {
		marginBottom: 18,
	},
	fieldContainer: {
		width: '100%',
		position: 'relative',
	},
	fieldGroup: {
		width: '100%',
	},
	fieldLabel: {
		marginBottom: 8,
		marginLeft: 2,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '600',
		color: '#5f7780',
	},
	fieldLabelTablet: {
		fontSize: 13,
	},
	fieldLabelMobile: {
		fontSize: 13,
	},
	inputShell: {
		minHeight: 54,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#d7e2e7',
		backgroundColor: '#fcfefe',
		paddingHorizontal: 16,
		flexDirection: 'row',
		alignItems: 'center',
	},
	inputShellFocused: {
		borderColor: '#147d75',
		shadowColor: '#147d75',
		shadowOpacity: 0.08,
		shadowRadius: 10,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
	leftAccessory: {
		marginRight: 10,
	},
	codePill: {
		height: 30,
		paddingHorizontal: 10,
		borderRadius: 10,
		backgroundColor: '#e7f4f2',
		alignItems: 'center',
		justifyContent: 'center',
	},
	codeText: {
		color: '#147d75',
		fontWeight: '700',
		fontSize: 12,
	},
	textInput: {
		flex: 1,
		fontSize: 15,
		color: '#21343b',
		paddingVertical: 14,
		paddingHorizontal: 0,
	},
	selectText: {
		flex: 1,
		fontSize: 15,
		lineHeight: 22,
		color: '#21343b',
	},
	placeholderText: {
		color: '#9aacb3',
	},
	tagWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 10,
	},
	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#e8f5f3',
		borderRadius: 999,
		paddingVertical: 7,
		paddingLeft: 10,
		paddingRight: 8,
		marginRight: 8,
		marginBottom: 8,
	},
	tagText: {
		color: '#147d75',
		fontWeight: '600',
		marginRight: 4,
	},
	footer: {
		alignItems: 'flex-start',
	},
	saveButton: {
		minWidth: 180,
	},
	saveButtonMobile: {
		width: '100%',
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(17, 31, 37, 0.42)',
		justifyContent: 'center',
		paddingHorizontal: 20,
		paddingVertical: 24,
	},
	modalCard: {
		alignSelf: 'center',
		width: '100%',
		maxWidth: 460,
		maxHeight: '75%',
		backgroundColor: '#fff',
		borderRadius: 24,
		paddingVertical: 10,
	},
	modalCardTablet: {
		maxWidth: 500,
	},
	modalCardMobile: {
		maxWidth: '100%',
		borderRadius: 20,
	},
	modalHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingBottom: 10,
		paddingTop: 8,
	},
	modalTitle: {
		color: '#1f3138',
	},
	modalSubtitle: {
		marginTop: 4,
		color: '#7a9098',
	},
	optionRow: {
		minHeight: 52,
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderTopWidth: 1,
		borderTopColor: '#eff4f6',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	optionRowActive: {
		backgroundColor: '#f2fbfa',
	},
	optionText: {
		color: '#294049',
		flex: 1,
		marginRight: 12,
	},
	optionTextActive: {
		color: '#147d75',
		fontWeight: '600',
	},
	modalFooter: {
		paddingHorizontal: 20,
		paddingTop: 16,
		paddingBottom: 10,
	},
	modalButton: {
		width: '100%',
	},
})
