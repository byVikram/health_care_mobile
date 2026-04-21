import React, { useState, useEffect } from 'react'
import { PaperProvider } from 'react-native-paper'
import { theme } from './src/config/theme'
import { AuthProvider } from './src/context/AuthContext'
import AppNavigator from './src/navigation/AppNavigator'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'
import { SplashScreen as SplashScreenComponent } from './src/components/common'

export default function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true)

  useEffect(() => {
    const prepareSplash = async () => {
      await SplashScreen.preventAutoHideAsync()
    }
    prepareSplash()
  }, [])

  const onSplashFinish = async () => {
    setIsSplashVisible(false)
    await SplashScreen.hideAsync()
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>

          {isSplashVisible ? (
            <SplashScreenComponent onFinish={onSplashFinish} />
          ) : (
            <AppNavigator />
          )}

        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  )
}