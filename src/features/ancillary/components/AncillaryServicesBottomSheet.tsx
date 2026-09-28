import React from 'react'
import {
	Image,
	StyleSheet,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { AppBottomSheet, AppTypography } from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'

export interface AncillaryServicesBottomSheetProps {
	visible: boolean
	onClose: () => void
}

interface AncillaryCategoryItem {
	key: string
	title: string
	image: string
	serviceKey: string
	serviceLabel: string
}

const CATEGORIES: AncillaryCategoryItem[] = [
	{
		key: 'home-care',
		title: 'Home Care',
		image: 'https://images.unsplash.com/photo-1581579438747-1dc8d17bbce4?auto=format&fit=crop&q=80&w=240',
		serviceKey: 'home-care',
		serviceLabel: 'Home Care',
	},
	{
		key: 'nursing',
		title: 'Nursing Care',
		image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=240',
		serviceKey: 'nursing-care',
		serviceLabel: 'Nursing Care',
	},
	{
		key: 'physio',
		title: 'Physiotherapy',
		image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=240',
		serviceKey: 'physiotherapy',
		serviceLabel: 'Physiotherapy',
	},
	{
		key: 'rehab',
		title: 'Rehab Care',
		image: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&q=80&w=240',
		serviceKey: 'rehab-care',
		serviceLabel: 'Rehab Care',
	},
	{
		key: 'equipment',
		title: 'Medical Equipment',
		image: 'https://images.unsplash.com/photo-1576671081837-49000212a370?auto=format&fit=crop&q=80&w=240',
		serviceKey: 'medical-equipment',
		serviceLabel: 'Medical Equipment',
	},
]

export default function AncillaryServicesBottomSheet({
	visible,
	onClose,
}: AncillaryServicesBottomSheetProps) {
	const navigation = useNavigation<any>()
	const { width } = useWindowDimensions()

	const handleCategorySelect = (item: AncillaryCategoryItem) => {
		onClose()
			navigation.navigate(ROUTES.STACK.ANCILLARY_SERVICES, {
			serviceKey: item.serviceKey,
			serviceLabel: item.serviceLabel,
		})
	}

	return (
		<AppBottomSheet
			visible={visible}
			onClose={onClose}
			title="Healthcare Services at Home"
		>
			<View style={styles.container}>
				<View style={styles.gridFourCol}>
					{CATEGORIES.map((cat) => (
						<TouchableOpacity
							key={cat.key}
							style={styles.colItem}
							onPress={() => handleCategorySelect(cat)}
							activeOpacity={0.82}
						>
							<View style={styles.imageWrap}>
								<Image source={{ uri: cat.image }} style={styles.catImage} resizeMode="cover" />
							</View>
							<AppTypography variant="caption" style={styles.catTitle} numberOfLines={2}>
								{cat.title}
							</AppTypography>
						</TouchableOpacity>
					))}
				</View>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 8,
		paddingBottom: 24,
	},
	gridFourCol: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		paddingHorizontal: 4,
	},
	colItem: {
		width: '23%',
		alignItems: 'center',
	},
	imageWrap: {
		width: 64,
		height: 64,
		borderRadius: 18,
		overflow: 'hidden',
		backgroundColor: '#F1F5F9',
		borderWidth: 1,
		borderColor: '#E2E8F0',
	},
	catImage: {
		width: '100%',
		height: '100%',
	},
	catTitle: {
		fontSize: 12,
		fontWeight: '600',
		color: '#0F172A',
		textAlign: 'center',
		marginTop: 6,
		lineHeight: 15,
	},
})
