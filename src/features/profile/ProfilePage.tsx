import React from 'react'
import { useAuth } from '../../context/AuthContext'
import DoctorProfileLayout from './doctor/DoctorProfileLayout'
import PatientProfileLayout from './patient/PatientProfileLayout'
import PharmacyProfileLayout from './pharmacy/PharmacyProfileLayout'

export default function ProfilePage() {
	const { role } = useAuth()

	if (role === 'doctor') {
		return <DoctorProfileLayout />
	}

	if (role === 'pharmacy') {
		return <PharmacyProfileLayout />
	}

	// Patient Profile acts as default fallback
	return <PatientProfileLayout />
}
