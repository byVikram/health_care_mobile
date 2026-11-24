// src/features/ancillary/staff/visit/VisitNotesSheet.tsx
//
// "Visit notes to finish" (provider Home): her completed visits that have no notes yet. One visit opens its notes box at once; several
// show a list to pick from. Notes (and only notes) can be written for VISIT_NOTES_WINDOW_HOURS (24) after a visit is completed
// (PATCH /provider/me/visits/{id}/progress); after that the server answers 409 NOTES_WINDOW_CLOSED and the visit leaves the list.
import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'
import { AppBottomSheet, AppButton, AppPathIcon } from '../../../../components/common'
import { APP_COLORS } from '../../../../config/theme'
import { extractApiErrorMessage } from '../../ancillaryService'
import { apiErrorCode } from '../../providerOpenJobsService'
import { updateVisitProgress, type ProviderNotesPending } from '../../providerVisitService'
import { PATHS } from '../schedule/scheduleTheme'

const MAX_NOTES = 4000

/** "Completed 45 min ago" / "Completed 3 h ago". */
const completedAgo = (iso: string | null) => {
	const t = iso ? new Date(iso).getTime() : NaN
	if (!Number.isFinite(t)) return 'Completed'
	const minutes = Math.max(1, Math.round((Date.now() - t) / 60_000))
	return minutes < 60 ? `Completed ${minutes} min ago` : `Completed ${Math.floor(minutes / 60)} h ago`
}

type Props = {
	visible: boolean
	items: ProviderNotesPending[]
	onClose: () => void
	/** After notes were saved (or the window turned out to be closed): re-read Today. */
	onSaved: () => void
}

export function VisitNotesSheet({ visible, items, onClose, onSaved }: Props) {
	const [pickedId, setPickedId] = useState<string | null>(null)
	const [text, setText] = useState('')
	const [busy, setBusy] = useState(false)

	// Opening starts at the list, or straight at the notes box when only one visit is waiting.
	useEffect(() => {
		if (!visible) return
		setPickedId(items.length === 1 ? items[0].visit_public_id : null)
		setText('')
	}, [visible, items])

	const picked = items.find((i) => i.visit_public_id === pickedId) ?? null

	const save = async () => {
		if (!picked || busy || !text.trim()) return
		setBusy(true)
		try {
			await updateVisitProgress(picked.visit_public_id, { notes: text.trim() }, { silent: true })
			Toast.show({
				type: 'success',
				text1: 'Notes saved',
				text2: `${picked.patient_name} · ${picked.service_name}`,
			})
			setText('')
			setPickedId(null)
			onSaved()
			if (items.length <= 1) onClose()
		} catch (e) {
			const closed = apiErrorCode(e) === 'NOTES_WINDOW_CLOSED'
			Toast.show({
				type: closed ? 'info' : 'error',
				text1: closed ? 'Notes are closed for this visit' : 'Could not save the notes',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
			if (closed) {
				setPickedId(null)
				onSaved()
			}
		} finally {
			setBusy(false)
		}
	}

	return (
		<AppBottomSheet
			visible={visible}
			title="Visit notes to finish"
			subtitle={picked ? undefined : 'Notes can be added for 24 hours after a visit is completed.'}
			onClose={onClose}
			appearance="modern"
			showHeaderDivider={false}
			dismissible={!busy}
			footer={
				picked ? (
					<View style={styles.footer}>
						<AppButton
							variant="outline"
							size="lg"
							style={styles.back}
							onPress={() => (items.length > 1 ? setPickedId(null) : onClose())}
							disabled={busy}
						>
							{items.length > 1 ? 'Back' : 'Later'}
						</AppButton>
						<AppButton
							size="lg"
							style={styles.save}
							loading={busy}
							disabled={busy || !text.trim()}
							onPress={() => void save()}
						>
							Save notes
						</AppButton>
					</View>
				) : undefined
			}
		>
			{picked ? (
				<View style={styles.body}>
					<View style={styles.who}>
						<Text style={styles.whoName}>{picked.patient_name}</Text>
						<Text
							style={styles.whoLine}
						>{`${picked.service_name} · ${completedAgo(picked.completed_at)}`}</Text>
					</View>
					<TextInput
						value={text}
						onChangeText={setText}
						placeholder="What did you do, and how did the patient do?"
						placeholderTextColor={APP_COLORS.inkMuted}
						multiline
						maxLength={MAX_NOTES}
						editable={!busy}
						textAlignVertical="top"
						accessibilityLabel="Visit notes"
						style={styles.input}
					/>
					<Text style={styles.hint}>The patient can read these notes after the visit.</Text>
				</View>
			) : (
				<View style={styles.list}>
					{items.map((i) => (
						<TouchableOpacity
							key={i.visit_public_id}
							onPress={() => setPickedId(i.visit_public_id)}
							activeOpacity={0.7}
							accessibilityRole="button"
							style={styles.item}
						>
							<View style={styles.itemText}>
								<Text style={styles.itemName}>{i.patient_name}</Text>
								<Text style={styles.itemSub} numberOfLines={1}>
									{`${i.service_name} · ${completedAgo(i.completed_at)}`}
								</Text>
							</View>
							<AppPathIcon
								d={PATHS.chevronRight}
								size={16}
								strokeWidth={2.4}
								color={APP_COLORS.inkMuted}
							/>
						</TouchableOpacity>
					))}
				</View>
			)}
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	body: { gap: 12 },
	who: { padding: 12, borderRadius: 12, backgroundColor: APP_COLORS.pageBg },
	whoName: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	whoLine: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	input: {
		minHeight: 120,
		paddingHorizontal: 12,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
		fontSize: 15,
		lineHeight: 20,
		color: APP_COLORS.ink,
	},
	hint: { fontSize: 12, lineHeight: 17, color: APP_COLORS.inkMuted },
	list: { gap: 0 },
	item: {
		minHeight: 60,
		paddingVertical: 8,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#EEF2F2',
	},
	itemText: { flex: 1, minWidth: 0 },
	itemName: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: APP_COLORS.ink },
	itemSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	footer: { flexDirection: 'row', gap: 8 },
	back: { flex: 1 },
	save: { flex: 1.8 },
})
