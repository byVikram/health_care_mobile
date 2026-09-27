import React, { useEffect, useRef, useState } from 'react'
import {
	Animated,
	Easing,
	Modal,
	NativeScrollEvent,
	NativeSyntheticEvent,
	PanResponder,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	useWindowDimensions,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS, CARD_SHADOW } from '../../../config/theme'

export type AppBottomSheetProps = {
	visible: boolean
	title: string
	onClose: () => void
	children: React.ReactNode
	maxHeightRatio?: number
	/**
	 * When false the sheet's own ScrollView is replaced with a plain View,
	 * allowing the child to own all scrolling behaviour independently.
	 * Defaults to true.
	 */
	scrollEnabled?: boolean
	footer?: React.ReactNode
	/** Optional 13/18 muted line under the title. */
	subtitle?: string
	/** When set, shows a chevron-left button before the title (e.g. step back inside the sheet). */
	onBack?: () => void
	/** Accessibility label for the back button. Defaults to "Back". */
	backAccessibilityLabel?: string
	/** Bottom border under the header. Defaults to true (existing behaviour); design sheets use false. */
	showHeaderDivider?: boolean
	/**
	 * 'default' keeps the existing chrome. 'modern' applies the KarolaHealth design: APP_COLORS.scrim
	 * backdrop, 40x4 APP_COLORS.divider handle, 18/26 700 APP_COLORS.ink title, APP_COLORS.ink close icon, APP_COLORS shadow.
	 */
	appearance?: 'default' | 'modern'
	/**
	 * When false the user can't dismiss the sheet (backdrop tap, drag, Android back, close button),
	 * e.g. while a submit is in flight. The parent can still close it via `visible`. Defaults to true.
	 */
	dismissible?: boolean
}

// Releasing after dragging this far down (or flicking faster than this) closes the sheet.
const DISMISS_DRAG_DISTANCE = 40
const DISMISS_DRAG_VELOCITY = 0.3
// Vertical movement before a drag is recognised, so taps on buttons inside the sheet still work.
const DRAG_START_THRESHOLD = 6
const MAX_HEIGHT_RATIO = 0.8
const OPEN_BACKDROP_MS = 220
// iOS: pulling scrollable content this far past the top (rubber-band) also closes the sheet.
const PULL_TO_DISMISS = 60
const CLOSE_MS = 200

export function AppBottomSheet({
	visible,
	title,
	onClose,
	children,
	maxHeightRatio = MAX_HEIGHT_RATIO,
	scrollEnabled = true,
	footer,
	subtitle,
	onBack,
	backAccessibilityLabel = 'Back',
	showHeaderDivider = true,
	appearance = 'default',
	dismissible = true,
}: AppBottomSheetProps) {
	const isModern = appearance === 'modern'
	const insets = useSafeAreaInsets()
	const { width, height } = useWindowDimensions()
	const isTablet = width >= 768
	const closedOffset = height
	const maxSheetHeight = height * maxHeightRatio

	const headerAndHandleHeight = 74 + (subtitle ? 18 : 0)
	const footerHeight = footer ? 64 : 0
	const maxScrollHeight = Math.max(
		120,
		maxSheetHeight - headerAndHandleHeight - footerHeight - insets.bottom,
	)

	const [modalVisible, setModalVisible] = useState(visible)

	const sheetTranslateY = useRef(new Animated.Value(closedOffset)).current
	const backdropOpacity = useRef(new Animated.Value(0)).current

	// Latest values for the gesture handler, which is created once.
	const sheetHeightRef = useRef(closedOffset)
	const scrollYRef = useRef(0)
	const closingRef = useRef(false)
	const onCloseRef = useRef(onClose)
	const dismissibleRef = useRef(dismissible)
	const scrollEnabledRef = useRef(scrollEnabled)
	onCloseRef.current = onClose
	dismissibleRef.current = dismissible
	scrollEnabledRef.current = scrollEnabled

	const getHiddenOffset = () => sheetHeightRef.current + insets.bottom + 24

	const animateSheetOpen = () => {
		closingRef.current = false
		sheetTranslateY.setValue(getHiddenOffset())
		backdropOpacity.setValue(0)

		Animated.parallel([
			Animated.spring(sheetTranslateY, {
				toValue: 0,
				useNativeDriver: true,
				damping: 22,
				stiffness: 220,
				mass: 1,
			}),
			Animated.timing(backdropOpacity, {
				toValue: 1,
				duration: OPEN_BACKDROP_MS,
				easing: Easing.out(Easing.quad),
				useNativeDriver: true,
			}),
		]).start()
	}

	/** Slide down + fade out, then unmount the modal and optionally notify the parent. */
	const closeSheet = (notifyParent: boolean) => {
		if (closingRef.current) return
		closingRef.current = true

		Animated.parallel([
			Animated.timing(sheetTranslateY, {
				toValue: getHiddenOffset(),
				duration: CLOSE_MS,
				easing: Easing.in(Easing.quad),
				useNativeDriver: true,
			}),
			Animated.timing(backdropOpacity, {
				toValue: 0,
				duration: CLOSE_MS,
				easing: Easing.in(Easing.quad),
				useNativeDriver: true,
			}),
		]).start(({ finished }) => {
			if (!finished) return
			setModalVisible(false)
			if (notifyParent) onCloseRef.current()
		})
	}

	const requestClose = () => {
		if (!dismissibleRef.current) return
		closeSheet(true)
	}

	const resetSheetPosition = () => {
		Animated.parallel([
			Animated.spring(sheetTranslateY, {
				toValue: 0,
				useNativeDriver: true,
				damping: 22,
				stiffness: 260,
			}),
			Animated.timing(backdropOpacity, {
				toValue: 1,
				duration: 150,
				useNativeDriver: true,
			}),
		]).start()
	}

	const isDownwardDrag = (dx: number, dy: number) =>
		dy > DRAG_START_THRESHOLD && Math.abs(dy) > Math.abs(dx) * 1.2

	// Shared drag behaviour for both responders below.
	const dragHandlers = {
		onPanResponderGrant: () => {
			sheetTranslateY.stopAnimation()
			backdropOpacity.stopAnimation()
		},

		onPanResponderMove: (_: unknown, g: { dy: number }) => {
			const dy = Math.max(0, g.dy)
			sheetTranslateY.setValue(dy)
			backdropOpacity.setValue(Math.max(0, 1 - dy / Math.max(1, sheetHeightRef.current)))
		},

		onPanResponderRelease: (_: unknown, g: { dy: number; vy: number }) => {
			if (g.dy > DISMISS_DRAG_DISTANCE || g.vy > DISMISS_DRAG_VELOCITY) {
				requestClose()
			} else {
				resetSheetPosition()
			}
		},

		onPanResponderTerminate: resetSheetPosition,
		// Keep the gesture once the sheet is being dragged.
		onPanResponderTerminationRequest: () => false,
	}

	/**
	 * Handle + header: claim the touch as soon as it starts, so the drag doesn't depend on move-phase
	 * negotiation (which doesn't reliably reach the sheet on Android when nothing owns the touch yet).
	 * The back / close buttons inside the header are deeper in the tree, so they still get taps first.
	 */
	const headerPanResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => dismissibleRef.current && !closingRef.current,
			...dragHandlers,
		}),
	).current

	/**
	 * Content: the sheet takes a downward drag away from whatever is under the finger (rows, chips,
	 * buttons) in the capture phase, while the content is scrolled to the top. With
	 * scrollEnabled={false} the child owns scrolling, so content drags are left to it.
	 */
	const contentPanResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => false,
			onMoveShouldSetPanResponder: (_, g) =>
				dismissibleRef.current && !closingRef.current && isDownwardDrag(g.dx, g.dy),
			onMoveShouldSetPanResponderCapture: (_, g) =>
				dismissibleRef.current &&
				!closingRef.current &&
				scrollEnabledRef.current &&
				scrollYRef.current <= 0 &&
				isDownwardDrag(g.dx, g.dy),
			...dragHandlers,
		}),
	).current

	// The native ScrollView grabs vertical touches (iOS always bounces, Android intercepts whenever it
	// can scroll) and that cancels the JS drag. So the ScrollView only scrolls when the content actually
	// overflows; when it fits, the whole sheet body is free to drag.
	const [viewportHeight, setViewportHeight] = useState(0)
	const [contentHeight, setContentHeight] = useState(0)
	const contentScrollable = contentHeight > viewportHeight + 1

	const handleContentScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		scrollYRef.current = e.nativeEvent.contentOffset.y
	}

	// Scrollable content on iOS: a rubber-band pull past the top closes the sheet too.
	const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		if (Platform.OS === 'ios' && e.nativeEvent.contentOffset.y < -PULL_TO_DISMISS) {
			requestClose()
		}
	}

	useEffect(() => {
		if (visible) {
			scrollYRef.current = 0
			if (modalVisible) {
				// Still mounted (reopened mid-close): onShow won't fire again, so animate from here.
				sheetTranslateY.stopAnimation()
				backdropOpacity.stopAnimation()
				animateSheetOpen()
			} else {
				// The open animation starts from Modal's onShow, once the sheet is actually on screen.
				setModalVisible(true)
			}
			return
		}

		// Parent closed the sheet directly: animate out without calling onClose back.
		if (modalVisible) {
			closeSheet(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [visible])

	return (
		<Modal
			visible={modalVisible}
			transparent
			animationType="none"
			statusBarTranslucent
			onShow={animateSheetOpen}
			onRequestClose={requestClose}
		>
			<View
				style={[
					styles.sheetOverlay,
					isTablet && styles.sheetOverlayTablet,
				]}
			>
				{/* Backdrop: fades with the sheet (and while dragging); tap to dismiss */}
				<Animated.View
					style={[
						StyleSheet.absoluteFill,
						styles.backdrop,
						isModern && styles.backdropModern,
						{ opacity: backdropOpacity },
					]}
				>
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={requestClose}
						accessibilityRole="button"
						accessibilityLabel="Close"
					/>
				</Animated.View>

				<Animated.View
					style={[
						styles.sheet,
						isModern && styles.sheetKh,
						isTablet && styles.sheetTablet,
						{
							maxHeight: maxSheetHeight,
							transform: [{ translateY: sheetTranslateY }],
						},
					]}
					onLayout={(e) => {
						sheetHeightRef.current = e.nativeEvent.layout.height
					}}
					{...contentPanResponder.panHandlers}
				>
					<View style={[styles.sheetBody, { maxHeight: maxSheetHeight }]}>
						{/* Drag Handle Area */}
						<View style={styles.sheetHandleHitArea} collapsable={false} {...headerPanResponder.panHandlers}>
							<View style={[styles.sheetHandle, isModern && styles.sheetHandleKh]} />
						</View>

						{/* Header Area */}
						<View
							style={[
								styles.sheetHeader,
								!showHeaderDivider && styles.sheetHeaderNoDivider,
								isModern && styles.sheetHeaderKh,
							]}
							collapsable={false}
							{...headerPanResponder.panHandlers}
						>
							{onBack && (
								<TouchableOpacity
									style={styles.sheetBackButton}
									onPress={onBack}
									activeOpacity={0.82}
									accessibilityRole="button"
									accessibilityLabel={backAccessibilityLabel}
								>
									<MaterialCommunityIcons
										name="chevron-left"
										size={24}
										color={isModern ? APP_COLORS.ink : '#64707d'}
									/>
								</TouchableOpacity>
							)}

							{subtitle ? (
								<View style={styles.sheetTitleCol}>
									<AppTypography
										variant="h4"
										style={[styles.sheetTitle, styles.sheetTitleInCol, isModern && styles.sheetTitleKh]}
										accessibilityRole="header"
									>
										{title}
									</AppTypography>
									<AppTypography style={styles.sheetSubtitle}>{subtitle}</AppTypography>
								</View>
							) : (
								<AppTypography
									variant="h4"
									style={[styles.sheetTitle, isModern && styles.sheetTitleKh]}
									accessibilityRole="header"
								>
									{title}
								</AppTypography>
							)}

							<TouchableOpacity
								style={[
									styles.sheetCloseButton,
									isModern && styles.sheetCloseButtonKh,
									!dismissible && styles.sheetCloseButtonDisabled,
								]}
								onPress={requestClose}
								disabled={!dismissible}
								activeOpacity={0.82}
								accessibilityRole="button"
								accessibilityLabel="Close"
							>
								<MaterialCommunityIcons
									name="close"
									size={22}
									color={isModern ? APP_COLORS.ink : '#64707d'}
								/>
							</TouchableOpacity>
						</View>

						{/* Scrollable Content or Custom View */}
						{scrollEnabled ? (
							<ScrollView
								style={[styles.sheetScroll, { maxHeight: maxScrollHeight }]}
								showsVerticalScrollIndicator={false}
								keyboardShouldPersistTaps="handled"
								scrollEventThrottle={16}
								onScroll={handleContentScroll}
								onScrollEndDrag={handleScrollEndDrag}
								onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
								onContentSizeChange={(_, h) => setContentHeight(h)}
								scrollEnabled={contentScrollable}
								bounces={contentScrollable}
								alwaysBounceVertical={false}
								overScrollMode={contentScrollable ? 'always' : 'never'}
								contentContainerStyle={[
									styles.sheetContent,
									{
										paddingBottom: footer
											? 16
											: Math.max(insets.bottom + 16, 24),
									},
								]}
							>
								{children}
							</ScrollView>
						) : (
							<View
								style={[
									styles.sheetScroll,
									styles.sheetContent,
									{
										maxHeight: maxScrollHeight,
										paddingBottom: footer
											? 16
											: Math.max(insets.bottom + 16, 24),
									},
								]}
							>
								{children}
							</View>
						)}

						{/* Footer Area */}
						{footer && (
							<View
								style={[
									styles.sheetFooterContainer,
									isModern && styles.sheetFooterContainerKh,
									{ paddingBottom: isModern ? 20 + insets.bottom : Math.max(insets.bottom, 12) },
								]}
							>
								{footer}
							</View>
						)}
					</View>
				</Animated.View>
			</View>
		</Modal>
	)
}

export default AppBottomSheet

const styles = StyleSheet.create({
	sheetOverlay: {
		flex: 1,
		justifyContent: 'flex-end',
		alignItems: 'center',
	},

	backdrop: {
		backgroundColor: 'rgba(18, 28, 33, 0.38)',
	},

	backdropModern: {
		backgroundColor: APP_COLORS.scrim,
	},

	sheetOverlayTablet: {
		paddingHorizontal: 24,
		paddingBottom: 24,
	},

	sheet: {
		width: '100%',
		maxWidth: 540,
		backgroundColor: '#ffffff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
		shadowColor: '#000000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.12,
		shadowRadius: 16,
		elevation: 10,
		zIndex: 10,
		flexShrink: 1,
	},

	sheetTablet: {
		borderRadius: 22,
		maxWidth: 540,
	},

	sheetBody: {
		width: '100%',
		flexShrink: 1,
	},

	sheetHandle: {
		width: 42,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#d5e4e6',
		alignSelf: 'center',
	},

	sheetHandleHitArea: {
		paddingTop: 10,
		paddingBottom: 8,
		marginBottom: 4,
	},

	sheetHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#eef4f5',
	},

	sheetTitle: {
		flex: 1,
		minWidth: 0,
		color: '#172838',
		fontWeight: '700',
	},

	sheetCloseButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 12,
	},

	sheetKh: {
		...CARD_SHADOW,
		shadowOffset: { width: 0, height: -8 },
	},

	sheetHandleKh: {
		width: 40,
		backgroundColor: APP_COLORS.divider,
	},

	sheetHeaderNoDivider: {
		borderBottomWidth: 0,
	},

	sheetHeaderKh: {
		gap: 8,
		paddingBottom: 8,
	},

	sheetBackButton: {
		width: 44,
		height: 44,
		marginLeft: -10,
		alignItems: 'center',
		justifyContent: 'center',
	},

	sheetTitleCol: {
		flex: 1,
		minWidth: 0,
	},

	sheetTitleInCol: {
		flex: 0,
	},

	sheetTitleKh: {
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '700',
		color: APP_COLORS.ink,
	},

	sheetSubtitle: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},

	sheetCloseButtonKh: {
		width: 44,
		height: 44,
		borderRadius: 22,
		marginRight: -10,
		marginLeft: 0,
	},

	sheetCloseButtonDisabled: {
		opacity: 0.4,
	},

	sheetFooterContainerKh: {
		borderTopColor: APP_COLORS.divider,
	},

	sheetScroll: {
		flexShrink: 1,
	},

	sheetContent: {
		paddingTop: 12,
		paddingHorizontal: 16,
	},

	sheetFooterContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 12,
		borderTopWidth: 1,
		borderTopColor: '#eef4f5',
		backgroundColor: '#ffffff',
	},
})
