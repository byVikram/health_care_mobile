import React, { useState, useEffect } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native'
import { Text, Card, Switch, useTheme } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import ApiService from '../../../services/apiService'
import { API_ENDPOINTS } from '../../../constants/apiUrls'
import { RideEstimate } from '../../../types/transportation'

export interface PatientAddressOut {
	id: string
	label?: string
	address_line: string
	city: string
	state: string
	pincode: string
	is_default: boolean
}

interface TransportationWidgetProps {
	clinicAddress: string
	needRide: boolean
	setNeedRide: (val: boolean) => void
	selectedRideOption: string | null
	setSelectedRideOption: (val: string | null) => void
	isReturnRideRequested: boolean
	setIsReturnRideRequested: (val: boolean) => void
	appointmentTime?: string
	onRideSelect?: (ride: {
		label: string
		price: number
		address: string
		wheelchair?: boolean
		assistance?: boolean
		companion?: boolean
		paymentMethod?: 'pay_now' | 'hospital_bill' | 'insurance'
	} | null) => void
}

export default function TransportationWidget({
	clinicAddress,
	needRide,
	setNeedRide,
	selectedRideOption,
	setSelectedRideOption,
	isReturnRideRequested,
	setIsReturnRideRequested,
	appointmentTime,
	onRideSelect,
}: TransportationWidgetProps) {
	const theme = useTheme()
	const [savedAddresses, setSavedAddresses] = useState<PatientAddressOut[]>([])
	const [selectedAddressId, setSelectedAddressId] = useState<string>('')
	const [customAddress, setCustomAddress] = useState('')
	const [useCustomAddress, setUseCustomAddress] = useState(false)
	const [estimatesLoading, setEstimatesLoading] = useState(false)
	const [rideEstimates, setRideEstimates] = useState<RideEstimate[]>([])

	const [wheelchair, setWheelchair] = useState(false)
	const [assistance, setAssistance] = useState(false)
	const [companion, setCompanion] = useState(false)
	const [paymentMethod, setPaymentMethod] = useState<'pay_now' | 'hospital_bill' | 'insurance'>('pay_now')

	const getSuggestedPickupTime = (startTimeStr?: string) => {
		if (!startTimeStr) return ''
		const parts = startTimeStr.split(':')
		if (parts.length < 2) return startTimeStr
		const [h, m] = parts
		let hour = parseInt(h, 10) - 1
		if (hour < 0) hour += 24
		const ampm = hour >= 12 ? 'PM' : 'AM'
		const displayHour = hour % 12 || 12
		return `${displayHour}:${m || '00'} ${ampm}`
	}

	useEffect(() => {
		if (needRide && savedAddresses.length === 0) {
			ApiService.get<{ success: boolean; data?: PatientAddressOut[] }>(API_ENDPOINTS.PATIENT.ADDRESSES)
				.then((res) => {
					if (res.data?.data) {
						const addrs = res.data.data
						setSavedAddresses(addrs)
						const def = addrs.find((a) => a.is_default)
						if (def) setSelectedAddressId(def.id)
						else if (addrs.length > 0) setSelectedAddressId(addrs[0].id)
					}
				})
				.catch((err) => console.error('Failed to load patient addresses:', err))
		}
	}, [needRide, savedAddresses.length])

	useEffect(() => {
		if (needRide) {
			setEstimatesLoading(true)
			const timer = setTimeout(() => {
				const basePrice = selectedAddressId ? 180 + (parseInt(selectedAddressId.slice(-1), 16) || 5) * 15 : 220
				const estimates: RideEstimate[] = [
					{ type: 'economy', label: 'Economy Sedan', price: basePrice, eta: 5 },
					{ type: 'comfort', label: 'Comfort SUV', price: basePrice + 120, eta: 7 },
					{ type: 'medical', label: 'Medical Assist Cab', price: basePrice + 200, eta: 12 },
				]
				setRideEstimates(estimates)
				if (!selectedRideOption) {
					setSelectedRideOption('economy')
				}
				setEstimatesLoading(false)
			}, 300)
			return () => clearTimeout(timer)
		} else {
			if (onRideSelect) onRideSelect(null)
		}
	}, [needRide, selectedAddressId, useCustomAddress, customAddress])

	useEffect(() => {
		if (needRide && selectedRideOption && onRideSelect) {
			const est = rideEstimates.find((e) => e.type === selectedRideOption)
			if (est) {
				const activeAddr = useCustomAddress
					? customAddress || 'Custom Location'
					: savedAddresses.find((a) => a.id === selectedAddressId)?.address_line || 'Saved Address'
				onRideSelect({
					label: est.label,
					price: isReturnRideRequested ? est.price * 1.9 : est.price,
					address: activeAddr,
					wheelchair,
					assistance,
					companion,
					paymentMethod,
				})
			}
		}
	}, [
		needRide,
		selectedRideOption,
		rideEstimates,
		isReturnRideRequested,
		selectedAddressId,
		useCustomAddress,
		customAddress,
		wheelchair,
		assistance,
		companion,
		paymentMethod,
	])

	return (
		<Card style={styles.card}>
			<Card.Content>
				<TouchableOpacity
					style={styles.headerRow}
					activeOpacity={0.8}
					onPress={() => setNeedRide(!needRide)}
				>
					<View style={styles.headerLeft}>
						<View style={[styles.headerCheck, needRide && styles.headerCheckActive]}>
							{needRide && <MaterialCommunityIcons name="check" size={14} color="#ffffff" />}
						</View>
						<MaterialCommunityIcons name="car-side" size={24} color="#0c7c7c" style={{ marginLeft: 8 }} />
						<View style={{ marginLeft: 10, flex: 1 }}>
							<Text variant="titleMedium" style={{ fontWeight: 'bold', color: '#101828' }}>
								Book a Cab for Visit
							</Text>
							<Text variant="bodySmall" style={{ color: '#667085' }}>
								Add safe, reliable medical cabs to your hospital appointment.
							</Text>
						</View>
					</View>
				</TouchableOpacity>

				{needRide && (
					<View style={styles.expandContent}>
						{appointmentTime && (
							<View style={styles.pickupBanner}>
								<MaterialCommunityIcons name="clock-outline" size={16} color="#0c7c7c" />
								<Text style={styles.pickupBannerText}>
									Suggested Pickup: {getSuggestedPickupTime(appointmentTime)}
								</Text>
							</View>
						)}

						{/* Pickup Address Selector */}
						<Text style={styles.sectionLabel}>Select Pickup Address</Text>
						{savedAddresses.map((addr) => {
							const isSelected = !useCustomAddress && selectedAddressId === addr.id
							return (
								<TouchableOpacity
									key={addr.id}
									style={[styles.addressCard, isSelected && styles.addressCardSelected]}
									onPress={() => {
										setUseCustomAddress(false)
										setSelectedAddressId(addr.id)
									}}
									activeOpacity={0.8}
								>
									<View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
										{isSelected && <View style={styles.radioDot} />}
									</View>
									<View style={{ flex: 1, marginLeft: 10 }}>
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
											<Text style={styles.addressTag}>{addr.label || 'Home Address'}</Text>
											{addr.is_default && (
												<View style={styles.defaultBadge}>
													<Text style={styles.defaultBadgeText}>Default</Text>
												</View>
											)}
										</View>
										<Text style={styles.addressLineText}>{addr.address_line}</Text>
										<Text style={styles.addressSubText}>
											{addr.city}, {addr.state} - {addr.pincode}
										</Text>
									</View>
								</TouchableOpacity>
							)
						})}

						{/* Custom Address Option */}
						<TouchableOpacity
							style={[styles.addressCard, useCustomAddress && styles.addressCardSelected]}
							onPress={() => setUseCustomAddress(true)}
							activeOpacity={0.8}
						>
							<View style={[styles.radioCircle, useCustomAddress && styles.radioCircleSelected]}>
								{useCustomAddress && <View style={styles.radioDot} />}
							</View>
							<View style={{ flex: 1, marginLeft: 10 }}>
								<Text style={styles.addressTag}>Custom Location</Text>
								<Text style={styles.addressSubText}>Enter a custom pickup location</Text>
							</View>
						</TouchableOpacity>

						{useCustomAddress && (
							<TextInput
								style={styles.customInput}
								placeholder="Enter house no, street, landmark..."
								placeholderTextColor="#94a3b8"
								value={customAddress}
								onChangeText={setCustomAddress}
								multiline
							/>
						)}

						{/* Ride Vehicle Options */}
						<Text style={styles.sectionLabel}>Select Vehicle Option</Text>
						{estimatesLoading ? (
							<ActivityIndicator color="#0c7c7c" style={{ marginVertical: 12 }} />
						) : (
							rideEstimates.map((opt) => {
								const isSelected = selectedRideOption === opt.type
								return (
									<TouchableOpacity
										key={opt.type}
										style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
										onPress={() => setSelectedRideOption(opt.type)}
										activeOpacity={0.8}
									>
										<View
											style={[
												styles.vehicleIconCircle,
												isSelected && { backgroundColor: '#0c7c7c' },
											]}
										>
											<MaterialCommunityIcons
												name={
													opt.type === 'medical' ? 'ambulance' : opt.type === 'comfort' ? 'car-estate' : 'car'
												}
												size={20}
												color={isSelected ? '#ffffff' : '#64748b'}
											/>
										</View>
										<View style={{ marginLeft: 10, flex: 1 }}>
											<Text style={styles.vehicleTitle}>{opt.label}</Text>
											<Text style={styles.vehicleSubtitle}>ETA: {opt.eta} mins • Sanitized Cab</Text>
										</View>
										<Text style={styles.priceText}>
											₹{isReturnRideRequested ? opt.price * 1.9 : opt.price}
										</Text>
									</TouchableOpacity>
								)
							})
						)}

						{/* Special Care & Assistance */}
						<Text style={styles.sectionLabel}>Special Care & Assistance</Text>

						<View style={[styles.careCard, wheelchair && styles.careCardActive]}>
							<View style={styles.careIconCircle}>
								<MaterialCommunityIcons
									name="wheelchair-accessibility"
									size={20}
									color={wheelchair ? '#0c7c7c' : '#64748b'}
								/>
							</View>
							<View style={{ flex: 1, marginHorizontal: 10 }}>
								<Text style={styles.careTitle}>Wheelchair Accessible Vehicle</Text>
								<Text style={styles.careSub}>Ramp or lift equipped vehicle</Text>
							</View>
							<Switch value={wheelchair} onValueChange={setWheelchair} color="#0c7c7c" />
						</View>

						<View style={[styles.careCard, assistance && styles.careCardActive]}>
							<View style={styles.careIconCircle}>
								<MaterialCommunityIcons
									name="account-heart-outline"
									size={20}
									color={assistance ? '#0c7c7c' : '#64748b'}
								/>
							</View>
							<View style={{ flex: 1, marginHorizontal: 10 }}>
								<Text style={styles.careTitle}>Driver Boarding Support</Text>
								<Text style={styles.careSub}>Assistance for walking & seating</Text>
							</View>
							<Switch value={assistance} onValueChange={setAssistance} color="#0c7c7c" />
						</View>

						<View style={[styles.careCard, companion && styles.careCardActive]}>
							<View style={styles.careIconCircle}>
								<MaterialCommunityIcons
									name="shield-account-outline"
									size={20}
									color={companion ? '#0c7c7c' : '#64748b'}
								/>
							</View>
							<View style={{ flex: 1, marginHorizontal: 10 }}>
								<Text style={styles.careTitle}>Caregiver Live Tracking Share</Text>
								<Text style={styles.careSub}>Share trip GPS with emergency contact</Text>
							</View>
							<Switch value={companion} onValueChange={setCompanion} color="#0c7c7c" />
						</View>

						{/* Return Ride Option */}
						<View style={styles.returnRideRow}>
							<Switch
								value={isReturnRideRequested}
								onValueChange={setIsReturnRideRequested}
								color="#0c7c7c"
							/>
							<View style={{ flex: 1, marginLeft: 10 }}>
								<Text style={{ fontWeight: 'bold', fontSize: 13, color: '#101828' }}>
									Include Return Cab Post-Consultation
								</Text>
								<Text style={{ fontSize: 11, color: '#667085', marginTop: 1 }}>
									Return cab is automatically matched post consultation.
								</Text>
							</View>
						</View>
					</View>
				)}
			</Card.Content>
		</Card>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		marginVertical: 10,
		borderWidth: 1,
		borderColor: '#eaecf0',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	headerCheck: {
		width: 22,
		height: 22,
		borderRadius: 6,
		borderWidth: 2,
		borderColor: '#94a3b8',
		justifyContent: 'center',
		alignItems: 'center',
	},
	headerCheckActive: {
		borderColor: '#0c7c7c',
		backgroundColor: '#0c7c7c',
	},
	expandContent: {
		marginTop: 16,
		borderTopWidth: 1,
		borderTopColor: '#f2f4f7',
		paddingTop: 12,
	},
	pickupBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(12, 124, 124, 0.08)',
		padding: 10,
		borderRadius: 8,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: 'rgba(12, 124, 124, 0.2)',
	},
	pickupBannerText: {
		fontSize: 12,
		color: '#0c7c7c',
		fontWeight: 'bold',
		marginLeft: 6,
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '800',
		color: '#344054',
		marginTop: 12,
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	addressCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#eaecf0',
		marginBottom: 6,
		backgroundColor: '#ffffff',
	},
	addressCardSelected: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	radioCircle: {
		width: 18,
		height: 18,
		borderRadius: 9,
		borderWidth: 2,
		borderColor: '#94a3b8',
		justifyContent: 'center',
		alignItems: 'center',
	},
	radioCircleSelected: {
		borderColor: '#0c7c7c',
	},
	radioDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#0c7c7c',
	},
	addressTag: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#101828',
	},
	defaultBadge: {
		backgroundColor: '#e0f2f1',
		paddingHorizontal: 5,
		paddingVertical: 1,
		borderRadius: 4,
	},
	defaultBadgeText: {
		fontSize: 9.5,
		fontWeight: '700',
		color: '#0c7c7c',
	},
	addressLineText: {
		fontSize: 12,
		color: '#344054',
		marginTop: 1,
	},
	addressSubText: {
		fontSize: 10.5,
		color: '#667085',
	},
	customInput: {
		backgroundColor: '#f8fafc',
		borderWidth: 1,
		borderColor: '#cbd5e1',
		borderRadius: 8,
		padding: 10,
		fontSize: 12.5,
		color: '#0f172a',
		marginTop: 4,
		marginBottom: 8,
	},
	vehicleCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#eaecf0',
		marginBottom: 6,
		backgroundColor: '#ffffff',
	},
	vehicleCardSelected: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	vehicleIconCircle: {
		width: 34,
		height: 34,
		borderRadius: 8,
		backgroundColor: '#f1f5f9',
		justifyContent: 'center',
		alignItems: 'center',
	},
	vehicleTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#101828',
	},
	vehicleSubtitle: {
		fontSize: 10.5,
		color: '#667085',
	},
	priceText: {
		fontSize: 14,
		fontWeight: '800',
		color: '#0c7c7c',
	},
	careCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 10,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#eaecf0',
		marginBottom: 6,
		backgroundColor: '#ffffff',
	},
	careCardActive: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	careIconCircle: {
		width: 32,
		height: 32,
		borderRadius: 8,
		backgroundColor: '#f1f5f9',
		justifyContent: 'center',
		alignItems: 'center',
	},
	careTitle: {
		fontSize: 12.5,
		fontWeight: '700',
		color: '#101828',
	},
	careSub: {
		fontSize: 10.5,
		color: '#667085',
	},
	returnRideRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 10,
		padding: 10,
		backgroundColor: '#f0f9ff',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#b9e6fe',
	},
})
