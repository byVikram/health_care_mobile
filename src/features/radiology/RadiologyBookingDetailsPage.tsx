// src/features/radiology/BookingDetailsRadiologyPage.tsx
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import {
	ScrollView,
	StyleSheet,
	Text,
	View,
	TouchableOpacity,
	Alert,
	RefreshControl,
	TextInput,
	
	Linking,
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons'
import Toast from 'react-native-toast-message'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


import { buildS3Url } from '../../utils/s3Utils'
import { AppSkeleton, AppSelect, StatusModal } from '../../components/common'
import {
	fetchRadiologyBookingDetail,
	// updateRadiologyBookingStatus,
	submitRadiologyBookingQuote,
	verifyRadiologyPrescription,
	confirmRadiologyPayment,
	fetchRadiologyScans,
	type RadiologyBooking,
} from './RadiologyService'
import { useAuth } from '../../context/AuthContext'
import ImageViewerModal from './component/ImageViewerModal'
import DocumentCarousel from './component/DocumentCarousel'


type RouteParams = {
	publicId: string
	booking?: RadiologyBooking
}

const normalizeStatus = (status: string): string => {
	switch (status?.toLowerCase()) {
		case 'pending_quote':
			return 'Pending Quote'
		case 'pending_payment':
			return 'Pending Payment'
		case 'confirmed':
			return 'Confirmed'
		case 'completed':
			return 'Completed'
		case 'cancelled':
		case 'rejected':
			return 'Cancelled'
		default:
			return status || 'Unknown'
	}
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
	'Pending Quote': { bg: '#FFF1D9', text: '#F0A018', dot: '#F0A018' },
	'Pending Payment': { bg: '#FDE7D8', text: '#D9711B', dot: '#D9711B' },
	Confirmed: { bg: '#DEE9FF', text: '#3F7EE8', dot: '#3F7EE8' },
	Completed: { bg: '#DFF5E4', text: '#43A047', dot: '#43A047' },
	Cancelled: { bg: '#FFE3E7', text: '#E74B5B', dot: '#E74B5B' },
}

const formatDisplayDate = (isoDate: string) =>
	new Date(isoDate).toLocaleDateString('en-IN', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	})

const formatDisplayTime = (time: string) => {
	if (!time) return ''
	if (['morning', 'afternoon', 'evening'].includes(time.toLowerCase())) {
		return time.charAt(0).toUpperCase() + time.slice(1).toLowerCase()
	}
	const parts = time.split(':')
	const hours = parseInt(parts[0], 10)
	if (isNaN(hours)) return time
	const minutes = parts[1] || '00'
	const ampm = hours >= 12 ? 'PM' : 'AM'
	const h12 = hours % 12 || 12
	return `${h12}:${minutes} ${ampm}`
}

const formatDateTime = (date: string, time: string) => `${formatDisplayDate(date)} • ${formatDisplayTime(time)}`



// ─── Section Card ─────────────────────────────────────────────────────────────
const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<View style={styles.card}>
		<Text style={styles.cardTitle}>{title}</Text>
		{children}
	</View>
)

// ─── Main Component ──────────────────────────────────────────────────────────
export default function RadiologyBookingDetailsPage() {
	const navigation = useNavigation<any>()
	const route = useRoute()
	const insets = useSafeAreaInsets()
	const {  role } = useAuth()

	const params = route.params as RouteParams | undefined
	const publicId = params?.publicId
	const initialBooking = params?.booking

	const [booking, setBooking] = useState<RadiologyBooking | null>(initialBooking || null)
	const [loading, setLoading] = useState(!initialBooking)
	const [refreshing, setRefreshing] = useState(false)

	// ── UI state ──
	const [finalFee, setFinalFee] = useState('0.00')
	const [selectedAction, setSelectedAction] = useState<string>('')
	const [updating, setUpdating] = useState(false)
	const [statusModal, setStatusModal] = useState<{
		visible: boolean
		status: 'success' | 'error'
		title: string
		description: string
	} | null>(null)

	interface EditedBookingItem {
		id?: number
		radiology_scan_id?: number
		name: string
		price: string
		base_price?: string
	}

	const [editedItems, setEditedItems] = useState<EditedBookingItem[]>([])
	const [centerScans, setCenterScans] = useState<any[]>([])
	const [loadingCenterScans, setLoadingCenterScans] = useState(false)

	useEffect(() => {
		if (booking?.booking_items) {
			const items = booking.booking_items.map((item) => ({
				id: item.id,
				radiology_scan_id: item.radiology_scan?.id,
				name: item.custom_scan_name || item.radiology_scan?.scan_type?.name || 'Scan',
				price:
					item.quoted_price !== null && item.quoted_price !== undefined
						? item.quoted_price.toString()
						: item.radiology_scan?.base_price !== null && item.radiology_scan?.base_price !== undefined
							? item.radiology_scan.base_price.toString()
							: '0',
				base_price:
					item.radiology_scan?.base_price !== null && item.radiology_scan?.base_price !== undefined
						? item.radiology_scan.base_price.toString()
						: '0',
			}))
			setEditedItems(items)
		}
	}, [booking])

	// 5. fetchRadiologyScans — load center's available scan catalogue for quoting
	useEffect(() => {
		if (
			role === 'radiology' &&
			(booking?.status === 'pending_quote' || booking?.status === 'pending_payment') &&
			booking?.radiology_public_id
		) {
			const loadScans = async () => {
				try {
					setLoadingCenterScans(true)
					const scans = await fetchRadiologyScans(booking.radiology_public_id)
					setCenterScans(scans)
				} catch (err) {
					console.error('[RadiologyBookingDetails] failed to load center scans:', err)
				} finally {
					setLoadingCenterScans(false)
				}
			}
			loadScans()
		}
	}, [role, booking?.status, booking?.radiology_public_id])

	const availableScanOptions = useMemo(() => {
		const selectedIds = new Set(editedItems.map((item) => item.radiology_scan_id))
		return centerScans
			.filter((scan) => !selectedIds.has(scan.id))
			.map((scan) => ({
				label: `${scan.scan_type?.name} (₹${scan.base_price || 0})`,
				value: scan.id.toString(),
			}))
	}, [centerScans, editedItems])

	// 7. handleAddScan
	const handleAddScan = (scanIdStr: string) => {
		const scanId = parseInt(scanIdStr, 10)
		const scan = centerScans.find((s) => s.id === scanId)
		if (scan) {
			setEditedItems((prev) => [
				...prev,
				{
					radiology_scan_id: scan.id,
					name: scan.scan_type?.name || 'New Scan',
					price: scan.base_price ? scan.base_price.toString() : '0',
					base_price: scan.base_price ? scan.base_price.toString() : '0',
				},
			])
		}
	}

	// 8. handleDeleteScan
	const handleDeleteScan = (index: number) => {
		setEditedItems((prev) => prev.filter((_, i) => i !== index))
	}

	// 9. computedTotalFee
	const computedTotalFee = useMemo(() => {
		let total = 0
		editedItems.forEach((item) => {
			const val = parseFloat(item.price || '0')
			if (!isNaN(val)) total += val
		})
		return total.toFixed(2)
	}, [editedItems])

	// ── Document viewer state ──
	const [viewerVisible, setViewerVisible] = useState(false)
	const [viewerIndex, setViewerIndex] = useState(0)

	// ── Uploaded documents (from booking.external_prescription_s3_key) ──
	const reportDocUrls = useMemo(() => {
		const urls: string[] = []

		if (booking?.report?.report_pdf_s3_key) {
			const url = buildS3Url(booking.report.report_pdf_s3_key)
			if (url) urls.push(url)
		}

		if (booking?.report?.scan_images_s3_keys) {
			booking.report.scan_images_s3_keys.forEach((key) => {
				const url = buildS3Url(key)
				if (url) urls.push(url)
			})
		}

		return urls
	}, [booking])
	const docUrls = useMemo(() => {
		const urls: string[] = []

		if (booking?.external_prescription_s3_key) {
			const url = buildS3Url(booking.external_prescription_s3_key)

			if (url) {
				urls.push(url)
			}
		}

		return urls
	}, [booking])
	// 1. fetchBooking
	const fetchBooking = useCallback(
		async (isRefresh = false) => {
			if (!publicId) {
				Toast.show({ type: 'error', text1: 'Error', text2: 'No booking ID provided' })
				return
			}
			try {
				isRefresh ? setRefreshing(true) : setLoading(true)
				const data = await fetchRadiologyBookingDetail(publicId)
				setBooking(data)
				if (data?.total_price != null) {
					setFinalFee(data.total_price.toFixed(2))
				}
			} catch (error: any) {
				console.error('[RadiologyBookingDetails] fetch error:', error)
				Toast.show({
					type: 'error',
					text1: 'Error',
					text2: error?.message || 'Failed to load booking details',
				})
			} finally {
				isRefresh ? setRefreshing(false) : setLoading(false)
			}
		},
		[ publicId]
	)

	useEffect(() => {
		if (!initialBooking && publicId) {
			fetchBooking()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [publicId])

	useEffect(() => {
		navigation.setOptions({
			title: 'Booking Details',
			headerBackTitle: 'Back',
		})
	}, [navigation])

	// ── Helpers for calling ──
	const handleCall = (phone: string, label: string) => {
		const cleaned = phone.replace(/\s/g, '')
		if (!cleaned || cleaned === '—') {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Unavailable',
				description: `No phone number on file for ${label}.`,
			})
			return
		}
		Linking.openURL(`tel:${cleaned}`).catch(() =>
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: 'Unable to open phone dialer.',
			})
		)
	}

	// 4. handleVerifyReport
	const handleVerifyReport = async () => {
		if (!booking) return
		setUpdating(true)
		try {
			await verifyRadiologyPrescription(booking.public_id)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'diagnosis Verified',
				description: 'The diagnosis has been successfully verified.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to verify diagnosis.',
			})
		} finally {
			setUpdating(false)
		}
	}

	// 10. handleConfirmBill
	const handleConfirmBill = async () => {
		if (!booking) return

		if (editedItems.length === 0) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'No Scans Selected',
				description: 'Please add at least one scan to the booking.',
			})
			return
		}

		const items = editedItems.map((item) => {
			const price = parseFloat(item.price || '0')
			return {
				booking_item_id: item.id || null,
				radiology_scan_id: item.id ? null : item.radiology_scan_id,
				quoted_price: price,
				custom_scan_name: item.name,
			}
		})

		if (items.some((it) => isNaN(it.quoted_price) || it.quoted_price <= 0)) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Invalid Quote',
				description: 'Please enter a valid positive quote price for all scan items.',
			})
			return
		}

		setUpdating(true)
		try {
			await submitRadiologyBookingQuote( booking.public_id, {
				items,
				prescription_verified: booking.prescription_verified,
				notes: booking.notes || null,
			})

			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Quotation Submitted',
				description: `Quotation of ₹${parseFloat(computedTotalFee).toFixed(2)} submitted successfully.`,
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to submit quotation.',
			})
		} finally {
			setUpdating(false)
		}
	}

	// 11. Upload Reports
	const handleUpload = () => {
		Alert.alert(
			'Upload Medical Report',
			'This would open a file picker. After selecting, upload to S3 and update the booking.',
			[{ text: 'OK' }]
		)
	}

	// 8 (patient). handlePayment
	const handlePayment = async () => {
		if (!booking) return
		setUpdating(true)
		try {
			await confirmRadiologyPayment( booking.public_id)
			setStatusModal({
				visible: true,
				status: 'success',
				title: 'Payment Confirmed',
				description: 'Your payment was successfully confirmed and booking is now scheduled.',
			})
			await fetchBooking()
		} catch (error: any) {
			setStatusModal({
				visible: true,
				status: 'error',
				title: 'Error',
				description: error?.message || 'Failed to complete payment.',
			})
		} finally {
			setUpdating(false)
		}
	}

	// ── Loading ──
	if (loading) {
		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<AppSkeleton width="100%" height={180} borderRadius={16} style={{ marginBottom: 16 }} />
					<AppSkeleton width="100%" height={120} borderRadius={16} style={{ marginBottom: 16 }} />
					<AppSkeleton width="100%" height={100} borderRadius={16} style={{ marginBottom: 16 }} />
				</ScrollView>
			</View>
		)
	}

	if (!booking) {
		return (
			<View style={[styles.container, styles.centerContent]}>
				<MaterialCommunityIcons name="alert-circle-outline" size={48} color="#b0bec5" />
				<Text style={styles.errorTitle}>Booking not found</Text>
				<TouchableOpacity onPress={() => navigation.goBack()} style={styles.goBackButton}>
					<Text style={styles.goBackText}>Go Back</Text>
				</TouchableOpacity>
			</View>
		)
	}

	// ── Derived data ──
	const statusDisplay = normalizeStatus(booking.status)
	const statusStyle = STATUS_STYLES[statusDisplay] || { bg: '#f0f0f0', text: '#555', dot: '#999' }

	const patientName = booking.patient?.name || booking.patient_name || 'N/A'
	const patientAge = booking.patient?.age != null ? String(booking.patient.age) : '—'
	const patientGender = booking.patient?.gender || '—'
	const patientId = booking.public_id ? `#${booking.public_id.slice(0, 8).toUpperCase()}` : 'N/A'
	const patientPhone = booking.patient?.phone || booking.patient_phone || ''
	const radiologyPhone = booking.radiology?.phone || booking.radiology_phone || ''
	const clinicPhone = booking.clinic?.phone || booking.doctor_phone || ''

	const billingStatus = statusDisplay === 'Confirmed' || statusDisplay === 'Completed' ? 'Billed' : 'Pending Review'

	const isPatient = role === 'patient'
	const isQuoteEditable = booking.status === 'pending_quote' || booking.status === 'pending_payment'

	// ═══════════════════════════════════════════════════════════════════════
	// PATIENT VIEW
	// 1.fetchBooking 2.Patient Details 3.Call Radiology 4.Billing Status
	// 5.Scan Items 6.Booking Details 7.View Documents 8.handlePayment
	// ═══════════════════════════════════════════════════════════════════════
	if (isPatient) {
		const isPendingPayment = booking.status === 'pending_payment' && booking.payment_status === 'pending'

		return (
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} />}
				>
					{/* 2 & 3: Patient Details + Call Radiology */}
					<View style={styles.headerCard}>
						<View style={styles.patientHeaderRow}>
							<View style={styles.patientInfo}>
								<Text style={styles.patientNameText}>{patientName}</Text>
								<Text style={styles.patientMeta}>
									Age: {patientAge} • {patientGender} • ID: {patientId}
								</Text>
							</View>
							<View style={styles.actionButtonsRow}>
								<TouchableOpacity
									style={[styles.callBtn, { backgroundColor: '#5C6BC0' }]}
									onPress={() => handleCall(radiologyPhone, 'radiology')}
								>
									<MaterialCommunityIcons name="phone" size={14} color="#fff" />
									<Text style={styles.callBtnText}>Call Radiology</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>

					{/* 4: Billing Status (display only, payment action moved to bottom) */}
					<SectionCard title="Billing Status">
						<View style={styles.billingStatusRow}>
							<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
								<Text style={[styles.statusText, { color: statusStyle.text }]}>{billingStatus}</Text>
							</View>
							<View style={styles.feeRow}>
								<Text style={styles.feeLabel}>Final Radiology Fee: </Text>
								<Text style={styles.feeValue}>
									{booking.total_price != null
										? `₹ ${booking.total_price.toFixed(2)}`
										: 'Awaiting Quote'}
								</Text>
							</View>
						</View>
					</SectionCard>

					{/* 5: Scan Items */}
					<SectionCard title="Scan Items">
						<View style={styles.fileList}>
							{booking.booking_items.map((item, idx) => (
								<View key={idx} style={styles.fileItem}>
									<MaterialCommunityIcons name="radiology-box" size={20} color="#1f5f68" />
									<Text style={styles.fileName}>
										{item.custom_scan_name || item.radiology_scan?.scan_type?.name}
									</Text>
									<Text style={[styles.fileDate, { fontWeight: '700', color: '#1f5f68' }]}>
										{item.quoted_price != null
											? `₹${item.quoted_price.toFixed(2)}`
											: item.radiology_scan?.base_price != null
												? `₹${item.radiology_scan.base_price.toFixed(2)}`
												: 'Awaiting Quote'}
									</Text>
								</View>
							))}
						</View>
					</SectionCard>
					{/* Diagnosis Report */}

					<SectionCard title="Diagnosis Report Documents">
						<DocumentCarousel
							documents={reportDocUrls}
							onImagePress={(idx) => {
								setViewerIndex(idx)
								setViewerVisible(true)
							}}
						/>
					</SectionCard>
					
					{/* 6: Booking Details */}
					<SectionCard title="Booking Details">
						<InfoRow label="Radiology Center" value={booking.radiology_name || 'N/A'} />
						<InfoRow label="Booking Date" value={formatDisplayDate(booking.booking_date)} />
						<InfoRow label="Booking Time" value={formatDisplayTime(booking.booking_time)} />
						<InfoRow label="Status" value={statusDisplay} />
						<InfoRow label="Payment Status" value={booking.payment_status || 'N/A'} />
						{booking.notes && <InfoRow label="Notes" value={booking.notes} />}
					</SectionCard>

					{/* 7: View Documents */}
					<SectionCard title="diagnosis & Referral Document">
						<DocumentCarousel
							documents={docUrls}
							onImagePress={(idx) => {
								setViewerIndex(idx)
								setViewerVisible(true)
							}}
						/>
					</SectionCard>
					{/* 8: handlePayment */}
					{isPendingPayment && (
						<TouchableOpacity
							style={[
								styles.confirmBillBtn,
								{ backgroundColor: '#0c7c7c', alignSelf: 'stretch', alignItems: 'center' },
							]}
							onPress={handlePayment}
							disabled={updating}
						>
							<Text style={styles.confirmBillText}>{updating ? 'Processing...' : 'Pay Now'}</Text>
						</TouchableOpacity>
					)}
				</ScrollView>

				<ImageViewerModal
					visible={viewerVisible}
					images={[...docUrls, ...reportDocUrls]}
					initialIndex={viewerIndex}
					onClose={() => setViewerVisible(false)}
				/>

				{statusModal && (
					<StatusModal
						visible={statusModal.visible}
						status={statusModal.status}
						title={statusModal.title}
						description={statusModal.description}
						submitText="Okay"
						onSubmit={() => setStatusModal(null)}
						onCancel={() => setStatusModal(null)}
					/>
				)}
			</View>
		)
	}

	// ═══════════════════════════════════════════════════════════════════════
	// STAFF / ADMIN VIEW
	// 1.fetchBooking 2.Patient Details 3.View Documents 4.handleVerifyReport
	// 5.fetchRadiologyScans 6.Edit Prices 7.handleAddScan 8.handleDeleteScan
	// 9.computedTotalFee 10.handleConfirmBill 11.Upload Reports 12.QR Scan
	// ═══════════════════════════════════════════════════════════════════════
	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<ScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBooking(true)} />}
			>
				{/* 2: Patient Details */}
				<View style={styles.headerCard}>
					<View style={styles.patientHeaderRow}>
						<View style={styles.patientInfo}>
							<Text style={styles.patientNameText}>{patientName}</Text>
							<Text style={styles.patientMeta}>
								Age: {patientAge} • {patientGender} • ID: {patientId}
							</Text>
						</View>
						<View style={styles.actionButtonsRow}>
							<TouchableOpacity
								style={[styles.callBtn, { backgroundColor: '#2E7C86' }]}
								onPress={() => handleCall(patientPhone, 'patient')}
							>
								<MaterialCommunityIcons name="phone" size={14} color="#fff" />
								<Text style={styles.callBtnText}>Call Patient</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[styles.callBtn, { backgroundColor: '#5C6BC0' }]}
								onPress={() => handleCall(clinicPhone, 'clinic')}
							>
								<MaterialCommunityIcons name="phone" size={14} color="#fff" />
								<Text style={styles.callBtnText}>Call Clinic</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>

				{/* 3: View Diagnosis Documents */}
				<SectionCard title="diagnosis & Referral Document">
					<DocumentCarousel
						documents={docUrls}
						onImagePress={(idx) => {
							setViewerIndex(idx)
							setViewerVisible(true)
						}}
					/>
				</SectionCard>

				{/* 4: handleVerifyReport, 5-10: quote workflow */}
				<SectionCard title="Billing Status">
					<View style={styles.billingStatusRow}>
						<View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
							<Text style={[styles.statusText, { color: statusStyle.text }]}>{billingStatus}</Text>
						</View>
						{isQuoteEditable && (
							<View style={styles.selectActionWrapper}>
								<AppSelect
									placeholder="Select Action"
									options={[{ label: 'Verify diagnosis', value: 'verify' }]}
									value={selectedAction}
									onSelect={(val) => {
										setSelectedAction(val)
										if (val === 'verify') handleVerifyReport()
									}}
									size="form"
									noMargin
									customCardStyle={{ minWidth: 180, borderColor: '#CBD5E1' }}
								/>
							</View>
						)}
					</View>

					{isQuoteEditable ? (
						<View style={styles.quoteFormContainer}>
							<Text style={styles.quoteInstruction}>Review and edit scan items for this booking:</Text>

							{/* 6: Edit Scan Prices (incl. 8: handleDeleteScan per row) */}
							{editedItems.map((item, index) => (
								<View key={index} style={styles.quoteItemRow}>
									<View style={styles.quoteItemLeft}>
										<Text style={styles.quoteItemName} numberOfLines={2}>
											{item.name}
										</Text>
										{item.base_price !== undefined && (
											<Text style={styles.quoteItemBasePrice}>
												Base Price: ₹{parseFloat(item.base_price || '0').toFixed(2)}
											</Text>
										)}
									</View>
									<View style={styles.quoteItemRight}>
										<View style={styles.feeInputWrapper}>
											<Text style={styles.feeCurrency}>₹</Text>
											<TextInput
												style={styles.feeInput}
												keyboardType="numeric"
												value={item.price}
												onChangeText={(val) => {
													setEditedItems((prev) => {
														const next = [...prev]
														next[index] = { ...next[index], price: val }
														return next
													})
												}}
												placeholder="0.00"
												placeholderTextColor="#94A3B8"
											/>
										</View>
										<TouchableOpacity
											onPress={() => handleDeleteScan(index)}
											style={styles.deleteScanBtn}
											hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
										>
											<MaterialCommunityIcons
												name="trash-can-outline"
												size={20}
												color="#E74B5B"
											/>
										</TouchableOpacity>
									</View>
								</View>
							))}

							{/* 7: handleAddScan */}
							{availableScanOptions.length > 0 && (
								<View style={{ marginTop: 12, marginBottom: 16 }}>
									<AppSelect
										placeholder="+ Add Scan Item"
										options={availableScanOptions}
										value={undefined}
										onSelect={handleAddScan}
										size="form"
										noMargin
										customCardStyle={{ borderColor: '#2E7C86', borderWidth: 1 }}
									/>
								</View>
							)}

							{/* 9: computedTotalFee */}
							<View style={styles.feeTotalRow}>
								<Text style={styles.feeLabel}>Total Quoted Price:</Text>
								<Text style={styles.feeValue}>₹ {computedTotalFee}</Text>
							</View>

							{/* 10: handleConfirmBill */}
							<TouchableOpacity
								style={[styles.confirmBillBtn, updating && { opacity: 0.7 }]}
								onPress={handleConfirmBill}
								disabled={updating}
							>
								<Text style={styles.confirmBillText}>Submit Quotation</Text>
							</TouchableOpacity>
						</View>
					) : (
						<View style={styles.readOnlyFeeRow}>
							<Text style={styles.feeLabel}>Final Radiology Fee:</Text>
							<Text style={styles.feeValue}>
								₹ {booking.total_price != null ? booking.total_price.toFixed(2) : '0.00'}
							</Text>
						</View>
					)}
				</SectionCard>

				{/* 11 & 12: Upload Reports, QR Scan */}
				<SectionCard title="Document Control">
					<TouchableOpacity style={styles.uploadBtn} onPress={handleUpload}>
						<MaterialCommunityIcons name="cloud-upload" size={20} color="#1f5f68" />
						<Text style={styles.uploadBtnText}>Upload Diagnosis Report</Text>
						<Text style={styles.uploadSubText}>PDF, JPG, PNG (Max 10MB)</Text>
					</TouchableOpacity>

					<TouchableOpacity style={styles.scanBtn}>
						<MaterialCommunityIcons name="qrcode-scan" size={22} color="#1f5f68" />
						<View style={{ marginLeft: 10 }}>
							<Text style={styles.scanBtnText}>Scan QR Code</Text>
							<Text style={styles.scanSubText}>Retrieve Previous Diagnosis Reports</Text>
						</View>
					</TouchableOpacity>
				</SectionCard>

				{/* Not in priority list — kept at the end as supplementary info */}
				<SectionCard title="Booking Details">
					<InfoRow label="Radiology Center" value={booking.radiology_name || 'N/A'} />
					<InfoRow label="Booking Date" value={formatDateTime(booking.booking_date, booking.booking_time)} />
					<InfoRow label="Status" value={statusDisplay} />
					<InfoRow label="Payment Status" value={booking.payment_status || 'N/A'} />
					<InfoRow
						label="Total Amount"
						value={booking.total_price != null ? `₹${booking.total_price.toFixed(2)}` : 'Not quoted'}
					/>
					{booking.notes && <InfoRow label="Notes" value={booking.notes} />}
				</SectionCard>

				<SectionCard title="diagnosis">
					<View style={styles.verificationRow}>
						<MaterialCommunityIcons
							name={booking.prescription_verified ? 'check-circle' : 'clock-alert'}
							size={20}
							color={booking.prescription_verified ? '#43A047' : '#D9711B'}
						/>
						<Text style={styles.verificationText}>
							{booking.prescription_verified
								? `Verified by ${booking.verified_by_name || 'Staff'}`
								: 'Pending Verification'}
						</Text>
					</View>
				</SectionCard>
			</ScrollView>

			<ImageViewerModal
				visible={viewerVisible}
				images={[...docUrls, ...reportDocUrls]}
				initialIndex={viewerIndex}
				onClose={() => setViewerVisible(false)}
			/>

			{statusModal && (
				<StatusModal
					visible={statusModal.visible}
					status={statusModal.status}
					title={statusModal.title}
					description={statusModal.description}
					submitText="Okay"
					onSubmit={() => setStatusModal(null)}
					onCancel={() => setStatusModal(null)}
				/>
			)}
		</View>
	)
}

// ─── InfoRow helper ──────────────────────────────────────────────────────────
const InfoRow = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
	<View style={styles.infoRow}>
		<Text style={styles.infoLabel}>{label}</Text>
		{typeof value === 'string' ? <Text style={styles.infoValue}>{value}</Text> : value}
	</View>
)

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	scanBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: '#f5fffd',
		borderWidth: 1,
		borderColor: '#1f5f68',
		borderStyle: 'dashed',
		borderRadius: 12,
		padding: 16,
		marginTop: 12,
	},
	scanBtnText: { fontSize: 16, fontWeight: '700', color: '#1f5f68' },
	scanSubText: { fontSize: 12, color: '#666', marginTop: 2 },
	container: { flex: 1, backgroundColor: '#f4f6f8' },
	centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
	scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
	headerCard: {
		backgroundColor: '#ffffff',
		borderRadius: 16,
		padding: 16,
		marginBottom: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	patientHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
	patientInfo: { flex: 1, marginRight: 8 },
	patientNameText: { fontSize: 16, fontWeight: '700', color: '#1A2C33' },
	patientMeta: { fontSize: 12, color: '#64707d', marginTop: 2 },
	actionButtonsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
	callBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
	},
	callBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
	card: {
		backgroundColor: '#fff',
		borderRadius: 14,
		padding: 16,
		marginBottom: 14,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.04,
		shadowRadius: 8,
		elevation: 2,
	},
	cardTitle: { fontSize: 14, fontWeight: '700', color: '#1A2C33', marginBottom: 12 },
	billingStatusRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16,
	},
	statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
	statusText: { fontSize: 13, fontWeight: '700' },
	selectActionWrapper: { minWidth: 180 },
	actionSelectBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
	},
	actionSelectText: { color: '#fff', fontSize: 13, fontWeight: '600' },
	feeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 8 },
	feeLabel: { fontSize: 14, fontWeight: '600', color: '#4A5B62' },
	feeValue: { fontSize: 16, fontWeight: '700', color: '#1f5f68' },
	feeInputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: '#E2E8F0',
		borderRadius: 8,
		paddingHorizontal: 8,
		backgroundColor: '#F8FAFC',
		width: 100,
	},
	feeCurrency: { fontSize: 14, fontWeight: '600', color: '#64707d', marginRight: 4 },
	feeInput: { flex: 1, height: 36, fontSize: 14, color: '#1A2C33', paddingVertical: 0 },
	confirmBillBtn: {
		backgroundColor: '#1f5f68',
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 8,
		alignSelf: 'flex-start',
		marginTop: 12,
	},
	confirmBillText: { color: '#fff', fontWeight: '700', fontSize: 13 },
	quoteFormContainer: { marginTop: 10 },
	quoteInstruction: { fontSize: 13, fontWeight: '600', color: '#4A5B62', marginBottom: 10 },
	quoteItemRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#F8FAFC',
		borderRadius: 10,
		borderWidth: 1,
		borderColor: '#E2E8F0',
		padding: 12,
		marginBottom: 10,
		gap: 12,
	},
	quoteItemLeft: { flex: 1, flexDirection: 'column', gap: 4 },
	quoteItemName: { fontSize: 14, fontWeight: '600', color: '#1A2C33' },
	quoteItemBasePrice: { fontSize: 12, color: '#64707D', fontWeight: '500' },
	quoteItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	deleteScanBtn: {
		width: 36,
		height: 36,
		borderRadius: 8,
		backgroundColor: '#FFF5F5',
		borderWidth: 1,
		borderColor: '#FFE3E3',
		alignItems: 'center',
		justifyContent: 'center',
	},
	feeTotalRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#E2E8F0',
		paddingTop: 10,
	},
	readOnlyFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
	uploadBtn: {
		borderWidth: 1,
		borderColor: '#CBD5E1',
		borderRadius: 12,
		padding: 14,
		alignItems: 'center',
		backgroundColor: '#F8FAFC',
	},
	uploadBtnText: { fontSize: 14, fontWeight: '600', color: '#1f5f68', marginTop: 4 },
	uploadSubText: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
	digitalPrescriptionRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4,
		marginBottom: 10,
	},
	digitalLabel: { fontSize: 13, fontWeight: '600', color: '#1A2C33' },
	viewAllText: { fontSize: 13, fontWeight: '600', color: '#1f5f68' },
	fileList: { marginTop: 6 },
	fileItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 8,
		borderBottomWidth: 1,
		borderBottomColor: '#F1F5F9',
	},
	fileName: { fontSize: 13, color: '#1A2C33', flex: 1 },
	fileDate: { fontSize: 11, color: '#94A3B8' },
	noDocsText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 6,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f4f8',
	},
	infoLabel: { fontSize: 13, color: '#64707d', fontWeight: '500', flexShrink: 0, marginRight: 12 },
	infoValue: { fontSize: 13, color: '#1D2939', fontWeight: '500', textAlign: 'right', flex: 1 },
	verificationRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
	verificationText: { fontSize: 13, fontWeight: '600', color: '#1A2C33' },
	errorTitle: { fontSize: 18, fontWeight: '600', color: '#1D2939', marginTop: 12 },
	goBackButton: {
		marginTop: 20,
		backgroundColor: '#1f5f68',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
	},
	goBackText: { color: '#fff', fontWeight: '600', fontSize: 16 },
})
