import React, { useEffect, useMemo, useState } from 'react'
import { ServiceDetailsSheet, ServiceProcedureItem } from '../../../components/common'
import { getAncillaryImageSource } from '../utils/ancillaryImageResolver'
import {
	AncillaryPackageDetail,
	AncillaryPackageListItem,
	fetchAncillaryPackageDetail,
} from '../ancillaryService'

interface PackageDetailsBottomSheetProps {
	visible: boolean
	pkg: AncillaryPackageListItem | null
	onClose: () => void
}

/**
 * Details sheet for a package. Reuses the shared ServiceDetailsSheet so it looks
 * identical to the individual-service details sheet: the package's image, name,
 * price and description, plus the services it bundles under "What's Included".
 *
 * Package booking is not supported by the booking flow yet, so the sheet is
 * view-only (no footer action) and has no reviews section (packages have no
 * review data).
 */
export const PackageDetailsBottomSheet: React.FC<PackageDetailsBottomSheetProps> = ({
	visible,
	pkg,
	onClose,
}) => {
	const [detail, setDetail] = useState<AncillaryPackageDetail | null>(null)
	const packageId = pkg?.id

	useEffect(() => {
		if (!visible || !packageId) return

		let isMounted = true
		setDetail(null)
		fetchAncillaryPackageDetail(packageId).then((res) => {
			if (isMounted) setDetail(res)
		})

		return () => {
			isMounted = false
		}
	}, [visible, packageId])

	const service = useMemo<ServiceProcedureItem | null>(() => {
		if (!pkg) return null
		return {
			id: pkg.id,
			title: pkg.label,
			description: pkg.description ?? '',
			price: `₹${pkg.packagePrice}`,
			image_url: pkg.imageUrl ?? null,
			whats_included: detail?.procedures.map((procedure) => procedure.label) ?? [],
		}
	}, [pkg, detail])

	return (
		<ServiceDetailsSheet
			visible={visible}
			service={service}
			onClose={onClose}
			showReviews={false}
			resolveImageSource={getAncillaryImageSource}
		/>
	)
}