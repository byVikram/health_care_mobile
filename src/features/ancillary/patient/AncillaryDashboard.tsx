import React, { useState } from 'react'
import {
	Image,
	ImageBackground,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons'
import { ROUTES } from '../../../navigation/routes'

interface ServiceItem {
	key: string
	title: string
	image: string
	routeType: 'stack' | 'main'
	route: string
	params?: any
}

const EXPLORE_SERVICES: ServiceItem[] = [
	{
		key: 'nursing-care',
		title: 'Nursing\nCare',
		image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=150',
		routeType: 'stack',
		route: ROUTES.STACK.ANCILLARY_SERVICES,
		params: { serviceKey: 'nursing-care', serviceLabel: 'Nursing Care' },
	},
	{
		key: 'physiotherapy',
		title: 'Physio-\ntherapy',
		image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=150',
		routeType: 'stack',
		route: ROUTES.STACK.ANCILLARY_SERVICES,
		params: { serviceKey: 'physiotherapy', serviceLabel: 'Physiotherapy' },
	},
	{
		key: 'rehab-care',
		title: 'Rehab\nCare',
		image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=150',
		routeType: 'stack',
		route: ROUTES.STACK.ANCILLARY_SERVICES,
		params: { serviceKey: 'rehab-care', serviceLabel: 'Rehab Care' },
	},
	{
		key: 'medical-equipment',
		title: 'Medical\nEquipment',
		image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&q=80&w=150',
		routeType: 'main',
		route: ROUTES.MAIN.PORTAL,
	},
]

interface PopularItem {
	id: string
	title: string
	rating: string
	reviews: string
	price: string
	image: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
	serviceKey: string
	serviceLabel: string
}

const POPULAR_SERVICES: PopularItem[] = [
	{
		id: 'pop-1',
		title: 'Injection at Home',
		rating: '4.8',
		reviews: '1.2k',
		price: '₹450',
		image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=260',
		iconName: 'needle',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
	},
	{
		id: 'pop-2',
		title: 'Wound Dressing',
		rating: '4.9',
		reviews: '850',
		price: '₹550',
		image: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=260',
		iconName: 'bandage',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
	},
	{
		id: 'pop-3',
		title: 'Blood Collection',
		rating: '4.7',
		reviews: '2.1k',
		price: '₹300',
		image: 'https://images.unsplash.com/photo-1581594693702-fbdc51b2763b?auto=format&fit=crop&q=80&w=260',
		iconName: 'blood-bag',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
	},
]

interface NeedItem {
	title: string
	iconName: keyof typeof MaterialCommunityIcons.glyphMap
	bgColor: string
	iconColor: string
	serviceKey: string
	serviceLabel: string
	procedureName: string
}

const NEEDS: NeedItem[] = [
	{
		title: 'Back Pain',
		iconName: 'wheelchair-accessibility',
		bgColor: '#FEF2F2',
		iconColor: '#EF4444',
		serviceKey: 'physiotherapy',
		serviceLabel: 'Physiotherapy',
		procedureName: 'Manual Therapy Session',
	},
	{
		title: 'Knee Pain',
		iconName: 'run',
		bgColor: '#EFF6FF',
		iconColor: '#3B82F6',
		serviceKey: 'physiotherapy',
		serviceLabel: 'Physiotherapy',
		procedureName: 'Post-Op Knee Rehab',
	},
	{
		title: 'Post Surgery',
		iconName: 'hospital-building',
		bgColor: '#F3E8FF',
		iconColor: '#A855F7',
		serviceKey: 'rehab-care',
		serviceLabel: 'Rehab Care',
		procedureName: 'Cognitive Rehabilitation',
	},
	{
		title: 'Elderly Care',
		iconName: 'human-cane',
		bgColor: '#ECFDF5',
		iconColor: '#10B981',
		serviceKey: 'elder-day-care',
		serviceLabel: 'Elder Day Care',
		procedureName: 'Safety Assessment Check',
	},
]

interface ProfessionalItem {
	name: string
	specialty: string
	exp: string
	rating: string
	reviews: string
	price: string
	distance: string
	avatar: string
	serviceKey: string
	serviceLabel: string
}

const TOP_PROFESSIONALS: ProfessionalItem[] = [
	{
		name: 'Dr. James Wilson',
		specialty: 'Physiotherapist',
		exp: '10y exp',
		rating: '4.9',
		reviews: '120',
		price: '₹850',
		distance: '1.2m',
		avatar: 'https://i.pravatar.cc/150?img=12',
		serviceKey: 'physiotherapy',
		serviceLabel: 'Physiotherapy',
	},
	{
		name: 'Anita Sharma',
		specialty: 'Registered Nurse',
		exp: '8y exp',
		rating: '4.8',
		reviews: '95',
		price: '₹600',
		distance: '2.5m',
		avatar: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=200',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
	},
]

export default function AncillaryDashboard() {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const [searchQuery, setSearchQuery] = useState('')

	const handleServicePress = (item: ServiceItem) => {
		if (item.routeType === 'stack') {
			navigation.navigate(item.route, item.params)
		} else {
			navigation.navigate(item.route)
		}
	}

	const handlePopularBook = (item: PopularItem) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: item.serviceKey,
			serviceLabel: item.serviceLabel,
			procedureName: item.title,
		})
	}

	const handleNeedPress = (item: NeedItem) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: item.serviceKey,
			serviceLabel: item.serviceLabel,
			procedureName: item.procedureName,
		})
	}

	const handleProfessionalBook = (item: ProfessionalItem) => {
		navigation.navigate(ROUTES.STACK.ANCILLARY_PROVIDERS, {
			serviceKey: item.serviceKey,
			serviceLabel: item.serviceLabel,
			procedureName: item.specialty,
		})
	}

	let paddingHorizontal = 16

	if (width >= 1024) {
		paddingHorizontal = 32
	} else if (width >= 768) {
		paddingHorizontal = 24
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[
				styles.content,
				isTablet && styles.scrollContentTablet,
				isTablet ? { paddingHorizontal } : undefined,
			]}
			showsVerticalScrollIndicator={false}
		>

			{/* Promotional Banner */}
			<ImageBackground
				source={{ uri: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=600' }}
				style={[styles.banner, isTablet && styles.bannerTablet]}
				imageStyle={styles.bannerImage}
			>
				<View style={styles.bannerOverlay}>
					<View style={styles.bannerBadge}>
						<Text style={styles.bannerBadgeText}>Premium Care</Text>
					</View>
					<Text style={styles.bannerTitle}>Complete Home Healthcare</Text>
					<TouchableOpacity
						style={styles.bannerBtn}
						activeOpacity={0.9}
						onPress={() => navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, { serviceKey: 'nursing-care', serviceLabel: 'Nursing Care' })}
					>
						<Text style={styles.bannerBtnText}>Book Now</Text>
					</TouchableOpacity>
				</View>
			</ImageBackground>

			{/* Explore Services Horizontal */}
			<View style={styles.sectionHeaderRow}>
				<Text style={styles.sectionTitle}>Explore Services</Text>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exploreScroll}>
				{EXPLORE_SERVICES.map((item) => (
					<TouchableOpacity
						key={item.key}
						style={styles.exploreCard}
						onPress={() => handleServicePress(item)}
						activeOpacity={0.8}
					>
						<View style={styles.exploreIconBox}>
							<Image source={{ uri: item.image }} style={styles.exploreImg} />
						</View>
						<Text style={styles.exploreText}>{item.title}</Text>
					</TouchableOpacity>
				))}
			</ScrollView>

			{/* Popular Near You */}
			<View style={styles.sectionHeaderRow}>
				<Text style={styles.sectionTitle}>Popular Near You</Text>
				<TouchableOpacity>
					<Text style={styles.seeAllText}>See All</Text>
				</TouchableOpacity>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularScroll}>
				{POPULAR_SERVICES.map((item) => (
					<View key={item.id} style={styles.popularCard}>
						<View style={styles.popularImageContainer}>
							<Image source={{ uri: item.image }} style={styles.popularImg} />
							<View style={styles.popularIconBadge}>
								<MaterialCommunityIcons name={item.iconName} size={16} color="#2B6F71" />
							</View>
						</View>
						<View style={styles.popularContent}>
							<Text style={styles.popularTitle} numberOfLines={1}>{item.title}</Text>
							<View style={styles.ratingRow}>
								<Ionicons name="star" size={14} color="#F59E0B" />
								<Text style={styles.ratingNum}>{item.rating}</Text>
								<Text style={styles.reviewsText}> ({item.reviews} reviews)</Text>
							</View>
							<View style={styles.cardFooter}>
								<View>
									<Text style={styles.startsAtLabel}>Starts at</Text>
									<Text style={styles.startsAtPrice}>{item.price}</Text>
								</View>
								<TouchableOpacity style={styles.cardBookBtn} onPress={() => handlePopularBook(item)}>
									<Text style={styles.cardBookBtnText}>Book</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				))}
			</ScrollView>

			{/* Based on Your Needs (Symptom-based) */}
			<Text style={styles.sectionTitle}>Based on Your Needs</Text>
			<View style={styles.needsGrid}>
				{NEEDS.map((item, idx) => (
					<TouchableOpacity
						key={idx}
						style={[styles.needCard, { width: isTablet ? '23%' : '48%' }]}
						activeOpacity={0.8}
						onPress={() => handleNeedPress(item)}
					>
						<View style={[styles.needIconBox, { backgroundColor: item.bgColor }]}>
							<MaterialCommunityIcons name={item.iconName} size={22} color={item.iconColor} />
						</View>
						<Text style={styles.needText} numberOfLines={1}>{item.title}</Text>
					</TouchableOpacity>
				))}
			</View>

			{/* Recommended Professionals */}
			{/* <View style={styles.sectionHeaderRow}>
				<Text style={styles.sectionTitle}>Top Professionals</Text>
				<TouchableOpacity>
					<Text style={styles.seeAllText}>View All</Text>
				</TouchableOpacity>
			</View>
			<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.popularScroll}>
				{TOP_PROFESSIONALS.map((item, idx) => (
					<View key={idx} style={styles.profCard}>
						<View style={styles.profHeader}>
							<Image source={{ uri: item.avatar }} style={styles.profAvatar} />
							<View style={styles.profInfoCol}>
								<Text style={styles.profName} numberOfLines={1}>{item.name}</Text>
								<Text style={styles.profSpecialty}>{item.specialty} • {item.exp}</Text>
								<View style={styles.ratingRow}>
									<Ionicons name="star" size={14} color="#F59E0B" />
									<Text style={styles.ratingNum}>{item.rating}</Text>
									<Text style={styles.reviewsText}> ({item.reviews} reviews)</Text>
								</View>
							</View>
						</View>
						<View style={styles.profFooter}>
							<View>
								<Text style={styles.profFeeLabel}>Consultation Fee</Text>
								<Text style={styles.profFeePrice}>{item.price}<Text style={styles.hrLabel}>/hr</Text></Text>
							</View>
							<View style={styles.profFooterRight}>
								<View style={styles.distanceBadge}>
									<MaterialIcons name="location-on" size={12} color="#2B6F71" />
									<Text style={styles.distanceText}>{item.distance}</Text>
								</View>
								<TouchableOpacity style={styles.cardBookBtn} onPress={() => handleProfessionalBook(item)}>
									<Text style={styles.cardBookBtnText}>Book</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				))}
			</ScrollView> */}

			{/* Healthcare Packages */}
			<Text style={styles.sectionTitle}>Healthcare Packages</Text>
			<View style={[styles.packagesContainer, isTablet && styles.packagesContainerTablet]}>
				<View style={[styles.packageCard, isTablet && styles.packageCardTablet]}>
					<View style={styles.packageHeader}>
						<View style={styles.packageTextCol}>
							<Text style={styles.packageTitle}>Monthly Nursing Care</Text>
							<Text style={styles.packageDesc}>Comprehensive daily care by registered nurses for chronic conditions.</Text>
							<View style={styles.nurseAssignedRow}>
								<Image
									source={{ uri: 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120' }}
									style={styles.nurseAvatarCircle}
								/>
								<View style={styles.nurseInfoCol}>
									<Text style={styles.nurseNameText}>Anita Sharma</Text>
									<Text style={styles.nurseRoleText}>Registered Nurse</Text>
								</View>
							</View>
						</View>
						<View style={styles.packageIconCircle}>
							<MaterialCommunityIcons name="heart-plus" size={24} color="#2B6F71" />
						</View>
					</View>
					<View style={styles.packageFooter}>
						<View>
							<Text style={styles.startsAtLabel}>Starting from</Text>
							<Text style={styles.startsAtPrice}>₹8,990<Text style={styles.hrLabel}>/month</Text></Text>
						</View>
						<TouchableOpacity
							style={styles.packageBtn}
							onPress={() => navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, { serviceKey: 'nursing-care', serviceLabel: 'Nursing Care' })}
						>
							<Text style={styles.packageBtnText}>View Details</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={[styles.packageCard, isTablet && styles.packageCardTablet]}>
					<View style={styles.packageHeader}>
						<View style={styles.packageTextCol}>
							<Text style={styles.packageTitle}>Elder Care Package</Text>
							<Text style={styles.packageDesc}>Assistance with daily activities, medication management, and companionship.</Text>
						</View>
						<View style={styles.packageIconCircle}>
							<MaterialCommunityIcons name="human-cane" size={24} color="#2B6F71" />
						</View>
					</View>
					<View style={styles.packageFooter}>
						<View>
							<Text style={styles.startsAtLabel}>Starting from</Text>
							<Text style={styles.startsAtPrice}>₹5,990<Text style={styles.hrLabel}>/month</Text></Text>
						</View>
						<TouchableOpacity
							style={styles.packageBtn}
							onPress={() => navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, { serviceKey: 'elder-day-care', serviceLabel: 'Elder Day Care' })}
						>
							<Text style={styles.packageBtnText}>View Details</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={[styles.packageCard, isTablet && styles.packageCardTablet]}>
					<View style={styles.packageHeader}>
						<View style={styles.packageTextCol}>
							<Text style={styles.packageTitle}>Post-Surgery Recovery Package</Text>
							<Text style={styles.packageDesc}>Dedicated wound care, mobility support, and vitals monitoring after surgery.</Text>
						</View>
						<View style={styles.packageIconCircle}>
							<MaterialCommunityIcons name="hospital-box-outline" size={24} color="#2B6F71" />
						</View>
					</View>
					<View style={styles.packageFooter}>
						<View>
							<Text style={styles.startsAtLabel}>Starting from</Text>
							<Text style={styles.startsAtPrice}>₹7,490<Text style={styles.hrLabel}>/month</Text></Text>
						</View>
						<TouchableOpacity
							style={styles.packageBtn}
							onPress={() => navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, { serviceKey: 'rehab-care', serviceLabel: 'Rehab Care' })}
						>
							<Text style={styles.packageBtnText}>View Details</Text>
						</TouchableOpacity>
					</View>
				</View>

				<View style={[styles.packageCard, isTablet && styles.packageCardTablet]}>
					<View style={styles.packageHeader}>
						<View style={styles.packageTextCol}>
							<Text style={styles.packageTitle}>Physiotherapy & Rehab Package</Text>
							<Text style={styles.packageDesc}>Personalized physical therapy sessions for injury rehabilitation & pain relief.</Text>
						</View>
						<View style={styles.packageIconCircle}>
							<MaterialCommunityIcons name="run" size={24} color="#2B6F71" />
						</View>
					</View>
					<View style={styles.packageFooter}>
						<View>
							<Text style={styles.startsAtLabel}>Starting from</Text>
							<Text style={styles.startsAtPrice}>₹6,490<Text style={styles.hrLabel}>/month</Text></Text>
						</View>
						<TouchableOpacity
							style={styles.packageBtn}
							onPress={() => navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, { serviceKey: 'physiotherapy', serviceLabel: 'Physiotherapy' })}
						>
							<Text style={styles.packageBtnText}>View Details</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>

		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafa',
	},
	content: {
		paddingTop: 16,
		paddingBottom: 24,
	},
	scrollContentTablet: {
		maxWidth: 1200,
		width: '100%',
		alignSelf: 'center',
	},
	topBar: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 12,
		backgroundColor: '#ffffff',
	},
	helloText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#3f4849',
	},
	locationPill: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 4,
		gap: 2,
	},
	locationLabel: {
		fontSize: 13,
		fontWeight: '800',
		color: '#12373E',
	},
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	iconButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: '#eceeee',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatarButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#bfc8c8',
		overflow: 'hidden',
		justifyContent: 'center',
		alignItems: 'center',
	},
	avatar: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	searchBar: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#bfc8c8',
		borderRadius: 24,
		paddingHorizontal: 14,
		height: 48,
		marginHorizontal: 16,
		marginVertical: 12,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 13,
		color: '#191c1d',
	},
	micButton: {
		backgroundColor: '#2B6F71',
		width: 28,
		height: 28,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
	},
	banner: {
		height: 180,
		borderRadius: 16,
		overflow: 'hidden',
		marginHorizontal: 16,
		marginBottom: 24,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	bannerTablet: {
		height: 240,
	},
	bannerImage: {
		resizeMode: 'cover',
	},
	bannerOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.45)',
		padding: 20,
		justifyContent: 'center',
	},
	bannerBadge: {
		alignSelf: 'flex-start',
		backgroundColor: 'rgba(255, 255, 255, 0.25)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.35)',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 4,
		marginBottom: 8,
	},
	bannerBadgeText: {
		fontSize: 10,
		fontWeight: '800',
		color: '#FFFFFF',
		textTransform: 'uppercase',
	},
	bannerTitle: {
		fontSize: 22,
		fontWeight: '800',
		color: '#FFFFFF',
		marginBottom: 12,
		textShadowColor: 'rgba(0, 0, 0, 0.5)',
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 3,
	},
	bannerBtn: {
		backgroundColor: '#FFFFFF',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
		alignSelf: 'flex-start',
	},
	bannerBtnText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#2B6F71',
	},
	sectionHeaderRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		marginTop: 8,
		marginBottom: 12,
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '800',
		color: '#12373E',
		paddingHorizontal: 16,
		marginTop: 8,
		marginBottom: 12,
	},
	seeAllText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#2B6F71',
	},
	exploreScroll: {
		paddingHorizontal: 16,
		gap: 12,
		paddingBottom: 16,
	},
	exploreCard: {
		alignItems: 'center',
		width: 80,
	},
	exploreIconBox: {
		width: 72,
		height: 72,
		borderRadius: 16,
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#eceeee',
		overflow: 'hidden',
		padding: 2,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	exploreImg: {
		width: '100%',
		height: '100%',
		borderRadius: 12,
		resizeMode: 'cover',
	},
	exploreText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#191c1d',
		textAlign: 'center',
		marginTop: 6,
		lineHeight: 14,
	},
	popularScroll: {
		paddingHorizontal: 16,
		gap: 12,
		paddingBottom: 16,
	},
	popularCard: {
		width: 180,
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#eceeee',
		overflow: 'hidden',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	popularImageContainer: {
		width: '100%',
		height: 96,
		position: 'relative',
	},
	popularContent: {
		padding: 12,
	},
	popularImg: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	popularIconBadge: {
		position: 'absolute',
		top: 8,
		right: 8,
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 1,
	},
	popularTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: '#191c1d',
		marginBottom: 4,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 6,
	},
	ratingNum: {
		fontSize: 11,
		fontWeight: '800',
		color: '#191c1d',
		marginLeft: 4,
	},
	reviewsText: {
		fontSize: 11,
		color: '#3f4849',
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		paddingTop: 8,
		marginTop: 4,
	},
	startsAtLabel: {
		fontSize: 9,
		color: '#3f4849',
		textTransform: 'uppercase',
	},
	startsAtPrice: {
		fontSize: 13,
		fontWeight: '800',
		color: '#2B6F71',
	},
	cardBookBtn: {
		backgroundColor: '#2B6F71',
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	cardBookBtnText: {
		fontSize: 11,
		fontWeight: '800',
		color: '#FFFFFF',
	},
	needsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: 16,
		gap: 12,
		marginBottom: 20,
	},
	needCard: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#eceeee',
		borderRadius: 12,
		padding: 10,
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	needIconBox: {
		width: 40,
		height: 40,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 10,
	},
	needText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#191c1d',
		flex: 1,
	},
	profCard: {
		width: 280,
		backgroundColor: '#ffffff',
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#eceeee',
		padding: 16,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	profHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	profAvatar: {
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: '#eceeee',
		resizeMode: 'cover',
	},
	profInfoCol: {
		flex: 1,
		marginLeft: 14,
	},
	profName: {
		fontSize: 15,
		fontWeight: '800',
		color: '#191c1d',
		marginBottom: 2,
	},
	profSpecialty: {
		fontSize: 12,
		color: '#3f4849',
		marginBottom: 6,
	},
	hrLabel: {
		fontSize: 12,
		fontWeight: 'normal',
		color: '#3f4849',
	},
	profFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	profFeeLabel: {
		fontSize: 12,
		color: '#3f4849',
		marginBottom: 2,
	},
	profFeePrice: {
		fontSize: 20,
		fontWeight: '800',
		color: '#191c1d',
	},
	profFooterRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	distanceBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#E6F2F2',
		borderRadius: 12,
		paddingHorizontal: 8,
		paddingVertical: 6,
		gap: 4,
	},
	distanceText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#2B6F71',
	},
	packagesContainer: {
		paddingHorizontal: 16,
		gap: 12,
		marginBottom: 24,
	},
	packagesContainerTablet: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between',
		gap: 16,
	},
	packageCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		borderWidth: 1,
		borderColor: '#eceeee',
		padding: 16,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 3,
	},
	packageCardTablet: {
		width: '48.8%',
	},
	packageHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	packageTextCol: {
		flex: 1,
		marginRight: 12,
	},
	packageTitle: {
		fontSize: 15,
		fontWeight: '800',
		color: '#191c1d',
		marginBottom: 4,
	},
	packageDesc: {
		fontSize: 13,
		color: '#3f4849',
		lineHeight: 18,
	},
	packageIconCircle: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: 'rgba(43, 111, 113, 0.1)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	packageFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		borderTopWidth: 1,
		borderTopColor: '#eceeee',
		paddingTop: 12,
	},
	packageBtn: {
		borderWidth: 2,
		borderColor: '#2B6F71',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	packageBtnText: {
		fontSize: 13,
		fontWeight: '800',
		color: '#2B6F71',
	},
	recentTitle: {
		fontSize: 13,
		fontWeight: '800',
		color: '#3f4849',
		paddingHorizontal: 16,
		marginTop: 8,
		marginBottom: 12,
	},
	recentScroll: {
		paddingHorizontal: 16,
		gap: 8,
		paddingBottom: 24,
	},
	recentPill: {
		borderWidth: 1,
		borderColor: '#bfc8c8',
		backgroundColor: '#ffffff',
		borderRadius: 20,
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	recentPillText: {
		fontSize: 13,
		fontWeight: '600',
		color: '#191c1d',
	},
	nurseAssignedRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		gap: 8,
	},
	nurseAvatarCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#eceeee',
	},
	nurseInfoCol: {
		justifyContent: 'center',
	},
	nurseNameText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#191c1d',
	},
	nurseRoleText: {
		fontSize: 10,
		color: '#526062',
	},
})
