import React from 'react'
import {
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
	type StyleProp,
	type TextStyle,
	type ViewStyle,
} from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS } from '../../../config/theme'

interface AppScreenHeaderProps {
	title?: string
	onBack?: () => void
	rightElement?: React.ReactNode
	/** Hide the back button entirely. Defaults to true (existing behaviour). */
	showBack?: boolean
	/** Override the header's background colour. Defaults to the standard teal. */
	backgroundColor?: string
	/**
	 * 'hero' (default) is the existing rounded-corner header with decorative
	 * wave circles, used across most screens. 'flat' is a plain rectangular
	 * bar with no waves and no bottom radius, for screens whose reference
	 * design calls for a simple compact bar instead of a hero-style header.
	 */
	variant?: 'hero' | 'flat' | 'bar'
	/** 'bar' only: 12/16 mint line under the title. */
	subtitle?: string
	/** 'bar' only: node shown before the title (e.g. a 36px avatar). */
	leading?: React.ReactNode
	/** 'bar' only: replaces the whole title/subtitle block (e.g. collapsing headers). */
	titleNode?: React.ReactNode
	/** 'bar' only: small text pill on the right, e.g. "Step 1 of 2". */
	badge?: string
	/** 'bar' only: accessibility label for the back button. Defaults to "Go back". */
	backAccessibilityLabel?: string
	/** 'bar' only: extra style for the outer bar (e.g. a shadow when collapsed). */
	style?: StyleProp<ViewStyle>
	/**
	 * 'bar' only: title text override. Defaults to 18/26 600, or 16/20 700 when a
	 * subtitle is shown (the design's doctor-identity header).
	 */
	titleStyle?: StyleProp<TextStyle>
	/**
	 * Optional screen-specific content (subtitle, search bar, filter chips, ...)
	 * rendered below the title row. AppScreenHeader stays generic — it only
	 * provides the slot; each screen decides what goes inside it.
	 */
	children?: React.ReactNode
}

export default function AppScreenHeader({
	title,
	onBack,
	rightElement,
	showBack = true,
	backgroundColor,
	variant = 'hero',
	subtitle,
	leading,
	titleNode,
	badge,
	backAccessibilityLabel = 'Go back',
	style,
	titleStyle,
	children,
}: AppScreenHeaderProps) {
	const navigation = useNavigation<any>()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768
	const isFlat = variant === 'flat'

	const handleBack = () => {
		if (onBack) {
			onBack()
		} else if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate('MainTabs', { screen: 'Portal' })
		}
	}

	if (variant === 'bar') {
		return (
			<View style={[styles.bar, { paddingTop: insets.top }, backgroundColor ? { backgroundColor } : null, style]}>
				<View style={[styles.barRow, isTablet && styles.headerContentTablet]}>
					{showBack && (
						<TouchableOpacity
							style={styles.barBack}
							onPress={handleBack}
							activeOpacity={0.75}
							accessibilityRole="button"
							accessibilityLabel={backAccessibilityLabel}
						>
							<MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />
						</TouchableOpacity>
					)}
					<View style={styles.barTitleWrap}>
						{titleNode ?? (
							<View style={styles.barIdent}>
								{leading}
								<View style={styles.barTextCol}>
									{!!title && (
										<AppTypography
											style={[styles.barTitle, !!subtitle && styles.barTitleWithSub, titleStyle]}
											numberOfLines={1}
											accessibilityRole="header"
										>
											{title}
										</AppTypography>
									)}
									{!!subtitle && (
										<AppTypography style={styles.barSubtitle} numberOfLines={1}>
											{subtitle}
										</AppTypography>
									)}
								</View>
							</View>
						)}
					</View>
					{!!badge && (
						<View style={styles.barBadge}>
							<AppTypography style={styles.barBadgeText}>{badge}</AppTypography>
						</View>
					)}
					{rightElement && <View style={styles.barRight}>{rightElement}</View>}
				</View>
				{children && <View style={styles.barChildren}>{children}</View>}
			</View>
		)
	}

	return (
		<View
			style={[
				styles.header,
				{ paddingTop: Math.max(insets.top, 12) + (isFlat ? 4 : 14) },
				isFlat && styles.headerFlat,
				backgroundColor ? { backgroundColor } : null,
			]}
		>
			{/* Background Waves */}
			{!isFlat && (
				<>
					<View style={styles.waveOne} />
					<View style={styles.waveTwo} />
				</>
			)}

			<View style={[styles.headerContent, isTablet && styles.headerContentTablet]}>
				{showBack && (
					<TouchableOpacity
						style={styles.backButton}
						onPress={handleBack}
						activeOpacity={0.75}
						hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
					>
						<MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />
					</TouchableOpacity>
				)}
				<View style={styles.headerText}>
					<AppTypography style={styles.title} numberOfLines={1}>
						{title}
					</AppTypography>
				</View>
				{rightElement && <View style={styles.rightElementContainer}>{rightElement}</View>}
			</View>

			{children && <View style={styles.childrenSlot}>{children}</View>}
		</View>
	)
}

const styles = StyleSheet.create({
	header: {
		backgroundColor: '#1f5f68',
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		overflow: 'hidden',
		position: 'relative',
	},
	headerFlat: {
		paddingBottom: 6,
		borderBottomLeftRadius: 0,
		borderBottomRightRadius: 0,
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
	headerContent: {
		flexDirection: 'row',
		alignItems: 'center',
		zIndex: 10,
	},
	headerContentTablet: {
		maxWidth: 800,
		alignSelf: 'center',
		width: '100%',
	},
	backButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: 'rgba(255,255,255,0.15)',
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.3)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	headerText: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 8,
	},
	title: {
		color: '#ffffff',
		fontSize: 20,
		fontWeight: '600',
	},
	rightElementContainer: {
		justifyContent: 'center',
		alignItems: 'flex-end',
	},
	childrenSlot: {
		marginTop: 12,
		zIndex: 10,
	},

	// variant 'bar' (KarolaHealth design app bar)
	bar: {
		backgroundColor: APP_COLORS.primary,
		paddingHorizontal: 16,
		zIndex: 2,
	},
	barRow: {
		minHeight: 64,
		paddingVertical: 4,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	barBack: {
		width: 44,
		height: 44,
		marginLeft: -10,
		alignItems: 'center',
		justifyContent: 'center',
	},
	barTitleWrap: {
		flex: 1,
		minWidth: 0,
		minHeight: 48,
		justifyContent: 'center',
	},
	barIdent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	barTextCol: {
		flex: 1,
		minWidth: 0,
	},
	barTitle: {
		color: '#ffffff',
		fontSize: 18,
		lineHeight: 26,
		fontWeight: '600',
	},
	barTitleWithSub: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '700',
	},
	barSubtitle: {
		color: APP_COLORS.mint,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500',
	},
	barBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8,
		backgroundColor: APP_COLORS.primaryDark,
	},
	barBadgeText: {
		color: '#ffffff',
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
	},
	barRight: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
	},
	barChildren: {
		paddingBottom: 12,
	},
})
