import { StyleSheet } from 'react-native'

export const bookingSearchStyles = StyleSheet.create({
	searchSectionContainer: {
		paddingHorizontal: 16,
		paddingVertical: 12,
		backgroundColor: '#FFFFFF',
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
	},
	searchBar: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 999,
		paddingHorizontal: 14,
		height: 48,
	},
	searchInput: {
		flex: 1,
		height: '100%',
		paddingHorizontal: 12,
		paddingVertical: 0,
		fontSize: 14,
		color: '#111827',
	},
	filterIconButton: {
		width: 48,
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		backgroundColor: '#F8FAFC',
		alignItems: 'center',
		justifyContent: 'center',
		flexShrink: 0,
		padding: 0,
	},
})
