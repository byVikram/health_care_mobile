// src/features/laboratory/utils/laboratoryPaymentConfig.ts
//
// Laboratory's own config for the shared `BookingPaymentPage`
// (`src/components/common/booking/BookingPaymentPage.tsx`) — mirrors the
// `bookingProgressStepperConfig.ts` pattern already used by Ancillary/Nursing:
// a feature-owned adapter around a shared, feature-agnostic component, kept
// out of `common/` so the shared component has no dependency on this
// feature's API/service layer or route names.

import { BookingPaymentPageConfig } from '../../../components/common/booking/BookingPaymentPage'
import { ROUTES } from '../../../navigation/routes'

export function buildLaboratoryPaymentConfig(
	navigation: any,
	labTrackingParams: any
): BookingPaymentPageConfig {
	return {
		orderSummaryUnitLabel: 'Test',
		itemMetaSuffix: '',
		visitFeeLabel:
			labTrackingParams?.draft?.collectionType === 'home_collection'
				? 'Phlebotomist Doorstep Visit Fee'
				: 'Center Walk-in & Handling Fee',
		securityNoticeText:
			'Your booking will be confirmed immediately. You will receive updates on your sample collection or center visit status.',
		payButtonLabel: 'Confirm & Pay ➔',
		stepper: {
			steps: (labTrackingParams?.progressSteps || ['Payment']).map((label: string) => ({ label })),
			currentIndex: (labTrackingParams?.progressSteps?.length || 1) - 1,
			wrapInContainer: false,
		},
		activeTaskModal: {
			title: 'Booking In Progress',
			description: 'You already have an active booking in progress. Please complete it before booking another.',
			submitText: 'View My Bookings',
		},
		onSubmit: async () => {
			// Laboratory has no backend booking API wired up yet (see
			// `laboratory_duplicated/laboratoryService.ts`'s `placeLabOrder` /
			// the real `/api/laboratory/bookings` endpoint — neither is
			// connected to this catalog/flow today). Laboratory must not call
			// the Ancillary request API or touch `ancillary_service_requests`
			// at all — that table's active-task check has no concept of
			// service type and would incorrectly block a Lab booking behind an
			// unrelated active Nursing visit (or vice versa). Until a real
			// Laboratory booking backend is wired in, this stays a local,
			// UI-only confirmation using the client-generated reference.
			return { bookingId: '' }
		},
		onSuccess: ({ bookingId, charges }) => {
			// Laboratory bookings have no "matching specialist" concept — that
			// flow is Nursing-specific (dispatching/matching a nurse). Route to
			// Laboratory's own post-payment tracking screen instead.
			navigation.navigate(ROUTES.STACK.LABORATORY_BOOKING_TRACKING, {
				bookingReference: bookingId,
				draft: labTrackingParams?.draft,
				labId: labTrackingParams?.labId,
				labName: labTrackingParams?.labName,
				labAddress: labTrackingParams?.labAddress,
				labCity: labTrackingParams?.labCity,
				date: labTrackingParams?.date,
				timeSlot: labTrackingParams?.timeSlot,
				totalAmount: Number(String(charges.totalAmount).replace(/[^0-9.]/g, '')) || 0,
			})
		},
		onActiveTaskConflict: () => {
			navigation.navigate(ROUTES.STACK.LABORATORY_LIST)
		},
	}
}
