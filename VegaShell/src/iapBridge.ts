import {
  PurchaseResponseCode,
  FulfillmentResult,
  PurchaseUpdatesResponseCode,
  PurchasingService,
} from "@amazon-devices/keplerscript-appstore-iap-lib";

const ENTITLEMENT_SKU = "com.flappywings.game.vega";

type WebViewRef = { injectJavaScript?: (code: string) => void } | null;

function sendToWebView(webRef: WebViewRef, payload: { type: string; success: boolean }) {
  if (!webRef || typeof webRef.injectJavaScript !== "function") {
    console.error("[IAP] WebView ref not available; cannot send result");
    return;
  }

  const json = JSON.stringify(payload);
  const escaped = json
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");

  webRef.injectJavaScript(`
    (function () {
      try {
        const data = JSON.parse('${escaped}');
        const event = new MessageEvent('message', { data: data });
        window.dispatchEvent(event);
        document.dispatchEvent(event);
      } catch (e) {
        // Swallow errors on device
      }
    })();
  `);
}

function isEntitlementActiveFromReceipts(receipts: any[]): boolean {
  try {
    for (const r of receipts || []) {
      const sku = r?.sku;
      const cancelled = r?.isCancelled === true;
      if (sku === ENTITLEMENT_SKU && !cancelled) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

async function notifyFulfillmentFulfilled(receiptId: string | undefined | null) {
  if (!receiptId) return;
  try {
    console.log("[IAP] notifyFulfillment(FULFILLED) for receiptId:", receiptId);
    await PurchasingService.notifyFulfillment({
      receiptId,
      fulfillmentResult: FulfillmentResult.FULFILLED,
    } as any);
    console.log("[IAP] notifyFulfillment(FULFILLED) done");
  } catch (e) {
    console.error("[IAP] notifyFulfillment(FULFILLED) failed:", e);
  }
}

/**
 * Query Amazon IAP for existing purchases and send premium status into the WebView.
 * This is what makes the entitlement "sticky" across app relaunch.
 */
export async function syncEntitlementToWebView(params: {
  webRef: WebViewRef;
}): Promise<void> {
  const { webRef } = params;
  try {
    console.log("[IAP] Sync entitlement status via getPurchaseUpdates...");
    let premium = false;

    // First call with reset=true to get a full view of receipts (recommended when app starts).
    let res: any = await PurchasingService.getPurchaseUpdates({ reset: true } as any);
    if (res?.responseCode === PurchaseUpdatesResponseCode.SUCCESSFUL) {
      premium = premium || isEntitlementActiveFromReceipts(res?.receiptList || []);
      while (res?.hasMore) {
        res = await PurchasingService.getPurchaseUpdates({ reset: false } as any);
        if (res?.responseCode !== PurchaseUpdatesResponseCode.SUCCESSFUL) break;
        premium = premium || isEntitlementActiveFromReceipts(res?.receiptList || []);
      }
    } else {
      console.log("[IAP] getPurchaseUpdates responseCode:", res?.responseCode ?? "undefined");
    }

    console.log("[IAP] Entitlement premium status:", premium);
    sendToWebView(webRef, { type: "iap-premium-status", success: premium });
  } catch (e) {
    console.error("[IAP] Failed to sync entitlement status:", e);
    // Don't flip premium on errors; just report false.
    sendToWebView(webRef, { type: "iap-premium-status", success: false });
  }
}

/**
 * Handle WebView -> Native IAP purchase request.
 * Returns true if the message was handled; false otherwise.
 *
 * WebView message shape:
 *  { type: "iap-purchase", sku?: string }
 *
 * WebView response shape (minimal by request):
 *  { type: "iap-result", success: boolean }
 */
export async function maybeHandleIapMessage(params: {
  data: any;
  webRef: WebViewRef;
  isPurchasingRef: { current: boolean };
}): Promise<boolean> {
  const { data, webRef, isPurchasingRef } = params;
  if (!data || data.type !== "iap-purchase") return false;

  const sku = (typeof data.sku === "string" && data.sku.length > 0) ? data.sku : ENTITLEMENT_SKU;

  if (isPurchasingRef.current) {
    console.log("[IAP] Purchase already in progress; ignoring request for SKU:", sku);
    return true;
  }

  console.log("[IAP] Purchase request received from WebView. SKU:", sku);
  isPurchasingRef.current = true;

  try {
    console.log("[IAP] Calling PurchasingService.purchase() ...");
    const purchase: any = await PurchasingService.purchase({ sku });

    const responseCode = purchase?.responseCode;
    console.log("[IAP] Purchase responseCode:", responseCode ?? "undefined");

    const success =
      responseCode === PurchaseResponseCode.SUCCESSFUL ||
      responseCode === PurchaseResponseCode.ALREADY_PURCHASED;
    console.log("[IAP] Purchase success:", success);

    if (success) {
      const receiptId = purchase?.receipt?.receiptId;
      await notifyFulfillmentFulfilled(receiptId);
      // After a successful purchase, also push premium status to WebView.
      sendToWebView(webRef, { type: "iap-premium-status", success: true });
    }

    sendToWebView(webRef, { type: "iap-result", success });
  } catch (e) {
    console.error("[IAP] Purchase threw error:", e);
    sendToWebView(webRef, { type: "iap-result", success: false });
  } finally {
    isPurchasingRef.current = false;
    console.log("[IAP] Purchase flow finished");
  }

  return true;
}

