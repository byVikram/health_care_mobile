export type RideStatus = 'scheduled' | 'requesting' | 'dispatched' | 'in_transit' | 'completed'

export interface RideEstimate {
	type: 'economy' | 'comfort' | 'medical'
	label: string
	price: number
	eta: number
}

export interface RideBooking {
	id?: string
	appointment_id: string
	pickup_address: string
	dropoff_address: string
	ride_provider: string
	vehicle_type: string
	estimated_fare: number
	is_return_ride: boolean
	status: RideStatus
	wheelchair?: boolean
	assistance?: boolean
	companion?: boolean
	payment_method?: 'pay_now' | 'hospital_bill' | 'insurance'
	driver_name?: string
	driver_phone?: string
	driver_rating?: number
	vehicle_number?: string
	trip_pin?: string
	created_at?: string
}

export interface RideState {
	hasOnward: boolean
	hasReturn: boolean
	onwardStatus: RideStatus | null
	returnStatus: RideStatus | null
	onwardRide?: RideBooking | null
	returnRide?: RideBooking | null
}
