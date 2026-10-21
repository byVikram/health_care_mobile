// src/features/dashboard/homeTheme.ts
//
// Patient Home redesign: stroke-icon paths (24x24, copied from the "1 · Home" design) and the shared
// section frame used by every Home section (sections sit straight on APP_COLORS.pageBg, 24px apart,
// title row inset 16px).
import type { ViewStyle } from 'react-native'
import type { AppSectionProps } from '../../components/common'

/** AppSection props for a Home section: transparent, no vertical padding, children own their 16px inset. */
export const homeSectionProps = (gap = 10): Pick<AppSectionProps, 'flush' | 'marginTop' | 'gap' | 'style'> => ({
	flush: true,
	marginTop: 0,
	gap,
	style: HOME_SECTION_STYLE,
})

const HOME_SECTION_STYLE: ViewStyle = { backgroundColor: 'transparent', paddingVertical: 0 }

export const HOME_ICONS = {
	// header
	menu: 'M5 7h14M5 12h14M5 17h9',
	bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
	heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
	search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
	mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
	pin: 'M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
	chevronRight: 'M9 6l6 6-6 6',
	// quick actions / care options
	calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
	pill: 'M10.5 20.5a4.95 4.95 0 0 1-7-7l6-6a4.95 4.95 0 0 1 7 7zM8.5 8.5l7 7',
	flask: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3M7.5 15h9',
	scan: 'M4 8V4h4M20 8V4h-4M4 16v4h4M20 16v4h-4M12 7v10M9 9h6M8.5 12h7M9 15h6',
	grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
	video: 'M3 8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM15 10l6-3v10l-6-3',
	// offers
	clipboard: 'M9 3h6v3H9zM8 4.5H6V21h12V4.5h-2M9 11h6M9 15h4',
	syringe: 'M18 2l4 4M17 7l3-3M19 9l-8.7 8.7a2 2 0 0 1-2.8 0l-2.2-2.2a2 2 0 0 1 0-2.8L14 4M9 11l4 4M5 19l-3 3M14 4l6 6',
	// upcoming
	directions: 'M3 11l18-8-8 18-2-8z',
	// symptoms
	skin: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 11h.01M15 11h.01M9.5 15h5M17 3l1 2 2 1-2 1-1 2-1-2-2-1 2-1z',
	child: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM9 12h.01M15 12h.01M9.5 16a3.5 3.5 0 0 0 5 0M12 5c0-1 .8-2 2-2',
	thermometer: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0zM12 10v7',
	brain: 'M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a3 3 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1',
	female: 'M12 3a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 13v8M9 18h6',
	pulse: 'M3 12h4l2-5 4 10 2-5h6',
	// specialities
	tooth: 'M7 3c-2 0-4 2-3.5 5 .4 2.5 1.5 4 1.8 7 .3 3 1 6 2.2 6 1.5 0 1.5-5 3.5-5s2 5 3.5 5c1.2 0 1.9-3 2.2-6 .3-3 1.4-4.5 1.8-7C20 5 18 3 16 3c-1.6 0-2.4 1-4 1S8.6 3 7 3z',
	apple: 'M12 7c-1-2-3-3-5-2-3 1-3 6-1 10 1 2 3 4 4 4s1.5-.5 2-.5 1 .5 2 .5 3-2 4-4c2-4 2-9-1-10-2-1-4 0-5 2zM12 7c0-2 1-4 3-4',
	stethoscope: 'M5 3v5a5 5 0 0 0 10 0V3M10 13v3a4 4 0 0 0 8 0v-3M18 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
	// health reads
	shield: 'M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-4.5',
	drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
	document: 'M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5',
	play: 'M8 5l11 7-11 7z',
	// communities / ask a doctor
	people: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.1a4 4 0 0 1 0 7.8M22 21v-1a6 6 0 0 0-4-5.6',
	chatQuestion: 'M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12zM9.5 10a2.5 2.5 0 1 1 3 2.4c-.5.1-.5.6-.5 1M12 16h.01',
	check: 'M5 12l5 5 9-10',
	plus: 'M12 5v14M5 12h14',
} as const
