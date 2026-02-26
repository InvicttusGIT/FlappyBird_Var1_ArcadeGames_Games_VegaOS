import React, { useCallback, useEffect, useRef, useState } from "react"; 
import { BackHandler, StyleSheet, Text, View } from "react-native";
import { WebView } from "@amazon-devices/webview";
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from "@amazon-devices/react-native-kepler";
import AsyncStorage from "@amazon-devices/react-native-async-storage__async-storage";
import { sendHighScoreToWebView, handleHighScoreMessage } from "./highScoreBridge";
import { maybeHandleIapMessage, syncEntitlementToWebView } from "./iapBridge";
import { initializeFirebaseAnalytics, trackNativeAnalyticsEvent } from "./analytics/analyticsBridge";

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
  const webLoadedRef = useRef<boolean>(false);
  const entitlementSyncStartedRef = useRef<boolean>(false);
  const [webFailed, setWebFailed] = useState(false);
  console.log("webFailed", webFailed);
  

  // Generate or load a persistent per-device ID on mount (for ads and other usage).
  useEffect(() => {
    (async () => {
      await initializeFirebaseAnalytics();

      const id = await getOrCreateDeviceId();
      deviceIdRef.current = id;
      console.log("[DeviceId] on-mount deviceId:", id);
    })();
  }, []);

  // If web content never finishes loading, log a timeout analytics event and show fallback UI.
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!webLoadedRef.current) {
        setWebFailed(true);
        // Even on failure, hide the splash screen so the fallback UI is visible.
        hideSplashScreenCallback();
        void trackNativeAnalyticsEvent({
          name: "web_load_failed",
          params: { reason: "timeout" },
        });
      }
    }, 15000);
    return () => clearTimeout(timeout);
  }, [hideSplashScreenCallback]);

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

      // Web app signals that it is fully ready (Phaser loaded, assets ready, etc.)
      if (data && data.type === "web-ready") {
        webLoadedRef.current = true;
        setWebFailed(false);
        // Once web is ready (and not failed), we can safely sync entitlement and push premium state to web.
        if (!entitlementSyncStartedRef.current) {
          entitlementSyncStartedRef.current = true;
          syncEntitlementToWebView({ webRef: webRef.current });
        }
        return;
      }
      
      if (data && data.type === "exit-game") {
        BackHandler.exitApp();
        return;
      }

      // Web analytics events are forwarded by the game via postMessage.
      if (data && data.type === "analytics-event" && typeof data.name === "string") {
        const params =
          data && typeof data.params === "object" && data.params !== null ? data.params : undefined;
        await trackNativeAnalyticsEvent({
          name: data.name,
          params,
        });
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
    webLoadedRef.current = true;
    hideSplashScreenCallback();
    // Send high score to WebView when it's loaded
    sendHighScoreToWebView(webRef);
  }, [hideSplashScreenCallback]);


  return (
    <View style={styles.container}>
      {webFailed ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Flappy Wings is unavailable</Text>
          <Text style={styles.errorSubtitle}>
            Please check your connection or try again later.
          </Text>
        </View>
      ) : (
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
          onHttpError={() => {setWebFailed(true); hideSplashScreenCallback();}}
          onError={(event) => {
            const { url, code, description } = event?.nativeEvent || {};
            console.log("onError url: ", url);

            // Treat as real failure only if web never reported ready
            if (!webLoadedRef.current) {
              setWebFailed(true);
              // Hide splash so the unavailable UI is shown instead of closing.
              hideSplashScreenCallback();
              void trackNativeAnalyticsEvent({
                name: "web_load_failed",
                params: {
                  url: url || "",
                  code: typeof code === "number" || typeof code === "string" ? code : "",
                  description: description || "",
                },
              });
            }
          }}
        />
      )}
    </View>
  );
};

// Styles for layout, which are necessary for proper focus behavior
const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#000",
  },
  errorTitle: {
    color: "#ffffff",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    color: "#cccccc",
    fontSize: 14,
    textAlign: "center",
  },
});