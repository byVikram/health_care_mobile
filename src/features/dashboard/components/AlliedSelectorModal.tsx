import React, { useMemo } from 'react'

import AcupunctureIcon from '../../../assets/allied-health/acupuncture.png'
import AyurvedaIcon from '../../../assets/allied-health/ayurveda.png'
import HomeopathyIcon from '../../../assets/allied-health/homeopathy.png'
import CardGridSelectorModal, { SelectorCardItem } from './CardGridSelector'

interface AlliedSelectorModalProps {
	open: boolean
	onClose: () => void
}

const ALLIED_CARDS: Omit<SelectorCardItem, 'onClick'>[] = [
	{ key: 'acupuncture', label: 'Acupuncture', icon: AcupunctureIcon },
	{ key: 'ayurveda', label: 'Ayurveda', icon: AyurvedaIcon },
	{ key: 'homeopathy', label: 'Homeopathy', icon: HomeopathyIcon },
]

export default function AlliedSelectorModal({ open, onClose }: AlliedSelectorModalProps) {
	const cards: SelectorCardItem[] = useMemo(
		() =>
			ALLIED_CARDS.map((card) => ({
				...card,
				onClick: onClose,
			})),
		[onClose],
	)

	return (
		<CardGridSelectorModal
			open={open}
			onClose={onClose}
			title="Which allied health service do you need?"
			cards={cards}
			searchable
			searchPlaceholder="Search allied health services..."
			emptyText="No allied health services found."
		/>
	)
}
