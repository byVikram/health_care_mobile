import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native'
import axios from 'axios'
import { createUser, getRoles } from '../authService'
import {AppInput,AppSelect} from '../../../components/common'
// import AppSelect from '../../../components/common/AppSelect'

type Role = { 
    value: string
    label: string
}

interface RegisterFormProps {
    onSubmit: (mobile: string) => void
    onSwitchToLogin?: () => void
}

export default function RegisterForm({ onSubmit, onSwitchToLogin }: RegisterFormProps) {
    const [registerAs, setRegisterAs] = useState('')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [mobile, setMobile] = useState('')
    const [loading, setLoading] = useState(false)
    const [roles, setRoles] = useState<Role[]>([])

    const [formError, setFormError] = useState('')
    const [roleError, setRoleError] = useState('')
    const [nameError, setNameError] = useState('')
    const [emailError, setEmailError] = useState('')
    const [mobileError, setMobileError] = useState('')

    useEffect(() => {
        const fetchRoles = async () => {
            try {
                debugger
                setLoading(true)
                const res = await getRoles()
                const rawData = res?.data || res?.data || []
                const formattedRoles = rawData.map((role: any) => ({
                    value: String(role.id),
                    label: role.label || role.name || 'Role',
                }))
                setRoles(
                    formattedRoles.length > 0
                        ? formattedRoles
                        : [{ value: '1', label: 'Doctor' }, { value: '2', label: 'Patient' }]
                )
            } catch {
                setRoles([{ value: '1', label: 'Doctor' }, { value: '2', label: 'Patient' }])
            } finally {
                setLoading(false)
            }
        }
        fetchRoles()
    }, [])

    const clearErrors = () => {
        setFormError('')
        setRoleError('')
        setNameError('')
        setEmailError('')
        setMobileError('')
    }

    const handleRegister = async () => {
        clearErrors()

        if (!registerAs) { setRoleError('Role is required'); return }
        if (!name.trim()) { setNameError('Name is required'); return }
        if (!email.trim()) { setEmailError('Email is required'); return }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setEmailError('Enter a valid email address'); return
        }
        if (!/^[6-9]\d{9}$/.test(mobile)) {
            setMobileError('Enter a valid 10-digit mobile number'); return
        }

        try {
            setLoading(true)
            const res = await createUser({
                role_id: registerAs,
                name,
                email,
                contact_number: mobile,
            })
            if (res?.success) {
                onSubmit(mobile)
            } else {
                setFormError(res?.message || 'Registration failed')
            }
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setFormError(err.response?.data?.message || 'Server error')
            } else {
                setFormError('Something went wrong')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <Text style={styles.title}>Register</Text>

            {/* Role — rendered first, matches web order */}
            <AppSelect 
                // label="Role"
                value={registerAs}
                options={roles}
                placeholder="Select a role"
                // disabled={loading}
                onSelect={(val: string) => {
                    debugger
                    setRegisterAs(val)
                    if (roleError) setRoleError('')
                    if (formError) setFormError('')
                }}
            
                // error={!!roleError}
                // helperText={roleError}
            />

            <AppInput
                placeholder="Enter your name"
                value={name}
                onChangeText={(t) => {
                    setName(t)
                    if (nameError) setNameError('')
                    if (formError) setFormError('')
                }}
                error={!!nameError}
                // helperText={nameError}
                style={styles.input}
            />

            <AppInput
                placeholder="Enter your email address"
                value={email}
                onChangeText={(t) => {
                    setEmail(t)
                    if (emailError) setEmailError('')
                    if (formError) setFormError('')
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                error={!!emailError}
                // helperText={emailError}
                style={styles.input}
            />

            <AppInput
                placeholder="Mobile Number"
                value={mobile}
                onChangeText={(t) => {
                    setMobile(t.replace(/\D/g, '').slice(0, 10))
                    if (mobileError) setMobileError('')
                    if (formError) setFormError('')
                }}
                keyboardType="phone-pad"
                maxLength={10}
                error={!!mobileError}
                // helperText={mobileError}
                style={styles.input}
            />

            <Text style={styles.terms}>
                By continuing, you agree to our{' '}
                <Text style={styles.link}>Terms &amp; Conditions</Text>
            </Text>

            <Text style={styles.switchText}>
                Already have an account?{' '}
                <Text style={styles.link} onPress={onSwitchToLogin}>Login</Text>
            </Text>

            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={loading}
            >
                {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.buttonText}>Register</Text>
                }
            </TouchableOpacity>

            {!!formError && <Text style={styles.error}>{formError}</Text>}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        flexGrow: 1,
        justifyContent: 'center',
    },
    
    title: {
        fontSize: 26,
        fontWeight: '600',
        marginBottom: 20,
        color: '#111',
    },
    input: {
        marginTop: 12,
    },
    terms: {
        fontSize: 13,
        color: '#666',
        marginTop: 20,
        marginBottom: 12,
    },
    switchText: {
        fontSize: 15,
        color: '#666',
        marginBottom: 16,
    },
    link: {
        color: '#0d9488',
        fontWeight: '600',
    },
    button: {
        backgroundColor: '#0d9488',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    error: {
        color: '#e24b4a',
        marginTop: 12,
        fontSize: 14,
    },
})