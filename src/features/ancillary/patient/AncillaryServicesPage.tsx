import React from 'react'
import { useRoute } from '@react-navigation/native'

import NursingCarePage from './NursingCarePage'

export default function AncillaryServicesPage() {
	const route = useRoute<any>()
	const { serviceKey = 'nursing-care', serviceLabel } = route.params || {}

	return <NursingCarePage serviceKey={serviceKey} serviceLabel={serviceLabel} />
}
