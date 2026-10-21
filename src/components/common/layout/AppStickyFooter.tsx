import React from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AppButton } from '../buttons/AppButton'

type StickyFooterProps = Pick<
	React.ComponentProps<typeof AppButton>,
	'onPress' | 'disabled' | 'loading' | 'children'
> & {
	footerStyle?: StyleProp<ViewStyle>
	contentStyle?: StyleProp<ViewStyle>
	buttonStyle?: React.ComponentProps<typeof AppButton>['style']
	horizontalPadding?: number
	contentMaxWidth?: number
	compact?: boolean
	centered?: boolean
	useDefaultButtonStyle?: boolean
}

// Base vertical padding values, mirrored from the `footer`/`compactFooter`
// styles below. Used to compute the safe-area-aware bottom padding without
// disturbing the (unrelated) top padding.
const BASE_FOOTER_PADDING = 12
const BASE_COMPACT_FOOTER_PADDING = 4

export function StickyFooter({
	onPress,
	disabled,
	loading,
	children = 'Save',
	footerStyle,
	contentStyle,
	buttonStyle,
	horizontalPadding,
	contentMaxWidth,
	compact = false,
	centered = false,
	useDefaultButtonStyle = true,
}: StickyFooterProps) {
	const insets = useSafeAreaInsets()
	const basePaddingBottom = compact ? BASE_COMPACT_FOOTER_PADDING : BASE_FOOTER_PADDING

	const button = (
		<AppButton
			variant="primary"
			formAction
			style={[useDefaultButtonStyle && styles.saveButton, buttonStyle]}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
		>
			{children}
		</AppButton>
	)

	return (
		<View
			style={[
				styles.footer,
				compact && styles.compactFooter,
				centered && styles.centeredFooter,
				// This screen doesn't sit inside a SafeAreaView with a bottom edge
				// (it's a normal flex sibling below the screen's ScrollView), so on
				// devices with a bottom inset (iOS home indicator, Android gesture
				// bar) the Save button would otherwise sit flush against the system
				// area. Extend just the bottom padding by the inset; top padding is
				// untouched.
				{ paddingBottom: basePaddingBottom + insets.bottom },
				horizontalPadding !== undefined && { paddingHorizontal: horizontalPadding },
				footerStyle,
			]}
		>
			{contentStyle || contentMaxWidth !== undefined ? (
				<View style={[contentStyle, contentMaxWidth !== undefined && { maxWidth: contentMaxWidth }]}>
					{button}
				</View>
			) : (
				button
			)}
		</View>
	)
}

export function AppStickyFooter(props: StickyFooterProps) {
	return <StickyFooter {...props} />
}

const styles = StyleSheet.create({
	footer: {
		paddingHorizontal: 16,
		paddingVertical: BASE_FOOTER_PADDING,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#E5E5E5',
	},
	saveButton: {
		alignSelf: 'stretch',
		marginTop: 0,
		width: '100%',
		minWidth: 160,
	},
	compactFooter: {
		paddingVertical: BASE_COMPACT_FOOTER_PADDING,
	},
	centeredFooter: {
		alignItems: 'center',
	},
})

export default AppStickyFooter
