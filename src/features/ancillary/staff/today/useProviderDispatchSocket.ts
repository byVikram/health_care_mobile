// src/features/ancillary/staff/today/useProviderDispatchSocket.ts
//
// Push channel for provider offers: the backend dispatch WebSocket (/ws/provider/dispatch). Replaces polling
// GET /provider/requests/available.
//   - Auth: first-message handshake {"type":"auth","token"} (handled by openAuthedSocket); the server answers AUTH_OK
//     and immediately pushes every pending offer for the provider as NEW_CARE_REQUEST_OFFER, so there is no
//     catch-up fetch after (re)connecting.
//   - Events handled:
//       NEW_CARE_REQUEST_OFFER      data = offer payload (instant request, or one visit of a provider-less
//                                   scheduled order). A tip change re-sends the same requestId -> `onOffer` again.
//       CARE_REQUEST_STATUS_CHANGE  a cancelled / expired / failed status for an offered request -> `onOfferGone`
//                                   (and `onOrdersChanged`); any other status -> `onOrdersChanged`.
//       OFFER_WITHDRAWN             data = {requestId, reason: ACCEPTED_BY_OTHER | CANCELLED | EXPIRED,
//                                   visitPublicId?} sent to the OTHER providers -> `onOfferGone` (with the reason).
//       NEW_SCHEDULED_ORDER_REQUEST a booking addressed to this provider -> `onOrdersChanged` (re-read Today).
//   - Open only while `enabled` (screen focused) AND the app is in the foreground; closed on blur / background /
//     unmount (logout unmounts the authenticated stack). openAuthedSocket reconnects with exponential backoff
//     (1 s doubling to 30 s) and stops on fatal close codes (4401 / 4403 / 4404). A light ping every 25 s keeps idle
//     proxies from closing the socket.
import { useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'
import { openAuthedSocket } from '../../../../utils/authedSocket'
import { toProviderOffer, type ProviderOffer } from '../../providerVisitService'

const KEEPALIVE_MS = 25_000
const GONE_STATUS = /CANCEL|EXPIRED|FAILED|NO_PROVIDER|UNASSIGNED/

/** An offer that is no longer available. `reason` is absent for a plain cancelled / expired status change. */
export type OfferGone = {
	requestId: string
	visitPublicId?: string | null
	reason?: 'ACCEPTED_BY_OTHER' | 'CANCELLED' | 'EXPIRED'
}

export type ProviderDispatchHandlers = {
	enabled: boolean
	onOffer: (offer: ProviderOffer) => void
	onOfferGone: (gone: OfferGone) => void
	onOrdersChanged: () => void
}

export function useProviderDispatchSocket({
	enabled,
	onOffer,
	onOfferGone,
	onOrdersChanged,
}: ProviderDispatchHandlers) {
	const [foreground, setForeground] = useState(AppState.currentState === 'active')
	const handlers = useRef({ onOffer, onOfferGone, onOrdersChanged })
	handlers.current = { onOffer, onOfferGone, onOrdersChanged }

	useEffect(() => {
		const sub = AppState.addEventListener('change', (state) => setForeground(state === 'active'))
		return () => sub.remove()
	}, [])

	const active = enabled && foreground
	useEffect(() => {
		if (!active) return
		const socket = openAuthedSocket(API_ENDPOINTS.ANCILLARY.WS_PROVIDER_DISPATCH, (event) => {
			const data = event?.data
			switch (event?.type) {
				case 'NEW_CARE_REQUEST_OFFER': {
					const offer = toProviderOffer(data)
					if (offer) handlers.current.onOffer(offer)
					break
				}
				case 'CARE_REQUEST_STATUS_CHANGE': {
					const requestId = String(data?.requestId ?? data?.id ?? data?.request_public_id ?? '')
					if (requestId && GONE_STATUS.test(String(data?.status ?? '').toUpperCase())) {
						handlers.current.onOfferGone({ requestId, reason: 'CANCELLED' })
					}
					handlers.current.onOrdersChanged()
					break
				}
				case 'OFFER_WITHDRAWN': {
					const requestId = String(data?.requestId ?? '')
					if (!requestId) break
					const reason = ['ACCEPTED_BY_OTHER', 'CANCELLED', 'EXPIRED'].includes(data?.reason)
						? (data.reason as OfferGone['reason'])
						: 'EXPIRED'
					handlers.current.onOfferGone({
						requestId,
						visitPublicId: data?.visitPublicId ? String(data.visitPublicId) : null,
						reason,
					})
					break
				}
				case 'NEW_SCHEDULED_ORDER_REQUEST':
					handlers.current.onOrdersChanged()
					break
			}
		})
		const ping = setInterval(() => socket.send(JSON.stringify({ type: 'ping' })), KEEPALIVE_MS)
		return () => {
			clearInterval(ping)
			socket.close()
		}
	}, [active])
}
