import React, { useCallback, useRef } from "react"; 
import { BackHandler, StyleSheet, View } from "react-native";
import { WebView } from "@amazon-devices/webview";
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from "@amazon-devices/react-native-kepler";

export const App = () => {
  usePreventHideSplashScreen();
  const hideSplashScreenCallback = useHideSplashScreenCallback();
  const webRef = useRef(null);

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data && data.type === "exit-game") {
        BackHandler.exitApp();
        return;
      }
    } catch (e) {
      // Non-JSON messages can be ignored
    }
  }, []);

  const handleWebViewLoaded = useCallback(() => {
    hideSplashScreenCallback();
  }, [hideSplashScreenCallback]);
  return (
    <View style={styles.container}>
      <WebView
      style={{flex: 1, borderColor:'red'}}
        ref={webRef}
        onLoad={handleWebViewLoaded}
        onMessage={handleWebViewMessage}
        hasTVPreferredFocus={true}
        allowSystemKeyEvents={true}
        mediaPlaybackRequiresUserAction={false}
        allowsDefaultMediaControl={true}
        source={{
          uri: "https://vega-flappy-v1.netlify.app/",
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
