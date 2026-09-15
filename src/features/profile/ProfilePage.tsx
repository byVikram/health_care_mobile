import React from 'react'
import { useAuth } from '../../context/AuthContext'
import DoctorProfileLayout from './doctor/DoctorProfileLayout'
import PatientProfileLayout from './patient/PatientProfileLayout'
import PharmacyProfileLayout from './pharmacy/PharmacyProfileLayout'
import RadiologyProfileLayout from './radiology/RadiologyProfileLayout'
import LaboratoryProfileLayout from './laboratory/LaboratoryProfileLayout'
import AncillaryProfileLayout from './ancillary/AncillaryProfileLayout'

export default function ProfilePage() {
	const { role } = useAuth()

	if (role === 'doctor') {
		return <DoctorProfileLayout />
	}

	if (role === 'pharmacy') {
		return <PharmacyProfileLayout />
	}

	if (role === 'radiology') {
		return <RadiologyProfileLayout />
	}

	if (role === 'laboratory') {
		return <LaboratoryProfileLayout />
	}

	if (role === 'ancillary' || (role as string) === 'nurse') {
		return <AncillaryProfileLayout />
	}

	// Patient Profile acts as default fallback
	return <PatientProfileLayout />
}
