import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Button } from 'react-native-paper'

import Community1 from '../../../assets/blog-and-community/community-1.svg'

const communities = [
	{
		id: 1,
		name: 'Diabetics Associations',
		location: 'Rajajinagar, Bengaluru',
		image: Community1,
	},
	{
		id: 2,
		name: 'Lions Health Club',
		location: 'Koramangala, Bengaluru',
		image: Community1,
	},
]

function CommunitySection() {
	return (
		<View style={styles.container}>
			<Text variant="titleMedium" style={styles.title}>
				Communities
			</Text>

			{communities.map((c) => (
				<View key={c.id} style={styles.card}>
					<View style={styles.avatar}>
						<c.image width="100%" height="100%" />
					</View>

					<View style={styles.info}>
						<Text variant="titleSmall">{c.name}</Text>
						<Text variant="labelSmall" style={styles.location}>
							{c.location}
						</Text>
					</View>

					<Button mode="outlined" compact>
						View
					</Button>
				</View>
			))}
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
