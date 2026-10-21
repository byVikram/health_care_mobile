// src/features/bookings/bookingNavigation.ts
//
// The one place that turns a Bookings-tab item (GET /api/patients/me/bookings) into navigation / side effects:
//   openBookingTarget  -- item.target.type -> the vertical's existing detail screen.
//   runBookingAction   -- item.actions.{primary,secondary}.key -> open target / map / call / cancel / book again.
// Unknown targets or actions never dead-end silently: they fall back to the target, or a toast.

import { Alert, Linking } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Toast from 'react-native-toast-message'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import type { BookingActionKey, BookingItem } from '../../services/bookingsService'
import { openOnMap } from '../../utils/maps'
import { cancelAncillaryOrder, getAncillaryOrder } from '../ancillary/ancillaryProviderBookingService'

/** Only 
avigate is needed, so the tab screen's composite navigation prop fits too. */
export type BookingsNavigation = Pick<NativeStackNavigationProp<AppStackParamList>, 'navigate'>

export type BookingActionHandlers = {
	/** Doctor cancel: show the shared CancelAppointmentSheet for this item. */
	requestAppointmentCancel: (item: BookingItem) => void
	/** Marks an action chip busy (null = idle) while something async runs. */
	setBusy: (busyKey: string | null) => void
	/** Refetch the list after something changed (e.g. a cancellation). */
	onChanged: () => void
}

export const bookingKey = (item: BookingItem) => `${item.category}:${item.id}`
export const actionBusyKey = (item: BookingItem, key: BookingActionKey) => `${bookingKey(item)}:${key}`

const cannotOpen = () =>
	Toast.show({ type: 'info', text1: "Can't open this booking yet", text2: 'Please try again in a moment.' })

/** Opens the existing detail screen for the item's target. */
export function openBookingTarget(navigation: BookingsNavigation, item: BookingItem) {
	const { type, id } = item.target ?? { type: undefined, id: '' }
	if (!id) {
		cannotOpen()
		return
	}
	switch (type) {
		case 'appointment':
			navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: id })
			return
		case 'visit_summary':
			navigation.navigate(ROUTES.STACK.VISIT_SUMMARY, { appointmentId: id })
			return
		case 'ancillary_request':
			navigation.navigate(ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS, { requestId: id })
			return
		case 'ancillary_tracking':
			navigation.navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, { bookingId: id })
			return
		case 'pharmacy_order':
			navigation.navigate(ROUTES.STACK.ORDER_DETAILS, { orderId: id })
			return
		case 'lab_booking':
			navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_TRACKING, { orderId: id })
			return
		default:
			cannotOpen()
	}
}

/** "Indiranagar clinic · 1.2 km" -> "Indiranagar clinic" (the distance isn't part of the place). */
const placeOf = (where?: string | null) => (where ?? '').replace(/\s*·\s*[\d.,]+\s*(km|m)\s*$/i, '').trim()

const confirm = (title: string, message: string, confirmLabel: string) =>
	new Promise<boolean>((resolve) => {
		Alert.alert(
			title,
			message,
			[
				{ text: 'Keep it', style: 'cancel', onPress: () => resolve(false) },
				{ text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
			],
			{ cancelable: true, onDismiss: () => resolve(false) }
		)
	})

async function callProvider(navigation: BookingsNavigation, item: BookingItem, handlers: BookingActionHandlers) {
	const isCare = item.target.type === 'ancillary_tracking' || item.target.type === 'ancillary_request'
	if (!isCare) {
		openBookingTarget(navigation, item)
		return
	}
	handlers.setBusy(actionBusyKey(item, 'call'))
	try {
		const order = await getAncillaryOrder(item.target.id)
		const phone = order.provider?.phone?.replace(/[^\d+]/g, '')
		if (!phone) {
			Toast.show({ type: 'info', text1: "Phone number isn't available yet" })
			return
		}
		await Linking.openURL(`tel:${phone}`)
	} catch {
		Toast.show({ type: 'error', text1: "Couldn't start the call", text2: 'Please try again.' })
	} finally {
		handlers.setBusy(null)
	}
}

async function cancelBooking(navigation: BookingsNavigation, item: BookingItem, handlers: BookingActionHandlers) {
	const { type, id } = item.target
	if (type === 'appointment') {
		handlers.requestAppointmentCancel(item)
		return
	}
	if (type === 'ancillary_request' || type === 'ancillary_tracking') {
		const ok = await confirm('Cancel this booking?', `${item.title} will be cancelled.`, 'Cancel booking')
		if (!ok) return
		handlers.setBusy(actionBusyKey(item, 'cancel'))
		try {
			await cancelAncillaryOrder(id)
			Toast.show({ type: 'success', text1: 'Booking cancelled' })
			handlers.onChanged()
		} catch {
			Toast.show({ type: 'error', text1: "Couldn't cancel the booking", text2: 'Please try again.' })
		} finally {
			handlers.setBusy(null)
		}
		return
	}
	// Pharmacy (and anything else): cancellation lives on the detail screen.
	openBookingTarget(navigation, item)
}

function bookAgain(navigation: BookingsNavigation, item: BookingItem) {
	switch (item.category) {
		case 'doctor':
			// The list item has no doctor id -- the appointment details page has its own "Book again".
			navigation.navigate(ROUTES.STACK.APPOINTMENT_DETAILS, { appointmentId: item.target.id })
			return
		case 'ancillary':
			// The speciality comes from the DB (item.service); without it there's no catalogue to open, so show
			// the booking itself instead of guessing one.
			if (item.service) {
				navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
					serviceKey: item.service.key,
					serviceLabel: item.service.label,
				})
			} else {
				openBookingTarget(navigation, item)
			}
			return
		case 'lab':
			navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
			return
		case 'pharmacy':
			navigation.navigate(ROUTES.STACK.PHARMACY_SEARCH_PAGE)
			return
		default:
			openBookingTarget(navigation, item)
	}
}

/** Runs a card action. Everything not handled specially opens the item's target. */
export async function runBookingAction(
	navigation: BookingsNavigation,
	item: BookingItem,
	key: BookingActionKey | (string & {}),
	handlers: BookingActionHandlers
) {
	switch (key) {
		case 'directions': {
			const place = placeOf(item.where)
			if (place) openOnMap(place, undefined)
			else openBookingTarget(navigation, item)
			return
		}
		case 'call':
			await callProvider(navigation, item, handlers)
			return
		case 'cancel':
			await cancelBooking(navigation, item, handlers)
			return
		case 'book_again':
			bookAgain(navigation, item)
			return
		case 'visit_summary':
			if (item.target.type === 'appointment' || item.target.type === 'visit_summary') {
				navigation.navigate(ROUTES.STACK.VISIT_SUMMARY, { appointmentId: item.target.id })
				return
			}
			openBookingTarget(navigation, item)
			return
		// view / view_pay / track / reschedule / view_report (the lab details page shows the report) /
		// reorder / invoice (both on the pharmacy order page) / anything new -> the target.
		default:
			openBookingTarget(navigation, item)
	}
}

/** Navigate to the Home tab (empty state's "Go to Home"). */
export const goHome = (navigation: BookingsNavigation) =>
	navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.HOME })
