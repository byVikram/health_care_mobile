import React from 'react'
import { useNavigation } from '@react-navigation/native'
import { BookingPaymentPage } from '../../../components/common/booking/BookingPaymentPage'
import { buildAncillaryPaymentConfig } from '../utils/ancillaryPaymentConfig'

/**
 * Ancillary/Nursing's own thin wrapper around the shared, configurable
 * `BookingPaymentPage` (`src/components/common/booking/BookingPaymentPage.tsx`).
 * Registered at `ROUTES.STACK.ANCILLARY_PAYMENT` — Ancillary's own payment
 * route, separate from Laboratory's `LABORATORY_PAYMENT`
 * (`features/laboratory/LaboratoryPaymentPage.tsx`), so the two domains never
 * need to reference each other's screens or config.
 */
export default function AncillaryPaymentPage() {
	const navigation = useNavigation<any>()
	const config = buildAncillaryPaymentConfig(navigation)

	return <BookingPaymentPage config={config} />
}
