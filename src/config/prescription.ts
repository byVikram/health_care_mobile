// The fixed prescription page (design: summary.html, "7b Visit summary"). The stored image is drawn by the backend
// (app/utils/prescription_image.py) from its PRESCRIPTION_* settings; this file only drives the page the doctor writes
// on, so keep the two in step when the look is changed.

export const PRESCRIPTION_PAGE = {
	/** The design's page, in its own units; every size below is scaled by (real width / designWidth). */
	designWidth: 326,
	designHeight: 461,
	headerColor: '#12373E',
	accentColor: '#2B6F71',
	logoTileColor: '#9FD3D1',
	panelColor: '#F2F7F7',
	borderColor: '#E3EAEB',
	footerText: 'Issued via Karolahealth',
	/** "Valid for N days"; 0 leaves it off. */
	validityDays: 30,
} as const
