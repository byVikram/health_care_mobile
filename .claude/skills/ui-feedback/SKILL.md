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

## Toast or modal?

Both exist on purpose; pick by what the user has to do next.

- **Toast** (`Toast.show`, the dark pill): short, non-blocking, disappears on its own. Use it for a **success** of any action ("Profile updated", "Address deleted"), for **form validation** ("Full name is required"), and for **minor failures** where nothing important is lost and the screen still works (a refresh or load-more that failed, a file/link that would not open, a vote or favourite that did not save, "Coming soon"). Keep it to one short line plus an optional second line.
- **Common modal** (`StatusModal`): blocks until the user taps OK. Use it when a **consequential action failed** and the user must read the reason and decide: placing or confirming a booking or order, cancelling or rescheduling, saving profile or clinical data, deleting something, provider actions with real-world effect. From anywhere (no local state needed) call the global helper; `AuthContext` renders it:

```ts
import { showStatusModal } from '../../services/apiService'

showStatusModal({ status: 'error', title: "Couldn't cancel", description: apiErrorMessage(e) || 'Please try again.', submitText: 'OK' })
```

- **Confirm sheet** (`AppConfirmSheet`): when the user must *choose* before an irreversible action (delete, log out). Never use the native `Alert.alert`.
- A **success** is a toast by default, including saving a form (profile, address, availability). Use a modal (or a confirmation screen) for a success only when it **ends a flow and the user needs something from it**: a booking, order or payment is placed (reference number, amount, what happens next), a wallet top-up, or any outcome with money or a next step. Saving a form is not one of those.
- Do not use a toast for a failure the user cannot miss (it disappears after a few seconds); that is a modal.
- Failures inside a bottom sheet or another modal: keep the message inside the sheet (inline text); a toast or a second modal can end up hidden behind it.

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
