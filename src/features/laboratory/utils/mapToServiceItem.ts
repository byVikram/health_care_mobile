// src/features/laboratory/utils/mapToServiceItem.ts
//
// Maps Laboratory's own data shapes (`DiagnosticTestItem` / `HealthPackageItem`
// — see `../data/laboratoryMockData.ts`) onto `ServiceProcedureItem`, the
// shared card data shape the common `ServiceCatalogCard`
// (`src/components/common/booking/ServiceCatalogCard.tsx`) uses. This is the
// one shared place this mapping lives — it was previously duplicated three
// times (inline in `LaboratoryHomeScreen.tsx`, and again inside the
// `DiagnosticTestCard.tsx` / `HealthPackageCard.tsx` wrapper components);
// all three now import it from here instead.
//
// `duration` is left unset and `hideRating: true` is always set, which is
// what keeps `ServiceCatalogCard` from ever rendering Nursing-only
// duration/rating UI for a Laboratory item.

import { ServiceProcedureItem } from '../../../components/common'
import { DiagnosticTestItem, HealthPackageItem } from '../data/laboratoryMockData'

const LAB_IMAGES = [
	require('../../../assets/Laboratory/lab1.jpg'),
	require('../../../assets/Laboratory/lab2.jpg'),
	require('../../../assets/Laboratory/lab3.jpg'),
]

export const toTestProcedureItem = (test: DiagnosticTestItem): ServiceProcedureItem => {
	const discountPercent =
		test.originalPrice && test.originalPrice > test.price
			? Math.round(((test.originalPrice - test.price) / test.originalPrice) * 100)
			: null

	// Deterministic image selection from existing laboratory assets — the
	// mock catalog has no per-test image, so this picks a stable one from
	// `LAB_IMAGES` per test id rather than leaving the card imageless.
	const charSum = test.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
	const image = LAB_IMAGES[Math.abs(charSum) % LAB_IMAGES.length]

	return {
		id: test.id,
		title: test.name,
		description: test.description,
		subtitle: test.alsoKnownAs || test.description,
		metadataLine: `${test.parameters} ${test.parameters === 1 ? 'parameter' : 'parameters'} · ${test.reportTime} report${
			test.fastingRequired ? ` · ${test.fastingRequired}` : ''
		}`,
		about_service: test.description,
		whats_included: test.alsoKnownAs,
		price: `₹${test.price}`,
		originalPrice: test.originalPrice && test.originalPrice > test.price ? `₹${test.originalPrice}` : undefined,
		discountText: discountPercent ? `${discountPercent}% off` : undefined,
		imageSource: image,
		// No `recommendedLabel`: `ServiceCatalogCard` wraps any item that has one in
		// its own bordered/tinted `cardRecommended` box. Nearly every mock test is
		// tagged `category: 'popular'`, so this must stay unset or almost every
		// row renders individually boxed — Nursing Care never sets it either.
		actionLabel: 'ADD +',
		duration: '',
		hideRating: true,
	}
}

export const toPackageProcedureItem = (pkg: HealthPackageItem): ServiceProcedureItem => {
	return {
		id: pkg.id,
		title: pkg.name,
		description: pkg.includesSummary,
		subtitle: pkg.includesSummary ? `Includes: ${pkg.includesSummary}` : undefined,
		metadataLine: `Includes ${pkg.testCount} tests · For Age: ${pkg.ageRange} · ${pkg.reportTime} report`,
		about_service: `Comprehensive health checkup package designed for prevention. Age group: ${pkg.ageRange}. Fasting: ${pkg.fastingRequired}. Report time: ${pkg.reportTime}.`,
		whats_included: pkg.includesSummary,
		price: `₹${pkg.price}`,
		originalPrice: pkg.originalPrice && pkg.originalPrice > pkg.price ? `₹${pkg.originalPrice}` : undefined,
		discountText: pkg.discountPercent ? `${pkg.discountPercent}% OFF` : undefined,
		imageSource: pkg.image,
		// Same reasoning as toTestProcedureItem above — almost every package has a
		// `popularTag`, so leave `recommendedLabel` unset to keep this flat.
		actionLabel: 'ADD +',
		duration: '',
		hideRating: true,
	}
}
