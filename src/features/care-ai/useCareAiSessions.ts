// src/features/care-ai/useCareAiSessions.ts
//
// The patient's saved Care AI chats for the "Recent chats" sheet: loaded each time the sheet opens, newest first,
// chats that never got a message left out.

import { useEffect, useState } from 'react'
import { formatShortDateDisplay } from '../../utils/date'
import { listChatSessions, type ChatSession } from './careAiService'
import type { CareAiRecentChat } from './careAiTypes'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const PREVIEW_CHARS = 120

const toRecentChat = (session: ChatSession): CareAiRecentChat | null => {
	const saved = [...(session.messages ?? [])].sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
	const last = saved[saved.length - 1]
	if (!last) return null
	const updated = new Date(session.updated_at ?? session.created_at ?? Date.now())
	const text = last.content.trim().replace(/\s+/g, ' ')
	return {
		id: session.id,
		group: Date.now() - updated.getTime() < WEEK_MS ? 'This week' : 'Earlier',
		title: session.title,
		preview: text.length > PREVIEW_CHARS ? `${text.slice(0, PREVIEW_CHARS).trimEnd()}…` : text,
		when: formatShortDateDisplay(updated),
	}
}

export function useCareAiSessions(open: boolean) {
	const [chats, setChats] = useState<CareAiRecentChat[]>([])
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		if (!open) return
		let active = true
		const load = async () => {
			setLoading(true)
			try {
				const sessions = await listChatSessions()
				if (active) {
					setChats(sessions.map(toRecentChat).filter((c): c is CareAiRecentChat => c !== null))
				}
			} catch {
				// keep what was loaded last time; the sheet shows it (or "No chats yet")
			} finally {
				if (active) setLoading(false)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [open])

	return { chats, loading }
}
