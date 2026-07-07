import { useState, useEffect, useCallback } from 'react'
import * as Location from 'expo-location'
import { getAddressFromCoords } from '../services/locationService'

/* ───────── TYPES ───────── */
type Coordinates = {
    latitude: number
    longitude: number

    area?: string
    city?: string
    district?: string
    state?: string
    country?: string

    fullAddress?: string
}

type UseGPSLocationReturn = {
    coordinates: Coordinates | null
    gpsLoading: boolean
    gpsError: string
    isTracking: boolean
    startTracking: () => Promise<void>
    stopTracking: () => void
}

/* ───────── HOOK ───────── */
export const useGPSLocation = (): UseGPSLocationReturn => {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [gpsError, setGpsError] = useState('')
    const [isTracking, setIsTracking] = useState(false)
    const [subscription, setSubscription] = useState<Location.LocationSubscription | null>(null)

    /* ───────── CLEANUP ───────── */
    useEffect(() => {
        return () => {
            subscription?.remove()
        }
    }, [subscription])

    /* ───────── START TRACKING ───────── */
    const startTracking = useCallback(async () => {
        setGpsLoading(true)
        setGpsError('')

        try {
            const { status } = await Location.requestForegroundPermissionsAsync()

            if (status !== 'granted') {
                setGpsError('Permission denied')
                setGpsLoading(false)
                return
            }

            const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            })

            const geoData = await getAddressFromCoords(current.coords.latitude, current.coords.longitude)

            setCoordinates({
                latitude: current.coords.latitude,
                longitude: current.coords.longitude,
                ...geoData,
            })

            setIsTracking(true)
            setGpsLoading(false)

            const sub = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10,
                },
                async (loc) => {
                    const geoData = await getAddressFromCoords(loc.coords.latitude, loc.coords.longitude)

                    setCoordinates({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                        ...geoData,
                    })
                }
            )

            setSubscription(sub)
        } catch (err) {
            console.log(err)
            setGpsError('Failed to get location')
            setGpsLoading(false)
            setIsTracking(false)
        }
    }, [])

    /* ───────── STOP TRACKING ───────── */
    const stopTracking = useCallback(() => {
        subscription?.remove()
        setSubscription(null)
        setCoordinates(null)
        setIsTracking(false)
        setGpsError('')
    }, [subscription])

    return {
        coordinates,
        gpsLoading,
        gpsError,
        isTracking,
        startTracking,
        stopTracking,
    }
}
