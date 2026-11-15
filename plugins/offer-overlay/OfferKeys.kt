package com.karolahealth.app.offer

/** Names shared by the offer ring service, its card, the activity and the JS module (plugins/withOfferOverlay.js copies these files in). */
object OfferKeys {
    const val REQUEST_ID = "requestId"
    const val VISIT_ID = "visitPublicId"
    const val BOOKING_TYPE = "bookingType"
    const val TITLE = "title"
    const val BODY = "body" // the card's lines, separated by newlines
    const val EXPIRES_AT = "expiresAtMs" // Long, epoch millis; 0 = no end

    const val ACTION_SHOW = "com.karolahealth.app.offer.SHOW"
    const val ACTION_ACCEPT = "com.karolahealth.app.offer.ACCEPT"
    const val ACTION_DECLINE = "com.karolahealth.app.offer.DECLINE"

    /** Broadcast (inside the app) saying the offer is over: the activity closes itself. */
    const val ACTION_GONE = "com.karolahealth.app.offer.GONE"

    /** The headless JS task that answers the request (index.ts registers it) and its two answers. */
    const val TASK_NAME = "OfferAction"
    const val ANSWER = "action"
    const val ANSWER_ACCEPT = "accept"
    const val ANSWER_DECLINE = "decline"
}
