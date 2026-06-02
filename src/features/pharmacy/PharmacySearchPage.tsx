import React, { useEffect, useMemo, useState } from 'react'
import {
	FlatList,
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	SafeAreaView,
	ActivityIndicator,
} from 'react-native'
import axios from 'axios'
import { useNavigation } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'

import AppHeader from '../../components/common/AppHeader'
import Card from '../../components/common/CommonCard'
import { API_ENDPOINTS } from '../../constants/apiUrls'

interface PharmacyOrder {
	id: string
	treatment_id: string
	status: string
	created_at: string
	bill_amount: number

	patient: {
		id: string
		name: string
		avatar_s3_key?: string
	}

	pharmacy: {
		id: string
		name: string
		city?: string
	}
}

const statusStyles: Record<string, { bg: string; text: string }> = {
	Pending: {
		bg: '#FFF1D9',
		text: '#F0A018',
	},
	Collected: {
		bg: '#DFF5E4',
		text: '#43A047',
	},
	Rejected: {
		bg: '#FFE3E7',
		text: '#E74B5B',
	},
	Packed: {
		bg: '#DEE9FF',
		text: '#3F7EE8',
	},
}

const formatDate = (dateString: string) => {
	const date = new Date(dateString)

	return date.toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})
}

const formatTime = (dateString: string) => {
	const date = new Date(dateString)

	return date.toLocaleTimeString('en-IN', {
		hour: '2-digit',
		minute: '2-digit',
	})
}

const formatGroupDate = (dateString: string) => {
	const date = new Date(dateString)

	return date.toLocaleDateString('en-IN', {
		weekday: 'long',
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})
}
const normalizeStatus = (status: string) => {
	if (!status) return 'Pending'

	switch (status.toLowerCase()) {
		case 'pending':
			return 'Pending'

		case 'collected':
			return 'Collected'

		case 'rejected':
			return 'Rejected'

		case 'packed':
			return 'Packed'

		default:
			return 'Pending'
	}
}
const OrderCard = ({ order, onPress }: { order: any; onPress: () => void }) => {
	const status = statusStyles[order.status] || statusStyles.Pending

	return (
		<Card style={styles.orderCard} onPress={onPress}>
			<View style={styles.avatarBox}>
				{order.avatar ? (
					<Image source={{ uri: order.avatar }} style={styles.avatar} />
				) : (
					<MaterialCommunityIcons name="account" size={34} color="#ffffff" />
				)}
			</View>

			<View style={styles.orderInfo}>
				<View style={styles.nameRow}>
					<Text numberOfLines={1} style={styles.patientName}>
						{order.name}
					</Text>

					<Text style={styles.orderId}>({order.orderId})</Text>
				</View>

				<Text numberOfLines={1} style={styles.doctorText}>
					By {order.doctor}
					{order.clinic ? ` - ${order.clinic}` : ''}
				</Text>

				<View style={styles.metaRow}>
					<MaterialCommunityIcons name="calendar-blank-outline" size={10} color="#8b969b" />

					<Text style={styles.metaText}>{order.date}</Text>

					<MaterialCommunityIcons name="clock-time-three-outline" size={10} color="#8b969b" />

					<Text style={styles.metaText}>{order.time}</Text>
				</View>
			</View>

			<View
				style={[
					styles.statusBadge,
					{
						backgroundColor: status.bg,
					},
				]}
			>
				<Text
					style={[
						styles.statusText,
						{
							color: status.text,
						},
					]}
				>
					{order.status}
				</Text>
			</View>

			<MaterialCommunityIcons name="chevron-right" size={24} color="#2E7C86" />
		</Card>
	)
}

export default function PharmacySearchPage() {
	const navigation = useNavigation<any>()

	const [orders, setOrders] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedDate, setSelectedDate] = useState('Date')

	useEffect(() => {
		fetchOrders()
	}, [])

	const fetchOrders = async () => {
		try {
			setLoading(true)

			const response = await axios.get(API_ENDPOINTS.PHARMACY_ORDERS.LIST)

			const apiOrders: PharmacyOrder[] = response?.data?.data || []

			const mappedOrders = apiOrders.map((item) => ({
				id: item.id,

				group: formatGroupDate(item.created_at),

				name: item.patient?.name || 'Unknown Patient',

				orderId: item.treatment_id || item.id.slice(0, 8),

				doctor: item.pharmacy?.name || 'Care & Cure',

				clinic: item.pharmacy?.city || '',

				date: formatDate(item.created_at),

				time: formatTime(item.created_at),

				status: normalizeStatus(item.status),

				avatar: item.patient?.avatar_s3_key || null,

				billAmount: item.bill_amount || 0,

				raw: item,
			}))

			setOrders(mappedOrders)
		} catch (error) {
			console.log('Failed to fetch pharmacy orders:', error)
		} finally {
			setLoading(false)
		}
	}
	const filteredOrders = useMemo(() => {
		const query = searchQuery.trim().toLowerCase()

		if (!query) {
			return orders
		}

		return orders.filter((order) => {
			return (
				order.name?.toLowerCase().includes(query) ||
				order.orderId?.toLowerCase().includes(query) ||
				order.doctor?.toLowerCase().includes(query)
			)
		})
	}, [orders, searchQuery])

	const renderOrder = ({ item, index }: { item: any; index: number }) => {
		const previous = filteredOrders[index - 1]

		const showGroupTitle = !previous || previous.group !== item.group

		return (
			<View>
				{showGroupTitle && <Text style={styles.groupTitle}>{item.group}</Text>}

				<OrderCard
					order={item}
					onPress={() =>
						navigation.navigate('OrderDetails', {
							orderId: item.id,
							order: item.raw,
						})
					}
				/>
			</View>
		)
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<AppHeader
				variant="search"
				location="KR Market"
				onAvatarPress={() => navigation.goBack()}
				isSearchEditable
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
			/>

			<View style={styles.content}>
				<Text style={styles.pageTitle}>List of medicine orders</Text>

				<Text style={styles.label}>Select date:</Text>

				<TouchableOpacity style={styles.dateSelect} activeOpacity={0.8}>
					<Text style={styles.dateText}>{selectedDate}</Text>

					<View style={styles.dateDivider} />

					<MaterialCommunityIcons name="chevron-down" size={20} color="#6d7f86" />
				</TouchableOpacity>

				{loading ? (
					<View
						style={{
							paddingTop: 40,
						}}
					>
						<ActivityIndicator size="large" color="#2E7C86" />
					</View>
				) : (
					<FlatList
						data={filteredOrders}
						keyExtractor={(item) => item.id.toString()}
						renderItem={renderOrder}
						contentContainerStyle={styles.listContent}
						showsVerticalScrollIndicator={false}
						ListEmptyComponent={
							<View style={styles.emptyState}>
								<Text style={styles.emptyTitle}>No orders found</Text>

								<Text style={styles.emptyText}>Try a different patient name or order id.</Text>
							</View>
						}
					/>
				)}
			</View>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: '#f4f4f4',
	},
	content: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	pageTitle: {
		color: '#24292b',
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 12,
	},
	label: {
		color: '#7d868a',
		fontSize: 12,
		marginBottom: 6,
	},
	dateSelect: {
		height: 38,
		borderWidth: 1,
		borderColor: '#2E9CAA',
		borderRadius: 6,
		backgroundColor: '#ffffff',
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
	},
	dateText: {
		flex: 1,
		color: '#236772',
		fontSize: 13,
		paddingHorizontal: 12,
	},
	dateDivider: {
		width: 1,
		height: '100%',
		backgroundColor: '#d8e2e5',
	},
	listContent: {
		paddingBottom: 30,
	},
	groupTitle: {
		color: '#9aa1a5',
		fontSize: 12,
		fontWeight: '500',
		marginBottom: 8,
		marginTop: 4,
	},
	orderCard: {
		paddingHorizontal: 12,
		paddingVertical: 12,
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	avatarBox: {
		width: 50,
		height: 50,
		borderRadius: 8,
		backgroundColor: '#dfe4e6',
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 12,
		overflow: 'hidden',
	},
	avatar: {
		width: '100%',
		height: '100%',
	},
	orderInfo: {
		flex: 1,
		minWidth: 0,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 2,
	},
	patientName: {
		color: '#22292c',
		fontSize: 14,
		fontWeight: '700',
		maxWidth: 100,
	},
	orderId: {
		color: '#2E7C86',
		fontSize: 9,
		fontWeight: '600',
		marginLeft: 4,
	},
	doctorText: {
		color: '#68777d',
		fontSize: 8,
		marginBottom: 4,
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	metaText: {
		color: '#8b969b',
		fontSize: 8,
		marginRight: 6,
	},
	statusBadge: {
		width: 70,
		height: 26,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
	statusText: {
		fontSize: 10,
		fontWeight: '600',
	},
	emptyState: {
		alignItems: 'center',
		paddingVertical: 60,
	},
	emptyTitle: {
		color: '#536167',
		fontSize: 16,
		fontWeight: '700',
	},
	emptyText: {
		color: '#8b969b',
		fontSize: 12,
		marginTop: 6,
	},
})
