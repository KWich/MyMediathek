/*
 *  MyMediathek: Frontend config
 */

"use strict";

// (local) Bookmarkserver REST API address:
export const cfgBookmarkServerAddress = "";

// No of items retrieved with one call to REST API:
export const cfgBookmarkServerLimit = 10;

// MediathekviewWeb REST API address:
export const cfgMediathekRestApiUrl = "https://mediathekviewweb.de/api/query";

// No of items retrieved with one call to REST API:
export const cfgMediathekRestApiLimit = 25;

// Minimum number of characters before Mediathekview search is executed:
export const cfgMinSearchStringLength = 2;

// Duration of message popup in ms:
export const cfgMessagePopUpDuration = 3000;

// HTTP Request timeout in ms
export const cfgHTTPRequestTimeout = 3000;

// Search Delay in ms:
export const cfgSearchDelay = 400;

// CORS Proxy:
// (used for ARTE detailed information)
// - specify with slash at the end!
// - if not used set to empty string ""
// - for build in proxy server use path "corsproxy/":
export const cfgCORS_ProxyServer = "corsproxy/";
