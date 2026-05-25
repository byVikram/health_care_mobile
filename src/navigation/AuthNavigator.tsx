import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { AuthStackParamList } from './types'
import { ROUTES } from './routes'

import LoginPage from '../features/auth/LoginPage'
import RoleSelectionScreen from '../features/onboarding/RoleSelectionScreen'
import RegisterPage from '../features/auth/RegisterPage'
import OnboardingPage from '../features/onboarding/OnboardingPage'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export default function AuthNavigator() {
	return (
		<Stack.Navigator screenOptions={{ headerShown: false }}>
			<Stack.Screen name={ROUTES.AUTH.LOGIN} component={LoginPage} options={{ animation: 'none' }} />
			<Stack.Screen name={ROUTES.AUTH.ROLE_SELECTION} component={RoleSelectionScreen} />
			<Stack.Screen
				name={ROUTES.AUTH.ONBOARDING}
				component={OnboardingPage}
				options={{ animation: 'none' }}
			/>
			<Stack.Screen name={ROUTES.AUTH.REGISTER} component={RegisterPage} />
		</Stack.Navigator>
	)
}
