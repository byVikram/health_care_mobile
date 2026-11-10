// src/features/notification/openNotificationTarget.ts
//
// Which screen a notification opens. The backend sets `redirect_type` / `redirect_id` on every notification and copies them into
// the push's data, so a tap on a row in the notification list and a tap on the phone's notification (app closed, in the
// background, or open with a toast) go through this one function and always land on the same screen.
import { ROUTES } from '../../navigation/routes'

export type NotificationTarget = {
	redirect_type?: string | null
	redirect_id?: string | null
	reference_type?: string | null
	reference_id?: string | null
}

/** `navigation.navigate` or the global `navigate` of navigationService: anything that opens a screen by name. */
export type NavigateFn = (name: string, params?: object) => void

/** Opens the screen for `target`. Returns false when the notification has no screen (an unknown or empty redirect type). */
export function openNotificationTarget(navigate: NavigateFn, target: NotificationTarget): boolean {
	const { redirect_type: type, redirect_id: id } = target

	if (type === 'doctor_availability' && id) {
		const referralId = target.reference_type === 'referral' ? (target.reference_id ?? undefined) : undefined
		navigate(ROUTES.STACK.DOCTOR_DETAIL, { id, referralId })
	} else if ((type === 'appointment' || type === 'appointment_detail') && id) {
		navigate(ROUTES.STACK.APPOINTMENTS, { appointmentId: id })
	} else if (
		(type === 'ancillary_booking' ||
			type === 'ancillary' ||
			// Older home-care notifications carried this generic type and opened nothing.
			type === 'ancillary_order') &&
		id
	) {
		navigate(ROUTES.STACK.ANCILLARY_TRACK_APPOINTMENT, { bookingId: id })
	} else if (type === 'ancillary_scheduled' && id) {
		// A scheduled home-care order: its booking details (the visits, and a missed one to answer).
		navigate(ROUTES.STACK.ANCILLARY_SCHEDULED_DETAILS, { requestId: id })
	} else if (type === 'lab_order' && id) {
		navigate(ROUTES.STACK.LABORATORY_BOOKING_TRACKING, { orderId: id })
	} else if (type === 'doctor_schedule') {
		// This screen lives in the root stack, so reach the tab through its navigator (see SidebarLayout).
		navigate(ROUTES.MAIN.TABS, {
			screen: ROUTES.MAIN.SCHEDULE,
			params: { segment: id === 'req' ? 'req' : 'today' },
		})
	} else if (type === 'doctor_engage') {
		navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.ENGAGE })
	} else {
		return false
	}
	return true
}
