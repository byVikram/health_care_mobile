// src/features/dashboard/components/HomeScrollView.tsx
//
// The scroll view every Home screen sits in: padded below the app bar (whose height the app reports through
// ScrollContext), clear of the bottom bar, centred on wide screens, and reporting its scroll offset so the header can
// collapse. Each Home (patient, provider "Today", staff) is its own screen and passes only what differs.

import React from 'react'
import { Animated, RefreshControl, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { APP_COLORS } from '../../../config/theme'
import { useScroll } from '../../../context/ScrollContext'
import { useTabBarClearance } from '../../../navigation/tabBar'

type Props = {
	/** Added to the top safe-area inset as the header's height, until the app bar reports its own. */
	headerOffset: number
	/** Space between the header and the first section. */
	topGap?: number
	/** Clear the floating tab bar at the bottom; otherwise a fixed amount that clears the docked one. */
	floatingTabBar?: boolean
	/** The pale page background of the patient and provider Homes, instead of the staff grey. */
	paleBackground?: boolean
	/** Pull to refresh; leave `onRefresh` out when there is nothing to refresh. */
	refreshing?: boolean
	onRefresh?: () => void
	children: React.ReactNode
}

export function HomeScrollView({
	headerOffset,
	topGap = 0,
	floatingTabBar = false,
	paleBackground = false,
	refreshing = false,
	onRefresh,
	children,
}: Props) {
	const scrollData = useScroll()
	const insets = useSafeAreaInsets()
	const tabBarClearance = useTabBarClearance()
	const scrollY = React.useRef(new Animated.Value(0)).current

	React.useEffect(() => {
		scrollData?.registerScrollY(scrollY)
		return () => scrollData?.unregisterScrollY(scrollY)
	}, [scrollData, scrollY])

	const headerHeight =
		scrollData?.headerHeight && scrollData.headerHeight > 0 ? scrollData.headerHeight : insets.top + headerOffset

	return (
		<Animated.ScrollView
			style={[styles.container, paleBackground && styles.paleBackground]}
			contentContainerStyle={[
				styles.content,
				{
					paddingTop: headerHeight + topGap,
					paddingBottom: floatingTabBar ? tabBarClearance + 8 : Math.max(insets.bottom + 96, 120),
				},
			]}
			showsVerticalScrollIndicator={false}
			scrollEventThrottle={16}
			onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
				useNativeDriver: true,
			})}
			refreshControl={
				onRefresh ? (
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						colors={['#0c7c7c']}
						tintColor="#0c7c7c"
						progressBackgroundColor="#ffffff"
					/>
				) : undefined
			}
		>
			{children}
		</Animated.ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	paleBackground: {
		backgroundColor: APP_COLORS.pageBg,
	},
	content: {
		flexGrow: 1,
		maxWidth: 1200,
		alignSelf: 'center',
		width: '100%',
	},
})

export default HomeScrollView
