// src/features/doctor/dashboard/MyAnswersLink.tsx
//
// The "My answers" card in the doctor's Patient questions section (design "5 · Patient questions"): the shared QaEntryCard with
// "24 answered · see other doctors' answers" and an "N new answers" chip. The count is the total from
// GET /api/qa?scope=answered_by_me; "new" counts the other doctors' answers newer than the last time each question was opened.

import React, { useCallback, useState } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { listMyAnswers, type PatientQuestion } from '../../../services/qaService'
import { QaEntryCard } from '../../health-feed/QaEntryCard'
import { newAnswerCount, useSeenQuestions } from '../../health-feed/seenQuestions'

const REPLY_ICON = 'M9 14l-5-5 5-5M4 9h11a5 5 0 0 1 5 5v6'

type Summary = { total: number; rows: PatientQuestion[] }

export function MyAnswersLink({ onPress }: { onPress: () => void }) {
	const { seen } = useSeenQuestions()
	const [summary, setSummary] = useState<Summary | null>(null)

	// Each time the screen is shown, so a new answer of another doctor shows up without a pull. A failure just leaves the plain card.
	useFocusEffect(
		useCallback(() => {
			let alive = true
			const load = async () => {
				try {
					const res = await listMyAnswers(1, 50)
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

	const fresh = (summary?.rows ?? []).reduce((n, q) => n + newAnswerCount(q, seen[q.id], true), 0)
	const subtitle = !summary
		? 'See the questions you answered'
		: summary.total > 0
			? `${summary.total} answered · see other doctors’ answers`
			: 'The questions you answer will be listed here'

	return <QaEntryCard title="My answers" subtitle={subtitle} icon={REPLY_ICON} newCount={fresh} onPress={onPress} />
}
