import {
  getApps,
  initializeApp,
  setReactNativeAsyncStorage,
} from "@react-native-firebase/app";
import { getAnalytics, logEvent } from "@react-native-firebase/analytics";
import AsyncStorage from "@amazon-devices/react-native-async-storage__async-storage";
import { firebaseConfig } from "./firebaseConfig";

type AnalyticsParams = Record<string, unknown>;

const FIRST_OPEN_KEY = "flappybird_first_app_open_tracked";
const SCORE_BUCKETS = new Set(["10", "20", "30", "40", "50", "60", "70", "80", "90", "100", "100+"]);
const SCREEN_NAMES = new Set(["home", "gameplay", "gameover", "score"]);
const DAY_MODES = new Set(["day", "night"]);
const MUSIC_TOGGLES = new Set(["on", "off"]);
const SUB_ACTIONS = new Set(["sub_now", "sub_later", "success", "failed", "initiate", "open"]);

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
let initialized = false;

function isValidSubscriptionEvent(name: string): boolean {
  if (!name.startsWith("subscription_")) return false;
  for (const screenName of SCREEN_NAMES) {
    for (const action of SUB_ACTIONS) {
      if (name === `subscription_${screenName}_${action}`) return true;
    }
  }
  return false;
}

function isValidEventName(name: string): boolean {
  if (!name) return false;
  if (name === "first_app_open" || name === "app_open") return true;
  if (name === "web_load_failed") return true;
  if (name === "home_play_btn_pressed" || name === "game_start" || name === "player_crash") return true;
  if (name === "restart_btn_pressed" || name === "exit_yes" || name === "exit_no") return true;
  if (name === "ad_played" || name === "ad_closed" || name === "ad_called" || name === "ad_failed") return true;
  if (name.startsWith("view_")) return SCREEN_NAMES.has(name.slice("view_".length));
  if (name.startsWith("score_")) return SCORE_BUCKETS.has(name.slice("score_".length));
  if (name.startsWith("best_")) return SCORE_BUCKETS.has(name.slice("best_".length));
  if (name.startsWith("game_bg_")) return DAY_MODES.has(name.slice("game_bg_".length));
  if (name.startsWith("music_")) return MUSIC_TOGGLES.has(name.slice("music_".length));
  if (isValidSubscriptionEvent(name)) return true;
  return false;
}

function sanitizeParams(params?: AnalyticsParams): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  if (!params) return safe;
  Object.keys(params).forEach((key) => {
    const value = params[key];
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      safe[key] = value;
      return;
    }
    if (value === null || value === undefined) {
      safe[key] = "null";
      return;
    }
    safe[key] = String(value);
  });
  return safe;
}

function getAnalyticsInstance() {
  if (analyticsInstance) return analyticsInstance;
  try {
    analyticsInstance = getAnalytics();
    return analyticsInstance;
  } catch (err) {
    console.warn("[Analytics][Native] analytics instance unavailable:", err);
    return null;
  }
}

async function safeLogEvent(name: string, params?: AnalyticsParams) {
  const inst = getAnalyticsInstance();
  if (!inst) {
    console.warn("[Analytics][Native] analytics not initialized, dropping event:", name);
    return;
  }
  try {
    await logEvent(inst, name, sanitizeParams(params));
    console.log("[Analytics][Native]", name, params || {});
  } catch (err) {
    console.warn(`[Analytics][Native] failed to log event ${name}:`, err);
  }
}

export async function initializeFirebaseAnalytics(): Promise<void> {
  if (initialized) return;
  try {
    setReactNativeAsyncStorage(AsyncStorage as never);

    const app = getApps().length ? getApps()[0] : await initializeApp(firebaseConfig);
    analyticsInstance = getAnalytics(app);
    initialized = true;

    try {
      await logEvent(analyticsInstance, "app_initialized");
    } catch (err) {
      console.warn("[Analytics][Native] could not log app_initialized:", err);
    }

    try {
      const firstOpenDone = await AsyncStorage.getItem(FIRST_OPEN_KEY);
      if (!firstOpenDone) {
        await safeLogEvent("first_app_open");
        await AsyncStorage.setItem(FIRST_OPEN_KEY, "1");
      }
    } catch (err) {
      console.warn("[Analytics][Native] first_app_open check failed:", err);
    }

    await safeLogEvent("app_open");

    const errorUtils = (global as unknown as { ErrorUtils?: any }).ErrorUtils;
    if (errorUtils && typeof errorUtils.getGlobalHandler === "function" && typeof errorUtils.setGlobalHandler === "function") {
      const previousHandler = errorUtils.getGlobalHandler();
      errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
        const fatal = !!isFatal;
        safeLogEvent("app_crash", {
          message: error?.message?.slice(0, 200) || "Unknown error",
          stack: error?.stack?.slice(0, 500) || "No stack",
          fatal,
        });
        if (typeof previousHandler === "function") {
          previousHandler(error, isFatal);
        }
      });
    }
  } catch (error) {
    console.error("[Analytics][Native] Firebase initialization failed:", error);
  }
}

export async function trackNativeAnalyticsEvent(options: {
  name: string;
  params?: AnalyticsParams;
}): Promise<void> {
  const { name, params } = options;

  if (!isValidEventName(name)) {
    console.warn("[Analytics][Native] skipped invalid event name:", name);
    return;
  }

  if (!initialized) {
    await initializeFirebaseAnalytics();
  }
  await safeLogEvent(name, params);
}

