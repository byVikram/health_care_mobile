import React, { useMemo } from 'react'
import { useNavigation } from '@react-navigation/native'
import { ROUTES } from '../../../navigation/routes'

import CardGridSelectorModal, { SelectorCardItem } from './CardGridSelcetor'
import ElderDayCareIcon from '../../../assets/ancillary/elder-day-care.png'
import HomeCareIcon from '../../../assets/ancillary/home-care.png'
import NursingCareIcon from '../../../assets/ancillary/nursing-care.png'
import PhysiotherapyIcon from '../../../assets/ancillary/physiotherapy.png'

interface AncillarySelectorModalProps {
	open: boolean
	onClose: () => void
}

const ANCILLARY_CARDS: Omit<SelectorCardItem, 'onClick'>[] = [
	{ key: 'elder-day-care', label: 'Elder Day Care', icon: ElderDayCareIcon },
	{ key: 'home-care', label: 'Home Care', icon: HomeCareIcon },
	{ key: 'nursing-care', label: 'Nursing Care', icon: NursingCareIcon },
	{ key: 'physiotherapy', label: 'Physiotherapy', icon: PhysiotherapyIcon },
]

export default function AncillarySelectorModal({ open, onClose }: AncillarySelectorModalProps) {
	const navigation = useNavigation<any>()
	const cards: SelectorCardItem[] = useMemo(
		() =>
			ANCILLARY_CARDS.map((card) => ({
				...card,
				onClick: () => {
					onClose()
						navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
							serviceKey: card.key,
							serviceLabel: card.label,
						})
				},
			})),
		[onClose, navigation],
	)

	return (
		<CardGridSelectorModal
			open={open}
			onClose={onClose}
			title="Which ancillary service do you need?"
			cards={cards}
			searchable
			searchPlaceholder="Search ancillary services..."
			emptyText="No ancillary services found."
		/>
	)
}
