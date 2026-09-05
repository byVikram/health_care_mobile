import AsyncStorage from '@react-native-async-storage/async-storage'
import { RideBooking, RideState, RideStatus } from '../../types/transportation'

export async function getRideState(appointmentId: string): Promise<RideState> {
	try {
		const onwardRaw = await AsyncStorage.getItem(`ride_${appointmentId}`)
		const returnRaw = await AsyncStorage.getItem(`ride_return_${appointmentId}`)

		const onwardRide: RideBooking | null = onwardRaw ? JSON.parse(onwardRaw) : null
		const returnRide: RideBooking | null = returnRaw ? JSON.parse(returnRaw) : null

		return {
			hasOnward: !!onwardRide,
			hasReturn: !!returnRide,
			onwardStatus: onwardRide ? onwardRide.status : null,
			returnStatus: returnRide ? returnRide.status : null,
			onwardRide,
			returnRide,
		}
	} catch (error) {
		console.error('[transportationService] Error fetching ride state:', error)
		return {
			hasOnward: false,
			hasReturn: false,
			onwardStatus: null,
			returnStatus: null,
			onwardRide: null,
			returnRide: null,
		}
	}
}

export async function saveRide(
	appointmentId: string,
	type: 'onward' | 'return',
	ride: RideBooking
): Promise<void> {
	try {
		const storageKey = type === 'return' ? `ride_return_${appointmentId}` : `ride_${appointmentId}`
		await AsyncStorage.setItem(storageKey, JSON.stringify(ride))
		if (type === 'onward') {
			await AsyncStorage.setItem(`ride_${appointmentId}`, JSON.stringify(ride))
		}
	} catch (error) {
		console.error('[transportationService] Error saving ride:', error)
		throw error
	}
}

export async function cancelRide(appointmentId: string, type: 'onward' | 'return'): Promise<void> {
	try {
		const storageKey = type === 'return' ? `ride_return_${appointmentId}` : `ride_${appointmentId}`
		await AsyncStorage.removeItem(storageKey)
	} catch (error) {
		console.error('[transportationService] Error cancelling ride:', error)
		throw error
	}
}

export async function clearRideStorage(appointmentId: string, type: 'onward' | 'return'): Promise<void> {
	await cancelRide(appointmentId, type)
}

export async function clearAllTransportationData(): Promise<void> {
	try {
		const keys = await AsyncStorage.getAllKeys()
		const rideKeys = keys.filter((k) => k.startsWith('ride_'))
		if (rideKeys.length > 0) {
			await AsyncStorage.multiRemove(rideKeys)
		}
	} catch (error) {
		console.error('[transportationService] Error clearing all ride data:', error)
	}
}

export async function advanceRideStatus(
	appointmentId: string,
	type: 'onward' | 'return'
): Promise<RideStatus | null> {
	try {
		const storageKey = type === 'return' ? `ride_return_${appointmentId}` : `ride_${appointmentId}`
		const raw = await AsyncStorage.getItem(storageKey)
		if (!raw) return null

		const ride: RideBooking = JSON.parse(raw)
		const statusOrder: RideStatus[] = ['scheduled', 'requesting', 'dispatched', 'in_transit', 'completed']
		const currentIndex = statusOrder.indexOf(ride.status)
		const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length]

		const updatedRide: RideBooking = {
			...ride,
			status: nextStatus,
			driver_name: nextStatus !== 'scheduled' ? ride.driver_name || (type === 'return' ? 'Amit Mishra' : 'Rajesh Kumar') : undefined,
			driver_phone: nextStatus !== 'scheduled' ? ride.driver_phone || (type === 'return' ? '+91 98765 43211' : '+91 98765 43210') : undefined,
			driver_rating: nextStatus !== 'scheduled' ? ride.driver_rating || (type === 'return' ? 4.8 : 4.9) : undefined,
			vehicle_number: nextStatus !== 'scheduled' ? ride.vehicle_number || (type === 'return' ? 'KA 03 PL 5678' : 'KA 01 MJ 1234') : undefined,
			trip_pin: nextStatus === 'dispatched' ? ride.trip_pin || (type === 'return' ? '8372' : '4829') : undefined,
		}

		await AsyncStorage.setItem(storageKey, JSON.stringify(updatedRide))
		return nextStatus
	} catch (error) {
		console.error('[transportationService] Error advancing ride status:', error)
		return null
	}
}
