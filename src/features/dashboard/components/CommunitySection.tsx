import React, { useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native'
import { Text, Button } from 'react-native-paper'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

import { listCommunityGroups, CommunityGroup } from '../../../services/communityService'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'

function CommunitySection() {
	const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>()

	const [groups, setGroups] = useState<CommunityGroup[]>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let isMounted = true
		const fetchGroups = async () => {
			setLoading(true)
			try {
				const res = await listCommunityGroups(true)
				if (isMounted && res.success && res.data) {
					setGroups(res.data.slice(0, 3))
				}
			} catch (err) {
				console.error('Error fetching communities for dashboard:', err)
			} finally {
				if (isMounted) setLoading(false)
			}
		}
		fetchGroups()
		return () => {
			isMounted = false
		}
	}, [])

	return (
		<View style={styles.container}>
			<Text variant="titleMedium" style={styles.title}>
				Communities
			</Text>

			{loading ? (
				<ActivityIndicator size="small" color="#0c7c7c" style={{ marginVertical: 16 }} />
			) : groups.length === 0 ? (
				<View style={styles.emptyBox}>
					<Text style={styles.emptyText}>No featured communities available.</Text>
				</View>
			) : (
				groups.map((c) => (
					<TouchableOpacity
						key={c.id}
						activeOpacity={0.8}
						onPress={() => navigation.navigate(ROUTES.STACK.COMMUNITY_FORUM as any)}
						style={styles.card}
					>
						<View style={styles.avatar}>
							<Image
								source={{
									uri: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=200',
								}}
								style={{ width: '100%', height: '100%' }}
							/>
						</View>

						<View style={styles.info}>
							<Text variant="titleSmall">{c.name}</Text>
							<Text variant="labelSmall" style={styles.location}>
								{c.category} • Support Group
							</Text>
						</View>

						<Button
							mode="outlined"
							compact
							textColor="#0c7c7c"
							style={{ borderColor: '#0c7c7c' }}
							onPress={() => navigation.navigate(ROUTES.STACK.COMMUNITY_FORUM as any)}
						>
							View
						</Button>
					</TouchableOpacity>
				))
			)}
		</View>
	)
}

export default React.memo(CommunitySection)

const styles = StyleSheet.create({
	container: {
		marginTop: 12,
	},
	title: {
		textAlign: 'center',
		fontWeight: 'bold',
		marginBottom: 10,
	},
	emptyBox: {
		backgroundColor: '#fff',
		marginHorizontal: 16,
		padding: 16,
		borderRadius: 12,
		alignItems: 'center',
	},
	emptyText: {
		fontSize: 12,
		color: '#666',
	},
	card: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#fff',
		marginHorizontal: 16,
		marginBottom: 8,
		padding: 12,
		borderRadius: 12,
		elevation: 1,
	},
	avatar: {
		width: 44,
		height: 44,
		borderRadius: 22,
		marginRight: 12,
		overflow: 'hidden',
		backgroundColor: '#eee',
	},
	info: {
		flex: 1,
	},
	location: {
		color: '#666',
	},
})
