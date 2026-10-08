// src/features/care-ai/components/BookCard.tsx
//
// "Book a slot inside the chat": the doctor, today's video slots and the confirm button. Confirming turns the
// card into the green "Booked" strip. `onConfirm` is where the real booking call goes (the card stays on the slot
// picker, with the button spinning, until it resolves; if it throws the caller reports the error and the card stays
// put). Without it the confirmation is a mock and no appointment is created.

import React, { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { AppAvatar, AppButton, AppPathIcon, SlotChipGrid, type SlotChipItem } from '../../../components/common'
import { APP_COLORS, TONES, formatInr } from '../../../config/theme'
import { CARE_AI_ICONS } from '../careAiIcons'
import { CARE_AI } from '../careAiTheme'
import type { CareAiBook } from '../careAiTypes'
import { ReplyCard } from './ReplyCard'

const SLOT_COLUMNS = 3

type Props = {
	book: CareAiBook
	/** Slot that starts selected (opened from a screen that already picked one). */
	initialSlot?: string
	/** Books `slot`. Resolve to confirm; throw to keep the picker open. */
	onConfirm?: (slot: string) => void | Promise<void>
	/** Opens the booked appointment. */
	onViewBooking: () => void
}

export function BookCard({ book, initialSlot, onConfirm, onViewBooking }: Props) {
	const [slot, setSlot] = useState<string | null>(initialSlot ?? null)
	const [booked, setBooked] = useState(false)
	const [saving, setSaving] = useState(false)
	const slots: SlotChipItem[] = book.slots.map((t) => ({ value: t, label: t }))
	const fee = formatInr(book.fee)
	const day = book.day ?? 'today'
	const mode = book.mode ?? 'Video'

	const confirm = async () => {
		if (!slot || saving) return
		setSaving(true)
		try {
			await onConfirm?.(slot)
			setBooked(true)
		} catch {
			// The caller reports its own errors; stay on the picker so the chosen slot is not lost.
		} finally {
			setSaving(false)
		}
	}

	return (
		<ReplyCard>
			<View style={styles.top}>
				<AppAvatar
					name={book.name}
					size={52}
					radius={16}
					backgroundColor={TONES.lilac.bg}
					initialsColor={TONES.lilac.ink}
				/>
				<View style={styles.text}>
					<Text style={styles.name}>{book.name}</Text>
					<Text style={styles.meta}>{book.meta}</Text>
				</View>
				<Text style={styles.fee}>{fee}</Text>
			</View>

			{booked ? (
				<View style={styles.booked}>
					<View style={styles.bookedTick}>
						<AppPathIcon d={CARE_AI_ICONS.check} size={15} strokeWidth={3} color="#FFFFFF" />
					</View>
					<View style={styles.bookedText}>
						<Text style={styles.bookedTitle}>
							Booked · {day}, {slot}
						</Text>
						<Text style={styles.bookedSub}>
							{mode} consult · paid {fee} · chat summary shared
						</Text>
					</View>
					<TouchableOpacity
						onPress={onViewBooking}
						accessibilityRole="link"
						accessibilityLabel="View booking"
					>
						<Text style={styles.bookedLink}>View</Text>
					</TouchableOpacity>
				</View>
			) : (
				<View style={styles.pick}>
					<Text style={styles.pickLabel}>{`${mode} slots ${day}`.toUpperCase()}</Text>
					<SlotChipGrid columns={SLOT_COLUMNS} slots={slots} selectedValue={slot} onSelectValue={setSlot} />
					<AppButton size="md" radius={10} softDisabled disabled={!slot} loading={saving} onPress={confirm}>
						{slot ? `Book ${slot} · ${fee}` : 'Pick a time'}
					</AppButton>
				</View>
			)}
		</ReplyCard>
	)
}

const styles = StyleSheet.create({
	top: { padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
	text: { flex: 1, minWidth: 0 },
	name: { fontSize: 16, lineHeight: 21, fontWeight: '800', color: APP_COLORS.ink },
	meta: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	fee: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
	pick: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
	pickLabel: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 0.48, color: APP_COLORS.inkMuted },
	booked: {
		marginHorizontal: 14,
		marginBottom: 14,
		padding: 12,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		backgroundColor: APP_COLORS.successBg,
	},
	bookedTick: {
		width: 28,
		height: 28,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: APP_COLORS.success,
	},
	bookedText: { flex: 1 },
	bookedTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800', color: APP_COLORS.success },
	bookedSub: { fontSize: 12, lineHeight: 16, color: CARE_AI.body },
	bookedLink: { fontSize: 13, fontWeight: '800', color: APP_COLORS.success },
})
