// src/features/medical-records/MedicalRecordsPage.tsx
//
// The patient's "Medical records" screen (design: Medical records, opened from the sidebar): a header with a switcher for
// whose records are shown (the patient and their family), a search, tabs (All / Prescriptions / Lab reports / My uploads
// with counts), an "Upload health records" card, the records grouped by month, and the upload sheet. The records and the
// upload are the backend's (useMedicalRecords, medicalRecordsService); a record opens as its photos in a viewer, or as its PDF
// in the phone's own viewer. Everything here is layout and state.

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Toast from 'react-native-toast-message'
import {
	AppConfirmSheet,
	AppDashedActionCard,
	AppEmptyCard,
	AppInfoBanner,
	AppMemberSwitcher,
	AppPillTabs,
	AppRecordList,
	AppScreenHeader,
	AppSearchBar,
	AppSkeleton,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { SELF_MEMBER_KEY, useFamilyMembers } from '../../hooks/useFamilyMembers'
import { ROUTES } from '../../navigation/routes'
import type { AppStackParamList } from '../../navigation/types'
import { openWebUrl } from '../../utils/safeLinking'
import { RecordViewerModal } from './components/RecordViewerModal'
import { UploadRecordSheet } from './components/UploadRecordSheet'
import { createRecord, deleteRecord, isRecordGone, recordFile, recordsErrorMessage } from './medicalRecordsService'
import type { MedicalRecord, RecordLink, RecordsTab, UploadDraft } from './medicalRecordsTypes'
import { emptyMessage, filterRecords, groupByMonth, recordDateLabel, tabCounts } from './medicalRecordsView'
import { RECORD_TABS, UPLOAD_ICON_PATH } from './recordVisuals'
import { useMedicalRecords } from './useMedicalRecords'

type Nav = NativeStackNavigationProp<AppStackParamList>

const PAGE_PADDING = 16
const PDF = 'application/pdf'

export default function MedicalRecordsPage() {
	const navigation = useNavigation<Nav>()
	const { members, loading: familyLoading } = useFamilyMembers()
	const { byMember, refresh, addRecord, removeRecord } = useMedicalRecords(members, !familyLoading)

	const [memberKey, setMemberKey] = useState(SELF_MEMBER_KEY)
	const [tab, setTab] = useState<RecordsTab>('all')
	const [query, setQuery] = useState('')
	const [uploadOpen, setUploadOpen] = useState(false)
	const [saving, setSaving] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [opening, setOpening] = useState(false)
	const openingRef = useRef(false)
	const [viewer, setViewer] = useState<{ title: string; file: RecordLink } | null>(null)

	const member = members.find((m) => m.key === memberKey) ?? members[0]
	const state = byMember[member.key]
	const mine = useMemo(() => state?.records ?? [], [state])
	const counts = useMemo(() => tabCounts(mine), [mine])
	const shown = useMemo(() => filterRecords(mine, tab, query), [mine, tab, query])

	// A record opens as its photos in the viewer (a visit's prescription is one image), or as its PDF in the phone's own viewer: the
	// links are signed and short-lived, so they are fetched at the tap.
	const openRecord = useCallback(async (record: MedicalRecord) => {
		if (openingRef.current) return
		openingRef.current = true
		setOpening(true)
		try {
			const file = await recordFile(record)
			if (file?.contentType === PDF) await openWebUrl(file.url)
			else if (file) setViewer({ title: record.title, file })
			else Toast.show({ type: 'info', text1: 'This record has no file to open' })
		} catch (error) {
			Toast.show({ type: 'error', text1: 'Couldn’t open the record', text2: recordsErrorMessage(error) })
		} finally {
			openingRef.current = false
			setOpening(false)
		}
	}, [])

	// A record the patient uploaded by mistake can be deleted (after asking, in the app's confirm sheet): the server removes it and
	// its file.
	const [deleteTarget, setDeleteTarget] = useState<MedicalRecord | null>(null)
	const runDelete = async () => {
		const record = deleteTarget
		if (!record) return
		try {
			await deleteRecord(record.id)
			removeRecord(record.memberKey, record.id)
			Toast.show({ type: 'success', text1: 'Record deleted' })
		} catch (error) {
			if (isRecordGone(error)) {
				// Already deleted (on another phone, or a second tap): nothing is left, so the row goes too.
				removeRecord(record.memberKey, record.id)
				Toast.show({ type: 'info', text1: 'This record was already deleted' })
			} else {
				Toast.show({ type: 'error', text1: 'Couldn’t delete the record', text2: recordsErrorMessage(error) })
			}
		} finally {
			setDeleteTarget(null)
		}
	}

	const groups = useMemo(() => groupByMonth(shown, openRecord, setDeleteTarget), [shown, openRecord])

	const openUpload = () => {
		setUploadError(null)
		setUploadOpen(true)
	}

	const handleSave = async (draft: UploadDraft) => {
		const target = members.find((m) => m.key === draft.memberKey)
		if (!target || saving) return
		setSaving(true)
		setUploadError(null)
		try {
			// The signed-in patient needs no id (the server uses the caller); a family member is named by theirs.
			const created = await createRecord(
				draft,
				target.key === SELF_MEMBER_KEY ? undefined : (target.publicId ?? target.id)
			)
			addRecord(target.key, created)
			setUploadOpen(false)
			// Show it straight away: that person's records, under My uploads.
			setMemberKey(target.key)
			setTab('up')
			setQuery('')
			Toast.show({ type: 'success', text1: 'Record saved to “My uploads”' })
		} catch (error) {
			setUploadError(recordsErrorMessage(error))
		} finally {
			setSaving(false)
		}
	}

	const handleRefresh = async () => {
		setRefreshing(true)
		try {
			await refresh(member)
		} finally {
			setRefreshing(false)
		}
	}

	const recordCountFor = (key: string): number | null => {
		const person = byMember[key]
		return person?.status === 'ready' ? person.records.length : null
	}

	const loading = !state || (state.status === 'loading' && state.records.length === 0)
	const subtitle = loading
		? `Loading records · ${member.name} (${member.relation})`
		: `${mine.length} record${mine.length === 1 ? '' : 's'} · ${member.name} (${member.relation})`

	return (
		<View style={styles.screen}>
			<AppScreenHeader variant="bar" solid title="Medical records" subtitle={subtitle}>
				<AppMemberSwitcher
					members={members}
					selectedKey={member.key}
					onSelect={(m) => setMemberKey(m.key)}
					accessibilityLabel="Records of"
					inset={PAGE_PADDING}
					style={styles.bleed}
				/>
			</AppScreenHeader>

			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={APP_COLORS.primary} />
				}
			>
				<AppSearchBar
					tone="onLight"
					placeholder="Search by doctor or clinic"
					hints={[]}
					showMicrophone={false}
					value={query}
					onChangeText={setQuery}
				/>
				<AppPillTabs
					tabs={RECORD_TABS.map((t) => ({ ...t, count: counts[t.key] }))}
					value={tab}
					onChange={setTab}
					accessibilityLabel="Record type"
					inset={PAGE_PADDING}
					style={styles.bleed}
				/>
				<AppDashedActionCard
					title="Upload health records"
					subtitle="Old prescriptions and lab reports"
					actionLabel="Upload"
					iconPath={UPLOAD_ICON_PATH}
					onPress={openUpload}
				/>

				{state?.status === 'error' && (
					<AppInfoBanner
						tone="danger"
						title="Couldn’t load the records"
						subtitle={state.error ?? undefined}
						action={{ label: 'Retry', onPress: () => void refresh(member) }}
						actionPlacement="below"
					/>
				)}

				{loading ? (
					<View style={styles.skeletons}>
						{[0, 1, 2].map((i) => (
							<AppSkeleton key={i} height={84} borderRadius={14} />
						))}
					</View>
				) : (
					<>
						<AppRecordList groups={groups} />
						{shown.length === 0 && state?.status !== 'error' && (
							<AppEmptyCard title="No records here yet" message={emptyMessage(query)} />
						)}
					</>
				)}
			</ScrollView>

			{opening && (
				<View style={styles.opening} pointerEvents="auto" accessibilityLabel="Opening the record">
					<ActivityIndicator size="large" color="#FFFFFF" />
				</View>
			)}

			<UploadRecordSheet
				visible={uploadOpen}
				onClose={() => setUploadOpen(false)}
				members={members}
				defaultMemberKey={member.key}
				recordCountFor={recordCountFor}
				onSave={handleSave}
				saving={saving}
				error={uploadError}
				onAddMember={() => navigation.navigate(ROUTES.STACK.PATIENT_FAMILY)}
			/>

			<AppConfirmSheet
				visible={deleteTarget !== null}
				onClose={() => setDeleteTarget(null)}
				title="Delete this record?"
				message={
					deleteTarget
						? `${deleteTarget.title} from ${recordDateLabel(deleteTarget.date)}${deleteTarget.subtitle ? ` (${deleteTarget.subtitle})` : ''} will be removed. This can’t be undone.`
						: undefined
				}
				confirmLabel="Delete"
				onConfirm={runDelete}
			/>

			<RecordViewerModal
				visible={viewer !== null}
				title={viewer?.title ?? ''}
				file={viewer?.file ?? null}
				onClose={() => setViewer(null)}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: APP_COLORS.pageBg },
	content: { padding: PAGE_PADDING, gap: 12 },
	// The scrollers run to the screen edges while their first item lines up with the page.
	bleed: { marginHorizontal: -PAGE_PADDING },
	skeletons: { gap: 12 },
	opening: {
		...StyleSheet.absoluteFill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#12373E66',
	},
})
