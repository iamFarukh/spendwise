package com.spendwisemobile.shareintake

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Receives text shared into SpendWise via ACTION_SEND. Cold-start shares are read
 * from the launching Activity's intent (getInitialShare); shares that arrive while
 * the app is running are forwarded from MainActivity.onNewIntent via emitShare.
 */
class ShareIntakeModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ShareIntake"

  private var initialConsumed = false

  private fun isoNow(): String {
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(Date())
  }

  private fun payloadFrom(intent: Intent?): WritableMap? {
    if (intent == null || intent.action != Intent.ACTION_SEND) return null
    val type = intent.type ?: return null
    val map = Arguments.createMap()
    map.putString("receivedAt", isoNow())
    if (type == "text/plain") {
      val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
      map.putString("text", text)
      map.putString("contentType", "text")
    } else {
      map.putString("text", "")
      map.putString("contentType", "unsupported")
    }
    return map
  }

  @ReactMethod
  fun getInitialShare(promise: Promise) {
    if (initialConsumed) {
      promise.resolve(null)
      return
    }
    initialConsumed = true
    val activity = currentActivity
    promise.resolve(payloadFrom(activity?.intent))
  }

  fun emitShare(intent: Intent?) {
    val payload = payloadFrom(intent) ?: return
    reactContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("shareReceived", payload)
  }

  // Required so NativeEventEmitter has a paired add/remove on the native side.
  @ReactMethod fun addListener(eventName: String) {}

  @ReactMethod fun removeListeners(count: Int) {}

  init {
    instance = this
  }

  companion object {
    var instance: ShareIntakeModule? = null
  }
}
