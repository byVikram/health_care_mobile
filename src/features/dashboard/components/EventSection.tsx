// src/features/dashboard/components/EventSection.tsx
//
// Home "Upcoming events" ("1 · Home"): the next four events as a sideways strip of compact cards, with "View all"
// opening the Events screen. Data: GET /api/events/public. Hidden while loading, when nothing is coming up, and when
// the events API cannot be reached, so Home never shows an error for it.

import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { AppSection, AppTextLink, EventCard } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { getPublicEvents } from '../../../services/eventService'
import type { EventItem } from '../../../types/event'
import { homeSectionProps } from '../homeTheme'

type Props = {
	/** Changes when the Home is pulled down to refresh. */
	refreshToken?: number
	/** Space above the section, for a Home that does not space its sections itself. */
	marginTop?: number
}

const HOME_EVENT_COUNT = 4

function UpcomingEventsSection({ refreshToken, marginTop = 0 }: Props) {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()
	const [events, setEvents] = useState<EventItem[]>([])

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const list = await getPublicEvents(HOME_EVENT_COUNT)
				if (active) setEvents(list.slice(0, HOME_EVENT_COUNT))
			} catch {
				// Soft-fail: keep what is shown (or nothing).
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [refreshToken])

	// A card opens the Events list first, with the event's details on top, so Back from the details lands on the list.
	const openEvent = (e: EventItem) => {
		navigation.push(ROUTES.STACK.ALL_EVENTS)
		navigation.push(ROUTES.STACK.EVENT_DETAILS, { eventId: e.id })
	}

	if (events.length === 0) return null

	return (
		<AppSection
			title="Upcoming events"
			right={<AppTextLink label="View all" onPress={() => navigation.navigate(ROUTES.STACK.ALL_EVENTS)} />}
			{...homeSectionProps(8)}
			marginTop={marginTop}
		>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
				{events.map((e) => (
					<EventCard key={e.id} item={e} variant="compact" onPress={() => openEvent(e)} />
				))}
			</ScrollView>
		</AppSection>
	)
}

export default React.memo(UpcomingEventsSection)

const styles = StyleSheet.create({
	strip: { gap: 10, paddingHorizontal: 16 },
})
