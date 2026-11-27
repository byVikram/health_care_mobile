// src/features/care-ai/careAiService.ts
//
// The Care AI chat API (backend /api/chatbot): sessions, one call per message (the whole reply comes back at once,
// nothing is streamed), the thumbs-up / down on an answer. The screens show their own errors, so none of these calls
// raises the global error dialog.

import { API_ENDPOINTS } from '../../constants/apiUrls'
import ApiService from '../../services/apiService'

/** A reply can take several seconds (the backend asks the model more than once per message). */
const MESSAGE_TIMEOUT_MS = 60_000

type Envelope<T> = { success: boolean; message: string; data: T }

export type ChatSource = { title?: string; source?: string; url?: string | null; chunk_id?: string }

export type ChatDoctor = {
	/** The doctor's public id: what the doctor detail screen opens. */
	id?: string | null
	name: string
	speciality?: string[]
	location?: string
	hospital_name?: string | null
	fees?: number
	rating?: number | null
	consultation_mode?: string
	distance?: string | null
	experience_years?: number
	earliest_slot?: string | null
}

/** What a reply carries besides its text (the same shape live and when a saved chat is reopened). */
export type ChatPayload = {
	answer?: string
	/** 'non-urgent' | 'urgent' | 'emergency' (older rows may say low / medium / high). */
	severity?: string
	doctor_needed?: boolean
	recommended_speciality?: string | null
	possible_conditions?: string[]
	home_remedies?: string[]
	nearby_doctors?: ChatDoctor[]
	sources?: ChatSource[]
	confidence_category?: string
}

export type ChatTurn = {
	message_id: string
	answer: string
	payload: ChatPayload
	session_title: string
}

export type ChatStoredMessage = {
	id: string
	/** 'user', or 'model' / 'assistant' for Care AI. */
	role: string
	content: string
	triage_level?: string | null
	confidence_category?: string | null
	sources?: ChatSource[] | null
	structured_payload?: ChatPayload | null
	created_at?: string | null
}

export type ChatSession = {
	id: string
	title: string
	created_at?: string | null
	updated_at?: string | null
	messages?: ChatStoredMessage[] | null
}

export async function createChatSession(): Promise<ChatSession> {
	const res = await ApiService.post<Envelope<ChatSession>>(
		API_ENDPOINTS.CHATBOT.SESSIONS,
		{},
		{ skipGlobalError: true }
	)
	return res.data.data
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatTurn> {
	const res = await ApiService.post<Envelope<ChatTurn>>(
		API_ENDPOINTS.CHATBOT.SEND_MESSAGE(sessionId),
		{ message },
		{ skipGlobalError: true, timeout: MESSAGE_TIMEOUT_MS }
	)
	return res.data.data
}

export async function listChatSessions(): Promise<ChatSession[]> {
	const res = await ApiService.get<Envelope<ChatSession[]>>(API_ENDPOINTS.CHATBOT.SESSIONS, {
		skipGlobalError: true,
	})
	return res.data.data
}

export async function getChatSession(sessionId: string): Promise<ChatSession> {
	const res = await ApiService.get<Envelope<ChatSession>>(API_ENDPOINTS.CHATBOT.SESSION_DETAIL(sessionId), {
		skipGlobalError: true,
	})
	return res.data.data
}

export async function sendChatFeedback(messageId: string, isHelpful: boolean): Promise<void> {
	await ApiService.post(
		API_ENDPOINTS.CHATBOT.FEEDBACK(messageId),
		{ is_helpful: isHelpful },
		{ skipGlobalError: true }
	)
}
