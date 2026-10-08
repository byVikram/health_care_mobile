// src/features/care-ai/useCareAiChat.ts
//
// State of one Care AI conversation: the messages, the "typing" beat before each reply, the suggested follow-ups
// and what each tap (starter, quick-reply chip, suggestion, typed text) asks. Replies come from the scripted
// careAiReplies module; swap `buildReply` for the chat API there and nothing in the screens changes.

import { useCallback, useEffect, useRef, useState } from 'react'
import { CONCERNS, SAMPLE_REPORT } from './careAiData'
import { buildReply, resolveChip, routeText } from './careAiReplies'
import { launchMessages } from './careAiScenarios'
import type {
	CareAiAssistantMessage,
	CareAiAttachment,
	CareAiFollowUp,
	CareAiLaunch,
	CareAiMessage,
	CareAiReply,
	CareAiRecentChat,
	CareAiReplyArg,
	CareAiReplyId,
	CareAiStarter,
} from './careAiTypes'

/** How long "Care AI is typing" shows before the reply lands. */
const TYPING_MS = 1000

export function useCareAiChat(firstName: string, launch?: CareAiLaunch) {
	const idRef = useRef(0)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const busyRef = useRef(false)
	// The concern picked in the doctor-finder, which the later turns (mode, area, result) are about.
	const concernRef = useRef(CONCERNS[0].label)

	const assistant = useCallback(
		(kind: CareAiReplyId, arg?: CareAiReplyArg, patch?: Partial<CareAiReply>): CareAiAssistantMessage => ({
			id: `m${++idRef.current}`,
			role: 'ai',
			kind,
			reply: { ...buildReply(kind, arg, { firstName }), ...patch },
		}),
		[firstName]
	)

	// Opened into a scenario (chat summary, booking a doctor)? Start from that conversation, not the welcome screen.
	const [messages, setMessages] = useState<CareAiMessage[]>(
		() =>
			launchMessages(launch, (text) => ({ id: `m${++idRef.current}`, role: 'user', text }), assistant) ?? [
				assistant('greet'),
			]
	)
	const [follow, setFollow] = useState<CareAiFollowUp[]>([])
	const [typing, setTyping] = useState(false)

	useEffect(
		() => () => {
			if (timerRef.current) clearTimeout(timerRef.current)
		},
		[]
	)

	/** Mark the choice made on turn `messageId`; the other chips on it lock. */
	const markPicked = useCallback((messageId: string, value: string) => {
		setMessages((prev) => prev.map((m) => (m.role === 'ai' && m.id === messageId ? { ...m, picked: value } : m)))
	}, [])

	/** Add the user's message, wait the typing beat, then add Care AI's `id` reply. Ignored while a reply is pending. */
	const ask = useCallback(
		(text: string, id: CareAiReplyId, arg?: CareAiReplyArg, file?: CareAiAttachment) => {
			if (busyRef.current) return
			busyRef.current = true
			setMessages((prev) => [
				// The welcome starters give way to the conversation once anything is asked.
				...prev.map((m) =>
					m.role === 'ai' && m.kind === 'greet' && !m.picked ? { ...m, picked: 'typed' } : m
				),
				{ id: `m${++idRef.current}`, role: 'user', text, file },
			])
			setTyping(true)
			setFollow([])
			timerRef.current = setTimeout(() => {
				const reply = assistant(id, arg)
				setMessages((prev) => [...prev, reply])
				setFollow(reply.reply.follow)
				setTyping(false)
				busyRef.current = false
			}, TYPING_MS)
		},
		[assistant]
	)

	const sendText = useCallback(
		(text: string) => {
			const trimmed = text.trim()
			if (trimmed) ask(trimmed, routeText(trimmed), trimmed)
		},
		[ask]
	)

	const pickStarter = useCallback(
		(starter: CareAiStarter) => {
			const greet = messages[0]
			if (greet) markPicked(greet.id, starter.title)
			ask(starter.title, starter.id)
		},
		[ask, markPicked, messages]
	)

	const answerChip = useCallback(
		(turn: CareAiAssistantMessage, chip: string) => {
			if (turn.picked) return
			markPicked(turn.id, chip)
			if (turn.kind === 'doctor') concernRef.current = chip
			const next = resolveChip(turn.kind, chip, concernRef.current)
			ask(chip, next.id, next.arg)
		},
		[ask, markPicked]
	)

	const askFollowUp = useCallback(
		(f: CareAiFollowUp) => ask(f.label, f.id ?? routeText(f.label), f.arg !== undefined ? f.arg : f.label),
		[ask]
	)

	const explainReport = useCallback(() => {
		const greet = messages[0]
		if (greet?.role === 'ai' && !greet.picked) markPicked(greet.id, 'report')
		ask('Explain my HbA1c report', 'report', undefined, SAMPLE_REPORT)
	}, [ask, markPicked, messages])

	const reopenRecent = useCallback((chat: CareAiRecentChat) => ask(chat.title, chat.seed, 'Headache'), [ask])

	const newChat = useCallback(() => {
		if (timerRef.current) clearTimeout(timerRef.current)
		busyRef.current = false
		concernRef.current = CONCERNS[0].label
		setMessages([assistant('greet')])
		setFollow([])
		setTyping(false)
	}, [assistant])

	return {
		messages,
		follow,
		typing,
		/** False on the welcome screen (only the greeting so far). */
		hasAsked: messages.length > 1,
		sendText,
		pickStarter,
		answerChip,
		askFollowUp,
		explainReport,
		reopenRecent,
		newChat,
	}
}
