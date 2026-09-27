// src/features/dashboard/homeChromeIcons.ts
//
// 24x24 stroke paths from the patient Home chrome design (drawer rows, floating tab bar, More services /
// Healthcare at home tiles), rendered with <AppPathIcon d={...} />.
export const HOME_CHROME_PATHS = {
	home: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	careAtHome:
		'M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16M7 20l1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9M2 15l6 6M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.73 2.73 0 0 0 16 4a2.78 2.78 0 0 0-5 1.8c0 1.2.8 2 1.5 2.8L16 12z',
	bookings: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4',
	wallet: 'M4 7h15a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4zM4 7V5.5A1.5 1.5 0 0 1 5.5 4H16v3M15 13.5h2',
	appointments: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
	medicine: 'M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7zM8.5 8.5l7 7',
	lab: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9',
	radiology: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M12 7v10M9 9h6M8.5 12h7M9 15h6',
	homeCare: 'M3 11l9-7 9 7M5 10v10h14V10M12 17.5s-3-1.8-3-4a1.5 1.5 0 0 1 3-.8 1.5 1.5 0 0 1 3 .8c0 2.2-3 4-3 4z',
	treatment: 'M14 3v5h5M6 3h8l5 5v13H6zM9 13h6M9 17h6',
	reminders: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2 2M5 3L2 6M19 3l3 3',
	myWallet: 'M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14.5h.01',
	payments: 'M3 6h18v12H3zM3 10h18M7 15h4',
	help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01',
	settings:
		'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1',
	logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
	close: 'M6 6l12 12M18 6L6 18',
	plus: 'M12 5v14M5 12h14',
	phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
	ambulance: 'M2 7h12v10H2zM14 10h4l3 3v4h-7M6 20a2 2 0 1 0 0-.01M17 20a2 2 0 1 0 0-.01M8 9.5v5M5.5 12h5',
	bloodBank: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM12 11v6M9 14h6',
	icu: 'M3 4h18v12H3zM8 20h8M12 16v4M6 10h3l2-3 2 6 2-3h3',
	allied: 'M4 11h16a8 8 0 0 1-16 0zM9 21h6M12 11V7M12 7c0-2.2 1.8-4 4-4 0 2.2-1.8 4-4 4zM12 8c0-1.7-1.3-3-3-3 0 1.7 1.3 3 3 3z',
	therapeutic:
		'M12 20c-4.4 0-8-3-8-7 3.2 0 6.2 2 8 5 1.8-3 4.8-5 8-5 0 4-3.6 7-8 7zM12 18c-2-3-2-7.5 0-11 2 3.5 2 8 0 11z',
	nursing:
		'M18 2l4 4M17 7l3-3M19 9l-8.7 8.7a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8L14 4M9 11l4 4M5 19l-3 3M14 4l6 6',
	physio: 'M13 5a2 2 0 1 0 0-.01M7 21l3-7 3 2v5M10 14l-1-4 5-1 3 3 3-1',
	rehab: 'M8 3h8M9 3v18M15 3v18M9 11h6M6 21h6M12 21h6',
	equipment: 'M9 5.5a1.5 1.5 0 1 0 0-.01M9 8v5h6l3 6M9 10.5h5M14 17a5 5 0 1 1-6-6',
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
} as const

export type HomeChromeIcon = keyof typeof HOME_CHROME_PATHS
