import React, { useEffect, useMemo, useState } from 'react'
import { ServiceDetailsSheet, type ServiceDetailsContent } from '../../../components/common'
import { AncillaryPackageDetail, AncillaryPackageListItem, fetchAncillaryPackageDetail } from '../ancillaryService'
import { buildPackageSheetContent } from '../utils/ancillaryCatalogContent'
import type { AncillaryCatalogCopy } from '../utils/ancillaryCatalogCopy'

interface PackageDetailsBottomSheetProps {
	visible: boolean
	pkg: AncillaryPackageListItem | null
	onClose: () => void
	/** Labels for the current home-care type (kind label, prep title, trust line). */
	copy: AncillaryCatalogCopy
	/** Index used to pick the package's tone (keep it the same as its catalogue row). */
	toneIndex?: number
	added?: boolean
	onAdd?: () => void
	onRemove?: () => void
}

/**
 * Details sheet for a care package (design 2a, modern ServiceDetailsSheet). Shows the list item's fields at
 * once and loads GET /packages/{id} for the bundled procedures, which fill "What's included" when the package
 * has no `includes` of its own.
 */
export const PackageDetailsBottomSheet: React.FC<PackageDetailsBottomSheetProps> = ({
	visible,
	pkg,
	onClose,
	copy,
	toneIndex = 0,
	added = false,
	onAdd,
	onRemove,
}) => {
	const [detail, setDetail] = useState<AncillaryPackageDetail | null>(null)
	const [loadingDetail, setLoadingDetail] = useState(false)
	const packageId = pkg?.id

	useEffect(() => {
		if (!visible || !packageId) return
		let isMounted = true
		const load = async () => {
			setDetail(null)
			setLoadingDetail(true)
			try {
				const res = await fetchAncillaryPackageDetail(packageId)
				if (isMounted) setDetail(res)
			} finally {
				if (isMounted) setLoadingDetail(false)
			}
		}
		void load()
		return () => {
			isMounted = false
		}
	}, [visible, packageId])

	const content = useMemo<ServiceDetailsContent | null>(
		() => (pkg ? buildPackageSheetContent(pkg, detail, copy, toneIndex, loadingDetail) : null),
		[pkg, detail, copy, toneIndex, loadingDetail]
	)

	return (
		<ServiceDetailsSheet
			variant="modern"
			visible={visible}
			content={content}
			onClose={onClose}
			added={added}
			onAdd={onAdd}
			onRemove={onRemove}
		/>
	)
}
