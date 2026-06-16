# Skill: Build a New Feature Screen

## Description
Scaffolds and integrates a new screen into the app using the Feature-Sliced architecture.

## Trigger
Use this skill when asked to create a new page, screen, or primary view.

## Execution Steps
1. **Folder Structure:** Create a new directory under `src/features/[feature_name]/` if the domain doesn't exist.
2. **Component Creation:** Create the main screen component `[Name]Page.tsx`. 
   - Use `StyleSheet.create` for styling.
   - Prefer standard React Native components (`View`, `Text`, `ScrollView`) combined with React Native Paper.
3. **Encapsulation:** Break down complex UI elements into smaller components *within* the feature folder. **Do not** place them in `src/components/common/` without explicit user permission.
4. **Routing:** Define the exact string route name in `src/navigation/routes.ts` (e.g., `ROUTES.[DOMAIN].[ACTION]`).
5. **Navigator Integration:** Register the screen in the appropriate navigator inside `src/navigation/` (e.g., `AppNavigator.tsx`).

## Code Template (`src/features/[feature]/[Name]Page.tsx`)
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
