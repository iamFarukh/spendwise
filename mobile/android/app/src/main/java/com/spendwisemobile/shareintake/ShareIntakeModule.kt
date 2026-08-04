package com.spendwisemobile.shareintake

import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Receives content shared into SpendWise via ACTION_SEND. Plain text is forwarded
 * as-is; shared images (Google Pay / PhonePe share receipt images, not text) are
 * run through on-device OCR (ML Kit) and forwarded as text so the JS parser
 * pipeline handles both identically. Cold-start shares come from the launching
 * Activity's intent (getInitialShare); shares that arrive while the app is running
 * are forwarded from MainActivity.onNewIntent via emitShare.
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

  private fun payload(text: String, contentType: String): WritableMap {
    val map = Arguments.createMap()
    map.putString("text", text)
    map.putString("contentType", contentType)
    map.putString("receivedAt", isoNow())
    return map
  }

  @Suppress("DEPRECATION")
  private fun imageUri(intent: Intent): Uri? =
    intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri

  /**
   * Builds the payload for an intent and delivers it via [onResult]. Text is
   * immediate; images require async OCR. Delivers null when the intent isn't a
   * share we handle.
   */
  private fun resolvePayload(intent: Intent?, onResult: (WritableMap?) -> Unit) {
    if (intent == null || intent.action != Intent.ACTION_SEND) {
      onResult(null)
      return
    }
    val type = intent.type
    when {
      type == "text/plain" -> {
        val text = intent.getStringExtra(Intent.EXTRA_TEXT) ?: ""
        onResult(payload(text, "text"))
      }
      type != null && type.startsWith("image/") -> {
        val uri = imageUri(intent)
        if (uri == null) {
          onResult(payload("", "unsupported"))
          return
        }
        runOcr(uri, onResult)
      }
      else -> onResult(payload("", "unsupported"))
    }
  }

  private fun runOcr(uri: Uri, onResult: (WritableMap?) -> Unit) {
    try {
      val image = InputImage.fromFilePath(reactContext, uri)
      val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
      recognizer.process(image)
        .addOnSuccessListener { visionText ->
          val text = visionText.text
          onResult(
            payload(text, if (text.isBlank()) "unsupported" else "text"),
          )
        }
        .addOnFailureListener { onResult(payload("", "unsupported")) }
    } catch (e: Exception) {
      onResult(payload("", "unsupported"))
    }
  }

  @ReactMethod
  fun getInitialShare(promise: Promise) {
    if (initialConsumed) {
      promise.resolve(null)
      return
    }
    initialConsumed = true
    resolvePayload(currentActivity?.intent) { promise.resolve(it) }
  }

  fun emitShare(intent: Intent?) {
    resolvePayload(intent) { payload ->
      if (payload == null) return@resolvePayload
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("shareReceived", payload)
    }
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
