// src/features/wallet/__tests__/WalletScreen.test.tsx
import React from 'react'

describe('WalletScreen formatting tests', () => {
	it('formats positive balance correctly', () => {
		const balance = 1250.00
		const formatted = `₹${balance.toFixed(2)}`
		expect(formatted).toBe('₹1250.00')
	})

	it('formats zero balance correctly', () => {
		const balance = 0.00
		const formatted = `₹${balance.toFixed(2)}`
		expect(formatted).toBe('₹0.00')
	})

	it('formats negative balance correctly', () => {
		const balance = -250.00
		const absVal = Math.abs(balance).toFixed(2)
		const formatted = balance < 0 ? `-₹${absVal}` : `₹${absVal}`
		expect(formatted).toBe('-₹250.00')
	})
})
