// src/features/care-ai/CareAiPage.tsx
//
// Care AI: the patient's health-assistant chat from the Care AI design. Welcome (starters) -> conversation (the
// backend chat's answers, the doctors it finds, quick-reply chips on the welcome prompts) with the composer and the
// Recent chats sheet. Answers come from the backend (useCareAiChat); the doctor buttons open the real doctor page
// and doctor search. Reading a patient's own reports, the "asking for" family switch and in-chat booking are not
// built yet: their components are in this folder but not shown.

import React, { useEffect, useRef, useState } from 'react'
import { Keyboard, ScrollViewInstance, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { APP_COLORS } from '../../config/theme'
import { useAuth } from '../../context/AuthContext'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { KeyboardLiftView } from '../auth/components/AuthKit'
import type { CareAiLink, CareAiRecentChat } from './careAiTypes'
import { useCareAiChat } from './useCareAiChat'
import { useCareAiSessions } from './useCareAiSessions'
import { useVoiceInput } from './useVoiceInput'
import { AiTurn } from './components/AiTurn'
import { CareAiHeader } from './components/CareAiHeader'
import { Composer } from './components/Composer'
import { FollowUps } from './components/FollowUps'
import { RecentChatsSheet } from './components/RecentChatsSheet'
import { TypingIndicator } from './components/TypingIndicator'
import { UserBubble } from './components/UserBubble'
import { GreetingStrip, WelcomePanel } from './components/WelcomePanel'

type Nav = NativeStackNavigationProp<AppStackParamList>

export default function CareAiPage() {
	const navigation = useNavigation<Nav>()
	const launch = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.CARE_AI>>().params
	const { user } = useAuth()
	const scrollRef = useRef<ScrollViewInstance>(null)
	// Set when a message or the typing indicator is added: the next layout then scrolls to the end. Growth from
	// anything else (opening "Why this answer?", confirming a booking) leaves the scroll position alone.
	const followEndRef = useRef(false)

	const userFirstName = user?.name?.trim().split(/\s+/)[0] || 'there'
	const chat = useCareAiChat(userFirstName, launch)

	const [draft, setDraft] = useState('')
	const [historyOpen, setHistoryOpen] = useState(false)
	const { chats } = useCareAiSessions(historyOpen)
	// What is said is added to what is already typed; the patient reads it and presses send.
	const voice = useVoiceInput((text) => setDraft((prev) => (prev.trim() ? `${prev.trim()} ${text}` : text)))

	useEffect(() => {
		followEndRef.current = true
	}, [chat.messages.length, chat.typing])

	// The keyboard opening shrinks the conversation: keep the latest message in view.
	useEffect(() => {
		const sub = Keyboard.addListener('keyboardDidShow', () => {
			scrollRef.current?.scrollToEnd({ animated: true })
		})
		return () => sub.remove()
	}, [])

	const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.MAIN.TABS))

	const openLink = (link: CareAiLink) => {
		if (link.to === 'appointments') {
			navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL, params: { filter: 'doctor' } } as never) // the Bookings tab
			return
		}
		if (link.to === 'doctor') {
			navigation.navigate(ROUTES.STACK.DOCTOR_DETAIL, { id: link.id })
			return
		}
		navigation.navigate(ROUTES.STACK.DOCTOR_SEARCH, {
			query: link.query,
			mode: link.mode,
			sort: link.sort,
			fromAi: true,
		})
	}

	const send = () => {
		chat.sendText(draft)
		setDraft('')
	}

	const startNewChat = () => {
		chat.newChat()
		setDraft('')
		setHistoryOpen(false)
	}

	const openRecent = (recent: CareAiRecentChat) => {
		setHistoryOpen(false)
		setDraft('')
		void chat.openChat(recent.id)
	}

	return (
		<View style={styles.screen}>
			<CareAiHeader onBack={goBack} onOpenHistory={() => setHistoryOpen(true)} onNewChat={startNewChat} />

			{/* the composer rides up with the keyboard (a plain KeyboardAvoidingView does nothing on Android here) */}
			<KeyboardLiftView style={styles.flex}>
				<ScrollView
					ref={scrollRef}
					style={styles.flex}
					contentContainerStyle={styles.conversation}
					keyboardShouldPersistTaps="handled"
					onContentSizeChange={() => {
						if (!followEndRef.current || !chat.hasAsked) return
						followEndRef.current = false
						scrollRef.current?.scrollToEnd({ animated: true })
					}}
					accessibilityLabel="Conversation"
				>
					{chat.messages.map((message) => {
						if (message.role === 'user') return <UserBubble key={message.id} message={message} />
						if (message.kind === 'greet') {
							return message.picked ? (
								<GreetingStrip key={message.id} firstName={userFirstName} />
							) : (
								<WelcomePanel
									key={message.id}
									firstName={userFirstName}
									onPickStarter={chat.pickStarter}
								/>
							)
						}
						return (
							<AiTurn
								key={message.id}
								turn={message}
								onLink={openLink}
								onChip={chat.answerChip}
								onFeedback={(turn, helpful) => void chat.sendFeedback(turn, helpful)}
							/>
						)
					})}
					{!chat.typing && !voice.listening && chat.follow.length > 0 ? (
						<FollowUps suggestions={chat.follow} onAsk={chat.askFollowUp} />
					) : null}
					{chat.typing ? <TypingIndicator /> : null}
				</ScrollView>

				<Composer
					draft={draft}
					onChangeDraft={setDraft}
					onSend={send}
					listening={voice.listening}
					heard={voice.heard}
					onStartListening={voice.start}
					onStopListening={voice.stop}
					busy={chat.typing}
				/>
			</KeyboardLiftView>

			<RecentChatsSheet
				visible={historyOpen}
				chats={chats}
				onClose={() => setHistoryOpen(false)}
				onNewChat={startNewChat}
				onOpenChat={openRecent}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.surface },
	flex: { flex: 1 },
	conversation: { gap: 20, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 24 },
})
