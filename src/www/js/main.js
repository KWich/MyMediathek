/*
 * MyMediathek: Main page routines
 *
 * SPDX-FileCopyrightText: 2024 Klaus Wich*
 * SPDX-License-Identifier: EUPL-1.2
 */

"use strict";

// Used: config.js, util.utils.js, sender.js
import * as cfg from "../config/config.js";
import * as util from "./util.js";
import * as sender from "./sender.js";

// Globals:
const NOCATEGORY = "Keine Kategorie";
const WOCATEGORY = "Ohne Kategorie";
const ALLENTRIES = "Alle Einträge";
const BASE_PATH = "/api/";

let m_stateDisplayNames = ["", ", gesehen", ", ungesehen", ", abgelaufen", ", ungültig"];
let currentPage = 0; // 0: Filmliste, 1: Merkliste

let gExpiryBookmarkWarningDays = 1;
let gExpiryMovieWarningDays = 1;
let gSearchChannelInclude = [];
let gFilterTopicEntries = [];
let gFilterTitleEntries = [];
let gBookmarkServerUrl;

let movieList = {
  init: false,
  previousCard: null,
  extendAll: false,
  selector: "#mext",
  currentCard: null,
  currentCategoryName: null,
  searchTimer: null,
  bmadded: false
};


let bookList = {
  init: false,
  previousCard: null,
  extendAll: false,
  selector: "#ext",
  currentCard: null,
  currentCategoryName: ALLENTRIES,
  totalCount: 0, // total nb of bookmarks
  totalCatCount: 0, // nb of bookmarks for selected category
  viewFilter: 0 // 0:all, 1:seen, 2:unseen, 3:expired, 4:dead
};


let gBackgroundTask = {
  active: false,
  nodes: null,
  nodeIdx: 0,
  nodeMIdx: 0,
  count: 0
};


let gDisplayFilter = {
  expired: false,
  dead: false
};


let gFontSize = 100;

// Filmliste:
let f_currentSort = "timestamp";
let f_currentSortOrder = "desc";
let f_currentSortText = "Sendedatum absteigend";
let queryOffset = 0;
let filteredNo = 0;
let receivedNo = 0;
let queryCurrent; // Aktueller Query String

let endOfQuery = false;
let lastQueryString = null;
let lastQuery = null;
let everywhere = false;
let currentQueryObj = null;
let currentQueryResult = null;
let currentQueryResultTotalNb;
let currentQueryResultLength;
let bookMarkServerConnectError = false;
let activeMovieQuery = false;
let keepDropDownOpen = false;

// Merkliste:
let m_currentSort = "expiry";
let m_currentSortText = "Ablaufdatum";
let m_currentSortDesc = false;
let m_cardcount = 0;
let m_cardcountfiltered = 0;
let m_queryOffset = 0;
let m_queryCurrent; // Aktueller Query String
let m_endOfQuery = false;
let m_queryAll = false; // lese alles unabhängig von Fenstergröße
let m_execFktAfterQuery = null;

const m_menuHeight = 160; // Anpassen wenn neue Optionen!

// Fixed items - global
const toptitle = document.getElementById("toptitle");
const currentPlayer = document.getElementById("topplayer");
const footer = document.getElementById("footer");
const footnb = document.getElementById("footnb");

// Fixed items - Filmliste
const f_container = document.getElementById("Filme");
const header = document.getElementById("header");
const searchInputValue = document.getElementById("searchInputValue");

// Fixed items - Merkliste
const m_catdropdown = document.getElementById("m_selectCategory");
const m_container = document.getElementById("m_Bookmarks");

const articleState = {
  valid: 0,
  expired: 1,
  seen: 2,
  dead: 3
};


function windowscroll() {
  let exttitle = 50 > window.pageYOffset ? "block" : "none";
  if (toptitle.style.display != exttitle) {
    toptitle.style.display = exttitle;
    currentPlayer.style.display = exttitle;
    document.getElementById("topmenu").style.display = exttitle;
    setContainerTopMargin(currentPage == 0 ? f_container : m_container);
  }
  if (currentPage == 0) {
    document.getElementById("selectView").style.display = "none";
  }
  else if (currentPage == 1) {
    document.getElementById("m_ctxm").style.display = "none";
  }

  const {scrollHeight, scrollTop, clientHeight} = document.documentElement;
  if (scrollTop + clientHeight + 150 > scrollHeight - 5) {
    if (currentPage == 0) {
      if (!endOfQuery && !activeMovieQuery) {
        readMoviesFromServer();
      }
    }
    else if (currentPage == 1) {
      if (!m_endOfQuery && util.noPendingHTTPRequest()) {
        readBookmarksFromServer();
      }
    }
  }
}


function movieListToggleExtended(obj) {
  if (!movieList.extendAll && obj.currentTarget.querySelector(movieList.selector).style.display == "block") {
    obj.currentTarget.querySelector(movieList.selector).style.display = "none";
    movieList.previousCard = null;
  }
  else {
    let extendnow = true;
    // check if image exists:
    if (!obj.currentTarget.children[2].children[0].innerHTML) {
      currentQueryObj = obj.currentTarget;
      let href = obj.currentTarget.children[2].children[2].href;
      extendnow = !(sender.checkAndQueryARDMovieInfo(href, getARDInfoMovieListSuccess, getInfoMovieListFailure) ||
          sender.checkAndQueryARTEMovieInfo(href, getARTEInfoMovieListSuccess, getInfoMovieListFailure) ||
          sender.checkAndQueryZDFMovieInfo(href, getZDF3SATInfoMovieListSuccess, getInfoMovieListFailure) ||
          sender.checkAndQuery3SATMovieInfo(href, getZDF3SATInfoMovieListSuccess, getInfoMovieListFailure));
    }
    if (extendnow) {
      showExtended(obj.currentTarget, movieList, header);
    }
    else {
      util.utilSetWait(true);
    }
  }
}


function getARDInfoMovieListSuccess(response) {
  let json = util.utilJsonParse(response);
  if (json) {
    let ts = sender.getARDExpiryStringFromJSON(json);
    let imgsrc = sender.getARDImageURLFromJSON(json);
    let res = sender.getARDStreamQuality(json, currentQueryObj.getAttribute("data-url"));
    updateMovieExpiryImageAndStream(ts, imgsrc, res.quality); // (res.found ? null : res.stream));
  }
  util.utilSetWait(false);
  showExtended(currentQueryObj, movieList, header);
}


function getARTEInfoMovieListSuccess(response) {
  let json = util.utilJsonParse(response);
  if (json) {
    let ts = sender.getARTEExpiryStringFromJSON(json);
    let imgsrc = sender.getARTEImageURLFromJSON(json);
    let res = sender.getARTEStreamQuality(json.data.attributes.streams, currentQueryObj.getAttribute("data-url"));
    updateMovieExpiryImageAndStream(ts, imgsrc, res.quality); // (res.found ? null : res.stream));
  }
  util.utilSetWait(false);
  showExtended(currentQueryObj, movieList, header);
}


function getZDF3SATInfoMovieListSuccess(response) {
  let json = util.utilJsonParse(response);
  if (json) {
    let ts = sender.getZDF3SATExpiryStringFromJSON(json);
    let imgsrc = sender.getZDF3SATImageURLFromJSON(json);
    let details = sender.getZDF3SATepisodeFromJSON(json);
    updateMovieExpiryImageAndStream(ts, imgsrc, null, null, details);
  }
  util.utilSetWait(false);
  showExtended(currentQueryObj, movieList, header);
}


function updateMovieExpiryImageAndStream(ts, imgurl, quality, stream, details) {
  if (details) {
    currentQueryObj.children[0].children[1].innerHTML = currentQueryObj.children[0].children[1].innerHTML + " (Folge: " + details + ")";
  }
  currentQueryObj.children[2].children[4].children[1].innerHTML = ts ? "verfügbar bis:<br>" + ts : "";
  if (ts) {
    let pasttime = Date.now() / 1000;
    let criticaltime = pasttime + 86400 * gExpiryMovieWarningDays;
    let ot = util.utilLocalStringToDate(ts);
    if (ot < pasttime) {
      if (!currentQueryObj.classList.contains("kwexpired")) {
        currentQueryObj.classList.add("kwexpired");
      }
    }
    else if (ot < criticaltime) {
      if (!currentQueryObj.classList.contains("kwexpiry")) {
        currentQueryObj.classList.add("kwexpiry");
      }
    }
  }
  currentQueryObj.children[2].children[0].innerHTML = imgurl ? supCreateImageLink(imgurl) : "";
  if (stream) {
    currentQueryObj.setAttribute("data-url", stream);
  }
  if (quality) {
    currentQueryObj.children[2].children[3].children[0].innerText = quality;
    currentQueryObj.children[2].children[3].children[0].classList.add("cattag");
  }
}


function supCreateImageLink(imgurl) {
  let linkurl;
  try {
    linkurl = imgurl != "None" ? "<img src=" + decodeURI(imgurl) + ">" : "";
  }
  catch { // catches a malformed URI
    linkurl = "ERROR";
  }
  return linkurl;
}


function getInfoMovieListFailure() {
  util.utilSetWait(false);
  if (!currentQueryObj.classList.contains("kwexpired")) {
    currentQueryObj.classList.add("kwexpired");
  }
  showExtended(currentQueryObj, movieList, header);
}


function bookmarkListShowExtended(obj) {
  document.getElementById("m_ctxm").style.display = "none";
  showExtended(obj.currentTarget, bookList, header);
}


function showExtended(src, list, head) {
  if (!list.extendAll) {
    if (list == bookList && list.previousCard) {
      list.previousCard.querySelector(list.selector).style.display = "none";
    }
    if (src != list.previousCard) {
      let ele = src.querySelector(list.selector);
      if (ele) {
        ele.style.display = ele.style.display == "block" ? "none" : "block";
        list.previousCard = src;
      }
    }
    else {
      list.previousCard = null;
    }
    // Scroll up if necessary:
    let scrollup = src.getBoundingClientRect().bottom - window.innerHeight + footer.clientHeight + 10;
    if (scrollup > 0 ) {
      window.scrollBy(0, scrollup);
    }
    else {
      // Scroll down if necessary:
      let scrolldown = src.getBoundingClientRect().top - head.clientHeight - 10;
      if (scrolldown < 0 ) {
        window.scrollBy(0, scrolldown);
      }
    }
  }
  util.utilSetWait(false);
}


//----------- Filmliste -----------------
function setFilmFootNumber() {
  footnb.innerHTML = "zeige " + receivedNo + " von " + (currentQueryResultTotalNb - filteredNo) + " Filmen, sortiert nach " + f_currentSortText;
}


function updateMovieExtendAll(startidx = 0) {
  let nodes = document.querySelectorAll("#mext");
  for (let i = startidx; i < nodes.length; i++) {
    nodes[i].style.display = movieList.extendAll ? "block" : "none";
  }
  document.getElementById("expand").innerHTML = movieList.extendAll ? "Kompakt" : "Expandiert";
}


// Film DB Handling: query mediathekweb.de
function searchMovies(querystring, newsort = false) {
  if (newsort || querystring != lastQueryString) {
    queryOffset = 0;
    filteredNo = 0;
    receivedNo = 0;
    activeMovieQuery = false;
    bookMarkServerConnectError = false;
    queryCurrent = createQuery(querystring);
    if (lastQuery != queryCurrent) {
      readMoviesFromServer();
      lastQuery = queryCurrent;
    }
    lastQueryString = querystring;
  }
}


// Parse Query: copied from mediathekweb.de: index.ts
function parseQuery(query) {
  const channels = [];
  const topics = [];
  const titles = [];
  const descriptions = [];
  let generics = [];
  let duration_min = undefined;
  let duration_max = undefined;
  let future = false;
  let allchannels = false;

  const splits = query.trim().toLowerCase().split(/\s+/).filter((split) => {
    return split.length > 0;
  });

  for (let i = 0; i < splits.length; i++) {
    const split = splits[i];

    if (split[0] == "!") {
      let arg = split.substring(1);
      if (arg == "") {
        allchannels = true;
      }
      else {
        for (let c of arg.split(",")) {
          channels.push(c);
        }
      }
    }
    else if (split[0] == "#") {
      const t = split.slice(1, split.length).split(",").filter((split) => {
        return split.length > 0;
      });
      if (t.length > 0) {
        topics.push(t);
      }
    }
    else if (split[0] == "+") {
      if (split[1] == "+") {
        future = true;
      }
      else {
        const t = split.slice(1, split.length).split(",").filter((split) => {
          return split.length > 0;
        });
        if (t.length > 0) {
          titles.push(t);
        }
      }
    }
    else if (split[0] == "*") {
      const d = split.slice(1, split.length).split(",").filter((split) => {
        return split.length > 0;
      });
      if (d.length > 0) {
        descriptions.push(d);
      }
    }
    else if (split[0] == ">") {
      const d = split.slice(1, split.length).split(",").filter((split) => {
        return split.length > 0;
      });
      if (d.length > 0 && !isNaN(d[0])) {
        duration_min = d[0] * 60;
      }
    }
    else if (split[0] == "<") {
      const d = split.slice(1, split.length).split(",").filter((split) => {
        return split.length > 0;
      });
      if (d.length > 0 && !isNaN(d[0])) {
        duration_max = d[0] * 60;
      }
    }
    else {
      generics = generics.concat(split.split(/\s+/));
    }
  }

  return {
    channels: channels,
    topics: topics,
    titles: titles,
    descriptions: descriptions,
    duration_min: duration_min,
    duration_max: duration_max,
    generics: generics,
    future: future,
    allchannels: allchannels
  };
}


function createQuery(querystring) {
  const parsedQuery = parseQuery(querystring);
  const queries = [];

  if (parsedQuery.channels.length > 0) {
    for (let i = 0; i < parsedQuery.channels.length; i++) {
      queries.push({
        fields: ["channel"],
        query: parsedQuery.channels[i]
      });
    }
  }
  else if (!parsedQuery.allchannels) {
    for (let i = 0; i < gSearchChannelInclude.length; i++) {
      queries.push({
        fields: ["channel"],
        query: gSearchChannelInclude[i]
      });
    }
  }

  for (let i = 0; i < parsedQuery.topics.length; i++) {
    queries.push({
      fields: ["topic"],
      query: parsedQuery.topics[i].join(" ")
    });
  }

  for (let i = 0; i < parsedQuery.titles.length; i++) {
    queries.push({
      fields: ["title"],
      query: parsedQuery.titles[i].join(" ")
    });
  }

  for (let i = 0; i < parsedQuery.descriptions.length; i++) {
    queries.push({
      fields: ["description"],
      query: parsedQuery.descriptions[i].join(" ")
    });
  }

  if (parsedQuery.generics.length > 0) {
    queries.push({
      fields: everywhere ? ["channel", "topic", "title", "description"] : parsedQuery.topics.length == 0 ? ["topic", "title"] : ["title"],
      query: parsedQuery.generics.join(" ")
    });
  }

  const query = {
    queries: queries,
    sortBy: f_currentSort,
    sortOrder: f_currentSortOrder,
    future: parsedQuery.future,
    duration_min: parsedQuery.duration_min,
    duration_max: parsedQuery.duration_max,
    offset: 0,
    size: cfg.cfgMediathekRestApiLimit
  };

  return query;
}


function readMoviesFromServer() {
  queryCurrent.offset = queryOffset;
  activeMovieQuery = true;
  util.utilSendHttpRequest("POST", cfg.cfgMediathekRestApiUrl, JSON.stringify(queryCurrent), false, buildMovieCards, getMovieError);
}


function getMovieError(status, statustext) {
  util.utilViewPopUp("MyMediathek Server kann nicht erreicht werden.<br>" + statustext ? statustext : "", "err");
  activeMovieQuery = false;
}


function validEntry(entry) {
  // Filter retrieved entries
  let result = true;
  for (let i = 0; i < gFilterTitleEntries.length; i++) {
    if (entry.title.includes(gFilterTitleEntries[i])) {
      result = false;
      break;
    }
  }
  if (result) {
    for (let i = 0; i < gFilterTopicEntries.length; i++) {
      if (entry.topic.includes(gFilterTopicEntries[i])) {
        result = false;
        break;
      }
    }
  }
  return result;
}


function buildMovieCards(response) {
  if (queryOffset == 0) { // New Query => delete old records
    while (f_container.firstChild) {
      f_container.removeChild(f_container.lastChild);
    }
  }
  let movies = JSON.parse(response);
  let notcont = true;
  if (movies) {
    endOfQuery = movies.result.results.length < cfg.cfgMediathekRestApiLimit;
    currentQueryResultTotalNb = movies.result.queryInfo.totalResults;
    currentQueryResultLength = movies.result.results.length;
    if (currentQueryResultLength > 0) {
      currentQueryResult = [];
      let request = [];
      for (let i = 0; i < currentQueryResultLength; i++) {
        let entry = movies.result.results[i];
        if (validEntry(entry)) {
          receivedNo += 1;
          currentQueryResult.push(entry);
          let hashId = util.utilHashID((entry.channel == "3Sat" ? "ZDF" : entry.channel) + (entry.url_video_hd ? entry.url_video_hd : entry.url_video));
          request.push(hashId);
        }
        else {
          filteredNo += 1;
        }
      }
      if (!bookMarkServerConnectError) {
        util.utilSendHttpRequest("POST", gBookmarkServerUrl + "moviestate", JSON.stringify(request), true, buildMovieCardsContinued, buildMovieCardsError);
      }
      else {
        buildMovieCardsNoServerContinue();
      }
      notcont = false;
    }
  }
  if (notcont) {
    buildMovieCardsEnd();
  }
}


function buildMovieCardsError() {
  util.utilViewPopUp("Bookmark Server kann nicht erreicht werden.<br>Kein Remote Status verfügbar", "err");
  buildMovieCardsNoServerContinue();
}


function buildMovieCardsNoServerContinue() {
  for (let i = 0; i < currentQueryResult.length; i++) {
    buildMovieCard(currentQueryResult[i], -1, false, false, false, false);
  }
  buildMovieCardsEnd();
  bookMarkServerConnectError = true;
}


function buildMovieCardsContinued(response) {
  for (let i = 0; i < currentQueryResult.length; i++) {
    buildMovieCard(currentQueryResult[i], response[i].hashid, response[i].seen, response[i].bookmarked, response[i].expiry, true);
  }
  buildMovieCardsEnd();
}


function buildMovieCard(entry, hashid, seen, bookmarked, expiry, remote) {
  let useexpiry = expiry && expiry > 0 && expiry < 5000000000;
  let cardmain = document.createElement("article");

  let card = util.utilAddChildObject(cardmain, "div", null, "card" + (seen ? " seen" : "") + (bookmarked ? " bookmark" : ""));
  card.setAttribute("data-hash", hashid);
  card.setAttribute("data-url", entry.url_video_hd ? entry.url_video_hd : entry.url_video);
  card.addEventListener("click", movieListToggleExtended);

  let header = util.utilAddChildObject(card, "header", "", seen ? " seen" : null);
  util.utilAddChildObject(header, "p", entry.channel != "ARTE.DE" ? entry.channel : "ARTE", "col s2 kwchannel");
  util.utilAddChildObject(header, "p", entry.topic ? entry.topic : "", "col s6 noverflow");
  util.utilAddChildObject(header, "p", entry.duration ? util.utilToTimeHHMMSSString(entry.duration) : "", "container rcol");
  util.utilAddChildObject(card, "h4", entry.title, "container");

  let content = util.utilAddChildObject(card, "div", null, "container");
  content.id = "mext";
  if (movieList.extendAll) {
    content.style.display = "block";
  }
  util.utilAddChildObject(content, "div", "", "movimg");
  util.utilAddChildObject(content, "p", entry.description ? entry.description : "");

  if (entry.url_website) {
    let a = document.createElement("a");
    a.setAttribute("href", entry.url_website);
    a.setAttribute("target", "_blank");
    a.innerHTML = "(Link zur Webseite)";
    a.setAttribute("class", "small");
    content.appendChild(a);
  }

  let tags = util.utilAddChildObject(content, "div", "", "tag");
  util.utilAddChildObject(tags, "div", "", "");
  util.utilAddChildObject(tags, "div", "", "col s9");
  util.utilAddChildObject(tags, "br", " ", "");

  let footer = util.utilAddChildObject(content, "footer", "", null);
  util.utilAddChildObject(footer, "p", entry.timestamp ? "gesendet am:<br>" + util.utilToDateString(entry.timestamp) : "", "col s3 small");
  util.utilAddChildObject(footer, "p", useexpiry ? "verfügbar bis:<br>" + util.utilToShortDateString(expiry) : "", "col s3 small");

  let btnclass = "cardBtn";
  if (remote) {
    let btn = util.utilCreateButton(seen ? "www/images/eye-off.svg" : "www/images/eye.svg", btnclass, seen ? seenAktionMovieCardDelete : seenAktionMovieCard);
    btn.id = "btnse";
    footer.appendChild(btn);

    footer.appendChild(util.utilCreateButton("www/images/play.svg", btnclass, playMovie));

    btn = util.utilCreateButton("www/images/bookmark" + (bookmarked ? "-cancel" : "") + ".svg", btnclass, bookmarked ? bookmarkMovieDelete : bookmarkMovie);
    btn.id = "btnbm";
    footer.appendChild(btn);
  }
  f_container.appendChild(cardmain);
}


function buildMovieCardsEnd() {
  setFilmFootNumber();
  queryOffset += cfg.cfgMediathekRestApiLimit;
  activeMovieQuery = false;

  if (!endOfQuery && f_container.scrollHeight < window.innerHeight) { // Read until f_container is filled
    readMoviesFromServer();
  }
}


function playMovie(event) {
  event.stopPropagation();
  movieList.currentCard = event.currentTarget.parentNode.parentNode.parentNode;
  movieList.currentCard.click();
  let body = {
    url: movieList.currentCard.getAttribute("data-url"),
    ts: Math.floor(Date.now() / 1000)
  };
  let playerID = currentPlayer.getAttribute("data-id");
  if (playerID == 0) { // Play in Browser
    util.utilViewPopUp("Starte Film im Browser");
    let newWin = window.open(body.url);
    if (newWin == null) {
      util.utilViewPopUp("Konnte Pop-up Fenster für Film nicht öffnen! - Browserberechtigugen prüfen.");
    }
    else {
      markMovieCardAsSeen();
    }
  }
  else {
    util.utilSendHttpRequest("POST", gBookmarkServerUrl + "player/play?playerid=" + playerID, JSON.stringify(body), true, playMovieResponse, playMovieError);
    util.utilViewPopUp("Starte Film ...");
  }
}


function playMovieResponse() {
  util.utilViewPopUp("Film wurde gestartet");
  // mark as seen
  markMovieCardAsSeen();
  if (movieList.currentCard.classList.contains("kwdead")) { // nicht sehr wahrscheinlich!
    movieList.currentCard.classList.remove("kwdead");
    util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + movieList.currentCard.getAttribute("data-hash") + "/valid?valid=true", null, false);
  }
}

function playMovieError(code, statustext) {
  let errtxt = "Fehlercode: " + code + "<p>Info: " + statustext;
  if (code == 404) {
    errtxt = "Film exisitiert nicht auf dem Server";
    if (!movieList.currentCard.classList.contains("kwdead")) {
      movieList.currentCard.classList.add("kwdead");
    }
  }
  util.utilViewPopUp("<h3>Film konnte nicht gestartet werden</h3><p>" + errtxt, "err");
}


function bookmarkMovie(event) {
  movieList.currentCard = event.currentTarget.parentNode.parentNode.parentNode;
  if (bookList.init) {
    document.getElementById("mNewCategoryName").value = "";
    document.getElementById("dlgm_selectCategory").style.display = "block";
  }
  else { // Update categories:
    getCategories();
  }
  window.event.stopPropagation();
}


function bookmarkMovieSend(category) {
  let body = {
    url: movieList.currentCard.getAttribute("data-url"),
    id: parseInt(movieList.currentCard.getAttribute("data-hash")),
    sender: movieList.currentCard.children[0].children[0].innerText,
    thema: movieList.currentCard.children[0].children[1].innerText,
    duration: util.utilTimeStr2Int(movieList.currentCard.children[0].children[2].innerText),
    titel: movieList.currentCard.children[1].innerText,
    description: movieList.currentCard.children[2].children[1].innerText.trim(),
    modified: 0,
    seen: movieList.currentCard.classList.contains("seen"),
    sendtime: util.utilRetrieveDate(movieList.currentCard.children[2].children[4].children[0].innerText.trim()),
    website: movieList.currentCard.children[2].children[2].href,
    expiry: 0
  };
  if (movieList.currentCard.children[2].children[0].firstChild) {
    let imgurl = movieList.currentCard.children[2].children[0].firstChild.src;
    if (imgurl != "") {
      body.imgurl = imgurl;
    }
  }
  let exp = movieList.currentCard.children[2].children[4].children[1].innerText;
  if (exp != "") {
    body.expiry = util.utilLocalStringToDate(exp.substring(15));
  }
  let videoformat = movieList.currentCard.children[2].children[3].children[0].innerText;
  if (videoformat != "") {
    body.videoformat = videoformat;
  }
  if (category != NOCATEGORY) {
    body.category = category;
  }
  movieList.currentCategoryName = category; // store for ML update
  let bodyarry = [body];
  util.utilSetWait(true);
  util.utilSendHttpRequest("POST", gBookmarkServerUrl + "bookmarks", JSON.stringify(bodyarry), true, bookmarkMovieResponse);
}


function bookmarkMovieResponse(response) {
  if (response.detail.length > 0 && response.detail[0].expiry > 0) {
    movieList.currentCard.children[2].children[4].children[1].innerHTML = "verfügbar bis:<br>" + util.utilToShortDateString(response.detail[0].expiry);
  }
  // mark as bookmarked
  updateMovieCardBookmark(movieList.currentCard, true);
  // Update bookmark list:
  updateEntryNumber(1, movieList.currentCategoryName);
  if (currentPage == 1) {
    if (movieList.currentCategoryName == bookList.currentCategoryName || bookList.currentCategoryName == ALLENTRIES || bookList.currentCategoryName == WOCATEGORY && movieList.currentCategoryName == NOCATEGORY) {
      readBookmarks();
    }
  }
  util.utilSetWait(false);
}


function bookmarkMovieDelete(event) {
  movieList.currentCard = event.currentTarget.parentNode.parentNode.parentNode;
  util.utilSetWait(true);
  util.utilSendHttpRequest("DELETE", gBookmarkServerUrl + "bookmarks/" + movieList.currentCard.getAttribute("data-hash"), null, false, bookmarkMovieDeleteResponse);
  window.event.stopPropagation();
}


function bookmarkMovieDeleteResponse() {
  updateMovieCardBookmark(movieList.currentCard, false);
  // Force update of bookmark list:
  bookList.init = false;
  util.utilSetWait(false);
}


function seenAktionMovieCard(event) {
  movieList.currentCard = event.currentTarget.parentNode.parentNode.parentNode;
  window.event.stopPropagation();
  markMovieCardAsSeen();
}


function markMovieCardAsSeen() {
  let hashid = movieList.currentCard.getAttribute("data-hash");
  util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "moviestate/" + hashid + "?seen=true", null, null, seenAktionMovieCardResponse, seenAktionMovieCardError);
  setMovieCardSeenDisplayState(movieList.currentCard, true);
}


function setMovieCardSeenDisplayState(card, seen) {
  let seenbtn = findChildWithId(card.children[2].children[4], "btnse");
  if (seen) {
    card.classList.add("seen");
    card.children[0].classList.add("seen");
    seenbtn.children[0].src = "www/images/eye-off.svg";
    seenbtn.removeEventListener("click", seenAktionMovieCard);
    seenbtn.addEventListener("click", seenAktionMovieCardDelete);
  }
  else {
    card.classList.remove("seen");
    card.children[0].classList.remove("seen");
    seenbtn.children[0].src = "www/images/eye.svg";
    seenbtn.removeEventListener("click", seenAktionMovieCardDelete);
    seenbtn.addEventListener("click", seenAktionMovieCard);
  }
}


function seenAktionMovieCardResponse() {
  updateBookmarkSeenAktion(true);
}


function seenAktionMovieCardError() {
  // nothing to do here
}


function seenAktionMovieCardDelete(event) {
  movieList.currentCard = event.currentTarget.parentNode.parentNode.parentNode;
  let hashid = movieList.currentCard.getAttribute("data-hash");
  util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "moviestate/" + hashid + "?seen=false", null, null, seenAktionMovieCardDeleteResponse);
  setMovieCardSeenDisplayState(movieList.currentCard, false);
  window.event.stopPropagation();
}


function seenAktionMovieCardDeleteResponse() {
  updateBookmarkSeenAktion(false);
}


function updateBookmarkSeenAktion(newstate) {
  if (movieList.currentCard.classList.contains("bookmark")) {
    // update bookmarklist
    let hashid = movieList.currentCard.getAttribute("data-hash");
    for (let i = 0; i < m_container.children.length; i++) {
      let bookmark = m_container.children[i];
      if (bookmark.children[0].getAttribute("data-hash") == hashid) {
        setCardSeenClasses(bookmark.children[0], newstate);
        break;
      }
    }
  }
}


// ---------------- Merkliste -----------------
function setSelectionDisplay() {
  let txt = bookList.currentCategoryName + m_stateDisplayNames[bookList.viewFilter];
  txt += gDisplayFilter.expired || gDisplayFilter.dead ? " (gefiltert)" : "";
  document.getElementById("foottext").innerHTML = txt;
}


function filterSeenState(contread = true) {
  m_cardcountfiltered = 0;

  for (let i = 0; i < m_container.children.length; i++) {
    let card = m_container.children[i];
    let isvisible = false;
    if (card.firstChild) {
      isvisible = bookList.viewFilter == 0 ||
                    bookList.viewFilter == 1 && card.children[0].children[0].classList.contains("kwseen") ||
                    bookList.viewFilter == 2 && !card.children[0].children[0].classList.contains("kwseen") ||
                    bookList.viewFilter == 3 && card.children[0].classList.contains("kwexpired") ||
                    bookList.viewFilter == 4 && card.children[0].classList.contains("kwdead");
      // Apply filters:
      if (card.children[0].classList.contains("kwexpired") && gDisplayFilter.expired ||
          card.children[0].classList.contains("kwdead") && gDisplayFilter.dead) {
        isvisible = false;
      }
    }

    if (isvisible) {
      m_cardcountfiltered++;
    }
    card.style.display = isvisible ? "block" : "none";
  }

  document.getElementById("m_mvall").style.display = bookList.viewFilter == 0 ? "none" : "block";
  document.getElementById("m_mvseen").style.display = bookList.viewFilter == 1 ? "none" : "block";
  document.getElementById("m_mvunseen").style.display = bookList.viewFilter == 2 ? "none" : "block";
  document.getElementById("m_mvexpired").style.display = gDisplayFilter.expired || bookList.viewFilter == 3 ? "none" : "block";
  document.getElementById("delExpired").style.display = gDisplayFilter.expired ? "none" : "block";
  document.getElementById("m_mvdead").style.display = gDisplayFilter.dead || bookList.viewFilter == 4 ? "none" : "block";
  document.getElementById("delDead").style.display = gDisplayFilter.dead ? "none" : "block";

  if (currentPage == 1) {
    setFootNumber();
  }
  if (contread && !m_endOfQuery && util.noPendingHTTPRequest() && m_container.clientHeight < window.innerHeight) { // Read until container is filled
    readBookmarksFromServer();
  }
}


function setFootNumber() {
  footnb.innerHTML = m_cardcountfiltered + " von " + bookList.totalCatCount + " Filmen, sortiert nach " + m_currentSortText;
}


/*function deleteSeenMovies() {
  let delarr = [];
  let delmovies = document.querySelectorAll("#m_Bookmarks > article > div > .kwseen");
  if (delmovies.length > 0) {
    for (let i = 0; i < delmovies.length; i++) {
      delarr.push(parseInt(delmovies[i].parentNode.getAttribute("data-hash")));
    }
    util.utilSendHttpRequest("POST", gBookmarkServerUrl + "bookmarks/delete", JSON.stringify(delarr), true, deleteMoviesResponse);
  }
}*/


async function deleteMovies(aState) {
  let delarr = [];
  let qry = "#m_Bookmarks > article" + (aState == articleState.seen ? " > div:has(.kwseen)" : aState == articleState.dead ? " > .kwdead" : " > .kwexpired:not(.kwdead)");
  let delmovies = document.querySelectorAll(qry);
  if (delmovies.length > 0) {
    if (aState == articleState.dead && bookList.viewFilter == 4) {
      bookList.viewFilter = 0;
    }
    for (let i = 0; i < delmovies.length; i++) {
      delarr.push(parseInt(delmovies[i].getAttribute("data-hash")));
    }
    const response = await fetch(gBookmarkServerUrl + "bookmarks/delete", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(delarr)
    }).catch(err => {
      util.utilNetworkErrorMsg(err.message);
    });

    if (response.ok) {
      const res = await response.json();
      bookList.totalCount -= res.nb;
      bookList.totalCatCount -= res.nb;
      let msg = res.nb == 0 ? "Es wurden keine Filme" : gBackgroundTask.count == 1 ? "Ein Film wurde" : res.nb.toString() + " Filme wurden";
      util.utilViewPopUp(msg + " gelöscht");
      readBookmarks();
    }
    else {
      util.utilNetworkErrorMsg(response);
    }
  }
  else {
    util.utilViewPopUp("Keine Filme zum Löschen gefunden");
  }
}


async function testExpiredMovies() {
  util.utilSetWait(true);
  document.getElementById("testExpired").disabled = true;

  if (m_endOfQuery) {
    gBackgroundTask.active = true;
    gBackgroundTask.count = 0;
    gBackgroundTask.nodeIdx = 0;
    gBackgroundTask.nodes = document.querySelectorAll(".kwexpired,.kwexpiry,.kwnoexpiry");

    while (gBackgroundTask.nodeIdx < gBackgroundTask.nodes.length) {
      let msg = `Teste ${gBackgroundTask.nodeIdx} von ${gBackgroundTask.nodes.length} Filmen, ungültig : ${gBackgroundTask.count}`;
      util.utilViewPopUp(msg);
      let url = cfg.cfgCORS_ProxyServer + gBackgroundTask.nodes[gBackgroundTask.nodeIdx].getAttribute("data-url");
      const response = await fetch(url, {method: "HEAD"}).catch(err => {
        util.utilNetworkErrorMsg(err.message);
      });
      if (response.ok) {
        if (gBackgroundTask.nodes[gBackgroundTask.nodeIdx].classList.contains("kwdead")) { // nicht sehr wahrscheinlich!
          gBackgroundTask.nodes[gBackgroundTask.nodeIdx].classList.remove("kwdead");
          util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + gBackgroundTask.nodes[gBackgroundTask.nodeIdx].getAttribute("data-hash") + "/valid?valid=true", null, false);
        }
      }
      else {
        gBackgroundTask.count++;
        if (!gBackgroundTask.nodes[gBackgroundTask.nodeIdx].classList.contains("kwdead")) {
          gBackgroundTask.nodes[gBackgroundTask.nodeIdx].classList.add("kwdead");
          // Inform server:
          util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + gBackgroundTask.nodes[gBackgroundTask.nodeIdx].getAttribute("data-hash") + "/valid?valid=false", null, false);
        }
      }
      gBackgroundTask.nodeIdx++;
    }

    gBackgroundTask.active = false;
    let msg = gBackgroundTask.count == 0 ? "Es wurden keine ungültige Filme" : gBackgroundTask.count == 1 ? "Einen ungültigen Film " : gBackgroundTask.count.toString() + " ungültige Filme";
    util.utilViewPopUp(msg + " gefunden");
    filterSeenState();
  }
  else {
    m_queryAll = true;
    m_execFktAfterQuery = testExpiredMovies;
    readBookmarksFromServer();
  }
  util.utilSetWait(false);
  document.getElementById("testExpired").disabled = false;
}


function updateExtendAll() {
  let nodes = document.querySelectorAll("#ext");
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].style.display = bookList.extendAll ? "block" : "none";
  }
  document.getElementById("m_expand").innerHTML = bookList.extendAll ? "Kompakt" : "Expandiert";
}


function buildCatDropDownOption(text, value) {
  let option = document.createElement("option");
  option.text = text;
  option.value = value;
  option.addEventListener("click", handleCategoryDropDownOption);
  option.addEventListener("touchstart", handleCategoryDropDownOption);
  return option;
}


function handleCategoryDropDownOption(e) {
  bookList.currentCategoryName = e.target.text;
  bookList.viewFilter = 0; // reset to all entries
  readBookmarks();
  setSelectionDisplay();
}


function readBookmarks() {
  m_queryOffset = 0;
  m_endOfQuery = false;
  m_queryCurrent = bookList.currentCategoryName == ALLENTRIES ? "" : "?category=" + (bookList.currentCategoryName == WOCATEGORY ? "@NULL" : bookList.currentCategoryName);
  if (m_currentSort != "") {
    m_queryCurrent += (m_queryCurrent != "" ? "&" : "?") + "sort=" + m_currentSort;
    if (m_currentSortDesc) {
      m_queryCurrent += "&desc=true";
    }
  }
  m_queryCurrent += (m_queryCurrent != "" ? "&" : "?") + "limit=" + cfg.cfgBookmarkServerLimit;
  readBookmarksFromServer();
}


function readBookmarksFromServer() {
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "bookmarks" + m_queryCurrent + "&offset=" + m_queryOffset, null, false, readBookmarksFromServerResponse);
}


function readBookmarksFromServerResponse(response) {
  if (m_queryOffset == 0) { // New Query => delete old records
    while (m_container.firstChild) {
      m_container.removeChild(m_container.lastChild);
    }
    m_cardcount = 0;
    bookList.totalCatCount = getCategoryEntryNb(bookList.currentCategoryName);
  }
  let pasttime = Date.now() / 1000;
  let criticaltime = pasttime + 86400 * gExpiryBookmarkWarningDays;
  let m_Bookmarks = response.length > 0 ? JSON.parse(response) : null;
  if (m_Bookmarks && Object.keys(m_Bookmarks).length > 0) {
    for (let i = 0, l = m_Bookmarks.length; i < l; i++) {
      buildBookmarkCard(m_Bookmarks[i], pasttime, criticaltime);
    }
    m_cardcount += m_Bookmarks.length;
  }
  m_endOfQuery = response.length == 0 || bookList.totalCatCount == m_cardcount || Object.keys(m_Bookmarks).length == 0;
  filterSeenState(false);

  m_queryOffset += cfg.cfgBookmarkServerLimit;
  if (!m_endOfQuery) {
    if (m_queryAll || m_container.clientHeight < window.innerHeight) { // Read until container is filled
      readBookmarksFromServer();
    }
    else {
      let dist = window.innerHeight - footer.clientHeight - m_container.lastChild.getBoundingClientRect().bottom;
      if (dist > 30) {
        readBookmarksFromServer();
      }
    }
  }
  else if (m_queryAll) {
    m_queryAll = false;
    if (m_execFktAfterQuery) {
      m_execFktAfterQuery();
      m_execFktAfterQuery = null;
    }
  }
}


function buildBookmarkCard(entry, pasttime, criticaltime) {
  let cldef = "card";
  let expirystate = 0;
  if (!entry.valid) {
    cldef += " kwdead";
  }
  if (entry.expiry == 0 || entry.expiry >= 5000000000) {
    expirystate = 1;
    cldef += " kwnoexpiry";
  }
  else if (entry.expiry < pasttime) {
    cldef += " kwexpired";
  }
  else if (entry.expiry < criticaltime) {
    cldef += " kwexpiry";
  }
  else if (entry.seen) {
    cldef += " kwseen";
  }

  let cardmain = document.createElement("article");

  let card = util.utilAddChildObject(cardmain, "div", "", cldef);
  card.setAttribute("data-hash", entry.id);
  card.setAttribute("data-cat", entry.category);
  card.setAttribute("data-url", entry.url);
  card.addEventListener("click", bookmarkListShowExtended);

  let header = util.utilAddChildObject(card, "header", "", entry.seen ? " kwseen" : null);
  util.utilAddChildObject(header, "p", entry.sender != "ARTE.DE" ? entry.sender : "ARTE", "col s2 kwchannel");
  util.utilAddChildObject(header, "p", entry.thema ? entry.thema : "", "col s6 noverflow");
  util.utilAddChildObject(header, "p", entry.duration ? util.utilToTimeHHMMSSString(entry.duration) : "", "container rcol");

  util.utilAddChildObject(card, "h4", entry.titel, "container");

  let content = util.utilAddChildObject(card, "div", null, "container");
  content.id = "ext";
  if (bookList.extendAll) {
    content.style.display = "block";
  }
  util.utilAddChildObject(content, "div", entry.imgurl ? supCreateImageLink(entry.imgurl) : "", "movimg");
  util.utilAddChildObject(content, "p", entry.description ? entry.description : "");

  if (entry.website) {
    let a = document.createElement("a");
    a.setAttribute("href", entry.website);
    a.setAttribute("target", "_blank");
    a.innerHTML = "(Link zur Webseite)";
    a.setAttribute("class", "small");
    content.appendChild(a);
  }

  let tags = util.utilAddChildObject(content, "div", "", "tag");
  if (entry.videoformat && entry.videoformat != "None") {
    util.utilAddChildObject(tags, "div", entry.videoformat, "cattag");
  }
  if (entry.category != null) {
    util.utilAddChildObject(tags, "div", entry.category, "cattag");
  }

  let footer = util.utilAddChildObject(card, "footer", "", null);
  util.utilAddChildObject(footer, "p", entry.sendtime ? "gesendet am:<br>" + util.utilToDateString(entry.sendtime) : "", "col s3 small");
  let exp = util.utilAddChildObject(footer, "p", expirystate != 1 ? "verfügbar bis:<br>" + util.utilToShortDateString(entry.expiry) : "", "col s3 small");
  exp.id = "expiry";
  let btnclass = "cardBtn";
  footer.appendChild(util.utilCreateButton("www/images/menu.svg", btnclass, showMovieActions));
  footer.appendChild(util.utilCreateButton("www/images/delete.svg", btnclass, deleteBookmark));
  footer.appendChild(util.utilCreateButton("www/images/play.svg", btnclass, playBookmark));

  m_container.appendChild(cardmain);
}


function playBookmark(event) {
  bookList.currentCard = event.currentTarget.parentNode.parentNode;
  bookList.currentCard.click();
  let body = {
    url: bookList.currentCard.getAttribute("data-url"),
    ts: Math.floor(Date.now() / 1000)
  };
  let playerID = currentPlayer.getAttribute("data-id");
  if (playerID == 0) { // Play in Browser
    util.utilViewPopUp("Starte Film im Browser");
    window.open(body.url);
    playBookmarkResponse();
  }
  else {
    util.utilSendHttpRequest("POST", gBookmarkServerUrl + "player/play?playerid=" + playerID, JSON.stringify(body), true, playBookmarkResponse, playBookmarkError);
    util.utilViewPopUp("Starte Film ...");
  }
  window.event.stopPropagation();
}


function playBookmarkResponse() {
  util.utilViewPopUp("Film wurde gestartet");
  util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash") + "/seen?seen=true", null, false, setCurrentSeen);
}


function playBookmarkError(code, statustext) {
  if (code == 404) {
    // Test if movie exists:
    let url = cfg.cfgCORS_ProxyServer + bookList.currentCard.getAttribute("data-url");
    let xhttp = new XMLHttpRequest();
    let errtxt = "Fehlercode: 404";
    xhttp.open("HEAD", url, true);
    xhttp.timeout = cfg.cfgHTTPRequestTimeout;
    xhttp.onreadystatechange = function() {
      if (this.readyState == 4) {
        if (this.status != 200 && this.status != 204) {
          //bookList.currentCard.classList.remove("kwexpired");
          if (!bookList.currentCard.classList.contains("kwdead")) {
            bookList.currentCard.classList.add("kwdead");
            // Update Bookmarkserver
            util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash") + "/valid?valid=false", null, false);
          }
          errtxt = "Film exisitiert nicht mehr auf dem Server";
        }
        else if (bookList.currentCard.classList.contains("kwdead")) { // nicht sehr wahrscheinlich!
          bookList.currentCard.classList.remove("kwdead");
          util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash") + "/valid?valid=true", null, false);
        }
        util.utilViewPopUp("<h3>Film konnte nicht gestartet werden</h3><p>" + errtxt, "err");
      }
    };
    xhttp.send();
  }
  else {
    util.utilViewPopUp("<h3>Film konnte nicht gestartet werden</h3><p>Fehlercode: " + code + "<p>Info: " + statustext, "err");
  }
}


function deleteBookmark(event) {
  bookList.currentCard = event.currentTarget.parentNode.parentNode;
  util.utilSendHttpRequest("DELETE", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash"), null, false, m_deleteCurrentNode);
  window.event.stopPropagation();
}


function setCurrentSeen() {
  setCardSeenState(true);
}


function setCurrentUnSeen() {
  setCardSeenState(false);
}


function setCardSeenState(seen) {
  setCardSeenClasses(bookList.currentCard, seen);
  // Update Filmliste:
  let hashid = bookList.currentCard.getAttribute("data-hash");
  for (let i = 0; i < f_container.children.length; i++) {
    let movie = f_container.children[i];
    if (movie.children[0].getAttribute("data-hash") == hashid) {
      setMovieCardSeenDisplayState(movie.children[0], seen);
      break;
    }
  }
}


function setCardSeenClasses(card, seen) {
  if (seen) {
    if (!isBookmarkCardSeen(card)) {
      card.children[0].classList.add("kwseen");
      if (!card.classList.contains("kwnoexpiry") && !card.classList.contains("kwexpired") && !card.classList.contains("kwexpiry")) {
        card.classList.add("kwseen");
      }
    }
  }
  else {
    card.classList.remove("kwseen");
    card.children[0].classList.remove("kwseen");
  }
}


function showMovieActions(obj) {
  let rect = obj.currentTarget.getBoundingClientRect();
  let tpos = rect.top + m_menuHeight > window.innerHeight - footer.clientHeight ? window.innerHeight - footer.clientHeight - m_menuHeight : rect.top;
  bookList.currentCard = obj.currentTarget.parentNode.parentNode;
  const isseen = isBookmarkCardSeen(bookList.currentCard.parentNode);
  document.getElementById("m_setseen").style.display = isseen ? "none" : "block";
  document.getElementById("m_setuseen").style.display = isseen ? "block" : "none";
  let ctxmenu = document.getElementById("m_ctxm");
  ctxmenu.style.left = `${rect.left - 120}px`;
  ctxmenu.style.top = `${tpos}px`;
  ctxmenu.style.display = "block";
  window.event.stopPropagation();
}


function isBookmarkCardSeen(card) {
  return card.children[0].children[0].classList.contains("kwseen");
}


function handleViewMenuClick(e) {
  switch (e.target.id) {
    case "m_expand":
      bookList.extendAll = !bookList.extendAll;
      updateExtendAll();
      break;
    case "m_mvall":
      bookList.viewFilter = 0;
      setSelectionDisplay();
      filterSeenState();
      break;
    case "m_mvseen":
      bookList.viewFilter = 1;
      setSelectionDisplay();
      filterSeenState();
      break;
    case "m_mvunseen":
      bookList.viewFilter = 2;
      setSelectionDisplay();
      filterSeenState();
      break;
    case "m_mvexpired":
      bookList.viewFilter = 3;
      setSelectionDisplay();
      filterSeenState();
      break;
    case "m_mvdead":
      bookList.viewFilter = 4;
      setSelectionDisplay();
      filterSeenState();
      break;
    case "m_filterexpired":
      util.utilToggleOption(document.getElementById(e.target.id));
      gDisplayFilter.expired = !gDisplayFilter.expired;
      keepDropDownOpen = true;
      setSelectionDisplay();
      filterSeenState();
      break;
    case "m_filterdead":
      util.utilToggleOption(document.getElementById(e.target.id));
      gDisplayFilter.dead = !gDisplayFilter.dead;
      keepDropDownOpen = true;
      setSelectionDisplay();
      filterSeenState();
      break;
  }
}


function handleMovieMenuClick(e) {
  switch (e.target.id) {
    case "expand":
      movieList.extendAll = !movieList.extendAll;
      updateMovieExtendAll();
      break;
  }
}


function handleTopMenuClick(e) {
  switch (e.target.id) {
    case "o_large":
      changeFontSize(1);
      e.currentTarget.parentNode.parentNode.style.display = "none";
      break;
    case "o_stand":
      changeFontSize(0);
      e.currentTarget.parentNode.parentNode.style.display = "none";
      break;
    case "o_small":
      changeFontSize(-1);
      e.currentTarget.parentNode.parentNode.style.display = "none";
      break;
    case "o_play":
      currentPlayer.innerText = e.target.innerText;
      currentPlayer.setAttribute("data-id", e.target.getAttribute("data-id"));
      // Store for session:
      sessionStorage.setItem("player-id", e.target.getAttribute("data-id"));
      break;
    case "o_admin":
      window.open("./www/admin.html", "_self");
      break;
    case "o_git":
      window.open("https://github.com/KWich/MyMediathek", "github-mm");
      break;
  }
}


function changeFontSize(val) {
  switch (val) {
    case 1:
      if (gFontSize < 200) {
        gFontSize += 10;
      }
      break;
    case -1:
      if (gFontSize > 60) {
        gFontSize -= 10;
      }
      break;
    default:
      gFontSize = 100;
  }
  document.body.style.fontSize = gFontSize.toString() + "%";
  localStorage.setItem("font-size", gFontSize);

}


function handleAktionClick(e) {
  document.getElementById("m_selectAction").style.display = "none";
  switch (e.target.id) {
    case "delSeen":
      deleteMovies(articleState.seen);
      break;
    case "delExpired":
      deleteMovies(articleState.expired);
      break;
    case "delDead":
      deleteMovies(articleState.dead);
      break;
    case "testExpired":
      testExpiredMovies();
      break;
  }
}


function handleMenuSort(e) {
  let id = e.target.value;
  m_currentSortText = e.target.text;
  let svalue = id.split(":");
  m_currentSort = svalue[0];
  m_currentSortDesc = svalue.length > 1;
  readBookmarks();
}


function handleMovieMenuSort(e) {
  f_currentSortText = e.target.text;
  let svalue = e.target.value.split(":");
  f_currentSort = svalue[0];
  f_currentSortOrder = svalue.length > 1 ? "desc" : "asc";
  searchMovies(searchInputValue.value.trim(), true);
}


function handleCtxmenuClick(event) {
  window.event.stopPropagation();
  document.getElementById("m_ctxm").style.display = "none";
  let expobj;
  switch (event.target.id) {
    // Context menu
    case "m_setseen":
      util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash") + "/seen?seen=true", null, false, setCurrentSeen);
      break;
    case "m_setuseen":
      util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash") + "/seen?seen=false", null, false, setCurrentUnSeen);
      break;
    case "setdel":
      util.utilSendHttpRequest("DELETE", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash"), null, false, m_deleteCurrentNode);
      break;
    case "setcat":
      document.getElementById("mNewCategoryName").value = "";
      document.getElementById("dlgm_selectCategory").style.display = "block";
      break;
    case "setexp":
      expobj = bookList.currentCard.querySelector("#expiry");
      document.getElementById("InputAblaufdatum").value = expobj != null ? util.utilCreateInputDate(expobj.innerText.substring(15)) : "";
      document.getElementById("InputAblaufdatum").setAttribute("min", util.utilGetTodayStr());
      document.getElementById("dlgSetExpiry").style.display = "block";
      break;
  }
}


function m_deleteCurrentNode() {
  let hashid = bookList.currentCard.getAttribute("data-hash");
  m_container.removeChild(bookList.currentCard.parentNode);
  m_cardcount--;
  updateEntryNumber(-1, bookList.currentCategoryName);
  setFootNumber();
  // Update Filmliste if necessary
  for (let i = 0; i < f_container.children.length; i++) {
    let movie = f_container.children[i];
    if (movie.children[0].getAttribute("data-hash") == hashid) {
      updateMovieCardBookmark(movie.children[0], false);
      break;
    }
  }
}


function updateMovieCardBookmark(card, bookmarked) {
  let btn = findChildWithId(card.children[2].children[4], "btnbm");
  if (bookmarked) {
    card.classList.add("bookmark");
    btn.children[0].src = "www/images/bookmark-cancel.svg";
    btn.removeEventListener("click", bookmarkMovie);
    btn.addEventListener("click", bookmarkMovieDelete);
  }
  else {
    card.classList.remove("bookmark");
    btn.children[0].src = "www/images/bookmark.svg";
    btn.removeEventListener("click", bookmarkMovieDelete);
    btn.addEventListener("click", bookmarkMovie);
  }
}


function findChildWithId(node, id) {
  let result = null;
  for (let i = 0; i < node.children.length; i++) {
    if (node.children[i].getAttribute("id") == id) {
      result = node.children[i];
      break;
    }
  }
  return result;
}


function m_buildCategoryButtonSingle(entry, color) {
  let button = document.createElement("button");
  button.type = "button";
  button.innerHTML = entry.name;
  button.className = color ? "catbutton" : "nocatbutton";
  button.onclick = function(event) {
    CategorySelected(event.target.innerText, true);
  };
  return button;
}


function m_setNewCategory() {
  let newcategory = document.getElementById("mNewCategoryName").value;
  if (newcategory.length < 3 || newcategory.includes("\"")) {
    util.utilViewPopUp("Kategoriename muß mindestens 3 Zeichen lang sein, und darf keine Anführungszeichen enthalten", "cdlg1");
  }
  else {
    let children = document.getElementById("m_KategorieListe").children;
    let cont = true;
    for (let i = 0; i < children.length; i++) {
      if (children[i].innerText.toUpperCase() == newcategory.toUpperCase()) {
        util.utilViewPopUp("Kategorie existiert bereits, bitte Namen ändern oder Kategorie direkt wählen.", "cdlg1");
        cont = false;
        break;
      }
    }
    if (cont) {
      if (currentPage == 0) { // Filmliste
        bookList.init = false; // force reinit
      }
      CategorySelected(newcategory, true);
    }
  }
}


function CategorySelected(name, fnew) {
  document.getElementById("dlgm_selectCategory").style.display = "none";
  if (currentPage == 0) { // Filmliste
    bookmarkMovieSend(name);
    movieList.bmadded = true;
  }
  else if (currentPage == 1) { // Merkliste
    let body = [];
    body.push(util.utilCreateJSONPatchReplaceObj("category", name == NOCATEGORY ? "NULL" : name));
    util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash"), JSON.stringify(body), true, fnew ? getCategories : readBookmarks);
  }
}


function getCategories() {
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "categories", null, false, getCategoriesSuccess);
}


function getCategoriesSuccess(response) {
  try {
    while (m_catdropdown.firstChild) {
      m_catdropdown.removeChild(m_catdropdown.lastChild);
    }
    m_catdropdown.appendChild(buildCatDropDownOption(ALLENTRIES, "all"));
    let dlgcategories = document.getElementById("m_KategorieListe");
    while (dlgcategories.firstChild) {
      dlgcategories.removeChild(dlgcategories.lastChild);
    }
    let kategorien = document.getElementById("Kategorien");
    while (kategorien.firstChild) {
      kategorien.removeChild(kategorien.lastChild);
    }

    let categories = JSON.parse(response);
    let wocat = 0;
    let curcatinc = false;
    bookList.totalCount = 0;
    for (let i = 0; i < categories.length; i++) {
      bookList.totalCount += categories[i].nb;
      if (categories[i].name != "@NULL") {
        if (categories[i].nb > 0) {
          m_catdropdown.appendChild(buildCatDropDownOption(categories[i].name, categories[i].name));
          if (bookList.currentCategoryName == categories[i].name) {
            curcatinc = true;
          }
        }
        dlgcategories.appendChild(m_buildCategoryButtonSingle(categories[i], true));
      }
      else {
        wocat = categories[i].nb;
      }
    }
    dlgcategories.appendChild(m_buildCategoryButtonSingle({name: NOCATEGORY}, false));
    if (wocat > 0 && m_catdropdown.children.length > 1) {
      m_catdropdown.appendChild(buildCatDropDownOption(WOCATEGORY, "@NULL"));
    }
    // reset filter if necesssary:
    if (!curcatinc) {
      bookList.currentCategoryName = ALLENTRIES;
      setSelectionDisplay();
    }
  }
  finally {
    if (currentPage == 0) { // Filmliste
      if (!movieList.bmadded) {
        document.getElementById("mNewCategoryName").value = "";
        document.getElementById("dlgm_selectCategory").style.display = "block";
      }
      movieList.bmadded = false;
    }
    else if (currentPage == 1) { // Merkliste
      readBookmarks();
    }
  }
}


function setNewExpiryDate() {
  let input = document.getElementById("InputAblaufdatum");
  let newexpiry = input.value == "" ? 0 : util.utilConvertInputDate(input.value);
  if (isNaN(newexpiry)) {
    util.utilViewPopUp("Ungültiges Datum, bitte korrigieren", "expdlg");
  }
  else {
    let today = new Date().getTime() / 1000;
    if (newexpiry == 0 || newexpiry > today) {
      document.getElementById("dlgSetExpiry").style.display = "none";
      bookList.currentCard.children[3].children[1].innerHTML = "verfügbar bis:<br>" + util.utilToShortDateString(newexpiry);
      //Update server
      let hashid = bookList.currentCard.getAttribute("data-hash");
      let body = [];
      body.push(util.utilCreateJSONPatchReplaceObj("expiry", newexpiry.toString()));
      if (bookList.currentCard.children[2].children[0].children[0]) {
        body.push(util.utilCreateJSONPatchReplaceObj("imgurl", bookList.currentCard.children[2].children[0].children[0].src));
      }
      util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "bookmarks/" + hashid, JSON.stringify(body), true, readBookmarks());
      updateMovieListExpiryDate(hashid, newexpiry);
    }
    else {
      util.utilViewPopUp("AblaufDatum muß in der Zukunft liegen, bitte korrigieren", "expdlg");
    }
  }
}


function updateMovieListExpiryDate(hashid, expiry) {
  // Update Expiry in Filmliste if shown:
  for (let i = 0; i < f_container.children.length; i++) {
    let movie = f_container.children[i];
    if (movie.children[0].getAttribute("data-hash") == hashid) {
      movie.children[0].children[2].children[4].children[1].innerHTML = "verfügbar bis:<br>" + util.utilToShortDateString(expiry);
      break;
    }
  }
}


function requestExpiryDate() {
  document.getElementById("ReqExpiryDate").disabled = true;
  util.utilSetWait(true);
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "bookmarks/" + bookList.currentCard.getAttribute("data-hash") + "/expiry", null, false, requestExpiryResponse, requestExpiryError);
}


function requestExpiryResponse(response) {
  document.body.style.cursor = "default";
  document.getElementById("InputAblaufdatum").value = util.utilCreateInputDate(JSON.parse(response).expiry);
  util.utilViewPopUp("Neues Datum gefunden:", "expdlg");
  document.getElementById("ReqExpiryDate").disabled = false;
  util.utilSetWait(false);
}


function requestExpiryError(statusCode, statusText) {
  document.body.style.cursor = "default";
  util.utilViewPopUp("Netzwerkfehler: " + statusCode + " " + (statusText == "" ? "!" : statusText), "expdlg");
  document.getElementById("ReqExpiryDate").disabled = false;
  util.utilSetWait(false);
}


/*function getRequestARDInfoSuccess(response) {
  let json = util.utilJsonParse(response);
  if (json) {
    document.getElementById("InputAblaufdatum").value = json.widgets[0].availableTo ? sender.formatARDDateInputString(json.widgets[0].availableTo) : 0;
    bookList.currentCard.children[2].children[0].innerHTML = sender.getARDImageURLFromJSON(json);
    util.utilViewPopUp("Neues Datum gefunden:", "expdlg");
    document.getElementById("ReqExpiryDate").disabled = false;
  }
  util.utilSetWait(false);
}*/


function getCategoryEntryNb(name) {
  let nb = bookList.totalCount;
  if (name != ALLENTRIES) {
    let elements = document.getElementsByClassName("cat_name");
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].innerText == name) {
        nb = parseInt(elements[i].nextElementSibling.innerText);
        break;
      }
    }
  }
  return nb;
}


function updateEntryNumber(cnb, cat) {
  // Update total
  bookList.totalCount += cnb;
  // Update categorie counter
  if (cat != ALLENTRIES) {
    let category = cat;
    if (category == NOCATEGORY) {
      category = WOCATEGORY;
      if (currentPage == 0) { // Filmliste
        bookList.init = false; // force reinit of booklist
      }
    }
    let elements = document.getElementsByClassName("cat_name");
    if (elements.length == 0) {
      getCategories();
    }
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].innerText == category) {
        if (elements[i].nextElementSibling.tagName == "BUTTON") {
          bookList.init = false;
        }
        else {
          let nb = parseInt(elements[i].nextElementSibling.innerText);
          elements[i].nextElementSibling.innerText = nb + cnb;
          if (nb + cnb == 0) {
            if (currentPage == 0) { // Filmliste
              bookList.init = false; // force reinit
            }
            else {
              getCategories();
            }
          }
        }
        break;
      }
    }
  }
  if (cat == bookList.currentCategoryName) {
    bookList.totalCatCount += cnb;
  }
}


function searchInput() {
  movieList.searchTimer = null;
  let svalue = searchInputValue.value.trim();
  if (svalue.length >= cfg.cfgMinSearchStringLength) {
    searchMovies(svalue);
  }
  else if (svalue == "!") {
    searchMovies(svalue);
  }
  else if (svalue.length == 0) {
    searchMovies("");
  }
}

// ========= General =============
// 0: Filmliste, 1: Merkliste, 2: Kategorien
let pageclasses = ["flist", "mlist"];
let pagetitle = ["Filmliste", "Merkliste"];

function switchPage(id) {
  currentPage = id;
  for (let i = 0; i < pageclasses.length; i++) {
    let show = i == id;
    for (let obj of document.getElementsByClassName(pageclasses[i])) {
      obj.style.display = show ? "" : "none";
    }
  }

  document.getElementById("foottext").style.display = id == 1 ? "block" : "none";
  footnb.style.display = id < 2 ? "block" : "none";
  toptitle.innerText = "MyMediathek: " + pagetitle[id];
  setNodeColor(header, id == 0 ? "color_ml" : "color_fl", id == 0 ? "color_fl" : "color_ml");
  document.getElementById("m_ctxm").style.display = "none";

  switch (id) {
    case 0:
      if (!movieList.init) {
        movieList.init = true;
        searchMovies(searchInputValue.value.trim());
      }
      setFilmFootNumber();
      setContainerTopMargin(f_container);
      setNodeColor(footer, "color_ml", "color_fl");
      break;
    case 1:
      if (!bookList.init) {
        bookList.init = true;
        getCategories();
      }
      setSelectionDisplay();
      setFootNumber();
      setContainerTopMargin(m_container);
      setNodeColor(footer, "color_fl", "color_ml");
      break;
  }
}

function setContainerTopMargin(container) {
  container.style.marginTop = "" + (header.clientHeight + 4) + "px";
}

function setNodeColor(node, oldColorClass, newColorClass) {
  if (node.classList.contains(oldColorClass)) {
    node.classList.remove(oldColorClass);
  }
  node.classList.add(newColorClass);
}

// init Player information from DB
function requestPlayerInfo() {
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "info", null, false, requestPlayerInfoSuccess, requestPlayerInfoError);
}

function requestPlayerInfoSuccess(response) {
  let result = JSON.parse(response);
  if (result) {
    let defaultplayer = sessionStorage.getItem("player-id") ? sessionStorage.getItem("player-id") : result.defaultplayer ? result.defaultplayer : 0;
    if (result.players.length > 0) {
      for (let i = 0; i < result.players.length; i++) {
        let playeropt = util.utilAddChildObject(document.getElementById("playerlist"), "option", result.players[i].name, "playercard");
        playeropt.setAttribute("id", "o_play");
        playeropt.setAttribute("data-id", result.players[i].idx);

        playeropt.onclick = function(e) {
          handleTopMenuClick(e);
        };
        playeropt.ontouchend = function(e) {
          handleTopMenuClick(e);
        };
        // Set selected default player
        if (defaultplayer == result.players[i].idx) {
          currentPlayer.innerText = result.players[i].name;
          currentPlayer.setAttribute("data-id", result.players[i].idx);
        }
      }
    }
    gExpiryBookmarkWarningDays = result.config.expiryBookmarkWarningDays;
    gExpiryMovieWarningDays = result.config.expiryMovieWarningDays;
    gSearchChannelInclude = result.config.searchChannelInclude[0] != "" ? result.config.searchChannelInclude : [];
    gFilterTitleEntries = result.config.searchTitleFilter[0] != "" ? result.config.searchTitleFilter : [];
    gFilterTopicEntries = result.config.searchTopicFilter[0] != "" ? result.config.searchTopicFilter : [];
  }
  // Show selected overview
  switchPage(currentPage);
}

function requestPlayerInfoError() {
  // Show selected overview
  switchPage(currentPage);
}

// --------------------------------------------
// Entry point:
document.addEventListener("DOMContentLoaded", function() {

  // Add event handlers
  // Window scroll
  window.addEventListener("scroll", windowscroll);

  window.addEventListener("resize", windowscroll);

  /*window.addEventListener("click", e => {
    if (gMenuVisible && e.target.id != "actbtn") {
      menu.style.display = command ? "block" : "none";
      gMenuVisible = command;
    }
  });*/

  // --------- Filmliste -----------------------

  // Search Input
  searchInputValue.onkeyup = function() {
    if (movieList.searchTimer != null) {
      clearTimeout(movieList.searchTimer);
    }
    movieList.searchTimer = setTimeout(searchInput, cfg.cfgSearchDelay);
  };

  // Search Button
  document.getElementById("searchBtn").onclick = function () {
    document.getElementById("selectView").style.display = "none";
    readMoviesFromServer();
  };

  document.getElementById("fMovieBtn").onclick = function () {
    history.pushState(currentPage, "", "?p=0");
    switchPage(0);
  };

  document.getElementById("fBookBtn").onclick = function () {
    history.pushState(currentPage, "", "?p=1");
    switchPage(1);
  };

  for (let obj of document.getElementsByClassName("ssort")) {
    obj.onclick = function(e) {
      handleMovieMenuSort(e);
    };
    obj.ontouchend = function(e) {
      handleMovieMenuSort(e);
    };
  }

  for (let obj of document.getElementsByClassName("fview")) {
    obj.onclick = function(e) {
      handleMovieMenuClick(e);
    };
    obj.ontouchend = function(e) {
      handleMovieMenuClick(e);
    };
  }

  // --------- Merkliste -----------------------
  for (let obj of document.querySelectorAll (".dropdown + button")) {
    obj.onmouseover = function(e) {
      if (e.nextSibling) {
        e.nextSibling.style.display = "";
      }
    };
  }

  for (let obj of document.querySelectorAll(".drop-top")) {
    obj.onmouseleave = function(e) {
      e.currentTarget.style.display = null;
    };
  }

  document.getElementById("mNewCategoryButton").addEventListener("click", m_setNewCategory);

  document.getElementById("NewExpiryButton").addEventListener("click", setNewExpiryDate);

  document.getElementById("ReqExpiryDate").addEventListener("click", requestExpiryDate);

  for (let obj of document.getElementsByClassName("msort")) {
    obj.onclick = function(e) {
      handleMenuSort(e);
    };
    obj.ontouchend = function(e) {
      handleMenuSort(e);
    };
  }

  for (let obj of document.getElementsByClassName("sview")) {
    obj.onclick = function(e) {
      handleViewMenuClick(e);
    };
    obj.ontouchend = function(e) {
      handleViewMenuClick(e);
    };
  }

  for (let obj of document.querySelectorAll (".drop-top > optgroup > option")) {
    obj.onclick = function(e) {
      handleTopMenuClick(e);
    };
    obj.ontouchend = function(e) {
      handleTopMenuClick(e);
    };
  }

  for (let obj of document.getElementsByClassName("saction")) {
    obj.onclick = function(e) {
      handleAktionClick(e);
    };
    obj.ontouchend = function(e) {
      handleAktionClick(e);
    };
  }

  // Context menu entries
  for (let obj of document.getElementsByClassName("m_ctxm")) {
    obj.onclick = function(e) {
      handleCtxmenuClick(e);
    };
  }

  // Drop down handling
  for (let obj of document.getElementsByClassName("dropdown")) {
    obj.ontouchstart = function(e) {
      obj.classList.add("hover_effect");
      let ele = e.currentTarget.querySelector(".dropdown-content");
      if (ele) {
        ele.style.display = ele.style.display == "block" ? "none" : "block";
        if (ele.style.display == "block") {
          // close all dropdowns if open
          for (let obj of document.querySelectorAll(".dropdown-content")) {
            if (obj != ele && obj.style.display == "block") {
              obj.style.display = "none";
            }
          }
        }
        e.preventDefault();
      }
    };
    obj.ontouchend = function() {
      obj.classList.remove("hover_effect");
    };
    obj.onmouseover = function(e) {
      let ele = e.currentTarget.querySelector(".dropdown-content");
      if (ele) {
        ele.style.display = "block";
      }
    };
    obj.onmouseout = function(e) {
      let ele = e.currentTarget.querySelector(".dropdown-content");
      if (ele) {
        ele.style.display = "none";
      }
    };
    obj.onclick = function(e) {
      if (!keepDropDownOpen) {
        let ele = e.currentTarget.querySelector(".dropdown-content");
        if (ele) {
          ele.style.display = ele.style.display == "block" ? "none" : "block";
        }
      }
      keepDropDownOpen = false;
    };
  }

  // Restore values from session storage if any:
  if (localStorage.getItem("font-size")) {
    gFontSize = parseInt(localStorage.getItem("font-size"));
    document.body.style.fontSize = localStorage.getItem("font-size") + "%";
  }

  // -----------------
  if (window.location.href.endsWith("p=1")) {
    currentPage = 1;
  }

  // set base url:
  if (cfg.cfgBookmarkServerAddress && cfg.cfgBookmarkServerAddress != "") {
    gBookmarkServerUrl = cfg.cfgBookmarkServerAddress;
  }
  else {
    gBookmarkServerUrl = window.location.pathname.slice(-1) == "/" ? window.location.pathname.slice(0, -1) : window.location.pathname;
  }
  gBookmarkServerUrl += BASE_PATH;

  requestPlayerInfo();
});
