import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getRoles } from '../auth/authService'
import type { AuthScreenProps } from '../../navigation/types'
import { ROUTES } from '../../navigation/routes'
import { APP_COLORS, TONES } from '../../config/theme'
import { AuthFooter, AuthHero, CtaButton, ICON_PATHS, PathIcon } from '../auth/components/AuthKit'
import { PROVIDER_KINDS, roleVariant, type RoleVariant } from '../auth/roleDisplay'

type Role = {
	id: string
	label: string
}

// The API returns these three; used as the fallback if the call fails.
const DEFAULT_ROLES: Role[] = [
	{ id: 'patient', label: 'Patient' },
	{ id: 'doctor', label: 'Doctor' },
	{ id: 'ancillary', label: 'Ancillary' },
]

const ROLE_CARD: Record<
	RoleVariant,
	{ title: string; description: string; tone: { bg: string; ink: string }; icon: keyof typeof ICON_PATHS }
> = {
	patient: {
		title: 'Patient',
		description: 'Doctors, lab tests and care at home for you and family',
		tone: TONES.mint,
		icon: 'person',
	},
	doctor: {
		title: 'Doctor',
		description: 'Consult patients in your clinic or on video',
		tone: TONES.sky,
		icon: 'doctor',
	},
	provider: {
		title: 'Healthcare provider',
		description: 'Nurse, physio, care attendant or rehab · home visits',
		tone: TONES.peach,
		icon: 'home',
	},
}

type RoleSelectionProps = AuthScreenProps<typeof ROUTES.AUTH.ROLE_SELECTION>

export default function RoleSelectionScreen({ navigation }: RoleSelectionProps) {
	const [roles, setRoles] = useState<Role[]>(DEFAULT_ROLES)
	const [loading, setLoading] = useState(true)
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [kind, setKind] = useState<string | null>(null)

	useEffect(() => {
		const fetchRoles = async () => {
			try {
				const res = await getRoles()
				if (res.success && Array.isArray(res.data) && res.data.length > 0) {
					setRoles(res.data)
				}
			} catch (error) {
				console.error('Error fetching roles:', error)
				setRoles(DEFAULT_ROLES)
			} finally {
				setLoading(false)
			}
		}
		fetchRoles()
	}, [])

	const selected = roles.find((r) => r.id === selectedId)
	const isProvider = !!selected && roleVariant(selected.id, selected.label) === 'provider'
	const ready = !!selected && (!isProvider || !!kind)

	const handleContinue = async () => {
		if (!selected || !ready) return
		if (isProvider && kind) {
			try {
				await AsyncStorage.setItem('user_specialty', kind)
			} catch (e) {
				console.log('[RoleSelectionScreen] Failed to save specialty:', e)
			}
		}
		navigation.navigate(ROUTES.AUTH.ONBOARDING, {
			roleLabel: selected.label,
			roleId: selected.id,
			...(isProvider && kind ? { specialty: kind } : {}),
		})
	}

	return (
		<View style={styles.container}>
			<AuthHero
				title="Create your account"
				subtitle="First, tell us how you'll use Karolahealth."
				height={220}
				onBack={() => navigation.navigate(ROUTES.AUTH.LOGIN)}
				backLabel="Go to login"
			/>

			<ScrollView style={styles.flex} contentContainerStyle={styles.main} showsVerticalScrollIndicator={false}>
				<Text style={styles.eyebrow}>I AM A</Text>

				{loading ? (
					<ActivityIndicator size="large" color={APP_COLORS.primary} style={styles.loader} />
				) : (
					<View accessibilityRole="radiogroup" style={styles.cards}>
						{roles.map((role) => {
							const variant = roleVariant(role.id, role.label)
							const card = ROLE_CARD[variant]
							const on = role.id === selectedId
							return (
								<Pressable
									key={role.id}
									onPress={() => {
										setSelectedId(role.id)
										if (variant !== 'provider') setKind(null)
									}}
									accessibilityRole="radio"
									accessibilityState={{ checked: on }}
									style={[
										styles.card,
										{
											backgroundColor: card.tone.bg,
											borderColor: on ? APP_COLORS.primary : 'transparent',
										},
										on && styles.cardOn,
									]}
								>
									<View pointerEvents="none" style={styles.cardCircle} />
									<View style={styles.cardText}>
										<Text style={styles.cardTitle}>{card.title}</Text>
										<Text style={styles.cardDesc}>{card.description}</Text>
									</View>
									<View style={styles.iconCircle}>
										<PathIcon d={ICON_PATHS[card.icon]} size={30} color={card.tone.ink} />
									</View>
									{on ? (
										<View style={styles.selTick}>
											<PathIcon
												d={ICON_PATHS.check}
												size={14}
												color={APP_COLORS.surface}
												strokeWidth={3}
											/>
										</View>
									) : null}
								</Pressable>
							)
						})}
					</View>
				)}

				{isProvider ? (
					<View style={styles.kinds}>
						<Text style={styles.kindsTitle}>What do you do?</Text>
						<View accessibilityRole="radiogroup" style={styles.kindsRow}>
							{PROVIDER_KINDS.map((k) => {
								const on = kind === k.key
								return (
									<Pressable
										key={k.key}
										onPress={() => setKind(k.key)}
										accessibilityRole="radio"
										accessibilityState={{ checked: on }}
										style={[
											styles.chip,
											{
												backgroundColor: on ? APP_COLORS.primary : APP_COLORS.surface,
												borderColor: on ? APP_COLORS.primary : APP_COLORS.border,
											},
										]}
									>
										<Text
											style={[
												styles.chipText,
												{ color: on ? APP_COLORS.surface : APP_COLORS.ink },
											]}
										>
											{k.label}
										</Text>
									</Pressable>
								)
							})}
						</View>
					</View>
				) : null}
			</ScrollView>

			<AuthFooter style={styles.footer}>
				<CtaButton label="Continue" onPress={handleContinue} disabled={!ready} />
				<Text style={styles.login}>
					Already have an account?{' '}
					<Text
						style={styles.loginLink}
						onPress={() => navigation.navigate(ROUTES.AUTH.LOGIN)}
						accessibilityRole="link"
					>
						Log in
					</Text>
				</Text>
			</AuthFooter>
		</View>
	)
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	container: { flex: 1, backgroundColor: APP_COLORS.surface },
	main: { padding: 16, paddingTop: 20, gap: 10 },
	loader: { marginTop: 32 },
	eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: '800', letterSpacing: 0.5, color: APP_COLORS.inkMuted },
	cards: { gap: 12 },
	card: {
		minHeight: 108,
		overflow: 'hidden',
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 18,
		paddingLeft: 20,
		paddingRight: 18,
		borderRadius: 18,
		borderWidth: 2,
	},
	cardOn: {
		shadowColor: APP_COLORS.primary,
		shadowOffset: { width: 0, height: 6 },
		shadowOpacity: 0.2,
		shadowRadius: 16,
		elevation: 4,
	},
	cardCircle: {
		position: 'absolute',
		right: -28,
		bottom: -36,
		width: 140,
		height: 140,
		borderRadius: 70,
		backgroundColor: APP_COLORS.surface,
		opacity: 0.55,
	},
	cardText: { flex: 1, minWidth: 0, gap: 4, paddingRight: 84 },
	cardTitle: { fontSize: 19, lineHeight: 24, fontWeight: '800', color: APP_COLORS.ink },
	cardDesc: { fontSize: 13, lineHeight: 18, color: '#3D5357' },
	iconCircle: {
		position: 'absolute',
		right: 18,
		top: '50%',
		marginTop: -32,
		width: 64,
		height: 64,
		borderRadius: 32,
		backgroundColor: APP_COLORS.surface,
		alignItems: 'center',
		justifyContent: 'center',
		shadowColor: APP_COLORS.shadow,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 12,
		elevation: 2,
	},
	selTick: {
		position: 'absolute',
		right: 12,
		top: 12,
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: APP_COLORS.primary,
		alignItems: 'center',
		justifyContent: 'center',
	},
	kinds: { gap: 8, paddingHorizontal: 4, paddingTop: 6 },
	kindsTitle: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: APP_COLORS.ink },
	kindsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	chip: {
		height: 40,
		paddingHorizontal: 14,
		borderRadius: 10,
		borderWidth: 1.5,
		alignItems: 'center',
		justifyContent: 'center',
	},
	chipText: { fontSize: 14, fontWeight: '700' },
	footer: { paddingHorizontal: 16, borderTopColor: APP_COLORS.divider },
	login: { fontSize: 14, lineHeight: 20, color: APP_COLORS.inkMuted, textAlign: 'center' },
	loginLink: { fontWeight: '800', color: APP_COLORS.primary },
})
