import { StyleSheet } from 'react-native'

export const doctorCardStyles = StyleSheet.create({
	card: {
		flex: 1,
		marginHorizontal: 8,
		marginBottom: 16,
		backgroundColor: '#fff',
		borderRadius: 12,
		overflow: 'hidden',
		borderWidth: 1,
		borderColor: '#e8edf0',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
	},
	mobileCard: {
		width: '100%',
		height: 178,
		flex: 0,
		flexDirection: 'row',
		marginHorizontal: 0,
		marginBottom: 16,
		borderRadius: 16,
		borderColor: '#edf1f4',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 8,
		elevation: 2,
	},

	imageContainer: {
		height: 140,
		backgroundColor: '#f0f4f8',
		position: 'relative',
	},
	mobileImageContainer: {
		width: '38%',
		minWidth: 112,
		maxWidth: 136,
		height: '100%',
		backgroundColor: '#dbe7eb',
	},

	image: {
		width: '100%',
		height: '100%',
	},

	badge: {
		position: 'absolute',
		top: 8,
		left: 8,
		backgroundColor: '#00a82d',
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},

	badgeText: {
		color: '#fff',
		fontWeight: 'bold',
		fontSize: 9,
	},

	content: {
		padding: 10,
	},
	mobileContent: {
		flex: 1,
		justifyContent: 'space-between',
		paddingTop: 11,
		paddingRight: 12,
		paddingBottom: 11,
		paddingLeft: 12,
	},

	name: {
		color: '#082b45',
		fontWeight: 'bold',
		fontSize: 14,
		marginBottom: 2,
	},
	mobileName: {
		color: '#071326',
		fontSize: 16,
		lineHeight: 19,
		marginBottom: 1,
	},

	speciality: {
		color: '#5b7282',
		marginBottom: 6,
	},
	mobileSpeciality: {
		fontSize: 13,
		lineHeight: 16,
		marginBottom: 2,
	},

	slotText: {
		color: '#5b7282',
		marginBottom: 8,
	},
	mobileSlotText: {
		color: '#435163',
		fontSize: 12,
		lineHeight: 15,
		fontWeight: '700',
		marginBottom: 5,
	},

	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	mobileInfoRow: {
		marginBottom: 4,
	},

	infoLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},

	infoRight: {
		flexDirection: 'row',
		alignItems: 'center',
	},

	infoText: {
		color: '#5b7282',
		marginLeft: 4,
		fontSize: 10,
	},
	mobileInfoText: {
		color: '#667084',
		fontSize: 11,
		lineHeight: 15,
	},

	infoTextBold: {
		color: '#082b45',
		fontWeight: 'bold',
		fontSize: 11,
	},

	infoTextBoldTeal: {
		color: '#287474',
		fontWeight: 'bold',
		fontSize: 11,
	},

	bookButton: {
		marginTop: 6,
		backgroundColor: '#2b7571',
		borderRadius: 8,
		paddingVertical: 5,
		minHeight: 38,
		justifyContent: 'center',
	},
	mobileBookButton: {
		marginTop: 7,
		borderRadius: 8,
		paddingVertical: 6,
		minHeight: 40,
		justifyContent: 'center',
		backgroundColor: '#1d7473',
	},
	mobileBookButtonLabel: {
		fontSize: 14,
		lineHeight: 18,
		marginVertical: 0,
	},
})
