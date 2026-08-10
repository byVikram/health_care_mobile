import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { AppTypography, AppStickyFooter } from '../../../../components/common'

const PROCEDURES_LOOKUP = {
	'nursing-care': [
		{ label: 'Injection Administration', rate: '₹299' },
		{ label: 'IV Drip Setup', rate: '₹799' },
		{ label: 'Bandage Dressing', rate: '₹499' },
		{ label: 'ICU Care at Home', rate: '₹2,499' },
	],
	'physiotherapy': [
		{ label: 'Manual Therapy Session', rate: '₹799' },
		{ label: 'Therapeutic Exercise Guidance', rate: '₹599' },
		{ label: 'Post-Op Knee Rehab', rate: '₹899' },
	],
	'rehab-care': [
		{ label: 'Cognitive Rehabilitation', rate: '₹699' },
		{ label: 'Cardiac Rehabilitation', rate: '₹899' },
	],
	'elder-day-care': [
		{ label: 'Daily Activity Monitoring', rate: '₹599' },
		{ label: 'Safety Assessment Check', rate: '₹499' },
	],
}

export default function CapabilitiesTab() {
	const { width } = useWindowDimensions()
	const contentWidth = width >= 768 ? 560 : '100%'

	const [specialty, setSpecialty] = useState('nursing-care')
	const [selected, setSelected] = useState<string[]>([])
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		const loadCapabilities = async () => {
			try {
				setLoading(true)
				const spec = await AsyncStorage.getItem('user_specialty')
				const caps = await AsyncStorage.getItem('ancillary_capabilities')

				if (spec) setSpecialty(spec)
				if (caps) setSelected(JSON.parse(caps))
			} catch (e) {
				console.log(e)
			} finally {
				setLoading(false)
			}
		}
		loadCapabilities()
	}, [])

	const handleSave = async () => {
		if (selected.length === 0) {
			Alert.alert('Error', 'Please select at least one capability service')
			return
		}
		try {
			setSaving(true)
			await AsyncStorage.setItem('ancillary_capabilities', JSON.stringify(selected))
			Alert.alert('Saved', 'Service capabilities saved successfully')
		} catch (e) {
			console.log(e)
			Alert.alert('Error', 'Failed to save capabilities')
		} finally {
			setSaving(false)
		}
	}

	const toggleItem = (label: string) => {
		if (selected.includes(label)) {
			setSelected(selected.filter((item) => item !== label))
		} else {
			setSelected([...selected, label])
		}
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	const items = (PROCEDURES_LOOKUP as any)[specialty] || PROCEDURES_LOOKUP['nursing-care']

	return (
		<View style={styles.root}>
			<ScrollView 
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { width: contentWidth }]}>
					<AppTypography variant="h3" style={styles.title}>
						Clinical Capabilities
					</AppTypography>
					<AppTypography variant="body" style={styles.subtitle}>
						Check the services you are certified to provide at standard clinic rates:
					</AppTypography>

					<View style={styles.list}>
						{items.map((item: any) => {
							const isChecked = selected.includes(item.label)
							return (
								<TouchableOpacity
									key={item.label}
									activeOpacity={0.8}
									onPress={() => toggleItem(item.label)}
									style={[styles.row, isChecked && styles.rowActive]}
								>
									<MaterialCommunityIcons
										name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
										size={22}
										color={isChecked ? '#0c7c7c' : '#6f7979'}
									/>
									<View style={styles.textRow}>
										<Text style={[styles.label, isChecked && styles.labelActive]}>
											{item.label}
										</Text>
										<Text style={styles.rate}>{item.rate}</Text>
									</View>
								</TouchableOpacity>
							)
						})}
					</View>
				</View>
			</ScrollView>
			
			<AppStickyFooter 
				onPress={handleSave}
				loading={saving}
			>
				Save 
			</AppStickyFooter>
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 100,
		alignItems: 'center',
	},
	contentShell: {
		alignSelf: 'center',
	},
	center: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f8fafc',
	},
	title: {
		color: '#191c1d',
		marginBottom: 6,
		fontWeight: '700',
	},
	subtitle: {
		fontSize: 13,
		color: '#62707a',
		lineHeight: 18,
		marginBottom: 20,
	},
	list: {
		gap: 10,
		marginBottom: 20,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ffffff',
		borderWidth: 1,
		borderColor: '#eceeee',
		borderRadius: 8,
		padding: 14,
		gap: 10,
	},
	rowActive: {
		borderColor: '#0c7c7c',
		backgroundColor: 'rgba(12, 124, 124, 0.04)',
	},
	textRow: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	label: {
		fontSize: 14,
		color: '#3f4849',
	},
	labelActive: {
		fontWeight: '700',
		color: '#002021',
	},
	rate: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0c7c7c',
	},
})
