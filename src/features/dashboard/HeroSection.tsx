import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { AppTypography } from '../../components/common';

import EmergencyIcon from '../../assets/quick-services/emergency.svg';
import AmbulanceIcon from '../../assets/quick-services/ambulance.svg';
import BloodBankIcon from '../../assets/quick-services/blood-bank.svg';
import IcuIcon from '../../assets/quick-services/icu.svg';
import AppointmentsIcon from '../../assets/quick-services/appointments.svg';
import PharmacyIcon from '../../assets/quick-services/pharmacy.svg';
import LabIcon from '../../assets/quick-services/lab.svg';
import RadiologyIcon from '../../assets/quick-services/radiology.svg';
import AncilaryIcon from '../../assets/quick-services/ancilary.svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function HeroSection() {
	const [activeAdSlide, setActiveAdSlide] = useState(0);

	const verticalServices = [
		{ title: 'Emergency', Component: EmergencyIcon },
		{ title: 'Ambulance', Component: AmbulanceIcon },
		{ title: 'Blood Bank', Component: BloodBankIcon },
		{ title: 'ICU', Component: IcuIcon },
	];

	const horizontalServices = [
		{ title: 'Appointment', Component: AppointmentsIcon },
		{ title: 'Pharmacy', Component: PharmacyIcon },
		{ title: 'Laboratory', Component: LabIcon },
		{ title: 'Radiology', Component: RadiologyIcon },
		{ title: 'Ancillary', Component: AncilaryIcon },
	];

	return (
		<View style={styles.container}>
			{/* Top Video + Right Services */}
			<View style={styles.topRow}>
				{/* left: Video Slider */}
				<View style={styles.videoBox}>
					<View style={styles.videoImageWrapper}>
						{/* Use require() for local bundled assets */}
						<Image
							source={require('../../assets/blog-and-community/video-image.png')}
							style={styles.videoImage}
						/>
					</View>
					{/* Slider dots */}
					<View style={styles.dotsRow}>
						{[0, 1, 2, 3, 4].map((_, i) => (
							<View key={i} style={[styles.dot, i === 0 ? styles.dotActive : null]} />
						))}
					</View>
				</View>

				{/* right: Vertical services */}
				<View style={styles.verticalServicesBox}>
					{verticalServices.map((s, idx) => (
						<TouchableOpacity
							key={s.title}
							style={[
								styles.vServiceCard,
								idx === verticalServices.length - 1 ? { borderBottomWidth: 0 } : null
							]}
						>
							<s.Component width={28} height={28} />
							<AppTypography style={styles.vServiceTitle}>{s.title}</AppTypography>
						</TouchableOpacity>
					))}
				</View>
			</View>

			{/* Bottom 5 horizontal service icons */}
			<View style={styles.horizontalServicesRow}>
				{horizontalServices.map((s) => (
					<TouchableOpacity key={s.title} style={styles.hServiceCard}>
						<s.Component width={30} height={30} />
						<AppTypography style={styles.hServiceTitle} numberOfLines={1}>{s.title}</AppTypography>
					</TouchableOpacity>
				))}
			</View>

			{/* Ad Slider */}
			<View style={styles.adBox}>
				{/* Placeholder for adImage */}
				<Image
					source={require('../../assets/blog-and-community/ad-image.png')}
					style={styles.adImage}
				/>
				<View style={styles.adDotsRow}>
					{[0, 1, 2].map((_, i) => (
						<TouchableOpacity key={i} onPress={() => setActiveAdSlide(i)}>
							<View style={[styles.adDot, i === activeAdSlide ? styles.adDotActive : null]} />
						</TouchableOpacity>
					))}
				</View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		paddingTop: 16,
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	topRow: {
		flexDirection: 'row',
		gap: 16,
	},
	videoBox: {
		flex: 1,
		flexDirection: 'column',
	},
	videoImageWrapper: {
		borderRadius: 16,
		overflow: 'hidden',
		width: '100%',
		aspectRatio: 1,
	},
	videoImage: {
		width: '100%',
		height: '100%',
		resizeMode: 'cover',
	},
	dotsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		paddingTop: 12,
		gap: 8,
	},
	dot: {
		width: 10,
		height: 10,
		borderRadius: 5,
		backgroundColor: '#d0d0d0',
	},
	dotActive: {
		width: 20,
		backgroundColor: '#0c7c7c',
	},
	verticalServicesBox: {
		display: 'flex',
		flexDirection: 'column',
		paddingTop: 8,
		width: 80,
	},
	vServiceCard: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		paddingBottom: 8,
		marginBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#e0e0e0',
	},
	vServiceTitle: {
		fontSize: 11,
		fontWeight: 'bold',
		color: '#333',
		textAlign: 'center',
		marginTop: 4,
	},
	horizontalServicesRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 16,
	},
	hServiceCard: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		width: 60,
	},
	hServiceTitle: {
		fontSize: 10,
		fontWeight: 'bold',
		color: '#333',
		textAlign: 'center',
		marginTop: 6,
	},
	adBox: {
		backgroundColor: '#fff',
		borderRadius: 16,
		overflow: 'hidden',
		marginTop: 24,
	},
	adImage: {
		width: '100%',
		height: 240, // approx max height
		resizeMode: 'cover',
	},
	adDotsRow: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 8,
		paddingVertical: 12,
	},
	adDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		backgroundColor: '#d0d0d0',
	},
	adDotActive: {
		width: 20,
		backgroundColor: '#0c7c7c',
	}
});
