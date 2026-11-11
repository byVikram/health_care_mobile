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
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { AppTypography } from '../display/AppTypography'
import { APP_COLORS } from '../../../config/theme'

// The top-bar background from the Doctor Consultation design ("1 · Specialities — minimal colour"): the ink base
// with three soft radial glows (teal top-right, blue left, mint bottom). AppScreenHeader draws it, and so do the
// bespoke headers (home, profile hub, auth hero, ...) that can't be built from AppScreenHeader's slots, so every
// bar looks the same. Purely decorative: it never takes touches and is hidden from screen readers.
type AppHeaderBackdropProps = {
	/** Replaces the ink base colour; the glows are still drawn on top. */
	base?: string
	style?: StyleProp<ViewStyle>
}

// [id, centre x/y, radius x/y, colour, centre opacity]: the design's three radial-gradient layers, each
// fading to transparent at 70% of its radius.
const GLOWS = [
	{ id: 'hbTeal', cx: 0.92, cy: 0, rx: 0.55, ry: 0.75, color: '#2B6F71', opacity: 1 },
	{ id: 'hbBlue', cx: 0, cy: 0.45, rx: 0.5, ry: 0.7, color: '#1F5E7A', opacity: 0.9 },
	{ id: 'hbMint', cx: 0.72, cy: 1.15, rx: 0.45, ry: 0.6, color: '#9FD3D1', opacity: 0.4 },
] as const

export function AppHeaderBackdrop({ base = APP_COLORS.ink, style }: AppHeaderBackdropProps) {
	return (
		<View
			pointerEvents="none"
			importantForAccessibility="no-hide-descendants"
			accessibilityElementsHidden
			style={[StyleSheet.absoluteFill, { backgroundColor: base }, style]}
		>
			<Svg width="100%" height="100%">
				<Defs>
					{GLOWS.map((g) => (
						<RadialGradient
							key={g.id}
							id={g.id}
							cx={g.cx}
							cy={g.cy}
							fx={g.cx}
							fy={g.cy}
							rx={g.rx}
							ry={g.ry}
						>
							<Stop offset="0" stopColor={g.color} stopOpacity={g.opacity} />
							<Stop offset="0.7" stopColor={g.color} stopOpacity={0} />
						</RadialGradient>
					))}
				</Defs>
				{GLOWS.map((g) => (
					<Rect key={g.id} x="0" y="0" width="100%" height="100%" fill={`url(#${g.id})`} />
				))}
			</Svg>
		</View>
	)
}

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
	/**
	 * A plain solid APP_COLORS.primary header (or `backgroundColor`) instead of the shared ink-and-glow backdrop.
	 * Inner profile screens and the booking flows use it; the home screens and the profile hub keep the gradient.
	 */
	solid?: boolean
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
	/** 'bar' only: subtitle text override (defaults to 12/16 500 APP_COLORS.mint). */
	subtitleStyle?: StyleProp<TextStyle>
	/** 'bar' only: subtitle truncation mode (single line). Defaults to 'tail'. */
	subtitleEllipsizeMode?: 'head' | 'middle' | 'tail' | 'clip'
	/** 'bar' only: replaces the default white 28px chevron-left inside the 44px back button. */
	backIcon?: React.ReactNode
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
	solid = false,
	subtitle,
	leading,
	titleNode,
	badge,
	backAccessibilityLabel = 'Go back',
	style,
	titleStyle,
	subtitleStyle,
	subtitleEllipsizeMode,
	backIcon,
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
			<View
				style={[
					styles.bar,
					solid && { backgroundColor: backgroundColor ?? APP_COLORS.primary },
					{ paddingTop: insets.top },
					style,
				]}
			>
				{!solid && <AppHeaderBackdrop base={backgroundColor} />}
				<View style={[styles.barRow, isTablet && styles.headerContentTablet]}>
					{showBack && (
						<TouchableOpacity
							style={styles.barBack}
							onPress={handleBack}
							activeOpacity={0.75}
							accessibilityRole="button"
							accessibilityLabel={backAccessibilityLabel}
						>
							{backIcon ?? <MaterialCommunityIcons name="chevron-left" size={28} color="#ffffff" />}
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
										<AppTypography
											style={[styles.barSubtitle, subtitleStyle]}
											numberOfLines={1}
											ellipsizeMode={subtitleEllipsizeMode}
										>
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
				solid && { backgroundColor: backgroundColor ?? APP_COLORS.primary },
			]}
		>
			{!solid && <AppHeaderBackdrop base={backgroundColor} />}

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
		backgroundColor: APP_COLORS.ink,
		overflow: 'hidden',
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
