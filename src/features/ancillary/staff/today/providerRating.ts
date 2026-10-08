// src/features/ancillary/staff/today/providerRating.ts
//
// Rating tile of the provider Today screen: the provider's average of approved patient reviews, from
// GET /api/ancillary/reviews/provider/{provider_public_id} (`averageRating`, null until a review is approved).
import ApiService from '../../../../services/apiService'
import { API_ENDPOINTS } from '../../../../constants/apiUrls'

type ReviewsEnvelope = { data?: { averageRating?: number | string | null } }

/** Average rating (one decimal) or null when the provider has none yet / it could not be read. */
export const getProviderAverageRating = async (providerPublicId: string): Promise<number | null> => {
	const res = await ApiService.getWithParams<ReviewsEnvelope>(
		API_ENDPOINTS.ANCILLARY.PROVIDER_REVIEWS(providerPublicId),
		{ page: 1, limit: 1 }
	)
	const n = Number(res.data?.data?.averageRating)
	return Number.isFinite(n) && n > 0 ? n : null
}

/** "4.8 ★" or "—". */
export const ratingLabel = (rating: number | null) => (rating == null ? '—' : `${rating.toFixed(1)} ★`)
