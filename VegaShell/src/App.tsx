import React, { useCallback, useRef } from "react"; 
import { BackHandler, StyleSheet, View } from "react-native";
import { WebView } from "@amazon-devices/webview";
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from "@amazon-devices/react-native-kepler";
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
