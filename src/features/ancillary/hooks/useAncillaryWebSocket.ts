import { useEffect, useRef, useCallback } from 'react'
import Toast from 'react-native-toast-message'
import { secureStorage } from '../../../utils/secureStorage'
import { API_ENDPOINTS } from '../../../constants/apiUrls'

export interface WsAncillaryScheduledRequestEvent {
	type: 'ancillary_scheduled_request'
	request_public_id: string
	patient_name: string
	scheduled_date: string
	scheduled_start_time: string
	scheduled_end_time: string
	address?: string
	message?: string
}

export interface WsPatientScheduledAcceptedEvent {
	type: 'patient_scheduled_request_accepted'
	request_public_id: string
	provider_name: string
	scheduled_date: string
	scheduled_time: string
	message?: string
}

export interface WsPatientRescheduleProposedEvent {
	type: 'patient_reschedule_proposed'
	request_public_id: string
	provider_name: string
	rescheduled_date: string
	rescheduled_start_time: string
	rescheduled_end_time: string
	reason?: string
	message?: string
}

export type AncillaryWsEvent =
	| WsAncillaryScheduledRequestEvent
	| WsPatientScheduledAcceptedEvent
	| WsPatientRescheduleProposedEvent

interface UseAncillaryWebSocketOptions {
	onScheduledRequest?: (event: WsAncillaryScheduledRequestEvent) => void
	onScheduledAccepted?: (event: WsPatientScheduledAcceptedEvent) => void
	onRescheduleProposed?: (event: WsPatientRescheduleProposedEvent) => void
	enabled?: boolean
}

export function useAncillaryWebSocket(options: UseAncillaryWebSocketOptions = {}) {
	const { onScheduledRequest, onScheduledAccepted, onRescheduleProposed, enabled = true } = options
	const wsRef = useRef<WebSocket | null>(null)
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const connect = useCallback(async () => {
		if (!enabled) return

		try {
			const token = await secureStorage.getItem('access_token')
			if (!token) return

			const wsUrl = API_ENDPOINTS.ANCILLARY.WS_ANCILLARY(token)
			const ws = new WebSocket(wsUrl)
			wsRef.current = ws

			ws.onopen = () => {
				console.log('[AncillaryWS] Connected to ancillary real-time WebSocket')
			}

			ws.onmessage = (e) => {
				try {
					const data: AncillaryWsEvent = JSON.parse(e.data)
					if (!data || !data.type) return

					if (data.type === 'ancillary_scheduled_request') {
						Toast.show({
							type: 'info',
							text1: '📅 New Scheduled Request',
							text2: data.message || `Booking request from ${data.patient_name} for ${data.scheduled_date} ${data.scheduled_start_time}`,
						})
						onScheduledRequest?.(data)
					} else if (data.type === 'patient_scheduled_request_accepted') {
						Toast.show({
							type: 'success',
							text1: '✅ Booking Confirmed',
							text2: data.message || `Your request for ${data.scheduled_date} ${data.scheduled_time} was accepted by ${data.provider_name}`,
						})
						onScheduledAccepted?.(data)
					} else if (data.type === 'patient_reschedule_proposed') {
						Toast.show({
							type: 'info',
							text1: '🔄 Reschedule Proposed',
							text2: data.message || `${data.provider_name} proposed new slot on ${data.rescheduled_date} at ${data.rescheduled_start_time}`,
						})
						onRescheduleProposed?.(data)
					}
				} catch (err) {
					console.log('[AncillaryWS] Error parsing WebSocket message:', err)
				}
			}

			ws.onerror = (error) => {
				console.log('[AncillaryWS] WebSocket error:', error)
			}

			ws.onclose = () => {
				console.log('[AncillaryWS] WebSocket closed, scheduling reconnect in 5s')
				reconnectTimeoutRef.current = setTimeout(() => {
					connect()
				}, 5000)
			}
		} catch (err) {
			console.log('[AncillaryWS] Failed to initiate WebSocket connection:', err)
		}
	}, [enabled, onScheduledRequest, onScheduledAccepted, onRescheduleProposed])

	useEffect(() => {
		connect()

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current)
			}
			if (wsRef.current) {
				wsRef.current.close()
			}
		}
	}, [connect])

	return {
		ws: wsRef.current,
	}
}
