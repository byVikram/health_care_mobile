// src/features/health-feed/MyQuestionsLink.tsx
//
// The "My questions" card at the top of the patient's Health questions: the shared QaEntryCard with "3 asked · see doctors' answers"
// and an "N new answers" chip when doctors answered since the patient last looked. The count is the total from
// GET /api/qa?scope=mine; "new" counts the answers newer than the last time each question was opened.

import React, { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { listMyQuestions, type PatientQuestion } from '../../services/qaService'
import { QaEntryCard } from './QaEntryCard'
import { FEED_ICONS } from './feedTheme'
import { newAnswerCount, useSeenQuestions } from './seenQuestions'

type Summary = { total: number; rows: PatientQuestion[] }

export function MyQuestionsLink({ onPress }: { onPress: () => void }) {
	const { seen } = useSeenQuestions()
	const [summary, setSummary] = useState<Summary | null>(null)

	// Each time the screen is shown, so a new answer shows up without a pull. A failure just leaves the plain card.
	useFocusEffect(
		useCallback(() => {
			let alive = true
			const load = async () => {
				try {
					const res = await listMyQuestions(1, 50)
					if (alive && res.success) setSummary({ total: res.meta?.total ?? res.data.length, rows: res.data })
				} catch {
					// the card stays as it is
				}
			}
			void load()
			return () => {
				alive = false
			}
		}, [])
	)

	const fresh = (summary?.rows ?? []).reduce((n, q) => n + newAnswerCount(q, seen[q.id]), 0)
	const subtitle = !summary
		? 'See the questions you asked'
		: summary.total > 0
			? `${summary.total} asked · see doctors’ answers`
			: 'Ask a doctor for free. Your name is never shown'

	return (
		<QaEntryCard
			title="My questions"
			subtitle={subtitle}
			icon={FEED_ICONS.question}
			newCount={fresh}
			onPress={onPress}
		/>
	)
}
