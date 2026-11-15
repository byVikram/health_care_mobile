package com.karolahealth.app.offer

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs the JS task `OfferAction` (registered in index.ts) with the request id and the answer ("accept" / "decline"), so a button
 * pressed on the card is answered through the app's own API code and stored login, even when the app was closed.
 */
class OfferActionService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        val extras = intent?.extras ?: return null
        return HeadlessJsTaskConfig(OfferKeys.TASK_NAME, Arguments.fromBundle(extras), 25_000L, true)
    }
}
