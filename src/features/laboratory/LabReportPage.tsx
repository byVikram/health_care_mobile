// src/features/laboratory/LabReportPage.tsx
//
// "Lab report" from the Lab Tests Ordering design: the report-ready summary (parameters / in range / to
// review), key results on a range bar, the "needs a doctor's review" banner with Consult, Details, the
// finished Status timeline, a help row and Share / Download PDF. Mock data (DEMO_REPORT): no report API yet.

import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import {
	AppButton,
	AppDetailRow,
	AppFooterBar,
	AppIconTile,
	AppNavRow,
	AppPathIcon,
	AppScreenHeader,
	AppSection,
	AppStatusTimeline,
	AppTag,
	AppTextLink,
	type AppTimelineStep,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { showComingSoon } from '../../utils/toast'
import { DEMO_REPORT, LAB_ICONS, type LabReportResult } from './labMock'

type Nav = NativeStackNavigationProp<AppStackParamList>

const STATUS_TONE: Record<LabReportResult['status'], { bg: string; ink: string }> = {
	Normal: { bg: APP_COLORS.successBg, ink: APP_COLORS.success },
	High: { bg: APP_COLORS.warningBg, ink: APP_COLORS.warning },
	Low: { bg: APP_COLORS.warningBg, ink: APP_COLORS.warning },
}

const BAR_NORMAL = '#C9E9D5'

function RangeBar({ position, ink }: { position: number; ink: string }) {
	return (
		<View style={styles.bar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
			<View style={styles.barTrack}>
				<View style={{ flex: 20, backgroundColor: APP_COLORS.warningBg }} />
				<View style={{ flex: 60, backgroundColor: BAR_NORMAL }} />
				<View style={{ flex: 20, backgroundColor: APP_COLORS.warningBg }} />
			</View>
			<View style={[styles.marker, { left: `${position}%`, borderColor: ink }]} />
		</View>
	)
}

export default function LabReportPage() {
	const navigation = useNavigation<Nav>()
	const r = DEMO_REPORT

	const timeline: AppTimelineStep[] = r.status.map((s, i) => ({
		key: String(i),
		title: s.title,
		sub: s.sub,
		state: 'done',
	}))

	return (
		<View style={styles.screen}>
			<AppScreenHeader
				variant="bar"
				solid
				title="Lab report"
				subtitle={`Order ${r.orderId}`}
				onBack={() => navigation.goBack()}
				backAccessibilityLabel="Back to bookings"
				rightElement={
					<View style={styles.headerActions}>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={() => showComingSoon()}
							accessibilityLabel="Share"
						>
							<MaterialCommunityIcons name="share-variant-outline" size={22} color="#FFFFFF" />
						</TouchableOpacity>
						<TouchableOpacity
							style={styles.headerBtn}
							onPress={() => showComingSoon()}
							accessibilityLabel="Help"
						>
							<MaterialCommunityIcons name="help-circle-outline" size={22} color="#FFFFFF" />
						</TouchableOpacity>
					</View>
				}
			/>

			<ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
				{/* Report ready */}
				<View style={styles.ready}>
					<View style={styles.readyTop}>
						<AppIconTile size={44} radius={12} backgroundColor={APP_COLORS.success}>
							<AppPathIcon d={LAB_ICONS.document} size={22} strokeWidth={2} color="#FFFFFF" />
						</AppIconTile>
						<View style={styles.flex}>
							<Text style={styles.readyEyebrow}>REPORT READY</Text>
							<Text style={styles.readyTitle}>{r.title}</Text>
							<Text style={styles.readySub}>{`Collected ${r.collected} · Ready ${r.ready}`}</Text>
						</View>
					</View>
					<View style={styles.stats}>
						<View style={styles.stat}>
							<Text style={styles.statValue}>{r.parameters}</Text>
							<Text style={styles.statLabel}>Parameters</Text>
						</View>
						<View style={styles.stat}>
							<Text style={[styles.statValue, { color: APP_COLORS.success }]}>{r.inRange}</Text>
							<Text style={styles.statLabel}>In range</Text>
						</View>
						<View style={styles.stat}>
							<Text style={[styles.statValue, { color: APP_COLORS.warning }]}>{r.toReview}</Text>
							<Text style={styles.statLabel}>To review</Text>
						</View>
					</View>
				</View>

				{/* Key results */}
				<AppSection marginTop={8} title="Key results" titleSize="sm" gap={0}>
					{r.results.map((res) => {
						const tone = STATUS_TONE[res.status]
						return (
							<View key={res.name} style={styles.result}>
								<View style={styles.resultTop}>
									<Text style={styles.resultName}>{res.name}</Text>
									<Text style={styles.resultValue}>
										{`${res.value} `}
										<Text style={styles.resultUnit}>{res.unit}</Text>
									</Text>
								</View>
								<RangeBar position={res.position} ink={tone.ink} />
								<View style={styles.resultBottom}>
									<Text style={styles.resultRange}>{`Range ${res.range}`}</Text>
									<AppTag label={res.status} bg={tone.bg} ink={tone.ink} size="xs" />
								</View>
							</View>
						)
					})}
					<View style={styles.seeAll}>
						<AppTextLink
							label={`See all ${r.parameters} parameters`}
							size="sm"
							onPress={() => showComingSoon()}
						/>
					</View>
				</AppSection>

				{/* Doctor review banner */}
				<View style={styles.reviewWrap}>
					<View style={styles.review}>
						<AppIconTile size={32} radius={10} backgroundColor="#FFFFFF">
							<AppPathIcon d={LAB_ICONS.stethoscope} size={18} strokeWidth={2} color="#2463A8" />
						</AppIconTile>
						<View style={styles.flex}>
							<Text style={styles.reviewTitle}>{`${r.toReview} values need a doctor’s review`}</Text>
							<Text style={styles.reviewSub}>A doctor can explain what they mean for you.</Text>
						</View>
						<TouchableOpacity
							style={styles.consult}
							onPress={() => navigation.navigate(ROUTES.STACK.ALL_SPECIALITIES)}
							accessibilityRole="button"
						>
							<Text style={styles.consultText}>Consult</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Details */}
				<AppSection marginTop={0} title="Details" titleSize="sm" gap={0}>
					<AppDetailRow
						icon="account-outline"
						label="PATIENT"
						value={r.patient.name}
						sub={r.patient.relation}
					/>
					<AppDetailRow
						icon="home-outline"
						label="COLLECTED AT"
						value={r.collectedAt.title}
						sub={r.collectedAt.sub}
					/>
					<AppDetailRow icon="flask-outline" label="LAB" value={r.lab.name} sub={r.lab.sub} />
					<AppDetailRow
						icon="clipboard-text-outline"
						label="ORDER ID"
						value={r.orderId}
						sub={`Paid ${r.paid}`}
						divider={false}
					/>
				</AppSection>

				{/* Status */}
				<AppSection marginTop={0} title="Status" titleSize="sm">
					<AppStatusTimeline steps={timeline} />
				</AppSection>

				<View style={styles.help}>
					<AppNavRow
						title="Need help with this booking?"
						subtitle="Chat with Karolahealth support"
						leading={{
							children: <AppPathIcon d={LAB_ICONS.chat} size={20} strokeWidth={2} color="#6A4BB5" />,
							tone: 'lilac',
							size: 36,
							radius: 10,
						}}
						onPress={() => showComingSoon()}
						minHeight={60}
						titleStyle={styles.helpTitle}
					/>
				</View>
			</ScrollView>

			<AppFooterBar>
				<AppButton
					variant="outline"
					size="lg"
					style={styles.flex}
					icon="share-variant-outline"
					onPress={() => showComingSoon()}
				>
					Share
				</AppButton>
				<AppButton size="lg" style={styles.flex} icon="download-outline" onPress={() => showComingSoon()}>
					Download PDF
				</AppButton>
			</AppFooterBar>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { gap: 8, paddingBottom: 16 },
	flex: { flex: 1, minWidth: 0 },
	headerActions: { flexDirection: 'row', alignItems: 'center', marginRight: -10 },
	headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

	ready: {
		marginHorizontal: 16,
		marginTop: 16,
		padding: 16,
		borderRadius: 16,
		backgroundColor: APP_COLORS.successBg,
		gap: 12,
	},
	readyTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	readyEyebrow: { fontSize: 11, lineHeight: 14, fontWeight: '800', letterSpacing: 0.66, color: APP_COLORS.success },
	readyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	readySub: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	stats: { flexDirection: 'row', gap: 8 },
	stat: { flex: 1, padding: 8, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center' },
	statValue: { fontSize: 18, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	statLabel: { fontSize: 11, lineHeight: 14, color: APP_COLORS.inkMuted },

	result: {
		gap: 6,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	resultTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
	resultName: { fontSize: 14, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	resultValue: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: APP_COLORS.ink },
	resultUnit: { fontSize: 12, fontWeight: '600', color: APP_COLORS.inkMuted },
	bar: { height: 6, justifyContent: 'center' },
	barTrack: { flexDirection: 'row', height: 6, borderRadius: 9999, overflow: 'hidden' },
	marker: {
		position: 'absolute',
		top: -4,
		width: 14,
		height: 14,
		marginLeft: -7,
		borderRadius: 9999,
		borderWidth: 3,
		backgroundColor: '#FFFFFF',
	},
	resultBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
	resultRange: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	seeAll: { alignItems: 'flex-start', paddingTop: 4 },

	reviewWrap: { marginHorizontal: 16 },
	review: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		padding: 12,
		borderRadius: 12,
		backgroundColor: '#DDEBFA',
	},
	reviewTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: '#2463A8' },
	reviewSub: { fontSize: 12, lineHeight: 16, color: APP_COLORS.ink },
	consult: {
		height: 36,
		paddingHorizontal: 12,
		borderRadius: 10,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	consultText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

	help: {
		marginHorizontal: 16,
		paddingHorizontal: 14,
		borderRadius: 12,
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: APP_COLORS.divider,
	},
	helpTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
})
