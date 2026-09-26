import Toast from 'react-native-toast-message'

/** Placeholder feedback for design actions that have no backend yet ("Pay now", "Help", ...). */
export const showComingSoon = (text2?: string) => {
	Toast.show({ type: 'info', text1: 'Coming soon', text2 })
}
