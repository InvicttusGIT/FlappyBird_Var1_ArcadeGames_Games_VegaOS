import React, { useCallback, useRef } from "react"; 
import { BackHandler, StyleSheet, View } from "react-native";
import { WebView } from "@amazon-devices/webview";
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from "@amazon-devices/react-native-kepler";
import DeviceInfo from "@amazon-devices/react-native-device-info";
import { sendHighScoreToWebView, handleHighScoreMessage } from "./highScoreBridge";

export const App = () => {
  usePreventHideSplashScreen();
  const hideSplashScreenCallback = useHideSplashScreenCallback();
  const webRef = useRef<any>(null);

  const handleWebViewMessage = useCallback(async (event: any) => {
    // Exit app (Vega back button)
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === "exit-game") {
        BackHandler.exitApp();
        return;
      }
      
      // Device ID request for CTV ads (only for non-premium users)
      if (data && data.type === "get-device-id") {
        const deviceId = DeviceInfo.getDeviceId();
        if (webRef.current && typeof webRef.current.injectJavaScript === "function") {
          // Send device ID if available, otherwise send null (will use default UUID in parser)
          const json = JSON.stringify({ type: "device-id", value: deviceId || null });
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
    } catch {
      // Ignore non‑JSON / malformed messages
    }

    // High‑score bridge (AsyncStorage + injectJavaScript)
    await handleHighScoreMessage(event, webRef);
  }, []);

  const handleWebViewLoaded = useCallback(() => {
    hideSplashScreenCallback();
    // Send high score to WebView when it's loaded
    sendHighScoreToWebView(webRef);
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
