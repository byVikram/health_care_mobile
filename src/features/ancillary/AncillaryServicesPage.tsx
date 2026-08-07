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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { ROUTES } from '../../navigation/routes'

interface PopularCardItem {
	id: string
	title: string
	description: string
	price: string
	image: string
}

interface RecommendedCardItem {
	id: string
	title: string
	description: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
}

interface ProcedureItem {
	id: string
	title: string
	description: string
	duration: string
	price: string
	verified?: boolean
	premium?: boolean
	image: string
}

interface GroupedCategory {
	categoryName: string
	procedures: ProcedureItem[]
}

interface ServiceDetails {
	subtitle: string
	searchPlaceholder: string
	popular: PopularCardItem[]
	recommended: RecommendedCardItem[]
	categories: GroupedCategory[]
}

const NURSING_DATA: ServiceDetails = {
	subtitle: 'Professional nursing services at your doorstep',
	searchPlaceholder: 'Search nursing services (e.g., Injection, Dressing)',
	popular: [
		{
			id: 'n-pop-1',
			title: 'Injection at Home',
			description: 'Safe medication administration by certified RNs.',
			price: '₹299',
			image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=260',
		},
		{
			id: 'n-pop-2',
			title: 'Wound Dressing',
			description: 'Professional wound care and bandage changing.',
			price: '₹499',
			image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=260',
		},
		{
			id: 'n-pop-3',
			title: 'IV Therapy',
			description: 'Hospital-like IV fluids and medication at home.',
			price: '₹799',
			image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=260',
		},
		{
			id: 'n-pop-4',
			title: 'Elder Care',
			description: 'Daily assistance & vital monitoring for seniors.',
			price: '₹1299',
			image: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&q=80&w=260',
		},
	],
	recommended: [
		{
			id: 'n-rec-1',
			title: 'Knee Surgery Recovery',
			description: 'Post-op care & physio assist',
			iconName: 'wheelchair-accessibility',
		},
		{
			id: 'n-rec-2',
			title: 'Daily Nursing Visit',
			description: 'Vitals check & medication',
			iconName: 'heart-pulse',
		},
	],
	categories: [
		{
			categoryName: 'Medical Procedures',
			procedures: [
				{
					id: 'n-proc-1',
					title: 'Injection Administration',
					description: 'Intramuscular or intravenous injections by certified nurses.',
					duration: '15-30 mins',
					price: '₹299',
					verified: true,
					image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=260',
				},
				{
					id: 'n-proc-2',
					title: 'IV Drip Setup',
					description: 'Professional setup and monitoring of IV fluids and meds.',
					duration: '60-90 mins',
					price: '₹799',
					image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=260',
				},
			],
		},
		{
			categoryName: 'Wound & Recovery Care',
			procedures: [
				{
					id: 'n-proc-3',
					title: 'Bandage Dressing',
					description: 'Cleaning and dressing of minor to major surgical wounds.',
					duration: '30-45 mins',
					price: '₹499',
					image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=260',
				},
			],
		},
		{
			categoryName: 'Special Care',
			procedures: [
				{
					id: 'n-proc-4',
					title: 'ICU Care at Home',
					description: 'Complete ICU setup with 24/7 dedicated critical care nursing.',
					duration: '12hr / 24hr shifts',
					price: 'Custom Pricing',
					premium: true,
					image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=260',
				},
			],
		},
	],
}

const PHYSIO_DATA: ServiceDetails = {
	subtitle: 'Professional physiotherapy at the comfort of your home',
	searchPlaceholder: 'Search physiotherapy (e.g., Back pain, Joint mobilization)',
	popular: [
		{
			id: 'p-pop-1',
			title: 'Post-Stroke Physio',
			description: 'Targeted mobility rehab to rebuild motor control.',
			price: '₹799',
			image: 'https://images.unsplash.com/photo-1576091160607-21c38dba92c6?auto=format&fit=crop&q=80&w=260',
		},
		{
			id: 'p-pop-2',
			title: 'Sports Injury Rehab',
			description: 'Strengthening and recovery drills for athletes.',
			price: '₹699',
			image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=260',
		},
	],
	recommended: [
		{
			id: 'p-rec-1',
			title: 'Lower Back Pain Care',
			description: 'Spinal decompression exercises.',
			iconName: 'run',
		},
	],
	categories: [
		{
			categoryName: 'Pain Management',
			procedures: [
				{
					id: 'p-proc-1',
					title: 'Manual Therapy Session',
					description: 'Hands-on mobilization, stretching, and soft tissue release.',
					duration: '45 mins',
					price: '₹799',
					verified: true,
					image: 'https://images.unsplash.com/photo-1576091160607-21c38dba92c6?auto=format&fit=crop&q=80&w=260',
				},
				{
					id: 'p-proc-2',
					title: 'Therapeutic Exercise Guidance',
					description: 'Custom exercise routines targeting muscle weakness.',
					duration: '40 mins',
					price: '₹599',
					image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=260',
				},
			],
		},
	],
}

export default function AncillaryServicesPage() {
	const navigation = useNavigation<any>()
	const route = useRoute<any>()
	const { serviceKey, serviceLabel } = route.params || {}
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [searchQuery, setSearchQuery] = useState('')

	const data = serviceKey === 'physiotherapy' ? PHYSIO_DATA : NURSING_DATA

	const handleProcedureSelect = (procedureName: string) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: serviceKey || 'nursing-care',
			serviceLabel: serviceLabel || 'Nursing Care',
			procedureName,
		})
	}

	return (
		<View style={styles.container}>
			{/* Mobile Header bar */}
			<View style={styles.header}>
				<View style={styles.headerRow}>
					<TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
						<Ionicons name="arrow-back" size={24} color="#191c1d" />
					</TouchableOpacity>
					<View style={styles.titleContainer}>
						<Text style={styles.title}>{serviceLabel || 'Nursing Care'}</Text>
						<Text style={styles.subtitle}>{data.subtitle}</Text>
					</View>
				</View>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Emergency Urgent Assistance Card */}
				<View style={styles.urgentBanner}>
					<View style={styles.urgentHeader}>
						<Ionicons name="warning" size={28} color="#ba1a1a" style={styles.urgentIcon} />
						<View style={styles.urgentTextCol}>
							<Text style={styles.urgentTitle}>Need urgent nursing assistance?</Text>
							<Text style={styles.urgentSub}>Available 24/7 for medical emergencies at home.</Text>
						</View>
					</View>
					<TouchableOpacity
						style={styles.urgentBtn}
						activeOpacity={0.8}
						onPress={() => handleProcedureSelect('Urgent Care Response')}
					>
						<Text style={styles.urgentBtnText}>Find Nurse Now</Text>
					</TouchableOpacity>
				</View>

				{/* Popular Nursing Services */}
				<Text style={styles.sectionHeader}>Popular Nursing Services</Text>
				<FlatList
					data={data.popular}
					horizontal
					showsHorizontalScrollIndicator={false}
					keyExtractor={(item) => item.id}
					contentContainerStyle={styles.popularScroll}
					renderItem={({ item }) => (
						<View style={[styles.popularCard, isTablet && styles.popularCardTablet]}>
							<Image source={{ uri: item.image }} style={styles.popularImg as any} resizeMode="cover" />
							<View style={styles.popularContent}>
								<Text style={styles.popularCardTitle} numberOfLines={1}>{item.title}</Text>
								<Text style={styles.popularCardDesc} numberOfLines={2}>{item.description}</Text>
								<View style={styles.popularCardFooter}>
									<Text style={styles.popularPrice}>From {item.price}</Text>
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

				{/* Recommended For You Section */}
				<View style={styles.recommendedWrapper}>
					<View style={styles.recommendedHeader}>
						<Ionicons name="time-outline" size={20} color="#30535a" />
						<Text style={styles.recommendedTitle}>Recommended For You</Text>
					</View>
					<Text style={styles.recommendedSub}>Based on previous searches</Text>
					<View style={[styles.recommendedGrid, isTablet && styles.recommendedGridTablet]}>
						{data.recommended.map((item) => (
							<TouchableOpacity
								key={item.id}
								style={[styles.recommendedCard, { width: isTablet ? '48%' : '100%' }]}
								activeOpacity={0.8}
								onPress={() => handleProcedureSelect(item.title)}
							>
								<View style={styles.recommendedIconCircle}>
									<MaterialCommunityIcons name={item.iconName} size={24} color="#296769" />
								</View>
								<View style={styles.recommendedCardText}>
									<Text style={styles.recCardTitle}>{item.title}</Text>
									<Text style={styles.recCardDesc}>{item.description}</Text>
								</View>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* All Nursing Services grouped list */}
				<Text style={styles.allServicesHeader}>All Nursing Services</Text>
				<View style={styles.categoriesList}>
					{data.categories.map((cat, idx) => (
						<View key={idx} style={styles.categoryBlock}>
							<Text style={styles.categoryName}>{cat.categoryName}</Text>
							<View style={styles.proceduresGrid}>
								{cat.procedures
									.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
									.map((proc) => (
										<View key={proc.id} style={styles.procCard}>
											<Image source={{ uri: proc.image }} style={styles.procImage} resizeMode="cover" />
											<View style={styles.procContentCol}>
												<View style={styles.procHeaderRow}>
													<Text style={styles.procTitle} numberOfLines={1}>{proc.title}</Text>
													{proc.verified && (
														<View style={styles.verifiedBadge}>
															<Ionicons name="checkmark-circle" size={10} color="#055759" />
															<Text style={styles.verifiedText}>Verified</Text>
														</View>
													)}
													{proc.premium && (
														<View style={styles.premiumBadge}>
															<Text style={styles.premiumText}>PREMIUM</Text>
														</View>
													)}
												</View>
												<Text style={styles.procDesc} numberOfLines={2}>{proc.description}</Text>
												<View style={styles.procFooterRow}>
													<View>
														<View style={styles.procTimeRow}>
															<Ionicons name="time-outline" size={12} color="#3f4849" />
															<Text style={styles.procDuration}>{proc.duration}</Text>
														</View>
														<Text style={styles.procPrice}>{proc.price}</Text>
													</View>
													<TouchableOpacity
														style={styles.procBtn}
														onPress={() => handleProcedureSelect(proc.title)}
													>
														<Text style={styles.procBtnText}>{proc.premium ? 'Enquire' : 'Select'}</Text>
													</TouchableOpacity>
												</View>
											</View>
										</View>
									))}
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
		backgroundColor: '#f8fafa',
	},
	header: {
		backgroundColor: '#ffffff',
		paddingTop: 56,
		paddingBottom: 16,
		paddingHorizontal: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#eceeee',
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	backBtn: {
		padding: 4,
		marginRight: 12,
	},
	titleContainer: {
		flex: 1,
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		color: '#191c1d',
	},
	subtitle: {
		fontSize: 12,
		color: '#3f4849',
		fontWeight: '600',
	},
	locationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(5, 87, 89, 0.1)',
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 6,
		gap: 4,
	},
	locationText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#055759',
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#eceeee',
		borderWidth: 1,
		borderColor: '#bfc8c8',
		borderRadius: 24,
		paddingHorizontal: 12,
		height: 48,
		marginBottom: 20,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#191c1d',
	},
	urgentBanner: {
		backgroundColor: '#ffdad6',
		borderWidth: 1,
		borderColor: 'rgba(186, 26, 26, 0.2)',
		borderRadius: 12,
		padding: 16,
		marginBottom: 24,
	},
	urgentHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 14,
	},
	urgentIcon: {
		marginRight: 12,
	},
	urgentTextCol: {
		flex: 1,
	},
	urgentTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#93000a',
	},
	urgentSub: {
		fontSize: 13,
		color: '#93000a',
		opacity: 0.8,
	},
	urgentBtn: {
		backgroundColor: '#2b6f71',
		borderRadius: 20,
		paddingVertical: 12,
		alignItems: 'center',
	},
	urgentBtnText: {
		color: '#ffffff',
		fontSize: 13,
		fontWeight: '700',
	},
	sectionHeader: {
		fontSize: 20,
		fontWeight: '600',
		color: '#191c1d',
		marginBottom: 16,
	},
	popularScroll: {
		gap: 12,
		paddingBottom: 16,
	},
	popularCard: {
		width: 240,
		backgroundColor: '#ffffff',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#bfc8c8',
		overflow: 'hidden',
		elevation: 1,
		shadowColor: '#12373e',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 4,
	},
	popularCardTablet: {
		width: 320,
	},
	popularImg: {
		width: '100%',
		height: 128,
	},
	popularContent: {
		padding: 12,
	},
	popularCardTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191c1d',
		marginBottom: 4,
	},
	popularCardDesc: {
		fontSize: 13,
		color: '#3f4849',
		lineHeight: 18,
		marginBottom: 12,
	},
	popularCardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	popularPrice: {
		fontSize: 13,
		fontWeight: '700',
		color: '#055759',
	},
	selectBtn: {
		backgroundColor: '#adebec',
		borderRadius: 20,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	selectBtnText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#2e6c6e',
	},
	recommendedWrapper: {
		backgroundColor: '#eceeee',
		borderRadius: 12,
		padding: 16,
		borderWidth: 1,
		borderColor: '#bfc8c8',
		marginBottom: 28,
	},
	recommendedHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 4,
	},
	recommendedTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: '#30535a',
	},
	recommendedSub: {
		fontSize: 11,
		color: '#3f4849',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 14,
	},
	recommendedGrid: {
		gap: 12,
	},
	recommendedGridTablet: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
	},
	recommendedCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#bfc8c8',
		borderRadius: 8,
		padding: 12,
		elevation: 1,
	},
	recommendedIconCircle: {
		width: 48,
		height: 48,
		borderRadius: 8,
		backgroundColor: 'rgba(41, 103, 105, 0.1)',
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12,
	},
	recommendedCardText: {
		flex: 1,
	},
	recCardTitle: {
		fontSize: 13,
		fontWeight: '700',
		color: '#191c1d',
		marginBottom: 2,
	},
	recCardDesc: {
		fontSize: 12,
		color: '#3f4849',
	},
	allServicesHeader: {
		fontSize: 20,
		fontWeight: '600',
		color: '#191c1d',
		marginBottom: 24,
	},
	categoriesList: {
		gap: 24,
	},
	categoryBlock: {
		marginBottom: 16,
	},
	categoryName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#191c1d',
		borderBottomWidth: 1,
		borderBottomColor: '#eceeee',
		paddingBottom: 6,
		marginBottom: 16,
	},
	proceduresGrid: {
		gap: 14,
	},
	procCard: {
		flexDirection: 'row',
		backgroundColor: '#ffffff',
		borderRadius: 12,
		padding: 12,
		borderWidth: 1,
		borderColor: '#bfc8c8',
		elevation: 1,
		shadowColor: '#12373e',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	procImage: {
		width: 96,
		height: 96,
		borderRadius: 8,
		marginRight: 12,
	},
	procContentCol: {
		flex: 1,
		justifyContent: 'space-between',
	},
	procHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 4,
	},
	procTitle: {
		fontSize: 14,
		fontWeight: '700',
		color: '#191c1d',
		flex: 1,
		marginRight: 6,
	},
	verifiedBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(5, 87, 89, 0.1)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 4,
		gap: 2,
	},
	verifiedText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#055759',
	},
	premiumBadge: {
		position: 'absolute',
		top: -12,
		right: -12,
		backgroundColor: '#adebec',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderBottomLeftRadius: 8,
	},
	premiumText: {
		fontSize: 9,
		fontWeight: '700',
		color: '#044f51',
	},
	procDesc: {
		fontSize: 12,
		color: '#3f4849',
		lineHeight: 16,
		marginBottom: 8,
	},
	procFooterRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-end',
	},
	procTimeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: 2,
	},
	procDuration: {
		fontSize: 12,
		color: '#3f4849',
	},
	procPrice: {
		fontSize: 13,
		fontWeight: '700',
		color: '#055759',
	},
	procBtn: {
		backgroundColor: '#2b6f71',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
		minHeight: 36,
		minWidth: 80,
		justifyContent: 'center',
		alignItems: 'center',
	},
	procBtnText: {
		color: '#ffffff',
		fontSize: 12,
		fontWeight: '700',
	},
})
