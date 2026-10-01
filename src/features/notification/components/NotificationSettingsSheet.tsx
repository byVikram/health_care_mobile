// src/features/notification/components/NotificationSettingsSheet.tsx
//
// "Notification settings" bottom sheet from the design: WHAT TO NOTIFY ME ABOUT (critical alerts are
// always on; one switch per category), HOW TO REACH ME (delivery-channel chips; App is always on) and
// a quiet-hours switch. Visual only for now: the switches just toggle on screen -- nothing is saved,
// sent to an API, or applied to the notification list.

import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppPathIcon } from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { CRITICAL_ICON, CRITICAL_TONE, NOTIFICATION_TONES, type NotificationCategory } from '../notificationCategories'

type Channel = 'push' | 'sms' | 'wa' | 'email'

const CHANNELS: { id: Channel; label: string }[] = [
	{ id: 'push', label: 'App' },
	{ id: 'sms', label: 'SMS' },
	{ id: 'wa', label: 'WhatsApp' },
	{ id: 'email', label: 'Email' },
]

function Toggle({ on, onPress, label, disabled }: { on: boolean; onPress?: () => void; label: string; disabled?: boolean }) {
	return (
		<Pressable
			onPress={onPress}
			disabled={disabled}
			accessibilityRole="switch"
			accessibilityLabel={label}
			accessibilityState={{ checked: on, disabled }}
			style={[styles.track, { backgroundColor: disabled ? '#9DBFC0' : on ? APP_COLORS.primary : '#C9D6D7', alignItems: on ? 'flex-end' : 'flex-start' }]}
		>
			<View style={styles.knob} />
		</Pressable>
	)
}

type Props = {
	visible: boolean
	onClose: () => void
	categories: NotificationCategory[]
	/** Role-specific reassurance under the quiet-hours switch. */
	quietHoursNote: string
}

export function NotificationSettingsSheet({ visible, onClose, categories, quietHoursNote }: Props) {
	const [off, setOff] = useState<Record<string, boolean>>({})
	const [channels, setChannels] = useState<Record<Channel, boolean>>({ push: true, sms: true, wa: true, email: false })
	const [quietHours, setQuietHours] = useState(false)

	return (
		<AppBottomSheet
			visible={visible}
			title="Notification settings"
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			footer={
				<TouchableOpacity style={styles.doneBtn} onPress={onClose}>
					<Text style={styles.doneText}>Done</Text>
				</TouchableOpacity>
			}
		>
			<View style={{ gap: 16 }}>
				<View>
					<Text style={styles.sectionLabel}>WHAT TO NOTIFY ME ABOUT</Text>
					<View style={[styles.settingRow, styles.rowRule]}>
						<View style={[styles.settingTile, { backgroundColor: CRITICAL_TONE.bg }]}>
							<AppPathIcon d={CRITICAL_ICON} size={18} strokeWidth={2} color={CRITICAL_TONE.ink} />
						</View>
						<View style={styles.settingText}>
							<Text style={styles.settingTitle}>Critical alerts</Text>
							<Text style={styles.settingDesc}>Always on, for your safety</Text>
						</View>
						<Toggle on disabled label="Critical alerts, always on" />
					</View>
					{categories.map((c, i) => {
						const on = !off[c.id]
						const tone = NOTIFICATION_TONES[c.tone]
						return (
							<View key={c.id} style={[styles.settingRow, i < categories.length - 1 && styles.rowRule]}>
								<View style={[styles.settingTile, { backgroundColor: tone.bg }]}>
									<AppPathIcon d={c.icon} size={18} strokeWidth={2} color={tone.ink} />
								</View>
								<View style={styles.settingText}>
									<Text style={styles.settingTitle}>{c.label}</Text>
									<Text style={styles.settingDesc}>{c.desc}</Text>
								</View>
								<Toggle on={on} label={c.label} onPress={() => setOff((o) => ({ ...o, [c.id]: on }))} />
							</View>
						)
					})}
				</View>

				<View style={{ gap: 8 }}>
					<Text style={styles.sectionLabel}>HOW TO REACH ME</Text>
					<View style={styles.chipWrap} accessibilityRole="radiogroup" accessibilityLabel="Delivery channels">
						{CHANNELS.map((h) => {
							const on = !!channels[h.id]
							return (
								<TouchableOpacity
									key={h.id}
									accessibilityState={{ selected: on }}
									onPress={() => {
										if (h.id === 'push') return
										setChannels((c) => ({ ...c, [h.id]: !on }))
									}}
									style={[styles.chip, on && styles.chipOn]}
								>
									{on && <Text style={styles.chipCheck}>✓</Text>}
									<Text style={[styles.chipText, on && styles.chipTextOn]}>{h.label}</Text>
								</TouchableOpacity>
							)
						})}
					</View>
					<Text style={styles.settingDesc}>App notifications stay on so you never miss a critical alert.</Text>
				</View>

				<View style={styles.quietCard}>
					<View style={styles.settingText}>
						<Text style={styles.settingTitle}>Quiet hours · 10 PM – 7 AM</Text>
						<Text style={styles.settingDesc}>{quietHoursNote}</Text>
					</View>
					<Toggle on={quietHours} label="Quiet hours" onPress={() => setQuietHours((q) => !q)} />
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	sectionLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.7, color: APP_COLORS.inkMuted, marginBottom: 4 },
	settingRow: { minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 12 },
	rowRule: { borderBottomWidth: 1, borderBottomColor: '#E3EAEB' },
	settingTile: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
	settingText: { flex: 1, minWidth: 0 },
	settingTitle: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	settingDesc: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	track: { width: 48, height: 28, padding: 3, borderRadius: 9999, justifyContent: 'center' },
	knob: {
		width: 22,
		height: 22,
		borderRadius: 9999,
		backgroundColor: '#FFFFFF',
		shadowColor: APP_COLORS.ink,
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 1,
	},
	chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 9999,
		borderWidth: 1,
		borderColor: '#C9D6D7',
		backgroundColor: '#FFFFFF',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
	chipOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.mint },
	chipText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.inkMuted },
	chipTextOn: { color: APP_COLORS.primary },
	chipCheck: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	quietCard: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg, flexDirection: 'row', alignItems: 'center', gap: 12 },
	doneBtn: { height: 52, borderRadius: 12, backgroundColor: APP_COLORS.primary, alignItems: 'center', justifyContent: 'center' },
	doneText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
})

export default NotificationSettingsSheet
