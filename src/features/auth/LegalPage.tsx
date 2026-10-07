// features/auth/LegalPage.tsx
//
// Terms of use / Privacy policy. Section summaries are real copy from the design; the full legal text,
// "last updated" date and support email are placeholders until the legal team supplies them. No backend.

import React, { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { APP_COLORS, TONES } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AuthStackParamList } from '../../navigation/types'
import { AuthHeaderMint, ICON_PATHS, PathIcon } from './components/AuthKit'

type Tab = 'Terms' | 'Privacy'

const DOCS: Record<Tab, { title: string; intro: string; sections: { title: string; summary: string }[] }> = {
	Terms: {
		title: 'Terms of use',
		intro: 'This is a plain-language summary to help you find what matters. The full text in each section is what applies.',
		sections: [
			{
				title: 'About these terms',
				summary: 'Who we are, who these terms apply to, and that using Karolahealth means you accept them.',
			},
			{
				title: 'Your account',
				summary:
					'Signing up with a verified mobile number, keeping your details accurate, and booking for family members.',
			},
			{
				title: 'Bookings and payments',
				summary: 'How doctor, lab and home-care bookings work, prices shown in the app, and payment methods.',
			},
			{
				title: 'Cancellations and refunds',
				summary: 'Free-cancellation windows, instant-visit fees, and how and when refunds reach you.',
			},
			{
				title: 'Not for emergencies',
				summary:
					'Karolahealth is not an emergency service. In an emergency, call 112 or go to the nearest hospital.',
			},
			{
				title: 'Doctors and care providers',
				summary:
					'Providers are independent, verified professionals. What we check, and what they’re responsible for.',
			},
			{
				title: 'Acceptable use',
				summary: 'What you must not do on the app, such as sharing false information or misusing the service.',
			},
			{ title: 'Liability', summary: 'The limits of our responsibility for advice, treatment and outcomes.' },
			{
				title: 'Changes to these terms',
				summary: 'How we’ll tell you about changes and when they take effect.',
			},
			{ title: 'Contact us', summary: 'How to reach support and our registered address.' },
		],
	},
	Privacy: {
		title: 'Privacy policy',
		intro: 'How we collect, use and protect your information, including health data. You can change your choices any time in Settings.',
		sections: [
			{
				title: 'What we collect',
				summary: 'Your name, mobile, email, addresses, family members, and booking history.',
			},
			{
				title: 'Health information',
				summary: 'Prescriptions, reports and visit notes you or your providers add. Treated as sensitive data.',
			},
			{
				title: 'How we use it',
				summary: 'To run bookings, send updates and codes, process payments, and improve the service.',
			},
			{
				title: 'Who we share it with',
				summary:
					'Only the doctor, lab or provider you book, payment partners, and when the law requires it. We don’t sell your data.',
			},
			{
				title: 'Location',
				summary: 'Used to find nearby care and to guide a provider to your address during a visit.',
			},
			{ title: 'How long we keep it', summary: 'How long records are kept and how to ask for deletion.' },
			{ title: 'Security', summary: 'How your data is protected in storage and in transit.' },
			{
				title: 'Your choices and rights',
				summary: 'See, correct, download or delete your data, and manage notifications and consent.',
			},
			{
				title: 'Grievance officer',
				summary: 'Who to contact about privacy concerns, and how quickly we respond.',
			},
		],
	},
}

const TABS: { key: Tab; label: string }[] = [
	{ key: 'Terms', label: 'Terms of use' },
	{ key: 'Privacy', label: 'Privacy policy' },
]

export default function LegalPage() {
	const navigation = useNavigation()
	const route = useRoute<RouteProp<AuthStackParamList, typeof ROUTES.AUTH.LEGAL>>()
	const insets = useSafeAreaInsets()
	const [tab, setTab] = useState<Tab>(route.params?.tab ?? 'Terms')
	const [open, setOpen] = useState<Record<number, boolean>>({ 0: true })
	const [all, setAll] = useState(false)

	const doc = DOCS[tab]

	const pickTab = (next: Tab) => {
		setTab(next)
		setOpen({ 0: true })
		setAll(false)
	}

	return (
		<View style={styles.container}>
			<AuthHeaderMint onBack={() => navigation.goBack()} style={styles.header}>
				<Text style={styles.headerTitle}>Legal</Text>
				<View accessibilityRole="tablist" style={styles.tabs}>
					{TABS.map((t) => {
						const on = t.key === tab
						return (
							<Pressable
								key={t.key}
								onPress={() => pickTab(t.key)}
								accessibilityRole="tab"
								accessibilityState={{ selected: on }}
								style={[styles.tab, on && styles.tabOn]}
							>
								<Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
							</Pressable>
						)
					})}
				</View>
			</AuthHeaderMint>

			<ScrollView
				contentContainerStyle={[styles.main, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}
				showsVerticalScrollIndicator={false}
			>
				<Text style={styles.docTitle}>{doc.title}</Text>
				<Text style={styles.updated}>
					Last updated [date] · Applies to patients, doctors and care providers
				</Text>

				<View style={styles.intro}>
					<PathIcon d={ICON_PATHS.info} size={18} color={TONES.sky.ink} strokeWidth={2.2} />
					<Text style={styles.introText}>{doc.intro}</Text>
				</View>

				{doc.sections.map((s, i) => {
					const isOpen = all || !!open[i]
					return (
						<View key={s.title} style={styles.section}>
							<Pressable
								onPress={() => {
									setOpen({ ...open, [i]: !isOpen })
									setAll(false)
								}}
								accessibilityRole="button"
								accessibilityState={{ expanded: isOpen }}
								style={styles.sectionHead}
							>
								<View style={styles.num}>
									<Text style={styles.numText}>{i + 1}</Text>
								</View>
								<Text style={styles.sectionTitle}>{s.title}</Text>
								<View style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
									<PathIcon d={ICON_PATHS.chevronDown} size={20} color={APP_COLORS.inkMuted} />
								</View>
							</Pressable>
							{isOpen ? (
								<View style={styles.sectionBody}>
									<Text style={styles.summary}>
										<Text style={styles.summaryStrong}>In short:</Text> {s.summary}
									</Text>
									<Text style={styles.placeholder}>
										[Full legal text for this section, from your legal team]
									</Text>
								</View>
							) : null}
						</View>
					)
				})}

				<View style={styles.questions}>
					<Text style={styles.questionsTitle}>Questions?</Text>
					<Text style={styles.questionsText}>Write to [support email] or use Help in the app.</Text>
				</View>

				<Pressable
					onPress={() => {
						setAll(!all)
						setOpen({})
					}}
					accessibilityRole="button"
					style={styles.expandAll}
				>
					<Text style={styles.expandAllText}>{all ? 'Collapse all' : 'Expand all'}</Text>
				</Pressable>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: APP_COLORS.surface },
	header: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		gap: 12,
	},
	headerTitle: {
		marginTop: -44,
		marginLeft: 36,
		height: 44,
		fontSize: 20,
		lineHeight: 44,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	tabs: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 12, backgroundColor: APP_COLORS.surface },
	tab: { flex: 1, height: 40, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
	tabOn: { backgroundColor: APP_COLORS.primary },
	tabText: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
	tabTextOn: { color: APP_COLORS.surface },
	main: { padding: 20, gap: 6 },
	docTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: APP_COLORS.ink },
	updated: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	intro: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 10,
		marginBottom: 6,
		padding: 12,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: TONES.sky.bg,
	},
	introText: { flex: 1, fontSize: 13, lineHeight: 19, color: APP_COLORS.ink },
	section: { borderBottomWidth: 1, borderBottomColor: '#E4ECEC' },
	sectionHead: { minHeight: 56, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
	num: {
		width: 28,
		height: 28,
		borderRadius: 8,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	numText: { fontSize: 13, fontWeight: '800', color: APP_COLORS.primary },
	sectionTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	sectionBody: { paddingLeft: 40, paddingBottom: 16, gap: 8 },
	summary: { fontSize: 14, lineHeight: 21, color: '#3D5357' },
	summaryStrong: { fontWeight: '700', color: APP_COLORS.ink },
	placeholder: {
		padding: 10,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.pageBg,
		fontSize: 13,
		lineHeight: 19,
		color: APP_COLORS.inkMuted,
		overflow: 'hidden',
	},
	questions: { marginTop: 16, padding: 14, borderRadius: 12, backgroundColor: APP_COLORS.pageBg, gap: 4 },
	questionsTitle: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
	questionsText: { fontSize: 13, lineHeight: 19, color: APP_COLORS.inkMuted },
	expandAll: {
		marginTop: 12,
		height: 44,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
	},
	expandAllText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
})
