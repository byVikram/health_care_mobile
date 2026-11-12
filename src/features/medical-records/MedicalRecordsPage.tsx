// src/features/medical-records/MedicalRecordsPage.tsx
//
// The patient's "Medical records" screen (design: Medical records, opened from the sidebar): a row of chips for whose records are
// shown ("Me", the family, Add), a search, one chip bar (Filters, then All / Prescriptions / Lab reports / My uploads with counts), an
// "Upload health records" card, the records grouped by month, and the upload sheet. The records and the upload are the backend's
// (useMedicalRecords, medicalRecordsService); a record opens as its photos in a viewer, or as its PDF in the phone's own viewer.
// Everything here is layout and state.

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import Toast from 'react-native-toast-message'
import {
	AppConfirmSheet,
	AppDashedActionCard,
	AppEmptyCard,
	AppFamilyMemberAvatar,
	AppFamilyMemberSheet,
	AppFilterSheet,
	AppPathIcon,
	AppPhotoSourceSheet,
	AppInfoBanner,
	AppRecordList,
	AppScreenHeader,
	AppSearchBar,
	AppSkeleton,
	familyMemberFirstName,
} from '../../components/common'
import { APP_COLORS } from '../../config/theme'
import { SELF_MEMBER_KEY, useFamilyMembers } from '../../hooks/useFamilyMembers'
import type { PickedFile } from '../../utils/pickedFile'
import { openWebUrl } from '../../utils/safeLinking'
import { RecordViewerModal } from './components/RecordViewerModal'
import { UploadRecordSheet } from './components/UploadRecordSheet'
import { pickRecordFile } from './pickRecordFile'
import { createRecord, deleteRecord, isRecordGone, recordFile, recordsErrorMessage } from './medicalRecordsService'
import {
	NO_RECORD_FILTERS,
	RECORD_FILTER_GROUPS,
	activeFilterCount,
	groupCount,
	selectedValues,
	withOption,
	type RecordFilterKey,
	type RecordFilters,
} from './medicalRecordsFilters'
import type { MedicalRecord, RecordLink, RecordsTab, UploadDraft } from './medicalRecordsTypes'
import {
	applyRecordFilters,
	emptyMessage,
	filterRecords,
	groupByMonth,
	recordDateLabel,
	tabCounts,
} from './medicalRecordsView'
import {
	FILTER_ICON_PATH,
	RECORD_TABS,
	UPLOAD_ICON_PATH,
	UPLOAD_SOURCE_SHEET,
	type UploadSourceId,
} from './recordVisuals'
import { useMedicalRecords } from './useMedicalRecords'

const PAGE_PADDING = 16

const PDF = 'application/pdf'

export default function MedicalRecordsPage() {
	const { members, loading: familyLoading, addFromDraft } = useFamilyMembers()
	const { byMember, refresh, addRecord, removeRecord } = useMedicalRecords(members, !familyLoading)

	const [tab, setTab] = useState<RecordsTab>('all')
	const [query, setQuery] = useState('')
	// The Filters sheet (the one Find a doctor uses): record date and the order.
	const [filters, setFilters] = useState<RecordFilters>(NO_RECORD_FILTERS)
	// Whose records are shown: the signed-in patient, or the family member picked in the chip row (or the family sheet).
	const [memberKey, setMemberKey] = useState(SELF_MEMBER_KEY)
	const [peopleOpen, setPeopleOpen] = useState(false)
	const [filtersOpen, setFiltersOpen] = useState(false)
	// An upload: the source sheet (where is the file from?), the picked file, then the details sheet. `uploadSession` remounts the
	// details sheet for each upload, so every one starts empty.
	const [sourceOpen, setSourceOpen] = useState(false)
	const [draftFile, setDraftFile] = useState<PickedFile | null>(null)
	const [detailsOpen, setDetailsOpen] = useState(false)
	const [uploadSession, setUploadSession] = useState(0)
	const [saving, setSaving] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)
	const [opening, setOpening] = useState(false)
	const openingRef = useRef(false)
	const [viewer, setViewer] = useState<{ title: string; file: RecordLink } | null>(null)

	// The signed-in patient's records, or the picked family member's (every person's list is already fetched, so switching is
	// instant).
	const member =
		members.find((m) => m.key === memberKey) ?? members.find((m) => m.key === SELF_MEMBER_KEY) ?? members[0]
	const state = byMember[member.key]
	const mine = useMemo(() => state?.records ?? [], [state])
	const filterCount = activeFilterCount(filters)
	// The tab counts follow the filters (not the search), so a count is what its tab will show.
	const counts = useMemo(() => tabCounts(applyRecordFilters(mine, filters)), [mine, filters])
	const shown = useMemo(() => filterRecords(mine, tab, query, filters), [mine, tab, query, filters])

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
		setDraftFile(null)
		setDetailsOpen(false)
		setUploadSession((n) => n + 1)
		setSourceOpen(true)
	}

	// The source sheet has already closed itself when this runs (so the camera, gallery or file explorer opens over nothing).
	const pickFile = async (source: UploadSourceId) => {
		const picked = await pickRecordFile(source)
		if (picked) {
			setDraftFile(picked)
			setDetailsOpen(true)
		}
	}

	// The details sheet's back arrow: choose another file (what was typed stays).
	const changeFile = () => {
		setDetailsOpen(false)
		setSourceOpen(true)
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
			setDetailsOpen(false)
			if (target.key === member.key) {
				// Show it straight away, under My uploads: a search or a Filters choice (a date range the record's date may be outside
				// of) must not hide it, so they are cleared.
				setTab('up')
				setQuery('')
				setFilters(NO_RECORD_FILTERS)
				Toast.show({ type: 'success', text1: 'Record saved to “My uploads”' })
			} else {
				Toast.show({ type: 'success', text1: `Record saved to ${familyMemberFirstName(target)}’s records` })
			}
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

	const loading = !state || (state.status === 'loading' && state.records.length === 0)
	const subtitle = loading
		? `Loading records · ${member.name} (${member.relation})`
		: `${mine.length} record${mine.length === 1 ? '' : 's'} · ${member.name} (${member.relation})`

	return (
		<View style={styles.screen}>
			<AppScreenHeader variant="bar" solid title="Medical records" subtitle={subtitle} />

			<ScrollView
				contentContainerStyle={styles.content}
				keyboardShouldPersistTaps="handled"
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={APP_COLORS.primary} />
				}
			>
				{/* Whose records: the patient and each family member, one tap to switch; Add opens the family sheet. */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.familyRow}
					style={styles.bleed}
					keyboardShouldPersistTaps="handled"
					accessibilityLabel="Whose records"
				>
					{members.map((m, index) => {
						const on = m.key === member.key
						const self = m.relation === 'Self'
						return (
							<TouchableOpacity
								key={m.key}
								onPress={() => setMemberKey(m.key)}
								activeOpacity={0.85}
								accessibilityRole="button"
								accessibilityState={{ selected: on }}
								accessibilityLabel={`${self ? 'My records' : `${m.name}, ${m.relation}`}${on ? ', showing' : ''}`}
								style={[styles.familyChip, on && styles.familyChipOn]}
							>
								<AppFamilyMemberAvatar member={m} index={index} size={28} />
								<Text style={[styles.familyName, on && styles.familyNameOn]} numberOfLines={1}>
									{self ? 'Me' : m.name.split(' ')[0]}
								</Text>
							</TouchableOpacity>
						)
					})}
					<TouchableOpacity
						onPress={() => setPeopleOpen(true)}
						activeOpacity={0.85}
						accessibilityRole="button"
						accessibilityLabel="Add a family member"
						style={[styles.familyChip, styles.familyAdd]}
					>
						<MaterialCommunityIcons name="plus" size={18} color={APP_COLORS.primary} />
						<Text style={styles.familyAddText}>Add</Text>
					</TouchableOpacity>
				</ScrollView>
				<AppSearchBar
					tone="onLight"
					placeholder="Search by doctor or clinic"
					hints={[]}
					showMicrophone={false}
					value={query}
					onChangeText={setQuery}
				/>
				{/* One chip bar, as in Find a doctor: Filters first, then the kinds of record (the chosen one is filled). */}
				<ScrollView
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={styles.chipBar}
					style={styles.bleed}
					keyboardShouldPersistTaps="handled"
					accessibilityRole="toolbar"
				>
					<TouchableOpacity
						onPress={() => setFiltersOpen(true)}
						activeOpacity={0.85}
						accessibilityRole="button"
						accessibilityLabel={filterCount ? `Filters, ${filterCount} selected` : 'Filters'}
						style={[styles.chip, filterCount > 0 && styles.chipOn]}
					>
						<AppPathIcon
							d={FILTER_ICON_PATH}
							size={16}
							strokeWidth={2.2}
							color={filterCount > 0 ? APP_COLORS.primary : APP_COLORS.ink}
						/>
						<Text style={[styles.chipText, filterCount > 0 && styles.chipTextOn]}>Filters</Text>
						{filterCount > 0 && (
							<View style={styles.countBadge}>
								<Text style={styles.countBadgeText}>{filterCount}</Text>
							</View>
						)}
					</TouchableOpacity>
					<View style={styles.chipDivider} />
					{RECORD_TABS.map((t) => {
						const on = t.key === tab
						return (
							<TouchableOpacity
								key={t.key}
								onPress={() => setTab(t.key)}
								activeOpacity={0.85}
								accessibilityRole="button"
								accessibilityState={{ selected: on }}
								accessibilityLabel={`${t.label}, ${counts[t.key]}`}
								style={[styles.chip, on && styles.kindChipOn]}
							>
								<Text style={[styles.chipText, on && styles.kindChipTextOn]}>{t.label}</Text>
								<Text style={[styles.kindCount, on && styles.kindChipTextOn]}>{counts[t.key]}</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
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
							<AppEmptyCard title="No records here yet" message={emptyMessage(query, filterCount > 0)} />
						)}
					</>
				)}
			</ScrollView>

			{opening && (
				<View style={styles.opening} pointerEvents="auto" accessibilityLabel="Opening the record">
					<ActivityIndicator size="large" color="#FFFFFF" />
				</View>
			)}

			<AppFilterSheet
				visible={filtersOpen}
				groups={RECORD_FILTER_GROUPS}
				selected={(key) => selectedValues(filters, key as RecordFilterKey)}
				count={(key) => groupCount(filters, key as RecordFilterKey)}
				onSelect={(key, value) => setFilters((f) => withOption(f, key as RecordFilterKey, value))}
				onClearAll={() => setFilters(NO_RECORD_FILTERS)}
				onClose={() => setFiltersOpen(false)}
			/>

			<AppFamilyMemberSheet
				visible={peopleOpen}
				onClose={() => setPeopleOpen(false)}
				members={members}
				selectedKey={member.key}
				onSelect={(m) => setMemberKey(m.key)}
				title="Whose records?"
				subtitle="Pick a family member to see their records"
				confirmLabel={(m) =>
					m.relation === 'Self' ? 'Show my records' : `Show ${familyMemberFirstName(m)}’s records`
				}
				onSave={async (draft) => {
					const key = await addFromDraft(draft)
					if (key) setMemberKey(key)
					return !!key
				}}
			/>

			<AppPhotoSourceSheet
				visible={sourceOpen}
				onClose={() => setSourceOpen(false)}
				{...UPLOAD_SOURCE_SHEET}
				onTakePhoto={() => void pickFile('camera')}
				onChoosePhoto={() => void pickFile('gallery')}
				onChooseFile={() => void pickFile('file')}
			/>

			<UploadRecordSheet
				key={uploadSession}
				visible={detailsOpen}
				file={draftFile}
				onClose={() => setDetailsOpen(false)}
				onChangeFile={changeFile}
				members={members}
				defaultMemberKey={member.key}
				onSave={handleSave}
				saving={saving}
				error={uploadError}
				onSaveMember={addFromDraft}
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
	// The family row: one single-line chip per person (avatar, first name; "Me" for the patient); the one on view has the primary border.
	familyRow: { gap: 8, paddingHorizontal: PAGE_PADDING },
	familyChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		height: 44,
		paddingLeft: 7,
		paddingRight: 16,
		borderRadius: 22,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	familyChipOn: { borderColor: APP_COLORS.primary, backgroundColor: '#F0F7F7' },
	familyName: { fontSize: 14, fontWeight: '700', color: APP_COLORS.inkMuted },
	familyNameOn: { color: APP_COLORS.ink },
	familyAdd: {
		paddingLeft: 12,
		borderStyle: 'dashed',
		borderColor: APP_COLORS.primary,
		backgroundColor: 'transparent',
	},
	familyAddText: { fontSize: 14, fontWeight: '700', color: APP_COLORS.primary },
	// One scrolling chip bar (Find a doctor's filter bar): it runs to the screen edges while the first chip lines up with the page.
	chipBar: { alignItems: 'center', gap: 8, paddingHorizontal: PAGE_PADDING },
	chipDivider: { width: 1, height: 20, backgroundColor: APP_COLORS.divider },
	// the Find a doctor filter chip: 36 high, radius 8, 1.5px border, 13/700; on = #F0F7F7 fill with a primary border and text
	chip: {
		height: 36,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		borderRadius: 8,
		borderWidth: 1.5,
		borderColor: APP_COLORS.divider,
		backgroundColor: APP_COLORS.surface,
	},
	chipOn: { borderColor: APP_COLORS.primary, backgroundColor: '#F0F7F7' },
	chipText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: APP_COLORS.ink },
	chipTextOn: { color: APP_COLORS.primary },
	// the chosen kind is filled, so it never reads as the (outlined) Filters chip being on
	kindChipOn: { borderColor: APP_COLORS.primary, backgroundColor: APP_COLORS.primary },
	kindChipTextOn: { color: '#FFFFFF' },
	kindCount: { fontSize: 12, fontWeight: '700', color: APP_COLORS.inkMuted },
	countBadge: {
		minWidth: 18,
		height: 18,
		paddingHorizontal: 5,
		borderRadius: 9,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	countBadgeText: { fontSize: 11, fontWeight: '800', color: '#FFFFFF' },
	opening: {
		...StyleSheet.absoluteFill,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#12373E66',
	},
})
