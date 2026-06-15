# Skill: Handle Success/Error UI Feedback

## Description
Standardizes how user feedback is displayed after asynchronous actions (e.g., form submissions, bookings).

## Trigger
Use this skill when completing an action that requires a success confirmation or error alert on the screen.

## Execution Steps
1. **State Management:** Use local state `useState` to track loading (`isLoading`) and the modal state type (`modalType: 'success' | 'error' | null`).
2. **Error Catching:** Wrap the API call in a `try/catch` block. On success, set `modalType` to `'success'`. On error, set it to `'error'`. (Note: 401/403 are handled globally by `ApiService`).
3. **Modal UI:** Render the `StatusModal` component conditionally or control it via its `visible` prop.
4. **Configuration:** 
   - Pass `status`, `title`, and `description` props clearly describing the outcome.
   - Implement `onSubmit` (e.g., navigate back or clear form) and `onCancel` (e.g., dismiss modal or retry).

## Code Template
```tsx
import React, { useState } from 'react'
import { View, Button } from 'react-native'
import StatusModal from '../../components/common/StatusModal'

export default function MyComponent() {
	const [isLoading, setIsLoading] = useState(false)
	const [modalType, setModalType] = useState<'success' | 'error' | null>(null)

	const handleAction = async () => {
		try {
			setIsLoading(true)
			// await someApiCall()
			setModalType('success')
		} catch (error) {
			setModalType('error')
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<View>
			<Button title="Submit" onPress={handleAction} disabled={isLoading} />
			
			<StatusModal
				visible={modalType !== null}
				status={modalType === 'success' ? 'success' : 'error'}
				title={modalType === 'success' ? 'Success!' : 'Action Failed'}
				description={modalType === 'success' ? 'Your action was completed.' : 'Something went wrong.'}
				submitText={modalType === 'success' ? 'Continue' : 'Try Again'}
				onSubmit={() => {
					if (modalType === 'success') {
						setModalType(null)
						// navigation.goBack()
					} else {
						setModalType(null)
						handleAction() // Retry
					}
				}}
				onCancel={() => setModalType(null)}
			/>
		</View>
	)
}
```
