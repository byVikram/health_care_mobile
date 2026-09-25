import React from 'react'
import { StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppTypography } from './AppTypography'

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
	variant?: 'hero' | 'flat'
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
})
