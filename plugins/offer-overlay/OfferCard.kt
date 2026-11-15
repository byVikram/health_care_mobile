package com.karolahealth.app.offer

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

/**
 * The card a provider sees for a new care request: an icon tile, "New visit request" with an INSTANT tag, the service, the lines the
 * server wrote (distance, "Patient is waiting"), what the provider collects, a countdown bar and the Decline / Accept buttons. Built in
 * code (no layout files to copy) and used both by the window over other apps (OfferRingService) and by the lock-screen activity.
 */
object OfferCard {
    private val TEAL = Color.parseColor("#2B6F71")
    private val TEAL_SOFT = Color.parseColor("#E6F2F2")
    private val GREEN = Color.parseColor("#1E8E4E")
    private val GREEN_SOFT = Color.parseColor("#E3F6EA")
    private val INK = Color.parseColor("#14282A")
    private val MUTED = Color.parseColor("#5C6F70")

    private fun dp(context: Context, value: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, value.toFloat(), context.resources.displayMetrics).toInt()

    private fun shape(context: Context, fill: Int, radiusDp: Int, strokeColor: Int? = null): GradientDrawable =
        GradientDrawable().apply {
            setColor(fill)
            cornerRadius = dp(context, radiusDp).toFloat()
            if (strokeColor != null) setStroke(dp(context, 2), strokeColor)
        }

    private fun text(context: Context, value: String, sizeSp: Float, color: Int, bold: Boolean = false): TextView =
        TextView(context).apply {
            this.text = value
            setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
            setTextColor(color)
            if (bold) setTypeface(typeface, Typeface.BOLD)
        }

    private fun button(context: Context, label: String, filled: Boolean, onClick: () -> Unit): TextView =
        text(context, label, 16f, if (filled) Color.WHITE else TEAL, true).apply {
            gravity = Gravity.CENTER
            background = if (filled) shape(context, TEAL, 24) else shape(context, Color.WHITE, 24, TEAL)
            setOnClickListener { onClick() }
        }

    fun build(context: Context, offer: Bundle, onAccept: () -> Unit, onDecline: () -> Unit, onOpen: () -> Unit): View {
        val lines = (offer.getString(OfferKeys.BODY) ?: "").split("\n").map { it.trim() }.filter { it.isNotEmpty() }
        val service = lines.firstOrNull() ?: "Care request"
        val amount = lines.firstOrNull { it.startsWith("Collect") }
        val details = lines.drop(1).filter { it != amount }
        val instant = (offer.getString(OfferKeys.BOOKING_TYPE) ?: "INSTANT").equals("INSTANT", ignoreCase = true)
        val expiresAt = offer.getLong(OfferKeys.EXPIRES_AT, 0L)

        val card = LinearLayout(context).apply {
            orientation = LinearLayout.VERTICAL
            background = shape(context, Color.WHITE, 22)
            elevation = dp(context, 10).toFloat()
            setPadding(dp(context, 16), dp(context, 16), dp(context, 16), dp(context, 16))
        }

        // Header: icon tile, the title with the INSTANT tag and the service, the countdown chip.
        val header = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        val tile = text(context, "+", 26f, TEAL, true).apply {
            gravity = Gravity.CENTER
            background = shape(context, TEAL_SOFT, 14)
        }
        header.addView(tile, LinearLayout.LayoutParams(dp(context, 46), dp(context, 46)))

        val titles = LinearLayout(context).apply { orientation = LinearLayout.VERTICAL }
        val titleRow = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL }
        titleRow.addView(text(context, "New visit request", 17f, INK, true))
        if (instant) {
            val tag = text(context, "INSTANT", 10f, GREEN, true).apply {
                background = shape(context, GREEN_SOFT, 6)
                setPadding(dp(context, 7), dp(context, 2), dp(context, 7), dp(context, 2))
            }
            val tagParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            tagParams.leftMargin = dp(context, 8)
            titleRow.addView(tag, tagParams)
        }
        titles.addView(titleRow)
        titles.addView(text(context, service, 14f, INK))
        val titlesParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        titlesParams.leftMargin = dp(context, 12)
        header.addView(titles, titlesParams)

        val chip = text(context, "", 13f, TEAL, true).apply {
            background = shape(context, TEAL_SOFT, 14)
            setPadding(dp(context, 10), dp(context, 4), dp(context, 10), dp(context, 4))
            visibility = View.GONE
        }
        header.addView(chip)
        card.addView(header)

        if (details.isNotEmpty()) {
            val detailsView = text(context, details.joinToString("\n"), 14f, MUTED)
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.topMargin = dp(context, 12)
            card.addView(detailsView, params)
        }
        if (amount != null) {
            val amountView = text(context, amount, 16f, INK, true)
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            params.topMargin = dp(context, 6)
            card.addView(amountView, params)
        }

        // The countdown: a bar that empties and the seconds left, until the offer ends.
        val total = if (instant && expiresAt > 0) maxOf(expiresAt - System.currentTimeMillis(), 1L) else 0L
        if (total > 0) {
            val bar = ProgressBar(context, null, android.R.attr.progressBarStyleHorizontal).apply {
                max = 1000
                progress = 1000
                progressTintList = ColorStateList.valueOf(TEAL)
                progressBackgroundTintList = ColorStateList.valueOf(TEAL_SOFT)
            }
            val params = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(context, 6))
            params.topMargin = dp(context, 14)
            card.addView(bar, params)
            chip.visibility = View.VISIBLE

            val handler = Handler(Looper.getMainLooper())
            val tick = object : Runnable {
                override fun run() {
                    val left = (expiresAt - System.currentTimeMillis()).coerceAtLeast(0L)
                    chip.text = "${(left + 999) / 1000}s"
                    bar.progress = (left * 1000 / total).toInt().coerceIn(0, 1000)
                    if (left > 0) handler.postDelayed(this, 200)
                }
            }
            tick.run()
            card.addOnAttachStateChangeListener(object : View.OnAttachStateChangeListener {
                override fun onViewAttachedToWindow(v: View) {}
                override fun onViewDetachedFromWindow(v: View) {
                    handler.removeCallbacks(tick)
                }
            })
        }

        val buttons = LinearLayout(context).apply { orientation = LinearLayout.HORIZONTAL }
        val height = dp(context, 50)
        val decline = button(context, "Decline", false, onDecline)
        val accept = button(context, "Accept", true, onAccept)
        val declineParams = LinearLayout.LayoutParams(0, height, 1f)
        declineParams.rightMargin = dp(context, 6)
        val acceptParams = LinearLayout.LayoutParams(0, height, 1f)
        acceptParams.leftMargin = dp(context, 6)
        buttons.addView(decline, declineParams)
        buttons.addView(accept, acceptParams)
        val buttonsParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT)
        buttonsParams.topMargin = dp(context, 14)
        card.addView(buttons, buttonsParams)

        // A tap on the text (not a button) opens the app.
        header.setOnClickListener { onOpen() }
        return card
    }
}
