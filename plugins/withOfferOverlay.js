// plugins/withOfferOverlay.js
//
// The native half of the care request "ring" (see plugins/offer-overlay/*.kt and src/services/offerNotification.ts), put into the
// Android project at prebuild time (`npx expo prebuild --platform android`, never `--clean`: the existing android/ folder is kept):
//
//  1. copies the Kotlin files into android/app/src/main/java/<app package>/offer/ (a changed file is overwritten, so editing a .kt here
//     and running the prebuild again is how native code changes reach the app);
//  2. declares what they need in AndroidManifest.xml: the permissions (display over other apps, foreground service, full-screen
//     notification, wake lock, vibrate), the foreground service that rings (type specialUse: it plays the ringtone and shows the
//     card), the activity that shows the card over the lock screen and the service that runs the JS task answering Accept / Decline;
//  3. registers OfferOverlayPackage (the JS module `NativeModules.OfferOverlay`) in MainApplication.
//
// Everything is idempotent: running the prebuild twice changes nothing the second time.
const fs = require('fs')
const path = require('path')
const { AndroidConfig, withAndroidManifest, withDangerousMod, withMainApplication } = require('expo/config-plugins')

const MARKER = 'withOfferOverlay'
const PACKAGE = 'com.karolahealth.app'
const SOURCE_DIR = path.join(__dirname, 'offer-overlay')
const RING_SOUND = 'new_request.wav' // assets/sounds/, raw resource name `new_request`
const PERMISSIONS = [
	'android.permission.SYSTEM_ALERT_WINDOW',
	'android.permission.FOREGROUND_SERVICE',
	'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
	'android.permission.USE_FULL_SCREEN_INTENT',
	'android.permission.WAKE_LOCK',
	'android.permission.VIBRATE',
]

const withKotlinFiles = (config) =>
	withDangerousMod(config, [
		'android',
		(c) => {
			const appPackage = c.android && c.android.package
			if (appPackage !== PACKAGE) {
				throw new Error(`${MARKER}: the Kotlin files are written for the package ${PACKAGE}, but app.json says ${appPackage}.`)
			}
			const target = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'java', ...PACKAGE.split('.'), 'offer')
			fs.mkdirSync(target, { recursive: true })
			for (const file of fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.kt'))) {
				fs.copyFileSync(path.join(SOURCE_DIR, file), path.join(target, file))
			}
			// The ring sound (assets/sounds/new_request.wav) becomes the raw resource R.raw.new_request, which OfferRingService plays;
			// without the file the service plays the phone's default ringtone.
			const sound = path.join(c.modRequest.projectRoot, 'assets', 'sounds', RING_SOUND)
			if (fs.existsSync(sound)) {
				const raw = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'raw')
				fs.mkdirSync(raw, { recursive: true })
				fs.copyFileSync(sound, path.join(raw, RING_SOUND))
			}
			return c
		},
	])

const withOfferManifest = (config) =>
	withAndroidManifest(config, (c) => {
		const manifest = c.modResults.manifest
		manifest['uses-permission'] = manifest['uses-permission'] || []
		for (const name of PERMISSIONS) {
			if (!manifest['uses-permission'].some((p) => p.$['android:name'] === name)) {
				manifest['uses-permission'].push({ $: { 'android:name': name } })
			}
		}

		const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults)
		const addOnce = (list, name, entry) => {
			if (!list.some((item) => item.$['android:name'] === name)) list.push(entry)
		}
		app.service = app.service || []
		app.activity = app.activity || []

		addOnce(app.service, `${PACKAGE}.offer.OfferRingService`, {
			$: {
				'android:name': `${PACKAGE}.offer.OfferRingService`,
				'android:exported': 'false',
				'android:foregroundServiceType': 'specialUse',
			},
			property: [
				{
					$: {
						'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
						'android:value': 'Rings and shows an incoming home-care request until the provider answers it',
					},
				},
			],
		})
		addOnce(app.service, `${PACKAGE}.offer.OfferActionService`, {
			$: { 'android:name': `${PACKAGE}.offer.OfferActionService`, 'android:exported': 'false' },
		})
		addOnce(app.activity, `${PACKAGE}.offer.OfferActivity`, {
			$: {
				'android:name': `${PACKAGE}.offer.OfferActivity`,
				'android:exported': 'false',
				'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
				'android:excludeFromRecents': 'true',
				'android:launchMode': 'singleTask',
				'android:taskAffinity': '',
				'android:showWhenLocked': 'true',
				'android:turnScreenOn': 'true',
			},
		})
		return c
	})

const withPackageRegistration = (config) =>
	withMainApplication(config, (c) => {
		let source = c.modResults.contents
		if (source.includes(MARKER)) return c
		if (c.modResults.language !== 'kt') throw new Error(`${MARKER}: a Java MainApplication is not supported.`)
		const register = `add(${PACKAGE}.offer.OfferOverlayPackage()) // ${MARKER}`
		if (/PackageList\(this\)\.packages\.apply\s*\{/.test(source)) {
			source = source.replace(/(PackageList\(this\)\.packages\.apply\s*\{)/, `$1\n              ${register}`)
		} else if (/PackageList\(this\)\.packages/.test(source)) {
			source = source.replace(
				/PackageList\(this\)\.packages/,
				`PackageList(this).packages.toMutableList().apply {\n              ${register}\n            }`
			)
		} else {
			throw new Error(`${MARKER}: could not find PackageList(this).packages in MainApplication; register OfferOverlayPackage by hand.`)
		}
		c.modResults.contents = source
		return c
	})

module.exports = (config) => withPackageRegistration(withOfferManifest(withKotlinFiles(config)))
