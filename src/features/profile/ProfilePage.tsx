import React from 'react'
import { useAuth } from '../../context/AuthContext'
import RadiologyProfileLayout from './radiology/RadiologyProfileLayout'
import ProfileHubPage from './ProfileHubPage'
import { hubRoleFor } from './config/profileHubConfig'

export default function ProfilePage() {
	const { role } = useAuth()

	// Patient (the default), doctor and ancillary get the redesigned hub.
	const hubRole = hubRoleFor(role)
	if (hubRole) {
		return <ProfileHubPage role={hubRole} />
	}

	if (role === 'radiology') {
		return <RadiologyProfileLayout />
	}

	return null
}
