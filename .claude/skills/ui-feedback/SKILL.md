---
description: Standardize success/error UI feedback after an async action (form submit, booking, etc.)
---

# Handle Success/Error UI Feedback

Standardizes how user feedback is shown after async actions. Ported from `.gemini/skills/ui_feedback.md` — keep both in sync if you update one.

## Steps

1. **State** — track `isLoading` and `modalType: 'success' | 'error' | null` via `useState`.
2. **Error catching** — wrap the API call in `try/catch`. On success set `modalType` to `'success'`, on error set `'error'`. Note: 401/403 are already handled globally by `ApiService` — don't duplicate that handling here.
3. **Modal UI** — render `StatusModal` conditionally, driven by its `visible` prop.
4. **Configuration** — pass `status`, `title`, `description` describing the outcome; implement `onSubmit` (e.g. navigate back / clear form) and `onCancel` (dismiss / retry).

## Template

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
