// src/features/ancillary/staff/schedule/ReasonSheet.tsx
//
// The "why?" sheet of the ancillary schedule design (release a day, can't make an instant visit, hide a job): who and when, a
// "Reason" radio list, an optional note, a mint info box and Back / confirm buttons. The caller runs the action: `onConfirm`
// gets the picked reason and the note; `busy` shows the spinner and keeps the sheet open.
import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { AppBottomSheet, AppButton } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'

export type ReasonSheetProps = {
	visible: boolean
	title: string
	subtitle?: string
	who: string
	line: string
	reasons: string[]
	/** Placeholder of the optional note; omit for no note field. */
	notePlaceholder?: string
	info: string
	confirmLabel: string
	/** 'danger' = red button (releasing something), 'primary' = the plain teal one. */
	tone?: 'danger' | 'primary'
	busy?: boolean
	onClose: () => void
	onConfirm: (reason: string, note: string) => void
}

export function ReasonSheet({
	visible,
	title,
	subtitle,
	who,
	line,
	reasons,
	notePlaceholder,
	info,
	confirmLabel,
	tone = 'danger',
	busy = false,
	onClose,
	onConfirm,
}: ReasonSheetProps) {
	const [picked, setPicked] = useState(0)
	const [note, setNote] = useState('')

	return (
		<AppBottomSheet
			visible={visible}
			title={title}
			subtitle={subtitle}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!busy}
			footer={
				<View style={styles.footer}>
					<AppButton variant="outline" size="lg" style={styles.back} onPress={onClose} disabled={busy}>
						Back
					</AppButton>
					<AppButton
						variant={tone === 'danger' ? 'danger' : 'primary'}
						size="lg"
						style={styles.confirm}
						loading={busy}
						disabled={busy}
						onPress={() => onConfirm(reasons[picked] ?? reasons[0], note.trim())}
					>
						{confirmLabel}
					</AppButton>
				</View>
			}
		>
			<View style={styles.body}>
				<View style={styles.who}>
					<Text style={styles.whoName}>{who}</Text>
					<Text style={styles.whoLine}>{line}</Text>
				</View>

				<Text style={styles.label}>Reason</Text>
				<View accessibilityRole="radiogroup" accessibilityLabel="Reason" style={styles.options}>
					{reasons.map((r, i) => {
						const on = i === picked
						return (
							<TouchableOpacity
								key={r}
								onPress={() => setPicked(i)}
								activeOpacity={0.8}
								accessibilityRole="radio"
								accessibilityState={{ checked: on }}
								style={[styles.option, on && styles.optionOn]}
							>
								<Text style={styles.optionText}>{r}</Text>
								<View style={[styles.ring, on && styles.ringOn]}>
									{on && <View style={styles.dot} />}
								</View>
							</TouchableOpacity>
						)
					})}
				</View>

				{!!notePlaceholder && (
					<TextInput
						value={note}
						onChangeText={setNote}
						placeholder={notePlaceholder}
						placeholderTextColor={APP_COLORS.inkMuted}
						multiline
						numberOfLines={2}
						accessibilityLabel={notePlaceholder}
						style={styles.note}
					/>
				)}

				<View style={styles.info}>
					<Text style={styles.infoText}>{info}</Text>
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: { gap: 12 },
	who: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg },
	whoName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	whoLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	label: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink },
	options: { gap: 8 },
	option: {
		minHeight: 48,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 10,
	},
	optionOn: { borderColor: APP_COLORS.primary, backgroundColor: '#F0F7F7' },
	optionText: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
	ring: {
		width: 20,
		height: 20,
		borderRadius: 10,
		borderWidth: 2,
		borderColor: '#B9C7C9',
		alignItems: 'center',
		justifyContent: 'center',
	},
	ringOn: { borderColor: APP_COLORS.primary },
	dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: APP_COLORS.primary },
	note: {
		minHeight: 64,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		fontSize: 15,
		lineHeight: 20,
		color: APP_COLORS.ink,
		textAlignVertical: 'top',
	},
	info: { padding: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: APP_COLORS.mint },
	infoText: { fontSize: 12, lineHeight: 17, color: APP_COLORS.ink },
	footer: { flexDirection: 'row', gap: 8 },
	back: { flex: 1 },
	confirm: { flex: 1.8 },
})
