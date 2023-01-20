/**
 * Sender specific export functions
 **/
"use strict";

import {utilSendHttpRequest} from "./util.js";
import {cfgCORS_ProxyServer} from "../config/config.js";


/**
* Checks if given url points to ARD and triggers retrieval of movie info
* @return {boolean} True if ARD movie URL, False if other or error occurred
*/
export function checkAndQueryARDMovieInfo(url, successFunc, errorFunc) {
  let rc = false;
  if (url && url.indexOf("ardmediathek") > -1) {
    // get ARD id
    let idx = url.indexOf("/Y3");
    if (idx > -1) {
      let id = url.substring(idx + 1);
      utilSendHttpRequest("GET", "https://api.ardmediathek.de/page-gateway/pages/ard/item/" + id, null, false, successFunc, errorFunc);
      rc = true;
    }
  }
  return rc;
}


/**
* Checks if given url points to ARTE and triggers retrieval of movie info
* @return {boolean} True if ARTE movie URL, False if other or error in url occurred
*/
export function checkAndQueryARTEMovieInfo(url, successFunc, errorFunc) {
  let rc = false;
  if (url && url.indexOf("www.arte.tv") > -1) {
    // get ARTE id
    let idx = url.indexOf("videos/");
    if (idx > -1) {
      let surl = url.substring(idx + 7);
      idx = surl.indexOf("/");
      if (idx > -1) {
        surl = surl.substring(0, idx);
        if (surl.length > 5 && surl.indexOf("fernsehfilme") == -1) {
          let addheader = {name:"X-Requested-With", content:"MyMediathek"};
          utilSendHttpRequest("GET", cfgCORS_ProxyServer + "https://api.arte.tv/api/player/v2/config/de/" + surl + "?platform=ARTE_NEXT", null, false, successFunc, errorFunc, addheader) ;
          rc = true;
        }
      }
    }
  }
  return rc;
}


/**
* Checks if given url points to ZDF and triggers retrieval of movie info
* @return {boolean} True if ZDF movie URL, False if other
*/
export function checkAndQueryZDFMovieInfo(url, successFunc, errorFunc) {
  let rc = false;
  if (url && url.indexOf("www.zdf.de") > -1) {
    // get ZDF Name id
    let surl = url.substring(19, url.length - 5);
    let addheader = {name:"Api-Auth", content:"Bearer 20c238b5345eb428d01ae5c748c5076f033dfcc7"};
    utilSendHttpRequest("GET", "https://api.zdf.de/content/documents/zdf/" + surl + ".json?profile=player-3", null, false, successFunc, errorFunc, addheader);
    rc = true;
  }
  return rc;
}


/**
* Checks if given url points to ZDF and triggers retrieval of movie info
* @return {boolean} True if ZDF movie URL, False if other
*/
export function checkAndQuery3SATMovieInfo(url, successFunc, errorFunc) {
  let rc = false;
  if (url && url.indexOf("www.3sat.de") > -1) {
    // get ZDF Name id
    let surl = url.substring(20, url.length - 5);
    let addheader = {name:"Api-Auth", content:"Bearer 13e717ac1ff5c811c72844cebd11fc59ecb8bc03"};
    utilSendHttpRequest("GET", "https://api.3sat.de/content/documents/zdf/" + surl + ".json?profile=player2", null, false, successFunc, errorFunc, addheader);
    rc = true;
  }
  return rc;
}



// --------- ZDF/3SAT specific functions -------------------------
export function getZDF3SATImageURLFromJSON(json) {
  try {
    return json.teaserImageRef.layouts["768x432"];
  }
  catch(err) {
    return null;
  }
}

/** Format dd/mm/yyyy => verfügbar bis:<br>dd.mm.yyyy */
export function getZDF3SATExpiryStringFromJSON(json) {
  let rstr = null;
  try {
    let date = json.mainVideoContent["http://zdf.de/rels/target"].visibleTo;
    if (date) {
      let yyyy = date.substring(0, 4);
      let mm = date.substring(5, 7);
      let dd = date.substring(8, 10);
      rstr = dd + "." + mm + "." + yyyy;
    }
  }
  catch(err) {
    // Do Nothing
  }
  return rstr;
}


export function getZDF3SATepisodeFromJSON(json) {
  try {
    return json.programmeItem[0]["http://zdf.de/rels/target"].episodeNumber;
  }
  catch(err) {
    return null;
  }
}


// --------- ARTE specific export functions -------------------------
export function getARTEImageURLFromJSON(json) {
  return json.data.attributes.metadata.images[0].url;
}

/** Format dd/mm/yyyy => verfügbar bis:<br>dd.mm.yyyy */
export function getARTEExpiryStringFromJSON(json) {
  let rstr = "";
  let date = null;
  try {
    date = json.data.attributes.rights.end;
    if (date !== null) {
      let yyyy = date.substring(0, 4);
      let mm = date.substring(5, 7);
      let dd = date.substring(8, 10);
      rstr = dd + "." + mm + "." + yyyy;
    }
  }
  catch(err) {
    // Do Nothing
  }
  return rstr;
}

const arteQualityMap = new Map([
  ["360p", 1],
  ["720p", 2],
  ["1080p", 3],
]);

function betterQuality(first, second) {
  let x = arteQualityMap.has(first) ? arteQualityMap.get(first) : -1;
  let y = arteQualityMap.has(second) ? arteQualityMap.get(second) : -1;
  return x > y;
}

export function getARTEStreamQuality(json) {
  let sarr = json;
  let maxidx = -1;
  let maxquality = -1;
  let quality = "";
  let omu = false;
  let originalversion = false; // Originalfassung
  let live = false;
  for (const x in sarr) {
    if (sarr[x].versions[0].shortLabel == "DE") {
      quality = sarr[x].mainQuality.label;
      if (betterQuality(quality, maxquality)) {
        maxquality = quality;
        maxidx = x;
      }
    }
  }
  if (maxidx == -1) {
    for (const x in sarr) {
      if (sarr[x].versions[0].shortLabel == "OmU" && sarr[x].versions[0].label.indexOf("deutsch") > -1) {
        quality = sarr[x].mainQuality.label;
        if (betterQuality(quality, maxquality)) {
          maxquality = quality;
          maxidx = x;
          omu = true;
        }
      }
    }
  }
  if (maxidx == -1) {
    for (const x in sarr) {
      if (sarr[x].versions[0].shortLabel == "OV") {
        quality = sarr[x].mainQuality.label;
        if (betterQuality(quality, maxquality)) {
          maxquality = quality;
          maxidx = x;
          originalversion = true;
        }
      }
    }
  }
  if (maxidx == -1) {
    for (const x in sarr) {
      if (sarr[x].versions[0].shortLabel == "liveDE") {
        quality = sarr[x].mainQuality.label;
        if (betterQuality(quality, maxquality)) {
          maxquality = quality;
          maxidx = x;
          live = true;
        }
      }
    }
  }
  return {
    "found"  : (maxidx > -1),
    "quality": maxidx > -1 ? sarr[maxidx].mainQuality.label : null,
    "stream" : maxidx > -1 ? sarr[maxidx].url : null,
    "omu"    : omu,
    "live"   : live,
    "ov"     : originalversion
  };
}

// --------- ARD specific export functions -------------------------
export function getARDImageURLFromJSON(json) {
  let imgurl = json.widgets[0].image.src;
  let idx = imgurl.indexOf("?");
  return imgurl.substring(0, idx) + "?w=500";
}

export function getARDExpiryStringFromJSON(json) {
  return json.widgets[0].availableTo ? formatARDDateString(json.widgets[0].availableTo) : "";
}

// String 2022-09-04T10:30:00Z  => 04.09.2022 formatieren
function formatARDDateString(date) {
  let yyyy = date.substring(0, 4);
  let mm = date.substring(5, 7);
  let dd = date.substring(8, 10);
  //let hhmm = date.substring(11,16);
  return dd + "." + mm + "." + yyyy; // + "<br>" + hhmm;
}


export function formatARDDateInputString(date) {
  let yyyy = date.substring(0, 4);
  let mm = date.substring(5, 7);
  let dd = date.substring(8, 10);
  //let hhmm = date.substring(11,16);
  return yyyy + "-" + mm + "-" + dd; // + "<br>" + hhmm;
}


export function getARDStreamQuality(json, url) {
  let maxidx = -1;
  let maxquality = -1;
  let found = -1;
  let sarr;
  if (json.widgets[0].mediaCollection) {
    sarr = json.widgets[0].mediaCollection.embedded._mediaArray[0]._mediaStreamArray;
    for (let k = 0; k < sarr.length; k++) {
      if (sarr[k]._stream == url) {
        found = k;
        maxquality = sarr[k]._quality;
      }
      if (sarr[k]._quality > maxquality) {
        maxquality = sarr[k]._quality;
        maxidx = k;
      }
    }
  }
  if (found > -1) {
    if (sarr[found]._quality < maxquality) { // There is a better stream
      found = -1;
    }
    else {
      maxidx = found;
    }
  }

  // Map quality:
  return {
    "found": (found > -1),
    "quality": (maxidx > -1) ? sarr[maxidx]._height + "p" : null,
    "stream": (maxidx > -1) ? sarr[maxidx]._stream : null
  };
}
