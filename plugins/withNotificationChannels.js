// plugins/withNotificationChannels.js
//
// Android notification setup for push messages, done at prebuild time (`npx expo prebuild --platform android`), no extra library:
//
//  1. Creates the notification channels when the app starts. A channel with HIGH importance is what makes a push appear as a
//     banner on top of the screen, with sound, like a chat message. A push sent to a channel the app never created only lands
//     quietly in the notification shade. The ids must match the backend (health_care_backend/app/core/push.py):
//       updates        appointment news and what the Notifications screen lists
//       care_requests  urgent care offers to nurses
//  2. Makes "updates" the default channel for pushes that name none (FCM's `default_notification_channel_id`).
//  3. Gives pushes the app's small status-bar icon (white mark on transparent, assets/notification/) and the brand colour.
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

const withChannelCode = (config) =>
	withMainApplication(config, (c) => {
		c.modResults.contents = addChannels(c.modResults.contents, c.modResults.language)
		return c
	})

const withFirebaseDefaults = (config) =>
	withAndroidManifest(config, (c) => {
		const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults)
		const add = AndroidConfig.Manifest.addMetaDataItemToMainApplication
		add(app, 'com.google.firebase.messaging.default_notification_channel_id', DEFAULT_CHANNEL_ID, 'value')
		add(app, 'com.google.firebase.messaging.default_notification_icon', `@drawable/${ICON_NAME}`, 'resource')
		add(app, 'com.google.firebase.messaging.default_notification_color', '@color/notification_color', 'resource')
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
