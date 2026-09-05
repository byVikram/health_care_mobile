import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native'
import { useRoute, useNavigation, type RouteProp } from '@react-navigation/native'
import { useTheme } from 'react-native-paper'

import {
	AppScreenHeader,
	AppInput,
	AppSelect,
	AppCalendar,
	AppTimePicker,
	AppPhotoPicker,
	AppButton,
	AppTypography,
} from '../../../components/common'
import { ROUTES } from '../../../navigation/routes'
import type { AppStackParamList } from '../../../navigation/types'
import { EVENT_CATEGORIES, createEvent, updateEvent, getEventDetail } from './eventService'

type DoctorEventFormRouteProp = RouteProp<AppStackParamList, typeof ROUTES.STACK.DOCTOR_EVENT_FORM>

export default function DoctorEventFormPage() {
	const route = useRoute<DoctorEventFormRouteProp>()
	const navigation = useNavigation()
	const theme = useTheme()
	
	const eventId = route.params?.eventId

	const [isLoading, setIsLoading] = useState(!!eventId)
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Form State
	const [title, setTitle] = useState('')
	const [category, setCategory] = useState('')
	const [eventDate, setEventDate] = useState('')
	const [startTime, setStartTime] = useState('')
	const [endTime, setEndTime] = useState('')
	const [locationType, setLocationType] = useState<'online' | 'offline'>('offline')
	const [registrationLink, setRegistrationLink] = useState('')
	const [location, setLocation] = useState('')
	const [description, setDescription] = useState('')
	const [coverImageUrl, setCoverImageUrl] = useState('')

	// Errors
	const [errors, setErrors] = useState<Record<string, string>>({})

	useEffect(() => {
		if (eventId) {
			fetchEventDetail(eventId)
		}
	}, [eventId])

	const fetchEventDetail = async (id: string) => {
		try {
			setIsLoading(true)
			const event = await getEventDetail(id)
			setTitle(event.title)
			setCategory(event.category)
			setEventDate(event.event_date)
			setStartTime(event.event_time)
			setEndTime(event.end_time)
			setLocationType(event.location_type || 'offline')
			if (event.registration_link) setRegistrationLink(event.registration_link)
			if (event.location) setLocation(event.location)
			setDescription(event.description)
			if (event.cover_image_url) setCoverImageUrl(event.cover_image_url)
		} catch (error) {
			Alert.alert('Error', 'Failed to load event details.')
			navigation.goBack()
		} finally {
			setIsLoading(false)
		}
	}

	const validateForm = () => {
		const newErrors: Record<string, string> = {}
		if (!title.trim()) newErrors.title = 'Title is required'
		if (!category) newErrors.category = 'Category is required'
		if (!eventDate) newErrors.eventDate = 'Event date is required'
		if (!startTime) newErrors.startTime = 'Start time is required'
		if (!endTime) newErrors.endTime = 'End time is required'
		
		if (locationType === 'online' && !registrationLink.trim()) {
			newErrors.registrationLink = 'Registration link is required'
		}
		if (locationType === 'offline' && !location.trim()) {
			newErrors.location = 'Location is required'
		}
		
		if (!description.trim()) newErrors.description = 'Description is required'

		setErrors(newErrors)
		return Object.keys(newErrors).length === 0
	}

	const handleSubmit = async (status: 'published' | 'draft') => {
		if (!validateForm()) {
			Alert.alert('Validation Error', 'Please check the form for errors.')
			return
		}

		try {
			setIsSubmitting(true)
			const payload = {
				title: title.trim(),
				category,
				event_date: eventDate,
				event_time: startTime,
				end_time: endTime,
				location_type: locationType,
				location: locationType === 'offline' ? location.trim() : undefined,
				registration_link: locationType === 'online' ? registrationLink.trim() : undefined,
				description: description.trim(),
				cover_image_url: coverImageUrl || undefined,
				status,
			}

			if (eventId) {
				await updateEvent(eventId, payload)
				Alert.alert('Success', `Event updated successfully as ${status}.`)
			} else {
				await createEvent(payload)
				Alert.alert('Success', `Event created successfully as ${status}.`)
			}
			navigation.goBack()
		} catch (error) {
			console.error('Submit Event Error', error)
			Alert.alert('Error', 'Failed to save event. Please try again.')
		} finally {
			setIsSubmitting(false)
		}
	}

	if (isLoading) {
		return (
			<View style={[styles.container, styles.center]}>
				<ActivityIndicator size="large" color={theme.colors.primary} />
			</View>
		)
	}

	return (
		<KeyboardAvoidingView 
			style={styles.container} 
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<AppScreenHeader
				title={eventId ? 'Edit Event' : 'Create Event'}
				onBack={() => navigation.goBack()}
			/>
			
			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.formSection}>
					<AppTypography variant="body" style={{ fontWeight: '600', marginBottom: 8, color: '#475569' }}>
						Cover Image
					</AppTypography>
					<AppPhotoPicker
						imageUri={coverImageUrl}
						fallbackSource={{ uri: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80' }}
						onChange={(change: any) => setCoverImageUrl(change.removed ? '' : change.uri)}
					/>
				</View>

				<View style={styles.formSection}>
					<AppInput
						label="Event Title *"
						placeholder="Enter event title"
						value={title}
						onChangeText={(t) => {
							setTitle(t)
							if (errors.title) setErrors((prev) => ({ ...prev, title: '' }))
						}}
						error={!!errors.title}
						errorText={errors.title}
					/>

					<AppSelect
						label="Category *"
						options={EVENT_CATEGORIES}
						value={category}
						onSelect={(val) => {
							setCategory(val as string)
							if (errors.category) setErrors((prev) => ({ ...prev, category: '' }))
						}}
						errorText={errors.category}
						placeholder="Select event category"
					/>
				</View>

				<View style={styles.row}>
					<View style={styles.flex1}>
						<AppCalendar
							label="Event Date *"
							value={eventDate}
							onChange={(val) => {
								setEventDate(val)
								if (errors.eventDate) setErrors((prev) => ({ ...prev, eventDate: '' }))
							}}
						/>
						{!!errors.eventDate && (
							<AppInput error={true} errorText={errors.eventDate} style={{ display: 'none' }} />
						)}
					</View>
				</View>

				<View style={[styles.row, { gap: 12 }]}>
					<View style={styles.flex1}>
						<AppTimePicker
							label="Start Time *"
							value={startTime}
							onChange={(val) => {
								setStartTime(val)
								if (errors.startTime) setErrors((prev) => ({ ...prev, startTime: '' }))
							}}
						/>
						{!!errors.startTime && (
							<AppInput error={true} errorText={errors.startTime} style={{ display: 'none' }} />
						)}
					</View>
					<View style={styles.flex1}>
						<AppTimePicker
							label="End Time *"
							value={endTime}
							onChange={(val) => {
								setEndTime(val)
								if (errors.endTime) setErrors((prev) => ({ ...prev, endTime: '' }))
							}}
						/>
						{!!errors.endTime && (
							<AppInput error={true} errorText={errors.endTime} style={{ display: 'none' }} />
						)}
					</View>
				</View>

				<View style={styles.formSection}>
					<AppSelect
						label="Event Mode *"
						options={[
							{ label: 'Offline (In-Person)', value: 'offline' },
							{ label: 'Online (Virtual)', value: 'online' },
						]}
						value={locationType}
						onSelect={(val) => {
							setLocationType(val as 'online' | 'offline')
							setErrors((prev) => ({ ...prev, location: '', registrationLink: '' }))
						}}
					/>

					{locationType === 'online' ? (
						<AppInput
							label="Registration Link *"
							placeholder="Enter meeting URL (e.g. Zoom, Google Meet)"
							value={registrationLink}
							onChangeText={(t) => {
								setRegistrationLink(t)
								if (errors.registrationLink) setErrors((prev) => ({ ...prev, registrationLink: '' }))
							}}
							error={!!errors.registrationLink}
							errorText={errors.registrationLink}
						/>
					) : (
						<AppInput
							label="Physical Location *"
							placeholder="Enter physical address/venue"
							value={location}
							onChangeText={(t) => {
								setLocation(t)
								if (errors.location) setErrors((prev) => ({ ...prev, location: '' }))
							}}
							error={!!errors.location}
							errorText={errors.location}
						/>
					)}

					<AppInput
						label="Description *"
						placeholder="Provide event details..."
						value={description}
						onChangeText={(t) => {
							setDescription(t)
							if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
						}}
						error={!!errors.description}
						errorText={errors.description}
						multiline
						numberOfLines={6}
						style={{ minHeight: 120, textAlignVertical: 'top' }}
					/>
				</View>
			</ScrollView>

			<View style={styles.footer}>
				<AppButton
					variant="outline"
					onPress={() => handleSubmit('draft')}
					disabled={isSubmitting}
					style={[styles.footerBtn, { marginRight: 12 }]}
				>
					Save as Draft
				</AppButton>
				<AppButton
					variant="primary"
					onPress={() => handleSubmit('published')}
					disabled={isSubmitting}
					loading={isSubmitting}
					style={styles.footerBtn}
				>
					Publish Event
				</AppButton>
			</View>
		</KeyboardAvoidingView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f8fafc',
	},
	center: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrollView: {
		flex: 1,
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
	},
	formSection: {
		marginBottom: 16,
	},
	row: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginBottom: 16,
	},
	flex1: {
		flex: 1,
	},
	footer: {
		flexDirection: 'row',
		padding: 16,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#e2e8f0',
		paddingBottom: Platform.OS === 'ios' ? 32 : 16,
	},
	footerBtn: {
		flex: 1,
	},
})
