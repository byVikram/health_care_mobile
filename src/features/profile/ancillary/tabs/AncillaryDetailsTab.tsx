import React, { useEffect, useState } from 'react'
import {
	ActivityIndicator,
	Alert,
	ScrollView,
	StyleSheet,
	View,
	useWindowDimensions,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AppInput, AppSelect, AppTypography, AppStickyFooter } from '../../../../components/common'

const MOCK_LOCATIONS = [
	{ label: 'Bangalore', value: 'Bangalore' },
	{ label: 'Mumbai', value: 'Mumbai' },
	{ label: 'Delhi', value: 'Delhi' },
	{ label: 'Chennai', value: 'Chennai' },
	{ label: 'Hyderabad', value: 'Hyderabad' },
]

export default function AncillaryDetailsTab() {
	const { width } = useWindowDimensions()
	const contentWidth = width >= 768 ? 560 : '100%'

	const [specialtyLabel, setSpecialtyLabel] = useState('Nursing Care')
	const [license, setLicense] = useState('')
	const [location, setLocation] = useState('Hyderabad')
	const [loading, setLoading] = useState(false)
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		const loadDetails = async () => {
			try {
				setLoading(true)
				const spec = await AsyncStorage.getItem('user_specialty')
				const lic = await AsyncStorage.getItem('ancillary_license')
				const loc = await AsyncStorage.getItem('ancillary_location')

				if (spec) {
					const formatted = spec
						.split('-')
						.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
						.join(' ')
					setSpecialtyLabel(formatted)
				}
				if (lic) setLicense(lic)
				if (loc) setLocation(loc)
			} catch (e) {
				console.log(e)
			} finally {
				setLoading(false)
			}
		}
		loadDetails()
	}, [])

	const handleSave = async () => {
		if (!license) {
			Alert.alert('Error', 'License number cannot be empty')
			return
		}
		try {
			setSaving(true)
			await AsyncStorage.setItem('ancillary_license', license)
			await AsyncStorage.setItem('ancillary_location', location)
			Alert.alert('Saved', 'Ancillary credentials saved successfully')
		} catch (e) {
			console.log(e)
			Alert.alert('Error', 'Failed to save credentials')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="small" color="#0c7c7c" />
			</View>
		)
	}

	return (
		<View style={styles.root}>
			<ScrollView 
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent} 
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				<View style={[styles.contentShell, { width: contentWidth }]}>
					{/* Specialty Read Only */}
					<View style={styles.fieldGroup}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Specialty
						</AppTypography>
						<AppInput 
							value={specialtyLabel} 
							editable={false} 
							style={styles.readOnlyInput} 
							fieldSize="compact"
							noMargin
							dense
						/>
					</View>

					{/* License Number Input */}
					<View style={styles.fieldGroup}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Professional License Number<AppTypography variant="caption" style={styles.requiredMark}> *</AppTypography>
						</AppTypography>
						<AppInput
							placeholder="License Code (e.g. RN-12930)"
							value={license}
							onChangeText={setLicense}
							placeholderTextColor="#9a9a9a"
							fieldSize="compact"
							noMargin
							dense
						/>
					</View>

					{/* Location dropdown */}
					<View style={styles.fieldGroup}>
						<AppTypography variant="caption" style={styles.fieldLabel}>
							Practice Location Base
						</AppTypography>
						<AppSelect
							label=""
							placeholder="Select location"
							options={MOCK_LOCATIONS}
							value={location}
							onSelect={setLocation}
							borderRadius={4}
							borderColor="#eceeee"
							size="compact"
						/>
					</View>
				</View>
			</ScrollView>
			
			<AppStickyFooter 
				onPress={handleSave}
				loading={saving}
			>
				Save Credentials
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
	fieldGroup: {
		marginBottom: 16,
	},
	fieldLabel: {
		fontWeight: '600',
		color: '#1a1a1a',
		marginBottom: 6,
		fontSize: 12,
	},
	requiredMark: {
		color: '#ff4d4f',
	},
	readOnlyInput: {
		backgroundColor: '#f2f4f4',
		color: '#62707a',
	},
})
