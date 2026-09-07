import React, { useState, useMemo } from 'react'
import {
	Image,
	ScrollView,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppBottomSheet, AppTypography } from '../../../components/common'
import { ANCILLARY_MOCK_DATA, AncillaryProvider } from '../ancillaryService'

interface NurseSelectionBottomSheetProps {
	visible: boolean
	onClose: () => void
	onSelectNurse: (nurse: AncillaryProvider) => void
	selectedNurseId?: string
	serviceKey?: string
}

export default function NurseSelectionBottomSheet({
	visible,
	onClose,
	onSelectNurse,
	selectedNurseId,
	serviceKey = 'nursing-care',
}: NurseSelectionBottomSheetProps) {
	const [searchQuery, setSearchQuery] = useState('')

	// Retrieve available providers from ancillary data source
	const providers: AncillaryProvider[] = useMemo(() => {
		const category = ANCILLARY_MOCK_DATA[serviceKey] || ANCILLARY_MOCK_DATA['nursing-care']
		return category?.providers || []
	}, [serviceKey])

	const filteredProviders = useMemo(() => {
		if (!searchQuery.trim()) return providers
		const query = searchQuery.toLowerCase()
		return providers.filter(
			(p) =>
				p.name.toLowerCase().includes(query) ||
				p.credentials.toLowerCase().includes(query) ||
				p.procedures.some((proc) => proc.toLowerCase().includes(query))
		)
	}, [providers, searchQuery])

	return (
		<AppBottomSheet
			visible={visible}
			title="Select a Preferred Nurse"
			onClose={onClose}
			maxHeightRatio={0.85}
			scrollEnabled={false}
		>
			<View style={styles.container}>
				<AppTypography variant="caption" style={styles.subtitle}>
					Choose an available nurse near your location. Their availability will be verified during matching.
				</AppTypography>

				{/* Search Bar */}
				<View style={styles.searchBox}>
					<Ionicons name="search" size={18} color="#64748B" style={styles.searchIcon} />
					<TextInput
						style={styles.searchInput}
						placeholder="Search by nurse name or service..."
						placeholderTextColor="#94A3B8"
						value={searchQuery}
						onChangeText={setSearchQuery}
					/>
					{searchQuery.length > 0 && (
						<TouchableOpacity onPress={() => setSearchQuery('')}>
							<Ionicons name="close-circle" size={18} color="#94A3B8" />
						</TouchableOpacity>
					)}
				</View>

				{/* Provider List */}
				<ScrollView
					style={styles.listContainer}
					contentContainerStyle={styles.listContent}
					showsVerticalScrollIndicator={false}
				>
					{filteredProviders.length > 0 ? (
						filteredProviders.map((nurse) => {
							const isSelected = selectedNurseId === nurse.id

							return (
								<TouchableOpacity
									key={nurse.id}
									style={[styles.nurseCard, isSelected && styles.nurseCardSelected]}
									onPress={() => {
										onSelectNurse(nurse)
										onClose()
									}}
									activeOpacity={0.8}
								>
									<View style={styles.cardHeader}>
										<Image source={{ uri: nurse.avatar }} style={styles.avatar} resizeMode="cover" />
										<View style={styles.nurseInfo}>
											<View style={styles.nameRow}>
												<AppTypography variant="h4" style={styles.nurseName}>
													{nurse.name}
												</AppTypography>
												<View style={styles.credentialsBadge}>
													<AppTypography variant="caption" style={styles.credentialsText}>{nurse.credentials}</AppTypography>
												</View>
											</View>
											<AppTypography variant="caption" style={styles.experienceText}>
												{nurse.experience} yrs exp • {nurse.distance} km away
											</AppTypography>
											<View style={styles.ratingRow}>
												<Ionicons name="star" size={14} color="#F59E0B" />
												<AppTypography variant="caption" style={styles.ratingText}>{nurse.rating}</AppTypography>
												<AppTypography variant="caption" style={styles.reviewsCount}>({nurse.reviewsCount} reviews)</AppTypography>
											</View>
										</View>

										<View style={styles.selectCol}>
											<View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
												{isSelected && <View style={styles.radioInnerCircle} />}
											</View>
										</View>
									</View>

									{/* Badges / Languages */}
									<View style={styles.metaRow}>
										<View style={styles.tag}>
											<Ionicons name="checkmark-circle" size={12} color="#047857" />
											<AppTypography variant="caption" style={styles.tagText}>Verified RN</AppTypography>
										</View>
										<AppTypography variant="caption" style={styles.languagesText}>
											Languages: {nurse.languages.join(', ')}
										</AppTypography>
									</View>

									{/* Procedures supported */}
									{nurse.procedures && nurse.procedures.length > 0 && (
										<AppTypography variant="caption" style={styles.proceduresText} numberOfLines={1}>
											Services: {nurse.procedures.join(' • ')}
										</AppTypography>
									)}
								</TouchableOpacity>
							)
						})
					) : (
						<View style={styles.emptyContainer}>
							<Ionicons name="person-outline" size={40} color="#94A3B8" />
							<AppTypography variant="h4" style={styles.emptyTitle}>
								No Nurses Found
							</AppTypography>
							<AppTypography variant="caption" style={styles.emptyText}>
								No nurse matched your search query. Try clearing the search.
							</AppTypography>
						</View>
					)}
				</ScrollView>
			</View>
		</AppBottomSheet>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 4,
	},
	subtitle: {
		fontSize: 13,
		color: '#64748B',
		marginBottom: 12,
		lineHeight: 18,
	},
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 10,
		paddingHorizontal: 12,
		height: 44,
		marginBottom: 12,
	},
	searchIcon: {
		marginRight: 8,
	},
	searchInput: {
		flex: 1,
		fontSize: 14,
		color: '#1E293B',
	},
	listContainer: {
		maxHeight: 440,
	},
	listContent: {
		paddingBottom: 24,
	},
	nurseCard: {
		backgroundColor: '#FFFFFF',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 12,
		padding: 12,
		marginBottom: 10,
	},
	nurseCardSelected: {
		borderColor: '#0C7C7C',
		backgroundColor: '#F0FDFA',
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	avatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginRight: 12,
	},
	nurseInfo: {
		flex: 1,
	},
	nameRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	nurseName: {
		fontSize: 15,
		fontWeight: '700',
		color: '#0F172A',
		marginRight: 6,
	},
	credentialsBadge: {
		backgroundColor: '#CCFBF1',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
	},
	credentialsText: {
		fontSize: 11,
		fontWeight: '700',
		color: '#0F766E',
	},
	experienceText: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2,
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 2,
	},
	ratingText: {
		fontSize: 12,
		fontWeight: '700',
		color: '#1E293B',
		marginLeft: 4,
	},
	reviewsCount: {
		fontSize: 12,
		color: '#64748B',
		marginLeft: 4,
	},
	selectCol: {
		marginLeft: 8,
	},
	radioButton: {
		width: 22,
		height: 22,
		borderRadius: 11,
		borderWidth: 2,
		borderColor: '#CBD5E1',
		justifyContent: 'center',
		alignItems: 'center',
	},
	radioButtonSelected: {
		borderColor: '#0C7C7C',
	},
	radioInnerCircle: {
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#0C7C7C',
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: '#F1F5F9',
	},
	tag: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#ECFDF5',
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 4,
		marginRight: 8,
	},
	tagText: {
		fontSize: 11,
		fontWeight: '600',
		color: '#047857',
		marginLeft: 3,
	},
	languagesText: {
		fontSize: 12,
		color: '#64748B',
		flex: 1,
	},
	proceduresText: {
		fontSize: 11,
		color: '#64748B',
		marginTop: 4,
	},
	emptyContainer: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	emptyTitle: {
		marginTop: 8,
		fontSize: 16,
		color: '#334155',
	},
	emptyText: {
		fontSize: 13,
		color: '#64748B',
		textAlign: 'center',
		marginTop: 4,
	},
})
