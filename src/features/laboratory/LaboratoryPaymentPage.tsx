import React from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { BookingPaymentPage } from '../../components/common/booking/BookingPaymentPage'
import { buildLaboratoryPaymentConfig } from './utils/laboratoryPaymentConfig'

/**
 * Laboratory's own thin wrapper around the shared, configurable
 * `BookingPaymentPage` (`src/components/common/booking/BookingPaymentPage.tsx`).
 * Registered at `ROUTES.STACK.LABORATORY_PAYMENT` — Laboratory's own payment
 * route, separate from Ancillary/Nursing's `ANCILLARY_PAYMENT`, so the two
 * domains never need to reference each other's screens or config.
 */
export default function LaboratoryPaymentPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()

	// See `BookingSummaryScreen.tsx` — carried alongside `bookingPayload`
	// rather than inside it so the shared screen's payload shape stays
	// feature-agnostic.
	const labTrackingParams = route.params?.labTrackingParams

	const config = buildLaboratoryPaymentConfig(navigation, labTrackingParams)

	return <BookingPaymentPage config={config} />
}
