import React, { useState } from 'react'
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import axios from 'axios'
import { createUser } from '../authService'
import { AppInput } from '../../../components/common'

interface RegisterFormProps {
  roleId: string
  roleLabel?: string
  onSubmit: (mobile: string) => void
}

export default function RegisterForm({
  roleId,
  roleLabel,
  onSubmit,
}: RegisterFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState('')

  const handleRegister = async () => {
    setFormError('')

    if (!roleId) {
      setFormError('Role ID missing')
      return
    }

    if (!name.trim()) {
      setFormError('Name is required')
      return
    }

    if (!email.trim()) {
      setFormError('Email is required')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Invalid email')
      return
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setFormError('Enter valid 10-digit mobile number')
      return
    }

    try {
      setLoading(true)

      const res = await createUser({
        role_id: roleId,
        name,
        email,
        contact_number: mobile,
      })

      console.log('REGISTER RESPONSE:', res)

      if (res?.success || res?.data) {
        onSubmit(mobile)
      } else {
        setFormError(res?.message || 'Registration failed')
      }
    } catch (err) {
      console.log(err)

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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register</Text>

      {roleLabel ? (
        <Text style={styles.roleText}>Role: {roleLabel}</Text>
      ) : null}

      <AppInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <AppInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={styles.input}
      />

      <AppInput
        placeholder="Mobile Number"
        value={mobile}
        onChangeText={(t) => setMobile(t.replace(/\D/g, '').slice(0, 10))}
        keyboardType="phone-pad"
        maxLength={10}
        style={styles.input}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleRegister}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
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
    marginBottom: 12,
  },
  roleText: {
    fontSize: 15,
    color: '#0d9488',
    marginBottom: 16,
  },
  input: {
    marginTop: 12,
  },
  button: {
    backgroundColor: '#0d9488',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: 'red',
    marginTop: 12,
  },
})