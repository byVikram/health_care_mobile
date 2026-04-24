import React from 'react'
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'

interface AppHeaderProps {
	userName?: string
	location?: string
	avatarUri?: string
	onAvatarPress: () => void

	searchValue?: string
	onSearchChange?: (text: string) => void
	onSearchSubmit?: () => void

	variant?: 'home' | 'search'
	isSearchEditable?: boolean
	onSearchPress?: () => void
}

export default function AppHeader({
	userName = 'User',
	location = 'KR Market',
	avatarUri,
	onAvatarPress,
	searchValue,
	onSearchChange,
	onSearchSubmit,
	variant = 'home',
	isSearchEditable = true,
	onSearchPress,
}: AppHeaderProps) {
	const insets = useSafeAreaInsets()
	const navigation = useNavigation<any>()

	return (
		<View style={[styles.wrapper, { paddingTop: insets.top + 16 }]}>
			<View style={styles.waveOne} />
			<View style={styles.waveTwo} />

			{/* ── ROW 1: home variant only ── */}
			{variant === 'home' && (
				<View style={styles.topRow}>
					<Pressable onPress={onAvatarPress} style={styles.profileRow}>
						<Image
							source={
								avatarUri ? { uri: avatarUri } : require('../../assets/Banner/patient.png')
							}
							style={styles.avatar}
						/>
						<View>
							<Text style={styles.helloText}>
								<Text style={styles.helloAccent}>Hello, </Text>
								{userName}
							</Text>
							<View style={styles.locationRow}>
								<MaterialCommunityIcons name="map-marker-outline" size={16} color="#f2f4f4" />
								<Text style={styles.locationText}>{location}</Text>
								<MaterialCommunityIcons name="chevron-down" size={16} color="#f2f4f4" />
							</View>
						</View>
					</Pressable>

					<View style={styles.actionsRow}>
						<Pressable
							style={styles.actionButton}
							onPress={() => navigation.navigate('Notification')}
						>
							<MaterialCommunityIcons name="bell-outline" size={22} color="#1b5f66" />
							<View style={styles.notificationDot} />
						</Pressable>
						<Pressable
							style={styles.actionButton}
							onPress={() => navigation.navigate('FavouriteDoctor')}
						>
							<MaterialCommunityIcons name="heart-outline" size={22} color="#1b5f66" />
						</Pressable>
					</View>
				</View>
			)}

			{/* ── ROW 2: search variant only ── */}
			{variant === 'search' && (
				<View style={styles.onlyLocationRow}>
					<MaterialCommunityIcons name="map-marker-outline" size={18} color="#fff" />
					<Text style={styles.locationTextBig}>{location}</Text>
					<MaterialCommunityIcons name="chevron-down" size={18} color="#fff" />
				</View>
			)}

			{/* ── ROW 3: search bar — both variants ── */}
			<View style={styles.searchContainer}>
				<MaterialCommunityIcons name="magnify" size={24} color="#26727a" />

				<TextInput
					placeholder="Search Doctors/Symptoms"
					placeholderTextColor="#8b8e94"
					style={styles.searchInput}
					value={searchValue}
					onChangeText={onSearchChange}
					editable={isSearchEditable}
					returnKeyType="search"
					autoFocus={isSearchEditable}
					onSubmitEditing={() => onSearchSubmit?.()}
				/>

				<MaterialCommunityIcons name="microphone-outline" size={22} color="#26727a" />

				{/*
					KEY FIX: When non-editable (Home screen), TextInput swallows touches
					silently. A fully transparent absoluteFill Pressable on top reliably
					captures the tap and fires onSearchPress — no timing issues.
				*/}
				{!isSearchEditable && onSearchPress && (
					<Pressable
						onPress={onSearchPress}
						style={StyleSheet.absoluteFillObject}
						android_ripple={null}
					/>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: '#1f5f68',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		overflow: 'hidden',
	},
	waveOne: {
		position: 'absolute',
		width: 420,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.06)',
		left: -140,
		top: -70,
		transform: [{ rotate: '-4deg' }],
	},
	waveTwo: {
		position: 'absolute',
		width: 430,
		height: 240,
		borderRadius: 120,
		backgroundColor: 'rgba(255,255,255,0.05)',
		left: -95,
		top: -22,
		transform: [{ rotate: '-4deg' }],
	},
	topRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	profileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flex: 1,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.5)',
		backgroundColor: '#fff',
	},
	helloText: {
		color: '#ffffff',
		fontSize: 18,
		fontWeight: '500',
	},
	helloAccent: {
		color: '#5dd0d7',
		fontWeight: '400',
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	locationText: {
		color: '#f2f4f4',
		fontSize: 12,
		marginHorizontal: 4,
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 8,
	},
	actionButton: {
		width: 44,
		height: 44,
		borderRadius: 10,
		backgroundColor: '#f1f1f1',
		alignItems: 'center',
		justifyContent: 'center',
		position: 'relative',
	},
	notificationDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#2fa748',
		position: 'absolute',
		top: 10,
		right: 10,
	},
	onlyLocationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		marginBottom: 10,
	},
	locationTextBig: {
		color: '#ffffff',
		fontSize: 14,
		fontWeight: '500',
	},
	searchContainer: {
		marginTop: 16,
		backgroundColor: '#f3f3f3',
		borderRadius: 10,
		height: 46,
		paddingHorizontal: 14,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		overflow: 'hidden',
	},
	searchInput: {
		flex: 1,
		fontSize: 16,
		color: '#333',
	},
})




