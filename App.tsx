import React, { useState, useEffect } from "react";
import { PaperProvider } from "react-native-paper";
import { theme } from "./src/config/theme";
import { AuthProvider } from "./src/context/AuthContext";
import AppNavigator from "./src/navigation/AppNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import { SplashScreen as SplashScreenComponent } from "./src/components/common";

export default function App() {
	const [isSplashVisible, setIsSplashVisible] = useState(true);

	useEffect(() => {
		const hideSplash = async () => {
			await SplashScreen.hideAsync();
		};
		hideSplash();
	}, []);

	const onSplashFinish = () => {
		setIsSplashVisible(false);
	};

	if (isSplashVisible) {
		return <SplashScreenComponent onFinish={onSplashFinish} />;
	}

	return (
		<SafeAreaProvider>
			<PaperProvider theme={theme}>
				<AuthProvider>
					<AppNavigator />
				</AuthProvider>
			</PaperProvider>
		</SafeAreaProvider>
	);
}
