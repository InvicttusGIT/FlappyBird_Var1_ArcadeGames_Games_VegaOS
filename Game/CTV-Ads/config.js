/**
 * CTV Ads configuration, based on the Adtelligent docs.
 *
 * This centralizes:
 *  - base URL
 *  - default slot size
 *  - VAST version
 *  - publisher AID
 *  - wrapper depth
 *  - midroll interval timing
 */
(function (global) {
    'use strict';

    global.CtvAdsConfig = {
        // Adtelligent endpoint that returns VAST wrappers/inline.
        baseUrl: 'https://a.adtelligent.com/',

        // Default video slot size for CTV (can be overridden per-request).
        defaultWidth: 1920,
        defaultHeight: 1080,

        // Static test parameters from sample URL (for development / QA).
        defaultUserAgent: 'Mozilla/5.0 (Linux) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36',
        defaultAppName: 'Flappy Wings',
        defaultAppBundle: 'com.invicttusx.flappywings_v1_ag_game_vega',
        defaultDeviceCategory: 'tv',
        defaultDeviceId: '00000000-0000-0000-0000-000000000000',

        // VAST protocol version requested.
        defaultVastVersion: '2',

        // Adtelligent account / publisher ID from sample URL.
        defaultAid: '940676',

        // Max number of wrapper hops (<VASTAdTagURI>) to follow before giving up.
        maxWrapperDepth: 5,

        // Time between midrolls in ms (can be adjusted per app/profile).
        // e.g. 60_000 or 180_000, docs mention 60s–180s midrolls.
        midrollIntervalMs: 180000
    };
})(typeof window !== 'undefined' ? window : this);

