import React, { useCallback, useRef } from "react"; 
import { StyleSheet, View } from "react-native";
import { WebView } from "@amazon-devices/webview";
import {
  useHideSplashScreenCallback,
  usePreventHideSplashScreen,
} from "@amazon-devices/react-native-kepler";

export const App = () => {
  usePreventHideSplashScreen();
  const hideSplashScreenCallback = useHideSplashScreenCallback();
  const webRef = useRef(null);

  const handleWebViewLoaded = useCallback(() => {
    hideSplashScreenCallback();
  }, [hideSplashScreenCallback]);
  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        onLoad={handleWebViewLoaded}
        hasTVPreferredFocus={true}
        allowSystemKeyEvents={true}
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
