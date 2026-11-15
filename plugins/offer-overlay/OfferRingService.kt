package com.karolahealth.app.offer

import android.app.KeyguardManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.PixelFormat
import android.net.Uri
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.facebook.react.HeadlessJsTaskService

/**
 * Rings, buzzes and shows a new INSTANT care request until it is answered or ends, like a ride request: the push (a data-only,
 * high-priority FCM message) wakes the app, the Firebase headless handler asks the JS module (OfferOverlayModule) to start this
 * foreground service, and the service then does the rest by itself, so it works with the app closed:
 *
 *  - the sound is OUR OWN player (the phone's default ringtone, looping, at ring volume), not a notification sound, so Samsung's
 *    notification settings, the "cool-down" Android applies to repeated notifications and the channel cannot mute it; it follows the
 *    ring volume and the silent / vibrate switch like a phone call;
 *  - screen on and "Display over other apps" allowed: the card is drawn over whatever is on screen (OfferCard);
 *  - screen off or locked: a full-screen notification opens OfferActivity over the lock screen (the same card);
 *  - without the permission: a heads-up notification with Accept / Decline buttons.
 * Accept / Decline start the headless JS task `OfferAction` (OfferActionService), which calls the same API as the in-app sheet.
 */
class OfferRingService : Service() {
    private val handler = Handler(Looper.getMainLooper())
    private var player: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var overlay: View? = null
    private var offer: Bundle? = null
    private val endRunnable = Runnable { finishOffer() }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            OfferKeys.ACTION_SHOW -> show(intent.extras ?: Bundle())
            OfferKeys.ACTION_ACCEPT -> answer(OfferKeys.ANSWER_ACCEPT, intent.getStringExtra(OfferKeys.REQUEST_ID))
            OfferKeys.ACTION_DECLINE -> answer(OfferKeys.ANSWER_DECLINE, intent.getStringExtra(OfferKeys.REQUEST_ID))
            else -> if (offer == null) stopSelf()
        }
        return START_NOT_STICKY
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onDestroy() {
        clearOffer()
        instance = null
        super.onDestroy()
    }

    private fun show(newOffer: Bundle) {
        val requestId = newOffer.getString(OfferKeys.REQUEST_ID)
        val expiresAt = newOffer.getLong(OfferKeys.EXPIRES_AT, 0L)
        val locked = isLocked()
        val overlayAllowed = Settings.canDrawOverlays(this)
        val inWindow = overlayAllowed && !locked

        // A foreground service must call startForeground right after it is started, whatever happens next.
        ensureChannels()
        val notification = buildNotification(newOffer, fullScreen = !inWindow)
        try {
            if (Build.VERSION.SDK_INT >= 34) {
                ServiceCompat.startForeground(this, NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
            } else {
                startForeground(NOTIFICATION_ID, notification)
            }
        } catch (error: Exception) {
            Log.w(TAG, "Could not start the foreground service for the offer", error)
            stopSelf()
            return
        }

        clearOffer() // a newer offer replaces the one on screen
        val leftMs = if (expiresAt > 0) expiresAt - System.currentTimeMillis() else Long.MAX_VALUE
        if (requestId.isNullOrEmpty() || leftMs < 1500) { // ended while the push was on its way
            finishOffer()
            return
        }
        offer = newOffer
        startRinging()
        startVibrating()
        if (inWindow) addOverlay(newOffer)
        handler.postDelayed(endRunnable, if (expiresAt > 0) leftMs else MAX_RING_MS)
    }

    // ----- what the provider hears and feels -----

    private fun startRinging() {
        try {
            val player = MediaPlayer()
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            player.setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
            // Our own sound (res/raw/new_request, copied in by the plugin) when the app has it, else the phone's default ringtone.
            val soundId = resources.getIdentifier("new_request", "raw", packageName)
            val source = if (soundId != 0) Uri.parse("android.resource://$packageName/$soundId") else RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)
            player.setDataSource(this, source)
            player.isLooping = true
            player.prepare()
            player.start()
            this.player = player
        } catch (error: Exception) {
            Log.w(TAG, "Could not play the ring sound", error)
            playDefaultRingtone()
        }
    }

    /** The fallback when our own sound cannot be played: the phone's default ringtone. */
    private fun playDefaultRingtone() {
        try {
            player?.release()
            player = null
            val player = MediaPlayer()
            player.setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            )
            player.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE))
            player.isLooping = true
            player.prepare()
            player.start()
            this.player = player
        } catch (error: Exception) {
            Log.w(TAG, "Could not play the default ringtone either", error)
        }
    }

    @Suppress("DEPRECATION")
    private fun startVibrating() {
        try {
            val vibrator = if (Build.VERSION.SDK_INT >= 31) {
                (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager).defaultVibrator
            } else {
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }
            if (Build.VERSION.SDK_INT >= 26) {
                vibrator.vibrate(VibrationEffect.createWaveform(VIBRATION_PATTERN, 0))
            } else {
                vibrator.vibrate(VIBRATION_PATTERN, 0)
            }
            this.vibrator = vibrator
        } catch (error: Exception) {
            Log.w(TAG, "Could not vibrate", error)
        }
    }

    // ----- what the provider sees -----

    private fun addOverlay(offer: Bundle) {
        try {
            val card = OfferCard.build(
                this,
                offer,
                onAccept = { answer(OfferKeys.ANSWER_ACCEPT, offer.getString(OfferKeys.REQUEST_ID)) },
                onDecline = { answer(OfferKeys.ANSWER_DECLINE, offer.getString(OfferKeys.REQUEST_ID)) },
                onOpen = {
                    openApp()
                    finishOffer()
                }
            )
            val margin = (12 * resources.displayMetrics.density).toInt()
            val holder = FrameLayout(this).apply {
                setPadding(margin, 0, margin, 0)
                addView(card)
            }
            val params = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            )
            params.gravity = Gravity.TOP
            params.y = statusBarHeight() + margin
            (getSystemService(Context.WINDOW_SERVICE) as WindowManager).addView(holder, params)
            overlay = holder
        } catch (error: Exception) {
            // The heads-up notification below is still on screen.
            Log.w(TAG, "Could not draw the card over other apps", error)
        }
    }

    private fun statusBarHeight(): Int {
        val id = resources.getIdentifier("status_bar_height", "dimen", "android")
        return if (id > 0) resources.getDimensionPixelSize(id) else 0
    }

    private fun smallIcon(): Int {
        val id = resources.getIdentifier("notification_icon", "drawable", packageName)
        return if (id != 0) id else android.R.drawable.ic_dialog_info
    }

    private fun ensureChannels() {
        if (Build.VERSION.SDK_INT < 26) return
        val manager = getSystemService(NotificationManager::class.java)
        // Both are silent: the service rings and buzzes itself. ALERT is high so it pops up and can open the lock-screen activity.
        val alert = NotificationChannel(CHANNEL_ALERT, "Incoming care request", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Shown while a new care request rings."
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        val quiet = NotificationChannel(CHANNEL_QUIET, "Care request ringing", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Keeps the app awake while a new care request rings over another app."
            setSound(null, null)
            enableVibration(false)
            lockscreenVisibility = Notification.VISIBILITY_PUBLIC
        }
        manager.createNotificationChannel(alert)
        manager.createNotificationChannel(quiet)
    }

    private fun buildNotification(offer: Bundle, fullScreen: Boolean): Notification {
        val requestId = offer.getString(OfferKeys.REQUEST_ID) ?: ""
        val expiresAt = offer.getLong(OfferKeys.EXPIRES_AT, 0L)
        val lines = (offer.getString(OfferKeys.BODY) ?: "").split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        val summary = listOfNotNull(lines.firstOrNull(), lines.firstOrNull { it.contains("km away") }).joinToString(" · ")

        val builder = NotificationCompat.Builder(this, if (fullScreen) CHANNEL_ALERT else CHANNEL_QUIET)
            .setSmallIcon(smallIcon())
            .setColor(0xFF2B6F71.toInt())
            .setContentTitle("New visit request")
            .setContentText(summary.ifEmpty { "Tap to open" })
            .setStyle(NotificationCompat.InboxStyle().also { style -> lines.forEach { style.addLine(it) } })
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setContentIntent(openAppIntent())
            .addAction(0, "Decline", answerIntent(OfferKeys.ACTION_DECLINE, requestId, 11))
            .addAction(0, "Accept", answerIntent(OfferKeys.ACTION_ACCEPT, requestId, 12))
        if (expiresAt > 0) {
            builder.setWhen(expiresAt).setUsesChronometer(true).setChronometerCountDown(true).setTimeoutAfter(
                (expiresAt - System.currentTimeMillis()).coerceAtLeast(1000L)
            )
        }
        if (fullScreen) {
            val activity = Intent(this, OfferActivity::class.java)
                .putExtras(offer)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            builder.setFullScreenIntent(
                PendingIntent.getActivity(this, 10, activity, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT),
                true
            )
        }
        return builder.build()
    }

    private fun answerIntent(action: String, requestId: String, code: Int): PendingIntent {
        val intent = Intent(this, OfferRingService::class.java).setAction(action).putExtra(OfferKeys.REQUEST_ID, requestId)
        return PendingIntent.getService(this, code, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun openAppIntent(): PendingIntent {
        val intent = packageManager.getLaunchIntentForPackage(packageName) ?: Intent()
        return PendingIntent.getActivity(this, 13, intent, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    private fun openApp() {
        try {
            val intent = packageManager.getLaunchIntentForPackage(packageName) ?: return
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            startActivity(intent)
        } catch (error: Exception) {
            Log.w(TAG, "Could not open the app", error)
        }
    }

    private fun isLocked(): Boolean {
        val keyguard = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
        val power = getSystemService(Context.POWER_SERVICE) as PowerManager
        return keyguard.isKeyguardLocked || !power.isInteractive
    }

    // ----- the end of the offer -----

    /** Accept / Decline: stop everything at once, then let the JS task call the API (it works with the app closed). */
    private fun answer(answer: String, requestId: String?) {
        if (requestId.isNullOrEmpty()) {
            finishOffer()
            return
        }
        try {
            val task = Intent(this, OfferActionService::class.java)
                .putExtra(OfferKeys.REQUEST_ID, requestId)
                .putExtra(OfferKeys.ANSWER, answer)
            HeadlessJsTaskService.acquireWakeLockNow(this)
            startService(task)
        } catch (error: Exception) {
            Log.w(TAG, "Could not start the task that answers the request", error)
        }
        finishOffer()
    }

    /** The offer ended (answered, expired, taken): stop the sound, the buzz and the card, and the service. */
    fun finishOffer() {
        clearOffer()
        try {
            sendBroadcast(Intent(OfferKeys.ACTION_GONE).setPackage(packageName))
        } catch (error: Exception) {
            Log.w(TAG, "Could not tell the lock-screen card to close", error)
        }
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    fun finishIfRequest(requestId: String) {
        val current = offer?.getString(OfferKeys.REQUEST_ID)
        if (current == null || current == requestId) finishOffer()
    }

    private fun clearOffer() {
        handler.removeCallbacks(endRunnable)
        try {
            player?.stop()
        } catch (error: Exception) {
            // never started
        }
        player?.release()
        player = null
        vibrator?.cancel()
        vibrator = null
        overlay?.let {
            try {
                (getSystemService(Context.WINDOW_SERVICE) as WindowManager).removeViewImmediate(it)
            } catch (error: Exception) {
                // already gone
            }
        }
        overlay = null
        offer = null
    }

    companion object {
        private const val TAG = "OfferRingService"
        private const val NOTIFICATION_ID = 7301
        private const val CHANNEL_ALERT = "care_request_live_alert"
        private const val CHANNEL_QUIET = "care_request_live_quiet"
        private const val MAX_RING_MS = 60_000L
        private val VIBRATION_PATTERN = longArrayOf(0, 700, 400, 700, 400, 700, 800)

        /** The running service, so the JS module can end a request (the app's own process). Main thread only. */
        @Volatile
        var instance: OfferRingService? = null
    }
}
