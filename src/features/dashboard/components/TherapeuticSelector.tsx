import React, { useMemo } from 'react'

import RehabilitationIcon from '../../../assets/therapeutic/rehabilitation.png'
import SpecializedServiceIcon from '../../../assets/therapeutic/specialized-service.png'
import CardGridSelectorModal, { SelectorCardItem } from './CardGridSelcetor'

interface TherapeuticSelectorModalProps {
	open: boolean
	onClose: () => void
}

const THERAPEUTIC_CARDS: Omit<SelectorCardItem, 'onClick'>[] = [
	{ key: 'rehabilitation', label: 'Rehabilitation', icon: RehabilitationIcon },
	{ key: 'specialized-service', label: 'Specialized Service', icon: SpecializedServiceIcon },
]

export default function TherapeuticSelector({ open, onClose }: TherapeuticSelectorModalProps) {
	const cards: SelectorCardItem[] = useMemo(
		() =>
			THERAPEUTIC_CARDS.map((card) => ({
				...card,
				onClick: onClose,
			})),
		[onClose],
	)

	return (
		<CardGridSelectorModal
			open={open}
			onClose={onClose}
			title="Which therapeutic service do you need?"
			cards={cards}
			searchable
			searchPlaceholder="Search therapeutic services..."
			emptyText="No therapeutic services found."
		/>
	)
}
