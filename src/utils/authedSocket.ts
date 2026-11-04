import { secureStorage } from './secureStorage'

// Close codes the backend uses to say "this will never work, stop retrying":
// 4401 not authenticated, 4403 not allowed (not your request), 4404 no such request.
const FATAL_CLOSE_CODES = new Set([4401, 4403, 4404])
const MAX_BACKOFF_MS = 30_000

export type AuthedSocketHandle = {
	close: () => void
	send: (data: string) => void
	/** True once the server has accepted the handshake and until the connection drops: pushes are arriving. */
	isConnected: () => boolean
}

/**
 * Open a WebSocket to the backend and authenticate it with the first-message
 * handshake it requires: {"type":"auth","token":<access token>} is sent as the
 * very first frame. The token travels in the message body, never in the URL, so
 * it can't end up in server/proxy access logs. The server replies {"type":"AUTH_OK"}
 * (swallowed here) and then streams events, which are handed to `onEvent` already
 * JSON-parsed.
 *
 * If the connection drops (and wasn't closed by us or rejected by the server) it
 * reconnects with exponential backoff, re-reading the token each time so a
 * refreshed token is picked up. Call close() on unmount.
 */
export const openAuthedSocket = (url: string, onEvent: (event: any) => void): AuthedSocketHandle => {
	let socket: WebSocket | null = null
	let closedByCaller = false
	let retryTimer: ReturnType<typeof setTimeout> | null = null
	let attempt = 0
	let authenticated = false

	const scheduleReconnect = () => {
		if (closedByCaller) return
		const delay = Math.min(MAX_BACKOFF_MS, 1000 * 2 ** attempt)
		attempt += 1
		retryTimer = setTimeout(connect, delay)
	}

	const connect = async () => {
		if (closedByCaller) return
		const token = await secureStorage.getItem('access_token')
		if (closedByCaller || !token) return

		const ws = new WebSocket(url)
		socket = ws

		ws.onopen = () => {
			attempt = 0
			ws.send(JSON.stringify({ type: 'auth', token }))
		}
		ws.onmessage = (message) => {
			try {
				const event = JSON.parse(message.data)
				if (event?.type === 'AUTH_OK') {
					authenticated = true
					return
				}
				onEvent(event)
			} catch (error) {
				console.log('[authedSocket] could not parse message:', error)
			}
		}
		ws.onerror = () => {
			// onclose follows and drives the retry; nothing to do here.
		}
		ws.onclose = (closeEvent) => {
			if (socket === ws) {
				socket = null
				authenticated = false
			}
			if (closedByCaller || FATAL_CLOSE_CODES.has(closeEvent.code)) return
			scheduleReconnect()
		}
	}

	void connect()

	return {
		send: (data: string) => {
			if (socket?.readyState === WebSocket.OPEN) socket.send(data)
		},
		isConnected: () => authenticated && socket?.readyState === WebSocket.OPEN,
		close: () => {
			closedByCaller = true
			if (retryTimer) clearTimeout(retryTimer)
			socket?.close()
		},
	}
}
