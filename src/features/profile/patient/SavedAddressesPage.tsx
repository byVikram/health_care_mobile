// "Saved addresses": default address first, per-address options (set default / edit / delete), empty
// state, and "Add new address". Delete is a soft delete; if the default is deleted the backend makes the
// oldest remaining address the default.

import React, { useCallback, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Toast from 'react-native-toast-message'
import {
	AppBottomSheet,
	AppConfirmSheet,
	AppInfoBanner,
	AppNavRow,
	AppStickyFooter,
	StatusModal,
} from '../../../components/common'
import { APP_COLORS } from '../../../config/theme'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import {
	deletePatientAddress,
	getPatientAddresses,
	updatePatientAddress,
	type PatientAddress,
} from './PatientProfileService'
import { AddressCard, fullAddress } from './components/AddressCard'
import { ProfileScreen } from '../shared/components/ProfileScreen'

type Nav = NativeStackNavigationProp<AppStackParamList>

export default function SavedAddressesPage() {
	const navigation = useNavigation<Nav>()
	const [addresses, setAddresses] = useState<PatientAddress[]>([])
	const [loading, setLoading] = useState(true)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [menuFor, setMenuFor] = useState<PatientAddress | null>(null)
	const [deleteFor, setDeleteFor] = useState<PatientAddress | null>(null)
	const [actionError, setActionError] = useState<string | null>(null)

	const load = useCallback(async () => {
		setLoadError(null)
		try {
			const list = await getPatientAddresses()
			setAddresses([...list].sort((a, b) => Number(b.is_default) - Number(a.is_default)))
		} catch (e) {
			setLoadError(e instanceof Error ? e.message : 'Could not load your addresses')
		} finally {
			setLoading(false)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			void load()
		}, [load])
	)

	const makeDefault = async (a: PatientAddress) => {
		setMenuFor(null)
		try {
			await updatePatientAddress(a.id, { is_default: true })
			Toast.show({ type: 'success', text1: `${a.label} is now your default address` })
			await load()
		} catch (e) {
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	const remove = async () => {
		if (!deleteFor) return
		const target = deleteFor
		try {
			await deletePatientAddress(target.id)
			setDeleteFor(null)
			Toast.show({ type: 'success', text1: `${target.label} deleted` })
			await load()
		} catch (e) {
			setDeleteFor(null)
			setActionError(e instanceof Error ? e.message : 'Please try again.')
		}
	}

	return (
		<ProfileScreen
			title="Saved addresses"
			subtitle="For home visits and sample pickup"
			loading={loading}
			loadError={loadError}
			onRetry={load}
			footer={
				<AppStickyFooter onPress={() => navigation.navigate(ROUTES.STACK.PATIENT_ADDRESS_FORM)}>
					Add new address
				</AppStickyFooter>
			}
			overlays={
				<>
					<AppBottomSheet
						visible={!!menuFor}
						onClose={() => setMenuFor(null)}
						title={menuFor?.label ?? ''}
						subtitle={menuFor ? fullAddress(menuFor) : undefined}
						appearance="modern"
						showHeaderDivider={false}
					>
						<View style={styles.menu}>
							{menuFor && !menuFor.is_default && (
								<AppNavRow
									title="Set as default"
									leading="star-outline"
									onPress={() => makeDefault(menuFor)}
									minHeight={52}
									divider
								/>
							)}
							<AppNavRow
								title="Edit address"
								leading="pencil-outline"
								minHeight={52}
								divider
								onPress={() => {
									const id = menuFor?.id
									setMenuFor(null)
									if (id) navigation.navigate(ROUTES.STACK.PATIENT_ADDRESS_FORM, { addressId: id })
								}}
							/>
							<AppNavRow
								title="Delete address"
								leading="trash-can-outline"
								tone="danger"
								minHeight={52}
								trailing={false}
								onPress={() => {
									setDeleteFor(menuFor)
									setMenuFor(null)
								}}
							/>
						</View>
					</AppBottomSheet>
					<AppConfirmSheet
						visible={!!deleteFor}
						onClose={() => setDeleteFor(null)}
						title={`Delete ${deleteFor?.label ?? 'address'}?`}
						message={
							deleteFor?.is_default && addresses.length > 1
								? 'This is your default address. Your next saved address becomes the default. Upcoming bookings here are not affected.'
								: 'Upcoming bookings at this address are not affected.'
						}
						confirmLabel="Delete"
						cancelLabel="Keep"
						onConfirm={remove}
					/>
					<StatusModal
						visible={!!actionError}
						status="error"
						title="Something went wrong"
						description={actionError || ''}
						submitText="OK"
						onSubmit={() => setActionError(null)}
					/>
				</>
			}
		>
			{addresses.length > 0 ? (
				<>
					<AppInfoBanner
						tone="info"
						icon={null}
						title="Your default address is picked first when you book"
						subtitle="You can change it on any booking."
						style={styles.banner}
					/>
					{addresses.map((a) => (
						<AddressCard key={a.id} address={a} onMore={() => setMenuFor(a)} />
					))}
				</>
			) : (
				<View style={styles.empty}>
					<Text style={styles.emptyTitle}>No saved addresses</Text>
					<Text style={styles.emptyText}>Add one for home visits and sample pickup.</Text>
				</View>
			)}
		</ProfileScreen>
	)
}

const styles = StyleSheet.create({
	banner: {
		marginHorizontal: 16,
		marginTop: 12,
	},
	menu: {
		paddingBottom: 12,
	},
	empty: {
		margin: 16,
		padding: 24,
		borderRadius: 12,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		gap: 4,
	},
	emptyTitle: {
		fontSize: 16,
		lineHeight: 22,
		fontWeight: '800',
		color: APP_COLORS.ink,
	},
	emptyText: {
		fontSize: 13,
		lineHeight: 18,
		color: APP_COLORS.inkMuted,
		textAlign: 'center',
	},
})
