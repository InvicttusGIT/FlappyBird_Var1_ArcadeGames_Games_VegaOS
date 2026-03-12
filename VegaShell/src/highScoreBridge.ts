import AsyncStorage from "@amazon-devices/react-native-async-storage__async-storage";

const HIGH_SCORE_KEY = "flappyBirdHighScore";

function injectMessage(webRef: any, payload: unknown) {
  if (!webRef || !webRef.current || typeof webRef.current.injectJavaScript !== "function") {
    return;
  }

  const json = JSON.stringify(payload);
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

export async function sendHighScoreToWebView(webRef: any) {
  try {
    const stored = await AsyncStorage.getItem(HIGH_SCORE_KEY);
    const highScore = stored ? parseInt(stored, 10) : 0;
    injectMessage(webRef, { type: "high-score", value: highScore });
  } catch {
    injectMessage(webRef, { type: "high-score", value: 0 });
  }
}

export async function handleHighScoreMessage(rawMessage: string | null | undefined, webRef: any) {
  try {
    if (!rawMessage) return;
    const data = JSON.parse(rawMessage);

    if (!data || typeof data !== "object") {
      return;
    }

    if (data.type === "get-high-score") {
      await sendHighScoreToWebView(webRef);
      return;
    }

    if (data.type === "save-high-score") {
      try {
        const jsonValue = JSON.stringify(data.value);
        await AsyncStorage.setItem(HIGH_SCORE_KEY, jsonValue);
        injectMessage(webRef, { type: "high-score", value: data.value });
      } catch {
        // Ignore persistence errors
      }
      return;
    }
  } catch {
    // Ignore non‑JSON / malformed messages
  }
}

