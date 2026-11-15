import { registerRootComponent } from 'expo'
import App from './App'
import { registerBackgroundPushHandler } from './src/services/pushNotificationService'
import { registerOfferBackgroundEvents, registerOfferHeadlessTask } from './src/services/offerNotification'

// Must run at module load (before the app mounts) so push messages that arrive while the app is killed are handled.
registerBackgroundPushHandler()
// Same reason: the Accept / Decline buttons of a care request notification are pressed while the app may be closed.
registerOfferBackgroundEvents()
// The native ring's Accept / Decline run this task (the ring is a foreground service, so it answers with the app closed).
registerOfferHeadlessTask()

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
registerRootComponent(App)
