import { registerRootComponent } from 'expo'
import App from './App'
import { registerBackgroundPushHandler } from './src/services/pushNotificationService'

// Must run at module load (before the app mounts) so push messages that arrive while the app is killed are handled.
registerBackgroundPushHandler()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App)
