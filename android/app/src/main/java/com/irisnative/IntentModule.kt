package com.irisnative

import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class IntentModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        @Volatile
        private var instance: IntentModule? = null
        
        fun getInstance(): IntentModule? = instance
    }

    init {
        instance = this
    }

    override fun getName(): String {
        return "IntentModule"
    }

    /**
     * Send event to React Native when a new intent is received
     */
    fun sendNewIntentEvent(url: String?) {
        try {
            if (url == null) return
            val params: WritableMap = Arguments.createMap()
            params.putString("url", url)
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("newIntent", params)
            println("[IntentModule] Sent newIntent event: $url")
        } catch (e: Exception) {
            println("[IntentModule] Error sending newIntent event: ${e.message}")
            e.printStackTrace()
        }
    }

    @ReactMethod
    fun getInitialURL(promise: Promise) {
        try {
            var intent: Intent? = null
            var url: String? = null

            // Strategy 1: Try to get from current activity's intent
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                intent = activity.intent
                println("[IntentModule] Got intent from currentActivity: ${intent?.action}, data: ${intent?.data}")
            }

            // Strategy 2: If null, try to get from MainActivity static storage
            if (intent == null) {
                intent = MainActivity.initialIntent
                println("[IntentModule] Got intent from MainActivity.initialIntent: ${intent?.action}, data: ${intent?.data}")
            }

            // Extract URL from intent data
            if (intent != null) {
                url = intent.data?.toString()
                println("[IntentModule] Extracted URL from intent: $url")
                
                // Also check if intent has ACTION_VIEW (common for deep links)
                if (url == null && Intent.ACTION_VIEW == intent.action) {
                    url = intent.dataString
                    println("[IntentModule] Extracted URL from ACTION_VIEW: $url")
                }
            }

            println("[IntentModule] Final URL result: $url")
            promise.resolve(url)
        } catch (e: Exception) {
            println("[IntentModule] Error getting initial URL: ${e.message}")
            e.printStackTrace()
            promise.reject("ERROR", e.message ?: "Unknown error", e)
        }
    }
}

