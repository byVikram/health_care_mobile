// src/utils/calendar.ts
//
// "Add to calendar": opens the phone's own "new event" screen (Google Calendar / the system calendar on
// Android, the Calendar sheet on iOS) prefilled with the appointment, so the user reviews it and taps
// Save -- we never write to their calendar silently.
//
// Uses expo-calendar's *legacy* API on purpose: since SDK 57 the default `expo-calendar` entry point is the
// new API, which is stubbed out in Expo Go ("not yet available in the Expo Go managed workflow"), while
// `expo-calendar/legacy` works in Expo Go and in dev/production builds alike.

import { Platform } from 'react-native'
import Toast from 'react-native-toast-message'
import * as Calendar from 'expo-calendar/legacy'

export type CalendarEventInput = {
	title: string
	start: Date
	/** Defaults to start + DEFAULT_DURATION_MINUTES. */
	end?: Date | null
	location?: string
	notes?: string
}

const DEFAULT_DURATION_MINUTES = 30
/** Reminder shown before the appointment. */
const REMINDER_MINUTES_BEFORE = 60

export type AddToCalendarResult = 'saved' | 'cancelled' | 'denied' | 'error'

export async function addToCalendar({ title, start, end, location, notes }: CalendarEventInput): Promise<AddToCalendarResult> {
	if (Number.isNaN(start.getTime())) {
		Toast.show({ type: 'error', text1: 'Couldn’t add to calendar', text2: 'This appointment has no valid date or time.' })
		return 'error'
	}
	const endDate = end && end.getTime() > start.getTime() ? end : new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60_000)

	try {
		// Android hands the event to the calendar app through an intent (no permission needed); iOS's event
		// sheet needs calendar access.
		if (Platform.OS === 'ios') {
			const { granted } = await Calendar.requestCalendarPermissionsAsync()
			if (!granted) {
				Toast.show({
					type: 'error',
					text1: 'Calendar access is off',
					text2: 'Allow calendar access in Settings to add appointments.',
				})
				return 'denied'
			}
		}

		const result = await Calendar.createEventInCalendarAsync({
			title,
			startDate: start,
			endDate,
			location,
			notes,
			alarms: [{ relativeOffset: -REMINDER_MINUTES_BEFORE }],
		})

		if (result.action === Calendar.CalendarDialogResultActions.canceled) return 'cancelled'
		Toast.show({ type: 'success', text1: 'Added to your calendar' })
		return 'saved'
	} catch (error) {
		console.log('[calendar] could not add event', error)
		Toast.show({ type: 'error', text1: 'Couldn’t add to calendar', text2: 'Please try again.' })
		return 'error'
	}
}
