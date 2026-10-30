// src/features/ancillary/patient/VisitWhoWhereSection.tsx
//
// The "VISIT FOR" row, the visit-address row and the optional note, plus the family-member and address
// bottom sheets they open -- shared by both Review & pay screens (Book now and Later). State comes from
// useVisitPatientAddress so the parent can read the picked patient/address when submitting.

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
import { addressLine, type VisitPatientAddress } from './useVisitPatientAddress'

const NOTE_MAX = 300

type Props = {
	who: VisitPatientAddress
	/** "nurse", "physiotherapist"… */
	noun: string
	note: string
	onNoteChange: (v: string) => void
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
	/** Adds a one-tap "Current location" row to the address sheet. */
	currentLocation?: boolean
}

export function VisitWhoWhereSection({
	who,
	noun,
	note,
	onNoteChange,
	addressHint,
	patientLabel = 'VISIT FOR',
	addressLabel = 'VISIT ADDRESS',
	familyTitle = 'Who is this visit for?',
	lockAddress = false,
	currentLocation = false,
}: Props) {
	const { member, address } = who
	const addressTag = address ? address.label.toUpperCase() : ''

	return (
		<>
			<AppSection marginTop={0} accessibilityLabel="Patient and address" style={styles.section}>
				{!!member && (
					<AppPatientRow
						member={member}
						label={patientLabel}
						toneIndex={who.memberIndex}
						onChange={() => who.setFamilyOpen(true)}
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
							? `Visit address, ${address.label}, ${addressLine(address)}. Change`
							: 'Add visit address'
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
								{who.addrError ? "Couldn't load addresses — tap to retry" : 'Add the visit address'}
							</Text>
						)}
					</View>
					{!lockAddress && <MaterialCommunityIcons name="chevron-right" size={20} color={APP_COLORS.border} />}
				</TouchableOpacity>
				<NotesInput
					variant="field"
					label={`Note for the ${noun} (optional)`}
					placeholder="e.g. Ring the bell twice, 2nd floor"
					value={note}
					onChangeValue={onNoteChange}
					maxLength={NOTE_MAX}
				/>
			</AppSection>

			<AppFamilyMemberSheet
				visible={who.familyOpen}
				onClose={() => who.setFamilyOpen(false)}
				members={who.members}
				selectedKey={who.patientKey}
				onSelect={(m) => who.setPatientKey(m.key)}
				title={familyTitle}
				confirmLabel={(m) => `Continue for ${familyMemberFirstName(m)}`}
				onSave={async (draft) => {
					const key = await who.addFromDraft(draft)
					if (key) who.setPatientKey(key)
					return !!key
				}}
			/>

			<AppAddressSheet
				visible={who.addrOpen}
				onClose={() => who.setAddrOpen(false)}
				title={`Where should the ${noun} come?`}
				addresses={who.addresses.map((a) => ({ id: a.id, label: a.label, line: addressLine(a) }))}
				loading={who.addrLoading}
				error={who.addrError}
				onRetry={() => void who.loadAddresses()}
				selectedId={who.addressId}
				onSelect={who.setAddressId}
				onSaveNew={who.saveAddress}
				onUseCurrentLocation={currentLocation ? undefined : who.useCurrentLocation}
				onPickCurrentLocation={currentLocation ? who.pickCurrentLocation : undefined}
			/>
		</>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1, minWidth: 0 },
	section: { paddingTop: 4 },
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
