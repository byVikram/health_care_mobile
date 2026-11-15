package com.karolahealth.app.offer

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.core.content.ContextCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.uimanager.ViewManager

/**
 * What the JS side can ask of the offer ring (services/offerNotification.ts): start it for a new request, end it, and the
 * "Display over other apps" permission (the card over other apps needs it; the ring and the lock-screen card do not).
 */
class OfferOverlayModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    override fun getName(): String = "OfferOverlay"

    @ReactMethod
    fun canDrawOverlays(promise: Promise) {
        promise.resolve(Settings.canDrawOverlays(context))
    }

    @ReactMethod
    fun openOverlaySettings() {
        val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:" + context.packageName))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
    }

    /** Starts the ring for one request. Rejects when Android refuses a foreground service now: the JS side then draws its own card. */
    @ReactMethod
    fun show(offer: ReadableMap, promise: Promise) {
        try {
            val extras = Bundle()
            extras.putString(OfferKeys.REQUEST_ID, offer.getString(OfferKeys.REQUEST_ID))
            extras.putString(OfferKeys.VISIT_ID, if (offer.hasKey(OfferKeys.VISIT_ID)) offer.getString(OfferKeys.VISIT_ID) else "")
            extras.putString(OfferKeys.BOOKING_TYPE, if (offer.hasKey(OfferKeys.BOOKING_TYPE)) offer.getString(OfferKeys.BOOKING_TYPE) else "INSTANT")
            extras.putString(OfferKeys.TITLE, if (offer.hasKey(OfferKeys.TITLE)) offer.getString(OfferKeys.TITLE) else "")
            extras.putString(OfferKeys.BODY, if (offer.hasKey(OfferKeys.BODY)) offer.getString(OfferKeys.BODY) else "")
            extras.putLong(OfferKeys.EXPIRES_AT, if (offer.hasKey(OfferKeys.EXPIRES_AT)) offer.getDouble(OfferKeys.EXPIRES_AT).toLong() else 0L)
            val intent = Intent(context, OfferRingService::class.java).setAction(OfferKeys.ACTION_SHOW).putExtras(extras)
            ContextCompat.startForegroundService(context, intent)
            promise.resolve(true)
        } catch (error: Exception) {
            promise.reject("OFFER_START_FAILED", error)
        }
    }

    /** Ends the ring and the card for a request (answered in the app, or withdrawn). */
    @ReactMethod
    fun hide(requestId: String) {
        Handler(Looper.getMainLooper()).post { OfferRingService.instance?.finishIfRequest(requestId) }
    }
}

class OfferOverlayPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
        listOf(OfferOverlayModule(reactContext))

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> = emptyList()
}
