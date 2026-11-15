// Cities and popular areas behind the "Choose your location" sheet (Patient Dashboard design, "1 · Home").
// `popular` cities fill the 3-column grid; every city is also listed under ALL CITIES. Picking a city opens its
// popular areas (`AREAS`); a city without an entry there gets the "no areas listed yet" message.

export type LocationCity = { name: string; state: string; popular: boolean }

export const CITIES: LocationCity[] = [
	{ name: 'Bengaluru', state: 'Karnataka', popular: true },
	{ name: 'Mysuru', state: 'Karnataka', popular: true },
	{ name: 'Mangaluru', state: 'Karnataka', popular: true },
	{ name: 'Hubballi', state: 'Karnataka', popular: true },
	{ name: 'Chennai', state: 'Tamil Nadu', popular: true },
	{ name: 'Hyderabad', state: 'Telangana', popular: true },
	{ name: 'Belagavi', state: 'Karnataka', popular: false },
	{ name: 'Coimbatore', state: 'Tamil Nadu', popular: false },
	{ name: 'Davanagere', state: 'Karnataka', popular: false },
	{ name: 'Dharwad', state: 'Karnataka', popular: false },
	{ name: 'Hosur', state: 'Tamil Nadu', popular: false },
	{ name: 'Kalaburagi', state: 'Karnataka', popular: false },
	{ name: 'Kochi', state: 'Kerala', popular: false },
	{ name: 'Mumbai', state: 'Maharashtra', popular: false },
	{ name: 'Pune', state: 'Maharashtra', popular: false },
	{ name: 'Shivamogga', state: 'Karnataka', popular: false },
	{ name: 'Tumakuru', state: 'Karnataka', popular: false },
	{ name: 'Udupi', state: 'Karnataka', popular: false },
]

export const POPULAR_CITIES = CITIES.filter((c) => c.popular)

export const CITIES_A_TO_Z = [...CITIES].sort((a, b) => a.name.localeCompare(b.name))

export const AREAS: Record<string, string[]> = {
	Bengaluru: [
		'Indiranagar',
		'Koramangala',
		'Whitefield',
		'HSR Layout',
		'Jayanagar',
		'Malleshwaram',
		'Electronic City',
		'Hebbal',
		'JP Nagar',
		'Marathahalli',
		'Rajajinagar',
		'BTM Layout',
	],
	Mysuru: ['Vijayanagar', 'Gokulam', 'Kuvempunagar', 'Saraswathipuram', 'Jayalakshmipuram'],
	Mangaluru: ['Hampankatta', 'Kadri', 'Bejai', 'Kodialbail', 'Surathkal'],
	Chennai: ['T. Nagar', 'Adyar', 'Anna Nagar', 'Velachery', 'Mylapore', 'Tambaram'],
	Hyderabad: ['Banjara Hills', 'Jubilee Hills', 'Gachibowli', 'Madhapur', 'Kukatpally', 'Secunderabad', 'Kondapur'],
	Mumbai: ['Andheri', 'Bandra', 'Powai', 'Dadar', 'Borivali', 'Colaba', 'Malad', 'Chembur'],
	Pune: ['Kothrud', 'Baner', 'Hinjewadi', 'Viman Nagar', 'Hadapsar', 'Aundh', 'Wakad'],
	Kochi: ['Kakkanad', 'Edappally', 'Vyttila', 'Fort Kochi', 'Kaloor'],
}
