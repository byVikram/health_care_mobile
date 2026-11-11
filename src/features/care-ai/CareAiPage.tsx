// src/features/care-ai/CareAiPage.tsx
//
// Care AI: the patient's health-assistant chat from the Care AI design. Welcome (starters, report banner,
// records switch) -> conversation (rich scripted replies, quick replies, follow-up suggestions) with the
// composer, "Asking for" family switcher, Recent chats and Add-a-report sheets. Replies are mock content
// (careAiReplies.ts); the doctor buttons open the real doctor search with the filters Care AI chose.

import React, { useEffect, useRef, useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { familyMemberFirstName } from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { useAuth } from '../../context/AuthContext'
import { SELF_MEMBER_KEY, useFamilyMembers } from '../../hooks/useFamilyMembers'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { showComingSoon } from '../../utils/toast'
import { RECENT_CHATS } from './careAiData'
import type { CareAiLink, CareAiRecentChat } from './careAiTypes'
import { useCareAiChat } from './useCareAiChat'
import { useVoiceInput } from './useVoiceInput'
import { AiTurn } from './components/AiTurn'
import { AskingForBar } from './components/AskingForBar'
import { AttachSheet } from './components/AttachSheet'
import { CareAiHeader } from './components/CareAiHeader'
import { Composer } from './components/Composer'
import { FollowUps } from './components/FollowUps'
import { RecentChatsSheet } from './components/RecentChatsSheet'
import { TypingIndicator } from './components/TypingIndicator'
import { UserBubble } from './components/UserBubble'
import { WhoForSheet } from './components/WhoForSheet'
import { GreetingStrip, WelcomePanel } from './components/WelcomePanel'

type Nav = NativeStackNavigationProp<AppStackParamList>

export default function CareAiPage() {
	const navigation = useNavigation<Nav>()
	const launch = useRoute<RouteProp<AppStackParamList, typeof ROUTES.STACK.CARE_AI>>().params
	const { user } = useAuth()
	const { members } = useFamilyMembers()
	const scrollRef = useRef<ScrollView>(null)
	// Set when a message or the typing indicator is added: the next layout then scrolls to the end. Growth from
	// anything else (opening "Why this answer?", confirming a booking) leaves the scroll position alone.
	const followEndRef = useRef(false)

	const userFirstName = user?.name?.trim().split(/\s+/)[0] || 'there'
	const chat = useCareAiChat(userFirstName, launch)

	const [whoKey, setWhoKey] = useState(SELF_MEMBER_KEY)
	const [recordsOn, setRecordsOn] = useState(true)
	const [draft, setDraft] = useState('')
	const [whoOpen, setWhoOpen] = useState(false)
	const [attachOpen, setAttachOpen] = useState(false)
	const [historyOpen, setHistoryOpen] = useState(false)
	const voice = useVoiceInput(setDraft)

	useEffect(() => {
		followEndRef.current = true
	}, [chat.messages.length, chat.typing])

	const whoIndex = Math.max(
		0,
		members.findIndex((m) => m.key === whoKey)
	)
	const who = members[whoIndex]
	const whoName = who ? familyMemberFirstName(who) : userFirstName

	const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate(ROUTES.MAIN.TABS))

	const openLink = (link: CareAiLink) => {
		if (link.to === 'appointments') {
			navigation.navigate(ROUTES.MAIN.TABS, { screen: ROUTES.MAIN.PORTAL, params: { filter: 'doctor' } } as never) // the Bookings tab
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
		chat.reopenRecent(recent)
	}

	const explainReport = () => {
		setAttachOpen(false)
		chat.explainReport()
	}

	return (
		<View style={styles.screen}>
			<CareAiHeader onBack={goBack} onOpenHistory={() => setHistoryOpen(true)} onNewChat={startNewChat} />
			{who ? <AskingForBar member={who} index={whoIndex} onPress={() => setWhoOpen(true)} /> : null}

			<KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
									recordsOn={recordsOn}
									onToggleRecords={setRecordsOn}
									onExplainReport={chat.explainReport}
									onPickStarter={chat.pickStarter}
								/>
							)
						}
						return (
							<AiTurn
								key={message.id}
								turn={message}
								forName={whoName}
								onLink={openLink}
								onChip={chat.answerChip}
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
					onAttach={() => setAttachOpen(true)}
					listening={voice.listening}
					onStartListening={voice.start}
					onStopListening={voice.stop}
					busy={chat.typing}
				/>
			</KeyboardAvoidingView>

			<WhoForSheet
				visible={whoOpen}
				members={members}
				selectedKey={who?.key ?? whoKey}
				onSelect={(member) => {
					setWhoKey(member.key)
					setWhoOpen(false)
				}}
				onClose={() => setWhoOpen(false)}
			/>
			<AttachSheet
				visible={attachOpen}
				ownerName={whoName}
				onClose={() => setAttachOpen(false)}
				onTakePhoto={() => {
					setAttachOpen(false)
					showComingSoon('Reading your own reports is coming soon.')
				}}
				onUploadFile={() => {
					setAttachOpen(false)
					showComingSoon('Reading your own reports is coming soon.')
				}}
				onPickReport={explainReport}
				onPickPrescription={() => setAttachOpen(false)}
			/>
			<RecentChatsSheet
				visible={historyOpen}
				chats={RECENT_CHATS}
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
