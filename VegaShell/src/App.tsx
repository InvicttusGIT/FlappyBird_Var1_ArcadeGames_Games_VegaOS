import React, { useRef } from "react"; 
import { StyleSheet, View } from "react-native";
import { WebView } from "@amazon-devices/webview";

export const App = () => {
  const webRef = useRef(null);
  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        hasTVPreferredFocus={true}
        allowSystemKeyEvents={true}
        source={{
          uri: "https://c2npfk3m-5500.asse.devtunnels.ms/",
        }}
        javaScriptEnabled={true}
        onLoadStart={(event) => {
          console.log("onLoadStart url: ", event.nativeEvent.url)
        }}
        onLoad={(event) => {
          console.log("onLoad url: ", event.nativeEvent.url)
        }}
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
