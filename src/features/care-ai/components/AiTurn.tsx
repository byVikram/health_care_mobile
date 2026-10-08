// src/features/care-ai/components/AiTurn.tsx
//
// One Care AI turn: the "Care AI" label, then whichever blocks the reply has, in the design's order -- text,
// urgent card, consult card, chat summary, booking card, closing sentence, lab results, medicine, bullets,
// caution, buttons, quick-reply chips, and the answer footer.

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { APP_COLORS } from '../../../config/theme'
import type { CareAiAssistantMessage, CareAiBook, CareAiLink } from '../careAiTypes'
import { AnswerFooter } from './AnswerFooter'
import { BookCard } from './BookCard'
import { CareAiAvatar } from './CareAiAvatar'
import { ConsultCard } from './ConsultCard'
import { QuickReplies } from './QuickReplies'
import { ReplyActions } from './ReplyActions'
import { BulletsCard, MedCard, NoteCallout } from './ReplyBlocks'
import { ResultsCard } from './ResultsCard'
import { SummaryCard } from './SummaryCard'
import { UrgentCard } from './UrgentCard'

type Props = {
	turn: CareAiAssistantMessage
	/** First name of whoever the chat is for ("For Vikram", "Saved to Vikram’s health records"). */
	forName: string
	onLink: (link: CareAiLink) => void
	onChip: (turn: CareAiAssistantMessage, chip: string) => void
	/** Books a slot from the in-chat booking card (resolve to confirm, throw to keep the picker open). */
	onBook?: (book: CareAiBook, slot: string) => void | Promise<void>
	/** The patient switched sharing the chat summary with the doctor on or off. */
	onShareSummary?: (shared: boolean) => void
}

export function AiTurn({ turn, forName, onLink, onChip, onBook, onShareSummary }: Props) {
	const { reply } = turn
	const showChips = !!reply.chips?.length && !turn.picked

	return (
		<View style={styles.turn}>
			<View style={styles.label}>
				<CareAiAvatar size={22} ring={2} iconSize={12} />
				<Text style={styles.labelText}>Care AI</Text>
			</View>
			<View style={styles.body}>
				{reply.text ? <Text style={styles.text}>{reply.text}</Text> : null}
				{reply.urgent ? <UrgentCard title={reply.urgent.title} body={reply.urgent.body} /> : null}
				{reply.consult ? (
					<ConsultCard consult={reply.consult} onPress={() => onLink(reply.consult!.link)} />
				) : null}
				{reply.summary ? (
					<SummaryCard summary={reply.summary} forName={forName} onShareChange={onShareSummary} />
				) : null}
				{reply.book ? (
					<BookCard
						book={reply.book}
						initialSlot={turn.initialSlot}
						onConfirm={onBook ? (slot) => onBook(reply.book!, slot) : undefined}
						onViewBooking={() => onLink({ to: 'appointments' })}
					/>
				) : null}
				{reply.after ? <Text style={styles.text}>{reply.after}</Text> : null}
				{reply.results ? <ResultsCard results={reply.results} /> : null}
				{reply.med ? <MedCard name={reply.med.name} sub={reply.med.sub} /> : null}
				{reply.bullets ? <BulletsCard title={reply.bulletsTitle ?? ''} bullets={reply.bullets} /> : null}
				{reply.note ? <NoteCallout text={reply.note} /> : null}
				{reply.actions?.length ? <ReplyActions actions={reply.actions} onLink={onLink} /> : null}
				{showChips ? <QuickReplies chips={reply.chips!} onPick={(chip) => onChip(turn, chip)} /> : null}
				{reply.source ? (
					<AnswerFooter source={reply.source} why={reply.why} shareText={reply.text} savedFor={forName} />
				) : null}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	turn: { gap: 10 },
	label: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	labelText: { fontSize: 12, lineHeight: 16, fontWeight: '800', color: APP_COLORS.primary },
	body: { gap: 10, paddingLeft: 30 },
	text: { fontSize: 15, lineHeight: 23, color: APP_COLORS.ink },
})
