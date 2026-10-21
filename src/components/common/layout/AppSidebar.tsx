// src/components/common/layout/AppSidebar.tsx
//
// Left drawer shared by every role (KarolaHealth design 1a): 316px sheet with 20px right corners sliding in
// over an APP_COLORS.scrim backdrop; "KAROLAHEALTH" wordmark + close; mint profile card (avatar, name, optional
// id line, "View profile", optional MY QR button and profile-completion bar); optional FAMILY strip; grouped
// AppNavRow sections with caps headers; footer with Log out (confirm modal) and the app version.
// Callers decide the content: the rows come from the backend (navigation/useSidebarMenu); patients add the
// family strip and the QR button.
import React, { useEffect, useRef, useState } from 'react'
import {
	Animated,
	Easing,
	Image,
	Modal,
	PanResponder,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'
import QRCode from 'react-native-qrcode-svg'
import { useAuth } from '../../../context/AuthContext'
import { AppTextLink } from '../buttons/AppTextLink'
import { LogoutConfirmModal } from '../feedback/LogoutConfirmModal'
import { AppNavRow } from './AppNavRow'
import AppAvatar from '../display/AppAvatar'
import { AppAvatarStack, type AppAvatarStackItem } from '../display/AppAvatarStack'
import { AppIconTile } from '../display/AppIconTile'
import { AppProgressBar } from '../display/AppProgressBar'
import { APP_COLORS } from '../../../config/theme'
import { USER_ROLES } from '../../../constants/constants'

export interface AppSidebarItem {
	id: string
	label: string
	icon: React.ReactNode
	onPress: () => void
	/** Right-hand value before the chevron, e.g. an <AppTag /> with the wallet balance. */
	value?: React.ReactNode
	accessibilityLabel?: string
}

/** A group of drawer rows under an optional caps header ("BOOKINGS & ORDERS"). */
export interface AppSidebarSection {
	id: string
	title?: string
	items: AppSidebarItem[]
}

/** FAMILY strip: overlapping member avatars, a dashed "+" add button and "Manage ›". */
export interface AppSidebarFamily {
	members: AppAvatarStackItem[]
	onAdd: () => void
	onManage: () => void
	onPressMember?: (member: AppAvatarStackItem, index: number) => void
}

interface AppSidebarProps {
	visible: boolean
	onClose: () => void
	onLogout: () => void
	/** "View profile" (and a tap anywhere on the profile card). */
	onEditProfile?: () => void
	/** The drawer rows, grouped under optional caps headers. */
	sections?: AppSidebarSection[]
	/** Defaults to useAuth().user.name. */
	profileName?: string
	/** Defaults to useAuth().user.avatar. */
	avatarUri?: string | null
	/** 12/16 600 muted line under the name, e.g. "ID · KH-000123". */
	profileSubtitle?: string
	/** 0-100; shows the progress bar when a number. */
	profileCompletion?: number | null
	/** "Complete" link next to the progress bar. */
	onCompleteProfile?: () => void
	/** Shows the MY QR button (patients). */
	onOpenQr?: () => void
	/** Value rendered in the MY QR button's mini code (falls back to a QR glyph). */
	qrValue?: string
	family?: AppSidebarFamily
}

const MAX_SIDEBAR_WIDTH = 316
const OPEN_MS = 240
const CLOSE_MS = 200
// Dragging the drawer left past this fraction of its width (or flicking faster than this) closes it.
const DISMISS_DRAG_RATIO = 0.25
const DISMISS_DRAG_VELOCITY = 0.5
const DRAG_START_THRESHOLD = 8

/** "1.4.2" -> "1.4" */
const shortVersion = (v?: string | null) => {
	if (!v) return ''
	const parts = v.split('.')
	return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : v
}

const APP_VERSION = shortVersion(Constants.expoConfig?.version ?? null)

export default function AppSidebar({
	visible,
	onClose,
	onLogout,
	onEditProfile,
	sections = [],
	profileName,
	avatarUri,
	profileSubtitle,
	profileCompletion,
	onCompleteProfile,
	onOpenQr,
	qrValue,
	family,
}: AppSidebarProps) {
	const insets = useSafeAreaInsets()
	const { width: windowWidth } = useWindowDimensions()
	const sidebarWidth = Math.min(MAX_SIDEBAR_WIDTH, windowWidth - 48)
	const translateX = useRef(new Animated.Value(-sidebarWidth)).current
	const backdropOpacity = useRef(new Animated.Value(0)).current
	const { user, role } = useAuth()
	const [mounted, setMounted] = useState(visible)
	const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false)
	const [imageError, setImageError] = useState(false)

	const isPatient = role === USER_ROLES.PATIENT
	const userName = profileName || user?.name || 'User'
	const profileImageUrl = avatarUri !== undefined ? avatarUri : (user?.avatar ?? null)

	useEffect(() => {
		setImageError(false)
	}, [profileImageUrl])

	// no stock photo stands in for a missing one: the profile card shows the person's initials instead
	const hasPhoto = !!profileImageUrl && !imageError

	const progress =
		typeof profileCompletion === 'number' && Number.isFinite(profileCompletion)
			? Math.round(Math.min(100, Math.max(0, profileCompletion)))
			: null

	// Keep the modal mounted until the slide-out finishes.
	useEffect(() => {
		if (visible) {
			setMounted(true)
			translateX.setValue(-sidebarWidth)
			backdropOpacity.setValue(0)
			Animated.parallel([
				Animated.timing(translateX, {
					toValue: 0,
					duration: OPEN_MS,
					easing: Easing.out(Easing.cubic),
					useNativeDriver: true,
				}),
				Animated.timing(backdropOpacity, { toValue: 1, duration: OPEN_MS, useNativeDriver: true }),
			]).start()
			return
		}
		Animated.parallel([
			Animated.timing(translateX, {
				toValue: -sidebarWidth,
				duration: CLOSE_MS,
				easing: Easing.in(Easing.quad),
				useNativeDriver: true,
			}),
			Animated.timing(backdropOpacity, { toValue: 0, duration: CLOSE_MS, useNativeDriver: true }),
		]).start(({ finished }) => {
			if (finished) setMounted(false)
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	// Drag the drawer toward its edge to close it, like pulling a bottom sheet down. Captures clearly
	// horizontal-left drags so it also works when the finger starts on the list or a row.
	const onCloseRef = useRef(onClose)
	onCloseRef.current = onClose
	const sidebarWidthRef = useRef(sidebarWidth)
	sidebarWidthRef.current = sidebarWidth

	const resetPosition = () => {
		Animated.parallel([
			Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
			Animated.timing(backdropOpacity, { toValue: 1, duration: 120, useNativeDriver: true }),
		]).start()
	}

	const isLeftDrag = (dx: number, dy: number) => dx < -DRAG_START_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.2

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, g) => isLeftDrag(g.dx, g.dy),
			onMoveShouldSetPanResponderCapture: (_, g) => isLeftDrag(g.dx, g.dy),
			onPanResponderMove: (_, g) => {
				const dx = Math.min(0, g.dx)
				translateX.setValue(dx)
				backdropOpacity.setValue(Math.max(0, 1 + dx / sidebarWidthRef.current))
			},
			onPanResponderRelease: (_, g) => {
				if (g.dx < -sidebarWidthRef.current * DISMISS_DRAG_RATIO || g.vx < -DISMISS_DRAG_VELOCITY) {
					onCloseRef.current() // the `visible` effect animates the rest of the way out
				} else {
					resetPosition()
				}
			},
			onPanResponderTerminate: resetPosition,
			onPanResponderTerminationRequest: () => false,
		})
	).current

	const handleEditProfile = () => {
		onClose()
		onEditProfile?.()
	}

	const handleConfirmLogout = () => {
		setLogoutConfirmVisible(false)
		onLogout()
	}

	const allSections = sections.filter((s) => s.items.length > 0)

	const renderLeading = (icon: AppSidebarItem['icon']) => (
		<AppIconTile size={34} radius={10} backgroundColor={APP_COLORS.pageBg}>
			{icon}
		</AppIconTile>
	)

	return (
		<>
			<Modal
				visible={mounted && !logoutConfirmVisible}
				transparent
				animationType="none"
				statusBarTranslucent
				onRequestClose={onClose}
			>
				<View style={styles.modalRoot}>
					<Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}>
						<Pressable
							style={StyleSheet.absoluteFill}
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel="Close menu"
						/>
					</Animated.View>

					<Animated.View
						style={[styles.sidebar, { width: sidebarWidth, transform: [{ translateX }] }]}
						{...panResponder.panHandlers}
						accessibilityViewIsModal
						accessibilityLabel="Menu"
					>
						<View style={[styles.topBar, { marginTop: insets.top }]}>
							<Text style={styles.wordmark}>KAROLAHEALTH</Text>
							<TouchableOpacity
								style={styles.closeButton}
								onPress={onClose}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel="Close menu"
							>
								<MaterialCommunityIcons name="close" size={22} color={APP_COLORS.ink} />
							</TouchableOpacity>
						</View>

						<ScrollView
							style={styles.scroll}
							contentContainerStyle={styles.scrollContent}
							showsVerticalScrollIndicator={false}
							keyboardShouldPersistTaps="handled"
							nestedScrollEnabled
							bounces
							alwaysBounceVertical
							overScrollMode="always"
						>
							{/* Profile card: tapping anywhere opens the profile (the QR button keeps its own action). */}
							<Pressable
								style={styles.profileCard}
								onPress={handleEditProfile}
								// On web role="button" renders a <button>, and the card contains other buttons (QR, link).
								accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
								accessibilityLabel={`${userName}. View profile`}
							>
								<View style={styles.profileRow}>
									{isPatient || !hasPhoto ? (
										<AppAvatar
											uri={profileImageUrl}
											name={userName}
											size={52}
											borderWidth={2}
											borderColor={APP_COLORS.surface}
										/>
									) : (
										<Image
											source={{ uri: profileImageUrl as string }}
											onError={() => setImageError(true)}
											style={styles.avatarImage}
										/>
									)}
									<View style={styles.profileInfo}>
										<Text style={styles.nameText} numberOfLines={1}>
											{userName}
										</Text>
										{!!profileSubtitle && (
											<Text style={styles.profileSubtitle} numberOfLines={1}>
												{profileSubtitle}
											</Text>
										)}
										<AppTextLink
											label="View profile"
											size="sm"
											onPress={handleEditProfile}
											style={styles.viewProfile}
										/>
									</View>
									{!!onOpenQr && (
										<TouchableOpacity
											style={styles.qrButton}
											onPress={onOpenQr}
											activeOpacity={0.8}
											accessibilityRole="button"
											accessibilityLabel="Show my health QR code"
										>
											{qrValue ? (
												<QRCode
													value={qrValue}
													size={44}
													color={APP_COLORS.ink}
													backgroundColor={APP_COLORS.surface}
												/>
											) : (
												<MaterialCommunityIcons
													name="qrcode"
													size={44}
													color={APP_COLORS.ink}
												/>
											)}
											<Text style={styles.qrLabel}>MY QR</Text>
										</TouchableOpacity>
									)}
								</View>

								{progress !== null && (
									<View style={styles.progressRow}>
										<AppProgressBar
											value={progress}
											label={`${progress}%`}
											accessibilityLabel={`Profile ${progress}% complete`}
											style={styles.progressBar}
										/>
										{!!onCompleteProfile && progress < 100 && (
											<AppTextLink
												label="Complete"
												size="sm"
												trailingIcon="none"
												onPress={() => {
													onClose()
													onCompleteProfile()
												}}
												textStyle={styles.completeLink}
											/>
										)}
									</View>
								)}
							</Pressable>

							{!!family && (
								<View style={styles.familyRow}>
									<Text style={styles.capsLabel}>FAMILY</Text>
									<View style={styles.familyAvatars}>
										{family.members.length > 0 && (
											<AppAvatarStack
												items={family.members}
												size={36}
												max={4}
												onPressItem={
													family.onPressMember
														? (m, i) => {
																onClose()
																family.onPressMember?.(m, i)
															}
														: undefined
												}
											/>
										)}
										<TouchableOpacity
											style={[
												styles.addMember,
												family.members.length > 0 && styles.addMemberSpaced,
											]}
											onPress={() => {
												onClose()
												family.onAdd()
											}}
											activeOpacity={0.75}
											hitSlop={4}
											accessibilityRole="button"
											accessibilityLabel="Add family member"
										>
											<MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
										</TouchableOpacity>
									</View>
									<AppTextLink
										label="Manage"
										size="sm"
										onPress={() => {
											onClose()
											family.onManage()
										}}
										accessibilityLabel="Manage family members"
									/>
								</View>
							)}

							{allSections.map((section) => (
								<View key={section.id} style={styles.section}>
									{!!section.title && (
										<Text style={[styles.capsLabel, styles.sectionTitle]}>{section.title}</Text>
									)}
									{section.items.map((item) => (
										<AppNavRow
											key={item.id}
											title={item.label}
											leading={renderLeading(item.icon)}
											value={item.value}
											accessibilityLabel={item.accessibilityLabel}
											onPress={() => {
												item.onPress()
												onClose()
											}}
											style={styles.navRow}
										/>
									))}
								</View>
							))}
							<View style={styles.scrollEnd} />
						</ScrollView>

						<View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
							<TouchableOpacity
								style={styles.logoutButton}
								onPress={() => setLogoutConfirmVisible(true)}
								activeOpacity={0.7}
								accessibilityRole="button"
								accessibilityLabel="Log out"
							>
								<MaterialCommunityIcons name="logout" size={20} color={APP_COLORS.danger} />
								<Text style={styles.logoutText}>Log out</Text>
							</TouchableOpacity>
							{!!APP_VERSION && <Text style={styles.versionText}>Version {APP_VERSION}</Text>}
						</View>
					</Animated.View>
				</View>
			</Modal>

			<LogoutConfirmModal
				visible={logoutConfirmVisible}
				onCancel={() => setLogoutConfirmVisible(false)}
				onConfirm={handleConfirmLogout}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	modalRoot: {
		flex: 1,
		flexDirection: 'row',
	},
	backdrop: {
		backgroundColor: APP_COLORS.scrim,
	},
	sidebar: {
		height: '100%',
		backgroundColor: APP_COLORS.surface,
		borderTopRightRadius: 20,
		borderBottomRightRadius: 20,
		overflow: 'hidden',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 8, height: 0 },
		shadowOpacity: 0.2,
		shadowRadius: 32,
		elevation: 16,
	},
	topBar: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingLeft: 16,
		paddingRight: 8,
	},
	wordmark: {
		fontSize: 13,
		lineHeight: 18,
		fontWeight: '800',
		letterSpacing: 0.5,
		color: APP_COLORS.primary,
	},
	closeButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		alignItems: 'center',
		justifyContent: 'center',
	},
	scroll: {
		flex: 1,
		minHeight: 0,
	},
	scrollContent: {
		paddingBottom: 16,
	},
	profileCard: {
		marginHorizontal: 12,
		padding: 12,
		borderRadius: 16,
		backgroundColor: APP_COLORS.mint,
		gap: 10,
	},
	profileRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	avatarImage: {
		width: 52,
		height: 52,
		borderRadius: 26,
		borderWidth: 2,
		borderColor: APP_COLORS.surface,
		backgroundColor: APP_COLORS.surface,
	},
	profileInfo: {
		flex: 1,
		minWidth: 0,
	},
	nameText: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	profileSubtitle: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '600',
		color: APP_COLORS.inkMuted,
	},
	viewProfile: {
		alignSelf: 'flex-start',
	},
	qrButton: {
		padding: 4,
		borderRadius: 10,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		gap: 2,
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.12,
		shadowRadius: 3,
		elevation: 2,
	},
	qrLabel: {
		fontSize: 10,
		lineHeight: 12,
		fontWeight: '800',
		letterSpacing: 0.4,
		color: APP_COLORS.primary,
	},
	progressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	progressBar: {
		flex: 1,
	},
	completeLink: {
		fontSize: 12,
		lineHeight: 16,
	},
	familyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		paddingTop: 12,
		paddingHorizontal: 16,
	},
	familyAvatars: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
	},
	addMember: {
		width: 36,
		height: 36,
		borderRadius: 18,
		borderWidth: 1.5,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
	},
	addMemberSpaced: {
		marginLeft: 6,
	},
	capsLabel: {
		fontSize: 11,
		lineHeight: 16,
		fontWeight: '700',
		letterSpacing: 0.66,
		color: APP_COLORS.inkMuted,
	},
	section: {
		gap: 2,
		paddingTop: 12,
		paddingBottom: 4,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		paddingBottom: 4,
	},
	navRow: {
		paddingHorizontal: 8,
		marginHorizontal: -8,
		borderRadius: 10,
	},
	scrollEnd: {
		height: 12,
	},
	footer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		paddingTop: 10,
		paddingHorizontal: 16,
		borderTopWidth: 1,
		borderTopColor: APP_COLORS.divider,
	},
	logoutButton: {
		height: 44,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 12,
		marginLeft: -12,
		borderRadius: 10,
	},
	logoutText: {
		fontSize: 15,
		fontWeight: '700',
		color: APP_COLORS.danger,
	},
	versionText: {
		fontSize: 12,
		lineHeight: 16,
		color: APP_COLORS.inkMuted,
	},
})
