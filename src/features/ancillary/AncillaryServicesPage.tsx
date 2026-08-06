import React, { useState } from 'react'
import {
	FlatList,
	Image,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { ANCILLARY_MOCK_DATA } from './ancillaryService'
import { ROUTES } from '../../navigation/routes'

export default function AncillaryServicesPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { serviceKey, serviceLabel } = route.params || {}
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [searchQuery, setSearchQuery] = useState('')
	const data = ANCILLARY_MOCK_DATA[serviceKey] || ANCILLARY_MOCK_DATA['nursing-care']

	const handleProcedureSelect = (procedureName: string) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey,
			serviceLabel,
			procedureName,
		})
	}

	const filteredProcedures = data.procedures.filter((p) =>
		p.title.toLowerCase().includes(searchQuery.toLowerCase())
	)

	return (
		<View style={styles.container}>
			{/* Header */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
					<Ionicons name="chevron-back" size={24} color="#16324A" />
				</TouchableOpacity>
				<View style={styles.titleContainer}>
					<Text style={styles.title}>{serviceLabel || 'Nursing Care'}</Text>
					<Text style={styles.subtitle}>{data.subtitle}</Text>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Location Pill Selector */}
				<View style={styles.locationContainer}>
					<Ionicons name="location-outline" size={16} color="#2B6F71" />
					<Text style={styles.locationText}>Hyderabad, Telangana</Text>
					<Ionicons name="chevron-down" size={14} color="#2B6F71" />
				</View>

				{/* Search Bar */}
				<View style={styles.searchBar}>
					<Ionicons name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder={data.searchPlaceholder}
						placeholderTextColor="#94A3B8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
				</View>

				{/* Urgent Assistance Banner */}
				<View style={styles.urgentBanner}>
					<View style={styles.urgentHeader}>
						<Ionicons name="alert-circle" size={22} color="#EF4444" style={styles.urgentIcon} />
						<Text style={styles.urgentTitle}>Need Urgent Assistance?</Text>
					</View>
					<Text style={styles.urgentText}>{data.urgentBannerText}</Text>
					<TouchableOpacity
						style={styles.urgentBtn}
						activeOpacity={0.8}
						onPress={() => handleProcedureSelect('Urgent Visit')}
					>
						<Text style={styles.urgentBtnText}>{data.urgentButtonText}</Text>
					</TouchableOpacity>
				</View>

				{/* Popular Services Section */}
				<Text style={styles.sectionHeader}>Popular Services</Text>
				<FlatList
					data={data.popular}
					horizontal
					showsHorizontalScrollIndicator={false}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.popularList}
					renderItem={({ item }) => (
						<View style={[styles.popularCard, isTablet && styles.popularCardTablet]}>
							<Image source={{ uri: item.imageUrl }} style={styles.popularImage as any} resizeMode="cover" />
							<View style={styles.popularCardContent}>
								<Text style={styles.popularCardTitle}>{item.title}</Text>
								<Text style={styles.popularCardDesc} numberOfLines={2}>
									{item.description}
								</Text>
								<View style={styles.popularCardFooter}>
									<Text style={styles.popularPrice}>From ₹{item.price}</Text>
									<TouchableOpacity
										style={styles.selectBtn}
										onPress={() => handleProcedureSelect(item.title)}
									>
										<Text style={styles.selectBtnText}>Select</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					)}
				/>

				{/* Recommended Section */}
				<Text style={styles.sectionHeader}>Recommended For You</Text>
				<View style={styles.recommendedContainer}>
					{data.recommended.map((item) => (
						<TouchableOpacity
							key={item.id}
							style={styles.recommendedCard}
							activeOpacity={0.85}
							onPress={() => handleProcedureSelect(item.title)}
						>
							<View style={styles.recommendedIconCircle}>
								<Ionicons name={item.iconName as any} size={20} color="#2B6F71" />
							</View>
							<View style={styles.recommendedContent}>
								<Text style={styles.recommendedTitle}>{item.title}</Text>
								<Text style={styles.recommendedDesc}>{item.description}</Text>
							</View>
							<Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
						</TouchableOpacity>
					))}
				</View>

				{/* All Procedures Section */}
				<Text style={styles.sectionHeader}>All Medical Procedures</Text>
				<View style={styles.proceduresList}>
					{filteredProcedures.map((proc) => (
						<View key={proc.id} style={styles.procCard}>
							<View style={styles.procHeader}>
								<Text style={styles.procTitle}>{proc.title}</Text>
								{proc.verified && (
									<View style={styles.verifiedBadge}>
										<Ionicons name="checkmark-circle" size={12} color="#2B6F71" />
										<Text style={styles.verifiedText}>Verified</Text>
									</View>
								)}
							</View>
							<Text style={styles.procDesc}>{proc.description}</Text>
							<View style={styles.procFooter}>
								<View style={styles.procMeta}>
									<Ionicons name="time-outline" size={14} color="#64748B" />
									<Text style={styles.procDuration}>{proc.duration}</Text>
									<Text style={styles.procPrice}> • ₹{proc.price}</Text>
								</View>
								<TouchableOpacity
									style={styles.procSelectBtn}
									onPress={() => handleProcedureSelect(proc.title)}
								>
									<Text style={styles.procSelectBtnText}>Select</Text>
								</TouchableOpacity>
							</View>
						</View>
					))}
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#F8FAFC',
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingTop: 56,
		paddingBottom: 16,
		paddingHorizontal: 16,
		backgroundColor: '#FFFFFF',
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	backBtn: {
		padding: 4,
		marginRight: 12,
	},
	titleContainer: {
		flex: 1,
	},
	title: {
		fontSize: 18,
		fontWeight: '800',
		color: '#16324A',
	},
	subtitle: {
		fontSize: 11,
		color: '#587087',
		fontWeight: '600',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
	},
	locationContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		backgroundColor: '#EAF6F6',
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 6,
		marginBottom: 16,
	},
	locationText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2B6F71',
		marginHorizontal: 4,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		paddingHorizontal: 12,
		height: 48,
		marginBottom: 20,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 13,
		color: '#1E293B',
	},
	urgentBanner: {
		backgroundColor: '#FFF5F5',
		borderWidth: 1,
		borderColor: '#FEE2E2',
		borderRadius: 16,
		padding: 16,
		marginBottom: 24,
	},
	urgentHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	urgentIcon: {
		marginRight: 6,
	},
	urgentTitle: {
		fontSize: 14,
		fontWeight: '800',
		color: '#EF4444',
	},
	urgentText: {
		fontSize: 12,
		color: '#7F1D1D',
		lineHeight: 16,
		fontWeight: '600',
		marginBottom: 14,
	},
	urgentBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 10,
		paddingVertical: 10,
		alignItems: 'center',
	},
	urgentBtnText: {
		color: '#FFFFFF',
		fontSize: 13,
		fontWeight: '700',
	},
	sectionHeader: {
		fontSize: 15,
		fontWeight: '800',
		color: '#16324A',
		marginBottom: 12,
		marginTop: 8,
	},
	popularList: {
		gap: 12,
		paddingBottom: 16,
	},
	popularCard: {
		width: 240,
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#E6EDF2',
		overflow: 'hidden',
		shadowColor: '#12373E',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.03,
		shadowRadius: 6,
		elevation: 1,
	},
	popularCardTablet: {
		width: 320,
	},
	popularImage: {
		width: '100%',
		height: 120,
	},
	popularCardContent: {
		padding: 12,
	},
	popularCardTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 4,
	},
	popularCardDesc: {
		fontSize: 11,
		color: '#587087',
		lineHeight: 14,
		marginBottom: 10,
		minHeight: 28,
	},
	popularCardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	popularPrice: {
		fontSize: 13,
		fontWeight: '800',
		color: '#16324A',
	},
	selectBtn: {
		backgroundColor: '#EAF6F6',
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 12,
	},
	selectBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#2B6F71',
	},
	recommendedContainer: {
		gap: 10,
		marginBottom: 24,
	},
	recommendedCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E6EDF2',
		borderRadius: 14,
		padding: 12,
	},
	recommendedIconCircle: {
		width: 38,
		height: 38,
		borderRadius: 19,
		backgroundColor: '#EAF6F6',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	recommendedContent: {
		flex: 1,
	},
	recommendedTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#16324A',
		marginBottom: 2,
	},
	recommendedDesc: {
		fontSize: 11,
		color: '#587087',
	},
	proceduresList: {
		gap: 12,
	},
	procCard: {
		backgroundColor: '#FFFFFF',
		borderRadius: 16,
		padding: 14,
		borderWidth: 1,
		borderColor: '#E6EDF2',
	},
	procHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	procTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#16324A',
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#EAF6F6',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
	},
	verifiedText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#2B6F71',
		marginLeft: 3,
	},
	procDesc: {
		fontSize: 12,
		color: '#587087',
		lineHeight: 16,
		marginBottom: 12,
	},
	procFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	procMeta: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	procDuration: {
		fontSize: 12,
		color: '#64748B',
		fontWeight: '600',
		marginLeft: 4,
	},
	procPrice: {
		fontSize: 12,
		color: '#16324A',
		fontWeight: '700',
	},
	procSelectBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 8,
		paddingVertical: 6,
		paddingHorizontal: 14,
	},
	procSelectBtnText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#FFFFFF',
	},
})
