import React, { useCallback, useEffect, useRef } from "react"; 
import { BackHandler, StyleSheet, View } from "react-native";
import { WebView } from "@amazon-devices/webview";
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from "@amazon-devices/react-native-kepler";
import AsyncStorage from "@amazon-devices/react-native-async-storage__async-storage";
import { sendHighScoreToWebView, handleHighScoreMessage } from "./highScoreBridge";
import { maybeHandleIapMessage, syncEntitlementToWebView } from "./iapBridge";

const DEVICE_ID_KEY = "flappybird_device_uuid";
function generateDeviceId(): string {
  // Generate a pseudo-unique ID: 3 random digits + current timestamp (ms)
  const rand3 = () => Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  const timestamp = Date.now().toString();
  return `${rand3()}${timestamp}`;
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length > 0) {
      return existing;
    }
    const fresh = generateDeviceId();
    try {
      await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
    } catch {
      // If persisting fails, still return the generated ID for this session.
    }
    return fresh;
  } catch {
    // If anything goes wrong, fall back to a fresh (non-persisted) ID.
    return generateDeviceId();
  }
}

export const App = () => {
  usePreventHideSplashScreen();
  const hideSplashScreenCallback = useHideSplashScreenCallback();
  const webRef = useRef<any>(null);
  const deviceIdRef = useRef<string | null>(null);
  const isPurchasingRef = useRef<boolean>(false);

  // Generate or load a persistent per-device ID on mount (for ads and other usage).
  useEffect(() => {
    (async () => {
      const id = await getOrCreateDeviceId();
      deviceIdRef.current = id;
      console.log("[DeviceId] on-mount deviceId:", id);
    })();
  }, []);

  const handleWebViewMessage = useCallback(async (event: any) => {
    // Avoid React synthetic event pooling warnings by capturing data synchronously.
    try {
      if (event && typeof event.persist === "function") {
        event.persist();
      }
    } catch {
      // ignore
    }
    const rawData: string | null | undefined = event?.nativeEvent?.data;

    // Exit app (Vega back button)
    try {
      if (!rawData) return;
      const data = JSON.parse(rawData);
      
      // Web console logs bridge
      if (data && data.type === "web-log") {
        const level = data.level || "log";
        const message = data.message || "";
        const timestamp = data.timestamp || "";
        
        // Format log message with timestamp and level
        const logMessage = `[WebView ${level.toUpperCase()}] ${timestamp ? `[${timestamp}] ` : ""}${message}`;
        
        // Use appropriate console method based on level
        switch (level) {
          case "error":
            console.error(logMessage);
            break;
          case "warn":
            console.warn(logMessage);
            break;
          case "info":
            console.info(logMessage);
            break;
          case "debug":
            console.debug(logMessage);
            break;
          default:
            console.log(logMessage);
        }
        return;
      }
      
      if (data && data.type === "exit-game") {
        BackHandler.exitApp();
        return;
      }
      
      // Device ID request for CTV ads (only for non-premium users)
      if (data && data.type === "get-device-id") {
        // Use our app-generated persistent device ID as the unique identifier.
        let currentId = deviceIdRef.current;
        if (!currentId) {
          currentId = await getOrCreateDeviceId();
          deviceIdRef.current = currentId;
        }
        console.log("[DeviceId] get-device-id sending:", currentId);

        if (webRef.current && typeof webRef.current.injectJavaScript === "function") {
          const json = JSON.stringify({
            type: "device-id",
            value: currentId,
          });
          const escaped = json
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");
          webRef.current.injectJavaScript(`
            (function() {
              try {
                const data = JSON.parse('${escaped}');
                const event = new MessageEvent('message', { data: data });
                window.dispatchEvent(event);
                document.dispatchEvent(event);
              } catch(e) {
                // Swallow errors on device
              }
            })();
          `);
        }
        return;
      }

      // IAP purchase request from WebView
      if (
        await maybeHandleIapMessage({
          data,
          webRef: webRef.current,
          isPurchasingRef,
        })
      ) {
        return;
      }
    } catch {
      // Ignore non‑JSON / malformed messages
    }

    // High‑score bridge (AsyncStorage + injectJavaScript)
    await handleHighScoreMessage(rawData, webRef);
  }, []);

  const handleWebViewLoaded = useCallback(() => {
    hideSplashScreenCallback();
    // Send high score to WebView when it's loaded
    sendHighScoreToWebView(webRef);

    // On app launch, sync entitlement status so the web app can set isPremiumUser persistently.
    // (Also a good place to re-check when app returns BG -> FG later.)
    syncEntitlementToWebView({ webRef: webRef.current });
  }, [hideSplashScreenCallback]);


  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        onLoad={handleWebViewLoaded}
        onMessage={handleWebViewMessage}
        hasTVPreferredFocus={true}
        allowSystemKeyEvents={true}
        mediaPlaybackRequiresUserAction={false}
        allowsDefaultMediaControl={true}
        source={{
          uri: "https://c2npfk3m-5500.asse.devtunnels.ms/",
        }}
        javaScriptEnabled={true}
        onError={(event) => {
          console.log("onError url: ", event.nativeEvent.url)
        }}
      />
    </View>
  );
};

// Styles for layout, which are necessary for proper focus behavior
const styles = StyleSheet.create({
  container: { flex: 1 }
});