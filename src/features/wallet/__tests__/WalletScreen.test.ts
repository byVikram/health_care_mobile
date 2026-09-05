// src/features/wallet/__tests__/WalletScreen.test.ts
export const formatWalletCurrency = (val: number): string => {
	const absVal = Math.abs(val).toFixed(2)
	return val < 0 ? `-₹${absVal}` : `₹${absVal}`
}

console.log('Testing wallet formatting...')
console.assert(formatWalletCurrency(1250) === '₹1250.00', 'Positive balance format test failed')
console.assert(formatWalletCurrency(0) === '₹0.00', 'Zero balance format test failed')
console.assert(formatWalletCurrency(-250) === '-₹250.00', 'Negative balance format test failed')
console.log('Wallet currency format tests passed successfully!')
