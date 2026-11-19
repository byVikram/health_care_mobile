// src/features/ancillary/patient/VisitWhoWhereSection.tsx
//
// The "VISIT FOR" row, the visit-address row and the optional note, plus the family-member and address
// bottom sheets they open -- shared by both Review & pay screens (Book now and Later). State comes from
// useVisitPatientAddress so the parent can read the picked patient/address when submitting.
//
// The pharmacy order uses just the address half (state from useSavedAddresses): `hidePatient` and `hideNote` drop the other two, and
// `embedded` lets it sit inside the page's own card. Without those props nothing changes for the visit flows.

import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { APP_COLORS } from '../../../config/theme'
import {
	AppAddressSheet,
	AppFamilyMemberSheet,
	AppPatientRow,
	AppSection,
	NotesInput,
	familyMemberFirstName,
} from '../../../components/common'
import { addressLine, type SavedAddresses, type VisitPatientAddress } from './useVisitPatientAddress'
import { isManagedAddress } from './currentLocationAddress'

const NOTE_MAX = 300

type Props = {
	/** The visit flows pass useVisitPatientAddress; the pharmacy order passes useSavedAddresses (with `hidePatient`). */
	who: VisitPatientAddress | SavedAddresses
	/** "nurse", "physiotherapist"… (the note label and the address sheet's title). */
	noun?: string
	note?: string
	onNoteChange?: (v: string) => void
	/** Green line under the address, e.g. "Nurse will come to this address". */
	addressHint?: string
	/** Eyebrow over the patient row. Defaults to "VISIT FOR". */
	patientLabel?: string
	/** Eyebrow prefix over the address. Defaults to "VISIT ADDRESS". */
	addressLabel?: string
	/** Title of the family sheet. Defaults to "Who is this visit for?". */
	familyTitle?: string
	/** Show the address but do not let it be changed here (something chosen earlier depends on it). */
	lockAddress?: boolean
	/** Adds a one-tap "Current location" card to the address sheet: the app's shared location, never a GPS read of its own. */
	currentLocation?: boolean
	/** Leave out the "VISIT FOR" row and its family sheet. */
	hidePatient?: boolean
	/** Leave out the note field. */
	hideNote?: boolean
	/** Sits inside another card: no padding or background of its own. */
	embedded?: boolean
	/** Title of the address sheet. Defaults to "Where should the {noun} come?". */
	sheetTitle?: string
	/** What the address is called in the prompts and the screen-reader text. Defaults to "visit address". */
	addressNoun?: string
	/** Adds a "Manage saved addresses" link to the address sheet. */
	onManageAddresses?: () => void
}

export function VisitWhoWhereSection({
	who,
	noun = 'visit',
	note = '',
	onNoteChange,
	addressHint,
	patientLabel = 'VISIT FOR',
	addressLabel = 'VISIT ADDRESS',
	familyTitle = 'Who is this visit for?',
	lockAddress = false,
	currentLocation = false,
	hidePatient = false,
	hideNote = false,
	embedded = false,
	sheetTitle,
	addressNoun = 'visit address',
	onManageAddresses,
}: Props) {
	// the patient half exists only when the caller passed the full visit state
	const full = !hidePatient && 'members' in who ? who : null
	const member = full?.member
	const { address } = who
	const addressTag = address ? address.label.toUpperCase() : ''
	const addressNounCaps = addressNoun.charAt(0).toUpperCase() + addressNoun.slice(1)

	return (
		<>
			<AppSection
				marginTop={0}
				flush={embedded}
				accessibilityLabel={hidePatient ? 'Address' : 'Patient and address'}
				style={[styles.section, embedded && styles.embedded]}
			>
				{!!member && (
					<AppPatientRow
						member={member}
						label={patientLabel}
						toneIndex={full?.memberIndex}
						onChange={() => full?.setFamilyOpen(true)}
					/>
				)}
				<TouchableOpacity
					style={styles.addrRow}
					onPress={() => who.setAddrOpen(true)}
					disabled={lockAddress}
					activeOpacity={lockAddress ? 1 : 0.8}
					accessibilityRole="button"
					accessibilityLabel={
						address
							? `${addressNounCaps}, ${address.label}, ${addressLine(address)}. Change`
							: `Add ${addressNoun}`
					}
				>
					<View style={styles.addrTile}>
						<MaterialCommunityIcons name="map-marker-outline" size={22} color={APP_COLORS.primary} />
					</View>
					<View style={styles.flex}>
						<Text style={styles.eyebrow}>
							{address ? `${addressLabel} · ${addressTag}` : addressLabel}
						</Text>
						{who.addrLoading && !address ? (
							<Text style={styles.muted}>Loading your addresses…</Text>
						) : address ? (
							<>
								<Text style={styles.addrLine1} numberOfLines={1}>
									{address.address_line}
								</Text>
								<Text style={styles.addrLine2} numberOfLines={1}>
									{[address.city, address.pincode].filter(Boolean).join(' ')}
								</Text>
								{!!addressHint && <Text style={styles.hint}>{addressHint}</Text>}
							</>
						) : (
							<Text style={[styles.addrLine1, styles.addrMissing]}>
								{who.addrError ? "Couldn't load addresses — tap to retry" : `Add the ${addressNoun}`}
							</Text>
						)}
					</View>
					{!lockAddress && <MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />}
				</TouchableOpacity>
				{!hideNote && (
					<NotesInput
						variant="field"
						label={`Note for the ${noun} (optional)`}
						placeholder="e.g. Ring the bell twice, 2nd floor"
						value={note}
						onChangeValue={onNoteChange ?? (() => {})}
						maxLength={NOTE_MAX}
					/>
				)}
			</AppSection>

			{full && (
				<AppFamilyMemberSheet
					visible={full.familyOpen}
					onClose={() => full.setFamilyOpen(false)}
					members={full.members}
					selectedKey={full.patientKey}
					onSelect={(m) => full.setPatientKey(m.key)}
					title={familyTitle}
					confirmLabel={(m) => `Continue for ${familyMemberFirstName(m)}`}
					onSave={async (draft) => {
						const key = await full.addFromDraft(draft)
						if (key) full.setPatientKey(key)
						return !!key
					}}
				/>
			)}

			<AppAddressSheet
				visible={who.addrOpen}
				onClose={() => who.setAddrOpen(false)}
				title={sheetTitle ?? `Where should the ${noun} come?`}
				addresses={who.addresses.map((a) => ({
					id: a.id,
					label: a.label,
					line: addressLine(a),
					managed: isManagedAddress(a),
				}))}
				loading={who.addrLoading}
				error={who.addrError}
				onRetry={() => void who.loadAddresses()}
				selectedId={who.addressId}
				onSelect={who.setAddressId}
				onSaveNew={who.saveAddress}
				onUseCurrentLocation={currentLocation ? undefined : who.useCurrentLocation}
				onPickCurrentLocation={currentLocation ? who.pickCurrentLocation : undefined}
				currentLocationLabel={currentLocation ? who.currentLocationTitle : undefined}
				currentLocationLine={currentLocation ? who.currentLocationLine : undefined}
				currentLocationNote={currentLocation ? who.currentLocationNote : undefined}
				onManage={onManageAddresses}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	section: { paddingTop: 4 },
	embedded: { paddingVertical: 0, backgroundColor: 'transparent' },
	muted: { fontSize: 12, lineHeight: 16, color: APP_COLORS.inkMuted },
	addrRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		minHeight: 64,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: APP_COLORS.divider,
	},
	addrTile: {
		width: 48,
		height: 48,
		borderRadius: 12,
		backgroundColor: APP_COLORS.mint,
		alignItems: 'center',
		justifyContent: 'center',
	},
	eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	addrLine1: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: APP_COLORS.ink },
	addrLine2: { fontSize: 13, lineHeight: 18, color: APP_COLORS.inkMuted },
	addrMissing: { color: APP_COLORS.primary },
	hint: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: APP_COLORS.success },
})

export default VisitWhoWhereSection
