// src/features/ancillary/staff/schedule/useScheduleOffer.ts
//
// The request card at the top of the Schedule: an offer open to this provider right now (an instant request she has 30 seconds to
// answer, or a scheduled visit nobody took within the hour). It polls GET /provider/requests/available while the screen is on show,
// counts down the time the server says is left on her offer (`expiresInMs`; from when this device first saw it with an older
// backend, the same rule as the Today tab), and accepts / declines
// through the unchanged offer endpoints. Today's dispatch socket is not opened here: Today keeps ringing the offer; this is the
// same offer shown where the provider is looking at her schedule.
import { useEffect, useState } from 'react'
import Toast from 'react-native-toast-message'
import { acceptCareRequestBackend, extractApiErrorMessage } from '../../ancillaryService'
import { getOpenOffers, rejectOffer, type ProviderOffer } from '../../providerVisitService'
import { isInstantOffer, offerSeenAtMs } from '../today/todayView'

const POLL_MS = 8_000
/** Seconds an instant request is held for this provider (the backend's 30 s offer; INSTANT_WINDOW_S on Today). */
export const INSTANT_WINDOW_S = 30

const keyOf = (o: ProviderOffer) => o.visitPublicId ?? o.requestId

type Options = {
	enabled: boolean
	/** After an accept: reload the schedule so the new visit shows. */
	onAccepted: () => void
}

export function useScheduleOffer({ enabled, onAccepted }: Options) {
	const [offers, setOffers] = useState<ProviderOffer[]>([])
	const [nowMs, setNowMs] = useState(() => Date.now())
	const [busy, setBusy] = useState(false)
	/** When this device first saw each offer (the 30 s of an instant request count from here). */
	const [seenAt, setSeenAt] = useState<Record<string, number>>({})
	/** Offers already answered here (accepted, declined or taken by someone else): not shown again. */
	const [gone, setGone] = useState<string[]>([])

	useEffect(() => {
		if (!enabled) return
		let active = true
		const run = async () => {
			try {
				const list = await getOpenOffers()
				if (!active) return
				const now = Date.now()
				setSeenAt((prev) => {
					const next = { ...prev }
					// The server's time left on her offer wins; without it the 30 s count from when this device first saw the offer.
					for (const o of list) {
						if (o.expiresInMs != null) next[keyOf(o)] = offerSeenAtMs(now, o.expiresInMs, INSTANT_WINDOW_S)
						else if (!next[keyOf(o)]) next[keyOf(o)] = now
					}
					return next
				})
				setNowMs(now)
				setOffers(list)
			} catch {
				// Offline or a hiccup: the card just stays as it was; the next poll tries again.
			}
		}
		void run()
		const t = setInterval(() => void run(), POLL_MS)
		return () => {
			active = false
			clearInterval(t)
		}
	}, [enabled])

	const secondsLeft = (o: ProviderOffer) =>
		isInstantOffer(o)
			? Math.max(0, INSTANT_WINDOW_S - Math.floor((nowMs - (seenAt[keyOf(o)] ?? nowMs)) / 1000))
			: null

	// A countdown tick while an instant request is on the card.
	const hasInstant = enabled && offers.some((o) => isInstantOffer(o) && !gone.includes(keyOf(o)))
	useEffect(() => {
		if (!hasInstant) return
		const t = setInterval(() => setNowMs(Date.now()), 1000)
		return () => clearInterval(t)
	}, [hasInstant])

	const live = offers.filter((o) => !gone.includes(keyOf(o)) && secondsLeft(o) !== 0)
	const offer = live[0] ?? null

	const finish = (o: ProviderOffer) => {
		setGone((prev) => [...prev, keyOf(o)])
		setOffers((prev) => prev.filter((x) => keyOf(x) !== keyOf(o)))
	}

	const accept = async (o: ProviderOffer) => {
		if (busy) return
		setBusy(true)
		try {
			const res = await acceptCareRequestBackend(o.requestId)
			finish(o)
			if (res.success) {
				Toast.show({
					type: 'success',
					text1: 'Request accepted',
					text2: o.patientName
						? `Your visit with ${o.patientName} is confirmed.`
						: 'Your visit is confirmed.',
				})
				onAccepted()
			} else {
				Toast.show({
					type: 'info',
					text1: res.alreadyClaimed ? 'Too late' : 'Could not accept',
					text2: res.message ?? 'Please try again.',
				})
			}
		} finally {
			setBusy(false)
		}
	}

	const decline = async (o: ProviderOffer) => {
		if (busy) return
		setBusy(true)
		try {
			const declined = await rejectOffer(o.requestId)
			finish(o)
			// Already hers (her Accept got there first): nothing was declined, so no toast.
			if (declined) Toast.show({ type: 'success', text1: 'Request passed to other nurses nearby' })
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'Could not decline the request',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		} finally {
			setBusy(false)
		}
	}

	return { offer, secondsLeft: offer ? secondsLeft(offer) : null, busy, accept, decline }
}
