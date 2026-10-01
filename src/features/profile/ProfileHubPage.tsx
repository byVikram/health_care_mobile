// "My profile" hub for patients, doctors and ancillary providers. Everything role-specific (rows, badges,
// banners, header status) comes from PROFILE_HUB_CONFIG; this screen only lays it out:
// AppProfileHeader, config banners, config sections, then Log out.

import React, { useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AppProfileHeader } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { showComingSoon } from '../../utils/toast'
import HealthQrSheet from '../dashboard/components/HealthQrSheet'
import { PROFILE_HUB_CONFIG, type HubBanner, type HubRole, type HubRow } from './config/profileHubConfig'
import { useProfileHubData } from './hooks/useProfileHubData'
import { ProfileHubSection } from './shared/components/ProfileHubSection'
import { ProfileHubBanner } from './shared/components/ProfileHubBanner'
import { LogoutButton } from './shared/components/LogoutButton'

type Nav = NativeStackNavigationProp<AppStackParamList>

export default function ProfileHubPage({ role }: { role: HubRole }) {
	const navigation = useNavigation<Nav>()
	const config = PROFILE_HUB_CONFIG[role]
	const { data } = useProfileHubData(role)
	const [qrOpen, setQrOpen] = useState(false)

	const go = (target: HubRow | HubBanner) => {
		if (!target.route) {
			showComingSoon()
			return
		}
		// Route names come from ROUTES.STACK; params are typed per route in AppStackParamList.
		;(navigation.navigate as (name: string, params?: object) => void)(target.route, target.params?.(data))
	}

	const status = config.statusTag(data)

	return (
		<View style={styles.screen}>
			<AppProfileHeader
				onBack={() => navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })}
				name={data.name || 'My profile'}
				roleLine={config.roleLine(data)}
				avatarUri={data.avatarUri}
				status={status ? { label: status.label, tone: status.tone, icon: status.icon } : null}
				action={
					config.showHealthQr
						? { icon: 'qrcode', onPress: () => setQrOpen(true), accessibilityLabel: 'Show my health QR' }
						: undefined
				}
				completion={data.completion ?? undefined}
				completionHint={config.completionHint(data)}
			/>
			<ScrollView contentContainerStyle={styles.content}>
				{config.banners
					.filter((b) => b.visible(data))
					.map((b) => (
						<ProfileHubBanner
							key={b.key}
							tone={b.tone}
							icon={b.icon}
							title={b.title(data)}
							subtitle={typeof b.subtitle === 'function' ? b.subtitle(data) : b.subtitle}
							onPress={b.route ? () => go(b) : undefined}
						/>
					))}
				{config.sections.map((section) => (
					<ProfileHubSection
						key={section.title}
						title={section.title}
						rows={section.rows}
						data={data}
						onPressRow={go}
					/>
				))}
				<LogoutButton />
			</ScrollView>
			{config.showHealthQr && <HealthQrSheet visible={qrOpen} onClose={() => setQrOpen(false)} />}
		</View>
	)
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
		backgroundColor: APP_COLORS.pageBg,
	},
	content: {
		gap: 8,
		paddingBottom: 24,
	},
})
