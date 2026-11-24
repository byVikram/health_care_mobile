// src/features/events/eventActions.ts
//
// What the event screens do with an event: open its registration link, and the screens that show it.
import Toast from 'react-native-toast-message'
import { openWebUrl } from '../../utils/safeLinking'
import type { EventItem } from '../../types/event'

/** Opens the registration page in the browser; tells the user when it cannot be opened (only https links open). */
export async function openRegistration(event: Pick<EventItem, 'registration_link'>) {
	try {
		await openWebUrl(event.registration_link)
	} catch {
		Toast.show({ type: 'error', text1: 'Couldn’t open the registration page', text2: 'Please try again later.' })
	}
}
