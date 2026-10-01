// Frame for the profile sub-screens: primary "bar" header (title + mint subtitle), a keyboard-aware scroll
// area of stacked AppFormCards (gap 8 on pageBg), skeleton cards while loading, a retry state when the
// load failed, an optional footer (usually AppSaveFooter) and a StatusModal for save errors.

import React from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { AppButton, AppScreenHeader, AppSkeleton, StatusModal } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'

export type ProfileScreenProps = {
	title: string
	subtitle?: string
	loading?: boolean
	loadError?: string | null
	onRetry?: () => void
	footer?: React.ReactNode
	saveError?: string | null
	onDismissSaveError?: () => void
	/** Content under the header that shouldn't scroll (e.g. tabs). */
	fixedTop?: React.ReactNode
	children?: React.ReactNode
	/** Overlays such as bottom sheets. */
	overlays?: React.ReactNode
}

function LoadingCards() {
	return (
		<View style={styles.content}>
			{[0, 1, 2].map((i) => (
				<View key={i} style={styles.skeletonCard}>
					<AppSkeleton width="40%" height={18} borderRadius={6} color={APP_COLORS.mint} />
					<AppSkeleton width="100%" height={48} borderRadius={10} color={APP_COLORS.pageBg} />
					<AppSkeleton width="100%" height={48} borderRadius={10} color={APP_COLORS.pageBg} />
				</View>
			))}
		</View>
	)
}

export function ProfileScreen({
	title,
	subtitle,
	loading = false,
	loadError,
	onRetry,
	footer,
	saveError,
	onDismissSaveError,
	fixedTop,
	children,
	overlays,
}: ProfileScreenProps) {
	return (
		<View style={styles.screen}>
			<AppScreenHeader variant="bar" title={title} subtitle={subtitle} titleStyle={styles.headerTitle} />
			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				{fixedTop}
				{loading ? (
					<LoadingCards />
				) : loadError ? (
					<View style={styles.errorBox}>
						<Text style={styles.errorTitle}>Couldn't load this page</Text>
						<Text style={styles.errorText}>{loadError}</Text>
						{onRetry ? (
							<AppButton variant="outline" size="md" onPress={onRetry}>
								Try again
							</AppButton>
						) : null}
					</View>
				) : (
					<ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
						{children}
					</ScrollView>
				)}
				{!loading && !loadError ? footer : null}
			</KeyboardAvoidingView>
			{overlays}
			<StatusModal
				visible={!!saveError}
				status="error"
				title="Couldn't save"
				description={saveError || ''}
				submitText="OK"
				onSubmit={onDismissSaveError}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	flex: {
		flex: 1,
	},
	headerTitle: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: '700',
	},
	content: {
		gap: 8,
		paddingBottom: 16,
	},
	skeletonCard: {
		backgroundColor: APP_COLORS.surface,
		padding: 16,
		gap: 12,
	},
	errorBox: {
		margin: 16,
		padding: 16,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		gap: 8,
		alignItems: 'flex-start',
	},
	errorTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	errorText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
	},
})

export default ProfileScreen
