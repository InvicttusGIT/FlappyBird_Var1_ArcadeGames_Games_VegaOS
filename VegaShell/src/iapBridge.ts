import {
  PurchaseResponseCode,
  FulfillmentResult,
  PurchaseUpdatesResponseCode,
  PurchasingService,
} from "@amazon-devices/keplerscript-appstore-iap-lib";

const ENTITLEMENT_SKU = "com.essentials.flappywings.pack2";

type WebViewRef = { injectJavaScript?: (code: string) => void } | null;

function sendToWebView(webRef: WebViewRef, payload: { type: string; success: boolean }) {
  if (!webRef || typeof webRef.injectJavaScript !== "function") {
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
    await PurchasingService.notifyFulfillment({
      receiptId,
      fulfillmentResult: FulfillmentResult.FULFILLED,
    } as any);
  } catch (e) {}
}

function extractReceiptId(purchase: any): string | null {
  if (!purchase) return null;
  const fromReceiptObj = purchase?.receipt?.receiptId;
  const fromTopLevel = purchase?.receiptId;
  const fromIdAlias = purchase?.receipt?.id;
  const receiptId = fromReceiptObj || fromTopLevel || fromIdAlias;
  return typeof receiptId === "string" && receiptId.length > 0 ? receiptId : null;
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
    }

    sendToWebView(webRef, { type: "iap-premium-status", success: premium });
  } catch (e) {
    // Don't flip premium on errors; just report false.
    sendToWebView(webRef, { type: "iap-premium-status", success: false });
  }
}

/**
 * Handle WebView -> Native IAP purchase request.
 * Returns true if the message was handled; false otherwise.
 *
 * WebView message shape:
 *  { type: "iap-purchase" }
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

  if (isPurchasingRef.current) {
    return true;
  }

  isPurchasingRef.current = true;

  try {
    // SKU only lives in Vega shell, never in web payload.
    const purchase: any = await PurchasingService.purchase({ sku: ENTITLEMENT_SKU });

    const responseCode = purchase?.responseCode;

    const isSuccessfulPurchase = responseCode === PurchaseResponseCode.SUCCESSFUL;
    const success = isSuccessfulPurchase || responseCode === PurchaseResponseCode.ALREADY_PURCHASED;

    if (success) {
      if (isSuccessfulPurchase) {
        const receiptId = extractReceiptId(purchase);
        if (receiptId) {
          await notifyFulfillmentFulfilled(receiptId);
        }
      }
      // After a successful purchase, also push premium status to WebView.
      sendToWebView(webRef, { type: "iap-premium-status", success: true });
    }

    sendToWebView(webRef, { type: "iap-result", success });
  } catch (e) {
    sendToWebView(webRef, { type: "iap-result", success: false });
  } finally {
    isPurchasingRef.current = false;
  }

  return true;
}

