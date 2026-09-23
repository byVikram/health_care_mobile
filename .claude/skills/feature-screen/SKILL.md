---
description: Scaffold a new feature screen/page and register it in navigation
---

# Build a New Feature Screen

Scaffolds and integrates a new screen using the feature-sliced architecture. Ported from `.gemini/skills/feature_screen.md` — keep both in sync if you update one.

## Steps

1. **Folder** — create `src/features/<feature_name>/` if the domain doesn't already exist.
2. **Component** — create the main screen `<Name>Page.tsx`:
   - Use `StyleSheet.create` for styling.
   - Prefer standard React Native components (`View`, `Text`, `ScrollView`) combined with React Native Paper.
3. **Encapsulation** — break complex UI into smaller components *within* the feature folder. Do NOT place them in `src/components/common/` without explicit user permission.
4. **Routing** — define the exact route name in `src/navigation/routes.ts` (e.g. `ROUTES.<DOMAIN>.<ACTION>`).
5. **Navigator** — register the screen in the relevant navigator under `src/navigation/` (e.g. `AppNavigator.tsx`, `MainTabNavigator.tsx`).

## Template — `src/features/<feature>/<Name>Page.tsx`

```tsx
import React from 'react'
import { StyleSheet, View, Text, ScrollView } from 'react-native'
import { useNavigation, type NavigationProp } from '@react-navigation/native'
import type { AppNavigationParamList } from '../../navigation/types'

export default function NewFeaturePage() {
	const navigation = useNavigation<NavigationProp<AppNavigationParamList>>()

	return (
		<ScrollView style={styles.container} contentContainerStyle={styles.content}>
			<Text style={styles.title}>New Feature</Text>
		</ScrollView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#f5f5f5',
	},
	content: {
		flexGrow: 1,
		padding: 16,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
	},
})
```
