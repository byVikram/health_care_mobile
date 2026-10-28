// src/features/ancillary/hooks/useVisitPolicy.ts
//
// The home-care visit rules (provider assigned N minutes before a visit, free cancellation up to M minutes before)
// for the screens shown before an order exists. They come from GET /api/lookup/app-config (the server owns the
// numbers); until that answers, or when it can't be reached, the defaults match what the server ships. Once an
// order exists it carries its own `policy` (see orderPolicy in scheduledVisitView).

import { useAppConfig } from '../../dashboard/useHomeChromeData'
import { DEFAULT_ORDER_POLICY, type AncillaryOrderPolicy } from '../ancillaryProviderBookingService'

export function useVisitPolicy(): AncillaryOrderPolicy {
	return useAppConfig()?.home_care_visit_policy ?? DEFAULT_ORDER_POLICY
}
