// plugins/withNotificationChannels.js
//
// Android notification setup for push messages, done at prebuild time (`npx expo prebuild --platform android`), no extra library:
//
//  1. Creates the notification channels when the app starts. A channel with HIGH importance is what makes a push appear as a
//     banner on top of the screen, with sound, like a chat message. A push sent to a channel the app never created only lands
//     quietly in the notification shade. The ids must match the backend (health_care_backend/app/core/push.py):
//       updates        appointment news and what the Notifications screen lists
//       care_requests      care offers to nurses (the ordinary one-time alert; a scheduled visit)
//       care_request_ring  an INSTANT care request: the phone's ringtone at ring volume and a repeating buzz
//  2. Makes "updates" the default channel for pushes that name none (FCM's `default_notification_channel_id`).
//  3. Gives pushes the app's small status-bar icon (white mark on transparent, assets/notification/) and the brand colour, both for
//     a push Android shows itself (FCM) and for the notification the app posts itself while it is open (expo-notifications).
//
// Android fixes a channel's importance when it is first created and the app cannot raise it later (only the user can): changing
// IMPORTANCE here after a release does nothing for phones that already have the channel, so give a new purpose a new id.
const fs = require('fs')
const path = require('path')
const { AndroidConfig, withAndroidColors, withAndroidManifest, withDangerousMod, withMainApplication } = require('expo/config-plugins')

const DEFAULT_CHANNEL_ID = 'updates'
const BRAND_COLOR = '#2B6F71' // APP_COLORS.primary
const ICON_NAME = 'notification_icon'
const MARKER = 'withNotificationChannels'
// A second marker for the ringing channel, so an android/ folder that was prebuilt before it existed still gets it (the first
// marker alone would make a new prebuild skip it).
const RING_MARKER = 'withNotificationChannels.ring'
const RING_CHANNEL_ID = 'care_request_ring'

const CHANNELS = [
	{ id: 'updates', name: 'Appointments & updates', description: 'Confirmations, changes, delays and reminders for your appointments.' },
	{ id: 'care_requests', name: 'Care requests', description: 'Urgent home-care requests near you.' },
]

// Kotlin, inserted right after `super.onCreate()` in MainApplication (fully-qualified names: no imports to add).
function channelCode() {
	const lines = CHANNELS.map(
		(c) =>
			`      manager.createNotificationChannel(\n` +
			`        android.app.NotificationChannel("${c.id}", "${c.name}", android.app.NotificationManager.IMPORTANCE_HIGH).apply {\n` +
			`          description = "${c.description}"\n` +
			`          enableVibration(true)\n` +
			`        }\n` +
			`      )`
	)
	return (
		`\n    // ${MARKER}: the channels the push messages are shown in (HIGH importance = a banner with sound)\n` +
		`    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {\n` +
		`      val manager = getSystemService(android.app.NotificationManager::class.java)\n` +
		`${lines.join('\n')}\n` +
		`    }\n`
	)
}

// The channel an instant care request rings in. Sound: the phone's own default ringtone, played as a ringtone (so it follows the ring
// volume and the silent / vibrate switch, not the notification volume). Vibration: a buzz-pause pattern of about 7 seconds. The sound
// plays once for its own length (a ringtone is long); if a phone cuts it short the notification can ask Android to repeat it
// (an "insistent" notification), which needs the notification to be drawn by the app. Public on the lock screen: the card shows no
// patient details. Android fixes all of this when the channel is first created: change it by giving the channel a new id.
function ringChannelCode() {
	return (
		`\n    // ${RING_MARKER}: an instant care request rings (the default ringtone, at ring volume) and buzzes\n` +
		`    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {\n` +
		`      val ringManager = getSystemService(android.app.NotificationManager::class.java)\n` +
		`      ringManager.createNotificationChannel(\n` +
		`        android.app.NotificationChannel("${RING_CHANNEL_ID}", "Instant care requests", android.app.NotificationManager.IMPORTANCE_HIGH).apply {\n` +
		`          description = "Rings and vibrates when an instant home-care request comes in near you."\n` +
		`          enableVibration(true)\n` +
		`          vibrationPattern = longArrayOf(0, 700, 400, 700, 400, 700, 400, 700, 400, 700, 400, 700)\n` +
		`          lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC\n` +
		`          setSound(\n` +
		`            android.provider.Settings.System.DEFAULT_RINGTONE_URI,\n` +
		`            android.media.AudioAttributes.Builder()\n` +
		`              .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE)\n` +
		`              .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)\n` +
		`              .build()\n` +
		`          )\n` +
		`        }\n` +
		`      )\n` +
		`    }\n`
	)
}

/** Adds the channel code after `super.onCreate()` (Kotlin or Java); returns the new source, unchanged when already there. */
function addChannels(source, language) {
	if (source.includes(MARKER)) return source
	if (language === 'java') {
		throw new Error(`${MARKER}: a Java MainApplication is not supported; add the channels by hand (see this plugin).`)
	}
	const pattern = /(override\s+fun\s+onCreate\s*\(\s*\)\s*\{[^]*?super\.onCreate\(\)[^\n]*\n)/
	if (!pattern.test(source)) {
		throw new Error(`${MARKER}: could not find \`override fun onCreate() { super.onCreate()\` in MainApplication.`)
	}
	return source.replace(pattern, (match) => match + channelCode())
}

/** Same insertion for the ringing channel, tracked by its own marker. */
function addRingChannel(source, language) {
	if (source.includes(RING_MARKER)) return source
	if (language === 'java') {
		throw new Error(`${MARKER}: a Java MainApplication is not supported; add the channels by hand (see this plugin).`)
	}
	const pattern = /(override\s+fun\s+onCreate\s*\(\s*\)\s*\{[^]*?super\.onCreate\(\)[^\n]*\n)/
	if (!pattern.test(source)) {
		throw new Error(`${MARKER}: could not find \`override fun onCreate() { super.onCreate()\` in MainApplication.`)
	}
	return source.replace(pattern, (match) => match + ringChannelCode())
}

const withChannelCode = (config) =>
	withMainApplication(config, (c) => {
		c.modResults.contents = addRingChannel(addChannels(c.modResults.contents, c.modResults.language), c.modResults.language)
		return c
	})

const withFirebaseDefaults = (config) =>
	withAndroidManifest(config, (c) => {
		const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults)
		const add = AndroidConfig.Manifest.addMetaDataItemToMainApplication
		// @react-native-firebase/messaging declares the channel id (empty) and the colour (white) itself, so the manifest merger refuses
		// ours unless it is told ours win: `tools:replace` on the attribute we set. Only those two clash; the others are not declared
		// by any library, so they are plain entries.
		c.modResults.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools'
		const entries = [
			// what a push shown by Android itself (app closed / in the background) uses
			['com.google.firebase.messaging.default_notification_channel_id', DEFAULT_CHANNEL_ID, 'value', true],
			['com.google.firebase.messaging.default_notification_icon', `@drawable/${ICON_NAME}`, 'resource', false],
			['com.google.firebase.messaging.default_notification_color', '@color/notification_color', 'resource', true],
			// what a notification the APP posts itself (expo-notifications: a push that arrives while the app is open) uses
			['expo.modules.notifications.default_notification_icon', `@drawable/${ICON_NAME}`, 'resource', false],
			['expo.modules.notifications.default_notification_color', '@color/notification_color', 'resource', false],
		]
		for (const [name, value, type, replace] of entries) {
			add(app, name, value, type)
			const item = (app['meta-data'] || []).find((m) => m.$['android:name'] === name)
			if (item && replace) item.$['tools:replace'] = `android:${type}`
		}
		return c
	})

const withBrandColor = (config) =>
	withAndroidColors(config, (c) => {
		c.modResults = AndroidConfig.Colors.assignColorValue(c.modResults, { name: 'notification_color', value: BRAND_COLOR })
		return c
	})

// assets/notification/notification-icon-<density>.png -> android/app/src/main/res/drawable-<density>/notification_icon.png
const withIconFiles = (config) =>
	withDangerousMod(config, [
		'android',
		(c) => {
			const source = path.join(c.modRequest.projectRoot, 'assets', 'notification')
			const res = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res')
			for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
				const from = path.join(source, `notification-icon-${density}.png`)
				if (!fs.existsSync(from)) throw new Error(`${MARKER}: missing ${from}`)
				const dir = path.join(res, `drawable-${density}`)
				fs.mkdirSync(dir, { recursive: true })
				fs.copyFileSync(from, path.join(dir, `${ICON_NAME}.png`))
			}
			return c
		},
	])

module.exports = (config) => withIconFiles(withBrandColor(withFirebaseDefaults(withChannelCode(config))))
module.exports.addChannels = addChannels // exported for a quick check of the transform on a sample file
