import { BookingStepperTheme } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'

/** Labels for the 3-step Ancillary/Nursing booking flow (Services → Booking
 *  Details → Payment), 0-indexed to match `BookingProgressStepper`'s
 *  `currentIndex` contract. */
export const ANCILLARY_BOOKING_STEPS = [
	{ label: 'Services' },
	{ label: 'Booking Details' },
	{ label: 'Payment' },
]

/** Reproduces this feature's exact pre-extraction stepper visuals (26px
 *  circles, `#2B6F71` teal, an active ring, a bordered white card, and
 *  completed labels staying highlighted) so moving to the shared
 *  `BookingProgressStepper` is a no-op for Nursing's current UI. */
export const ANCILLARY_STEPPER_THEME: BookingStepperTheme = {
	circleSize: 26,
	numberFontSize: 12,
	labelFontSize: 11.5,
	activeColor: '#2B6F71',
	activeRingColor: 'rgba(43, 111, 113, 0.3)',
	activeRingWidth: 2,
	pendingBackgroundColor: '#F1F4F4',
	pendingBorderColor: '#E0E7EF',
	pendingBorderWidth: 1,
	pendingTextColor: '#64748B',
	highlightCompletedLabel: true,
	cardWrapper: true,
	cardBackgroundColor: '#FFFFFF',
	cardBorderColor: '#E8ECEC',
	cardBorderRadius: 14,
	cardPaddingHorizontal: 16,
	cardPaddingVertical: 10,
}

/** Reproduces the stepper's previous built-in default tap-to-jump navigation
 *  (back when the shared component owned the `useNavigation()` call itself).
 *  `currentIndex` / `index` are both 0-based. */
export function navigateAncillaryStep(navigation: any, currentIndex: number, index: number) {
	if (index === currentIndex) return

	if (index === 0) {
		if (navigation.canGoBack()) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES)
		}
	} else if (index === 1) {
		if (currentIndex === 2) {
			navigation.goBack()
		} else {
			navigation.navigate(ROUTES.STACK.ANCILLARY_BOOKING_DETAILS)
		}
	} else if (index === 2) {
		if (currentIndex === 1) {
			navigation.navigate(ROUTES.STACK.ANCILLARY_PAYMENT)
		}
	}
}
