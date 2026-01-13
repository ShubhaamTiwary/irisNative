package com.irisnative

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  companion object {
    var initialIntent: Intent? = null
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "irisNative"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

  /**
   * Handle initial intent when app is opened from deep link
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Ensure intent is set so getInitialURL() can access it
    if (intent != null) {
      initialIntent = intent
      val data = intent.data
      val action = intent.action
      val dataString = intent.dataString
      println("[MainActivity] onCreate - Intent action: $action, data: $data, dataString: $dataString")
      setIntent(intent)
    } else {
      println("[MainActivity] onCreate - Intent is null")
    }
    
    // Also check savedInstanceState for deep link data (in case activity was recreated)
    if (savedInstanceState != null && savedInstanceState.containsKey("intent_data")) {
      val savedData = savedInstanceState.getString("intent_data")
      println("[MainActivity] onCreate - Found saved intent data: $savedData")
    }
  }

  /**
   * Handle deep links when app is already running
   * This is needed because launchMode is set to "singleTask"
   */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    initialIntent = intent
    val data = intent.data
    val action = intent.action
    val dataString = intent.dataString
    println("[MainActivity] onNewIntent - Intent action: $action, data: $data, dataString: $dataString")
    setIntent(intent)
    
    // Send event to React Native about the new intent
    val url = intent.data?.toString() ?: intent.dataString
    sendIntentEventToReactNative(url)
  }
  
  /**
   * Send intent event to React Native via IntentModule
   */
  private fun sendIntentEventToReactNative(url: String?) {
    try {
      if (url == null) {
        println("[MainActivity] URL is null, cannot send event")
        return
      }
      
      // Use IntentModule instance to send the event
      val intentModule = IntentModule.getInstance()
      if (intentModule != null) {
        intentModule.sendNewIntentEvent(url)
      } else {
        println("[MainActivity] IntentModule instance not available yet")
      }
    } catch (e: Exception) {
      println("[MainActivity] Error sending intent event: ${e.message}")
      e.printStackTrace()
    }
  }
  
  /**
   * Save intent data in case activity is recreated
   */
  override fun onSaveInstanceState(outState: Bundle) {
    super.onSaveInstanceState(outState)
    if (intent?.data != null) {
      outState.putString("intent_data", intent.dataString)
      println("[MainActivity] onSaveInstanceState - Saved intent data: ${intent.dataString}")
    }
  }
}
