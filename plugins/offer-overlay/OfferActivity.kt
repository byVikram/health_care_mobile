package com.karolahealth.app.offer

import android.app.Activity
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.Gravity
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.core.content.ContextCompat

/**
 * The care request card over the LOCK SCREEN (and with the screen off): OfferRingService's full-screen notification opens this
 * activity, which turns the screen on, shows the same card as the window over other apps and closes itself when the offer ends.
 * Accept / Decline go to the service, which stops the ring and calls the API.
 */
class OfferActivity : Activity() {
    private val gone = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            finish()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        val offer = intent?.extras ?: Bundle()
        // The offer is not on any more (answered or ended while this was starting): nothing to show.
        if (OfferRingService.instance == null) {
            finish()
            return
        }

        val margin = (14 * resources.displayMetrics.density).toInt()
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#B3000000"))
            setPadding(margin, margin * 3, margin, margin)
        }
        val card = OfferCard.build(
            this,
            offer,
            onAccept = { send(OfferKeys.ACTION_ACCEPT, offer) },
            onDecline = { send(OfferKeys.ACTION_DECLINE, offer) },
            onOpen = {}
        )
        root.addView(card, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.WRAP_CONTENT, Gravity.TOP))
        setContentView(root)

        ContextCompat.registerReceiver(this, gone, IntentFilter(OfferKeys.ACTION_GONE), ContextCompat.RECEIVER_NOT_EXPORTED)
    }

    private fun send(action: String, offer: Bundle) {
        startService(Intent(this, OfferRingService::class.java).setAction(action).putExtra(OfferKeys.REQUEST_ID, offer.getString(OfferKeys.REQUEST_ID)))
        finish()
    }

    override fun onDestroy() {
        try {
            unregisterReceiver(gone)
        } catch (error: Exception) {
            // never registered (the activity closed at once)
        }
        super.onDestroy()
    }
}
