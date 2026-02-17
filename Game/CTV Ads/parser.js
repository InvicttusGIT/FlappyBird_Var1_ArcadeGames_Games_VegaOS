/**
 * CTV Adtelligent VAST helper, ported from CtvVastAdWrapper.kt and docs.
 *
 * Main public functions:
 *  - CtvAds.buildCtvTagUrl(params): construct the Adtelligent VAST tag URL.
 *  - CtvAds.parseCtvVastResponse(xmlText): parse a VAST wrapper/inline response.
 *
 * Additional helpers (pingPixels, resolveInlineMediaFile) can be added later
 * to mirror loadWrapperFromUrl/fetchInlineMediaFile behaviour.
 */
(function (global) {
    'use strict';

    var cfg = global.CtvAdsConfig || {};

    /**
     * Build the Adtelligent CTV VAST tag URL.
     * Mirrors CtvVastAdWrapper.buildTagUrl / CtvRequestParams and the docs.
     *
     * Required params:
     *  - width, height, userAgent, userIp, deviceModel, deviceMake,
     *    deviceCategory, appStoreUrl, deviceId
     *
     * Optional params:
     *  - appName, appBundle, vastVersion, aid, cacheBuster
     */
    function buildCtvTagUrl(params) {
        if (!params) params = {};

        var baseUrl = (cfg.baseUrl || 'https://a.adtelligent.com/').trim();
        var url = new URL(baseUrl);

        var cacheBuster = params.cacheBuster || randomCacheBuster();
        var width = params.width || cfg.defaultWidth || 0;
        var height = params.height || cfg.defaultHeight || 0;
        var vastVersion = params.vastVersion || params.vast_version || cfg.defaultVastVersion || '2';
        var aid = params.aid || cfg.defaultAid;

        url.searchParams.set('width', String(width));
        url.searchParams.set('height', String(height));
        url.searchParams.set('cb', cacheBuster);

        if (params.userAgent) url.searchParams.set('ua', params.userAgent);
        if (params.userIp) url.searchParams.set('uip', params.userIp);

        if (params.appName || params.app_name) {
            url.searchParams.set('app_name', params.appName || params.app_name);
        }
        if (params.appBundle || params.app_bundle) {
            url.searchParams.set('app_bundle', params.appBundle || params.app_bundle);
        }

        if (params.deviceModel) url.searchParams.set('device_model', params.deviceModel);
        if (params.deviceMake) url.searchParams.set('device_make', params.deviceMake);
        if (params.deviceCategory) url.searchParams.set('device_category', params.deviceCategory);

        if (params.appStoreUrl || params.app_store_url) {
            url.searchParams.set('app_store_url', params.appStoreUrl || params.app_store_url);
        }

        // Device ID: forward whatever was provided by the app (no UUID enforcement here).
        var deviceIdValue = params.deviceId || params.device_id;
        if (deviceIdValue) {
            url.searchParams.set('device_id', deviceIdValue);
        }

        if (vastVersion) {
            url.searchParams.set('vast_version', vastVersion);
        }

        if (aid) {
            url.searchParams.set('aid', aid);
        }

        return url.toString();
    }

    /**
     * Parse a VAST XML response (wrapper or inline).
     *
     * Returns an object:
     *  {
     *    type: 'wrapper' | 'inline' | 'unknown',
     *    nextTagUrl: string | null,
     *    impressions: string[],
     *    trackingEvents: { [eventName: string]: string[] },
     *    mediaUrl: string | null
     *  }
     *
     * - For wrappers: mediaUrl will be null, nextTagUrl may be set.
     * - For inline creatives: mediaUrl may be set from <MediaFile>.
     */
    function parseCtvVastResponse(xmlText) {
        if (!xmlText || typeof xmlText !== 'string') {
            return emptyResult();
        }

        var parser = new DOMParser();
        var doc = parser.parseFromString(xmlText, 'text/xml');

        var allNodes = Array.prototype.slice.call(doc.getElementsByTagName('*'));

        // Wrapper <VASTAdTagURI>
        var nextTagUrl = null;
        for (var i = 0; i < allNodes.length; i++) {
            var node = allNodes[i];
            if (node.tagName && node.tagName.toLowerCase() === 'vastadtaguri') {
                nextTagUrl = textOrEmpty(node);
                if (nextTagUrl) break;
            }
        }

        // <Impression> URLs
        var impressions = [];
        for (var j = 0; j < allNodes.length; j++) {
            var node2 = allNodes[j];
            if (node2.tagName && node2.tagName.toLowerCase() === 'impression') {
                var imp = textOrEmpty(node2);
                if (imp) impressions.push(imp);
            }
        }

        // <Tracking event="..."> URLs
        var trackingEvents = {};
        for (var k = 0; k < allNodes.length; k++) {
            var node3 = allNodes[k];
            if (node3.tagName && node3.tagName.toLowerCase() === 'tracking') {
                var eventName = (node3.getAttribute('event') || 'unknown').toLowerCase();
                var url = textOrEmpty(node3);
                if (!url) continue;
                if (!trackingEvents[eventName]) trackingEvents[eventName] = [];
                trackingEvents[eventName].push(url);
            }
        }

        // Inline <MediaFile> selection (mp4 / progressive)
        var mediaUrl = null;
        for (var m = 0; m < allNodes.length; m++) {
            var node4 = allNodes[m];
            if (node4.tagName && node4.tagName.toLowerCase() === 'mediafile') {
                var typeAttr = (node4.getAttribute('type') || '').toLowerCase();
                var deliveryAttr = (node4.getAttribute('delivery') || '').toLowerCase();
                var urlText = textOrEmpty(node4);
                if (!mediaUrl && typeAttr.indexOf('mp4') !== -1) {
                    mediaUrl = urlText;
                } else if (!mediaUrl && deliveryAttr.indexOf('progressive') !== -1) {
                    mediaUrl = urlText;
                }
            }
        }

        var resultType = 'unknown';
        if (mediaUrl) {
            resultType = 'inline';
        } else if (nextTagUrl) {
            resultType = 'wrapper';
        }

        return {
            type: resultType,
            nextTagUrl: nextTagUrl,
            impressions: impressions,
            trackingEvents: trackingEvents,
            mediaUrl: mediaUrl
        };
    }

    // ---- Internal helpers ---------------------------------------------------

    function randomCacheBuster() {
        // Cache buster should be a numeric timestamp (milliseconds since epoch)
        // Sample: 1691938475123
        return Date.now();
    }

    function emptyResult() {
        return {
            type: 'unknown',
            nextTagUrl: null,
            impressions: [],
            trackingEvents: {},
            mediaUrl: null
        };
    }

    function textOrEmpty(node) {
        if (!node || !node.textContent) return '';
        return String(node.textContent).trim();
    }

    // Public API
    global.CtvAds = {
        buildCtvTagUrl: buildCtvTagUrl,
        parseCtvVastResponse: parseCtvVastResponse
    };
})(typeof window !== 'undefined' ? window : this);

