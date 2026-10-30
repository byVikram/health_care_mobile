// src/features/dashboard/PatientHomeScreen.tsx
//
// The patient's Home ("1 · Home" design), top to bottom; sections are 24px apart. Pulling down refreshes every
// section (each reloads when `refreshToken` changes). The doctor, provider and staff Homes are separate screens, picked
// by role in MainTabNavigator.

import React, { useCallback, useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { useAuth } from '../../context/AuthContext'
import type { SpecialityItem } from '../../types/speciality'
import { getSpecialities } from '../doctor/doctorService'
import AskDoctorSection from './components/AskDoctorSection'
import ConsultSection from './components/ConsultSection'
import HomeCommunitiesSection from './components/HomeCommunitiesSection'
import HomeHealthReadsSection from './components/HomeHealthReadsSection'
import HomeOffersSection from './components/HomeOffersSection'
import HomeScrollView from './components/HomeScrollView'
import PatientUpcomingAppointments from './components/PatientUpcomingAppointments'
import QuickServicesSection from './components/QuickServicesSection'
import ServicesSection from './components/ServiceSection'
import SpecialitySection from './components/SpecialitySection'

export default function PatientHomeScreen() {
	const { role } = useAuth()
	const [refreshing, setRefreshing] = useState(false)
	const [refreshToken, setRefreshToken] = useState(0)

	// Stable reference: PatientUpcomingAppointments has this in its fetch
	// effect's dependency array, so a new function identity on every render
	// (e.g. from an unrelated parent re-render) would re-trigger the fetch.
	const handleAppointmentsRefreshComplete = useCallback(() => setRefreshing(false), [])

	// Specialities fetched once and shared by Care options (count), symptoms and "Book by speciality"
	// (label -> id resolution). Failing soft-fails to [] (sections still render).
	const [specialities, setSpecialities] = useState<SpecialityItem[]>([])
	const [specialitiesLoading, setSpecialitiesLoading] = useState(true)

	useEffect(() => {
		let active = true
		const load = async () => {
			try {
				const res = await getSpecialities()
				if (active && res?.success && Array.isArray(res.data)) setSpecialities(res.data)
			} catch {
				// keep the previous list
			} finally {
				if (active) setSpecialitiesLoading(false)
			}
		}
		void load()
		return () => {
			active = false
		}
	}, [refreshToken])

	const handleRefresh = () => {
		setRefreshing(true)
		setRefreshToken((token) => token + 1)
	}

	return (
		// Header (expanded): 8 + 52 + 6 + 28 + 6 + 48 + 16. Clears the floating tab bar (64 + 16 bottom offset + safe
		// area) like the design's 104px.
		<HomeScrollView
			headerOffset={164}
			topGap={16}
			floatingTabBar
			paleBackground
			refreshing={refreshing}
			onRefresh={handleRefresh}
		>
			<View style={styles.content}>
				<QuickServicesSection role={role} />
				<ServicesSection
					specialityCount={specialities.length || null}
					specialitiesLoading={specialitiesLoading}
					refreshToken={refreshToken}
				/>
				<HomeOffersSection refreshToken={refreshToken} />
				<PatientUpcomingAppointments
					refreshToken={refreshToken}
					onRefreshComplete={handleAppointmentsRefreshComplete}
				/>
				<SpecialitySection specialities={specialities} refreshToken={refreshToken} />
				<ConsultSection specialities={specialities} />
				<HomeHealthReadsSection refreshToken={refreshToken} />
				<HomeCommunitiesSection refreshToken={refreshToken} />
				<AskDoctorSection itemLimit={3} refreshToken={refreshToken} />
			</View>
		</HomeScrollView>
	)
}

const styles = StyleSheet.create({
	content: {
		gap: 24,
	},
})
