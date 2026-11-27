// src/features/ancillary/staff/schedule/useScheduleActions.ts
//
// What the provider Schedule DOES, apart from what it shows (ProviderSchedulePage): the ⋮ menu of a visit (navigate, call, on the way,
// release, running late), giving a day or the rest back, and the open jobs (take with a confirmation, pick days in the job view, hide
// one). It owns the state of the sheets those open; the page renders them. After an action the schedule is re-read (`reload`).
import { useState } from 'react'
import Toast from 'react-native-toast-message'
import type { AppCancelResult } from '../../../../components/common'
import { callPhone, openDirections, openOnMap } from '../../../../utils/maps'
import { extractApiErrorMessage } from '../../ancillaryService'
import {
	acceptOpenJob,
	apiErrorCode,
	hideOpenJob,
	isStaleJobError,
	releaseVisitDay,
	type OpenJob,
	type ReleaseScope,
} from '../../providerOpenJobsService'
import { getProviderVisit, markVisitOnTheWay, releaseOrder } from '../../providerVisitService'
import type { ManageAction } from './ManageVisitSheet'
import { longDay, type ScheduleVisit } from './scheduleModel'

type Options = {
	visits: ScheduleVisit[]
	reload: () => Promise<void>
	/** Opens a visit's own screen. */
	openVisit: (visit: ScheduleVisit) => void
}

export function useScheduleActions({ visits, reload, openVisit }: Options) {
	const [manage, setManage] = useState<ScheduleVisit | null>(null)
	const [releasing, setReleasing] = useState<ScheduleVisit | null>(null)
	/** What a release gives back: this day only, or this day and the later ones she holds. */
	const [releaseScope, setReleaseScope] = useState<ReleaseScope>('DAY')
	const [late, setLate] = useState<ScheduleVisit | null>(null)
	const [job, setJob] = useState<OpenJob | null>(null)
	const [jobBusy, setJobBusy] = useState(false)
	const [declining, setDeclining] = useState<OpenJob | null>(null)
	/** The job under "Needed now" she tapped Take on: asked to confirm before it is taken. */
	const [taking, setTaking] = useState<OpenJob | null>(null)

	/** How many days of the booking she holds from this one on (this day and the later ones). */
	const remainingDays = (v: ScheduleVisit) =>
		visits.filter(
			(x) =>
				x.orderId === v.orderId &&
				x.state === 'active' &&
				(x.date > v.date || (x.date === v.date && x.startTime >= v.startTime))
		).length

	const runAction = async (action: ManageAction, v: ScheduleVisit) => {
		if (action === 'details') {
			setManage(null)
			openVisit(v)
			return
		}
		if (action === 'release' || action === 'releaseDay' || action === 'releaseRest') {
			setManage(null)
			setReleaseScope(action === 'releaseRest' ? 'REMAINING' : 'DAY')
			setReleasing(v)
			return
		}
		if (action === 'late') {
			setManage(null)
			setLate(v)
			return
		}
		setManage(null)
		try {
			if (action === 'navigate' || action === 'call') {
				const detail = v.visitId ? await getProviderVisit(v.visitId) : null
				if (action === 'navigate') {
					if (detail) {
						await openDirections(
							detail.address.latitude,
							detail.address.longitude,
							detail.address.street_address
						)
					} else {
						openOnMap(v.address, undefined)
					}
				} else if (detail?.patient.phone) {
					await callPhone(detail.patient.phone)
				} else {
					Toast.show({ type: 'info', text1: 'No phone number for this patient' })
				}
			} else if (action === 'onTheWay' && v.visitId) {
				await markVisitOnTheWay(v.visitId, true)
				Toast.show({ type: 'success', text1: `${v.patientName} can see you are on the way` })
				void reload()
			}
		} catch (e) {
			Toast.show({
				type: 'error',
				text1: 'That did not work',
				text2: extractApiErrorMessage(e, 'Please try again.'),
			})
		}
	}

	/**
	 * Gives the visit back and returns how it went: the reason sheet shows the confirmation, or the error. The reason and the note go with
	 * the release itself (the server stores them); a release less than 12 hours ahead is allowed and recorded, and she is told so.
	 */
	const confirmRelease = async (reason: string, note: string): Promise<AppCancelResult> => {
		if (!releasing) return { ok: false, error: 'Please try again.' }
		const text = [reason, note].filter(Boolean).join(' - ')
		try {
			// A visit of a booking sent out day by day goes back out by itself: this day, or this and the later ones. An instant visit, and
			// an older order that was never sent out that way (409 RELEASE_NOT_SUPPORTED), go back as the whole order.
			let wholeOrder = releasing.kind === 'instant' || !releasing.visitId
			let lateRelease = false
			if (!wholeOrder && releasing.visitId) {
				try {
					lateRelease = (await releaseVisitDay(releasing.visitId, releaseScope, reason, note)).late
				} catch (e) {
					if (apiErrorCode(e) !== 'RELEASE_NOT_SUPPORTED') throw e
					wholeOrder = true
				}
			}
			if (wholeOrder) await releaseOrder(releasing.orderId, text)
			if (lateRelease) {
				Toast.show({
					type: 'info',
					text1: 'Released less than 12 hours before the visit',
					text2: 'A late release is recorded.',
				})
			}
			void reload()
			return { ok: true }
		} catch (e) {
			return { ok: false, error: extractApiErrorMessage(e, 'Please try again.') }
		}
	}

	/**
	 * A refused job call. Someone else took it, or a day is no longer open: the list was out of date, so say so and re-read it.
	 * Anything else (a clash with a visit she holds, she is offline, no connection) shows the server's own sentence and leaves the job open.
	 */
	const onJobError = (e: unknown, title: string) => {
		if (isStaleJobError(e)) {
			Toast.show({
				type: 'info',
				text1:
					apiErrorCode(e) === 'ALREADY_TAKEN' ? 'Someone else just took this' : 'That day is no longer open',
				text2: extractApiErrorMessage(e, 'Your list has been refreshed.'),
			})
			setJob(null)
			setDeclining(null)
			void reload()
			return
		}
		Toast.show({ type: 'error', text1: title, text2: extractApiErrorMessage(e, 'Please try again.') })
	}

	const acceptJob = async (j: OpenJob, dates: string[]) => {
		setJobBusy(true)
		try {
			const res = await acceptOpenJob(j.id, dates)
			setJob(null)
			void reload()
			// What the server really gave her: a day someone took meanwhile is not in `acceptedDates`.
			const taken = res.acceptedDates.map(longDay)
			const left = (
				res.openDates.length
					? res.openDates
					: j.days.filter((d) => !res.acceptedDates.includes(d.date)).map((d) => d.date)
			).map(longDay)
			const first = j.patientName
			Toast.show({
				type: 'success',
				text1: left.length
					? `Added ${taken.join(', ')} · ${left.join(', ')} stays open for other nurses`
					: j.days.length > 1
						? `All ${j.days.length} days with ${first} added to your schedule`
						: `Visit with ${first} added to your schedule`,
			})
		} catch (e) {
			onJobError(e, 'Could not pick up this job')
		} finally {
			setJobBusy(false)
		}
	}

	/**
	 * "Take" on a row of Needed now. A booking of several days opens the job view, where she picks the days; an instant request or a
	 * single day asks first (TakeJobSheet), so one tap never commits her.
	 */
	const pickNeeded = (j: OpenJob) => {
		if (j.kind === 'scheduled' && j.days.length > 1) setJob(j)
		else setTaking(j)
	}

	/** She confirmed the take: the one day (or the instant request) goes on her schedule. */
	const confirmTake = async (j: OpenJob) => {
		await acceptJob(
			j,
			j.days.map((d) => d.date)
		)
		setTaking(null)
	}

	/**
	 * Hides the job from her. It is a quick dismissal, not a cancellation: the sheet closes and a toast says so (a failure stays in the
	 * sheet). A job someone took meanwhile (or a day no longer open) is gone, so there is nothing left to hide: `onJobError` says so in a
	 * toast, closes the sheet and the job view and re-reads the list, and the sheet has nothing more to show (`carryOn`).
	 */
	const declineJob = async (j: OpenJob, reason: string): Promise<AppCancelResult> => {
		try {
			await hideOpenJob(j.id, reason)
			void reload()
			return { ok: true }
		} catch (e) {
			if (isStaleJobError(e)) {
				onJobError(e, 'Could not hide this job')
				return { ok: true, carryOn: true }
			}
			return { ok: false, error: extractApiErrorMessage(e, 'Please try again.') }
		}
	}

	return {
		manage,
		setManage,
		releasing,
		setReleasing,
		releaseScope,
		late,
		setLate,
		job,
		setJob,
		jobBusy,
		declining,
		setDeclining,
		taking,
		setTaking,
		remainingDays,
		runAction,
		confirmRelease,
		acceptJob,
		pickNeeded,
		confirmTake,
		declineJob,
	}
}
