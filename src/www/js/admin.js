/*
 * MyMediathek: Admin page routines
 *
 * SPDX-FileCopyrightText: 2024 Klaus Wich*
 * SPDX-License-Identifier: EUPL-1.2
 */
"use strict";

import * as util from "./util.js";
import {cfgBookmarkServerAddress} from "../config/config.js";

const unusedCatContainer = document.getElementById("admKategorieListe");

let gDaysBefore = 365;
let gBookmarkServerUrl;
const BASE_PATH = "/api/";


function loadStatsSuccess(response) {
  let result = JSON.parse(response);
  if (result) {
    document.getElementById("merknb").innerHTML = "Merkliste: " + result.bookmarks.number + " Einträge";
    // delete old table:
    let tablecontainer = document.querySelector("#merkliste > #aext");
    while (tablecontainer.firstChild) {
      tablecontainer.removeChild(tablecontainer.lastChild);
    }
    // create station table
    if (result.bookmarks.station.length > 0) {
      let table = document.createElement("table");
      let thead = document.createElement("thead");
      let row = document.createElement("tr");
      let ele = document.createElement("th");
      ele.innerHTML = "Sender:";
      row.appendChild(ele);

      ele = document.createElement("th");
      ele.innerHTML = "Anzahl:";
      row.appendChild(ele);
      thead.appendChild(row);
      table.appendChild(thead);

      let tbody = document.createElement("tbody");
      for (let i = 0; i < result.bookmarks.station.length; i++) {
        if (result.bookmarks.station[i].nb > 0) {
          util.utilAddTableRow(tbody, [result.bookmarks.station[i].name, result.bookmarks.station[i].nb], "rr1");
        }
      }
      table.appendChild(tbody);
      tablecontainer.appendChild(table);
    }
    // delete old category table:
    let catcontainer = document.querySelector("#catnb > #aext");
    while (catcontainer.firstChild) {
      catcontainer.removeChild(catcontainer.lastChild);
    }
    while (unusedCatContainer.firstChild) {
      unusedCatContainer.removeChild(unusedCatContainer.lastChild);
    }
    // create category table
    if (result.bookmarks.categories.length > 0) {
      let table = document.createElement("table");
      let thead = document.createElement("thead");
      let row = document.createElement("tr");
      let ele = document.createElement("th");
      ele.innerHTML = "Name:";
      row.appendChild(ele);

      ele = document.createElement("th");
      ele.innerHTML = "Anzahl:";
      row.appendChild(ele);
      thead.appendChild(row);
      table.appendChild(thead);

      let tbody = document.createElement("tbody");
      let usedcatcount = 0;
      let unusedcatcount = 0;
      for (let i = 0; i < result.bookmarks.categories.length; i++) {
        if (result.bookmarks.categories[i].name != "@NULL") {
          if (result.bookmarks.categories[i].nb > 0) {
            usedcatcount++;
            util.utilAddTableRow(tbody, [result.bookmarks.categories[i].name, result.bookmarks.categories[i].nb], "rr1");
          }
          else {
            unusedcatcount++;
            util.utilAddChildObject(unusedCatContainer, "div", result.bookmarks.categories[i].name, "nocat");
          }
        }
      }
      table.appendChild(tbody);
      catcontainer.appendChild(table);

      document.getElementById("catuse").innerHTML = "benutzte Kategorien: " + usedcatcount;
      document.getElementById("catnouse").innerHTML = "unbenutzte Kategorien: " + unusedcatcount;
      if (unusedcatcount == 0) {
        document.getElementById("deluncat").style.display = "none";
      }
    }
    // create movie stats
    let msstattable = document.getElementById("msstat");
    // delete old entries:
    while (msstattable.firstChild) {
      msstattable.removeChild(msstattable.lastChild);
    }
    util.utilAddTableRow(msstattable, ["Merklisteneinträge:", result.moviestate.bookmarked], "rr1");
    util.utilAddTableRow(msstattable, ["- ungesehen::", result.moviestate.bookmarkedunseen], "rr1");
    util.utilAddTableRow(msstattable, ["- gesehen::", result.moviestate.bookmarked - result.moviestate.bookmarkedunseen], "rr1");
    util.utilAddTableRow(msstattable, ["Einträge älter " + result.daysbefore + " Tage:", result.moviestate.oldtotal], " rr1");
    util.utilAddTableRow(msstattable, ["<b>- löschbar:</b>", result.moviestate.oldnotbookmarked], "rr1");
    if (result.moviestate.oldnotbookmarked == 0) {
      document.getElementById("deloldmstate").style.display = "none";
    }
    document.getElementById("moviestate").innerHTML = "Filmstatus: " + result.tables[1].nb + " Einträge";
  }
  util.utilSetWait(false);
}


function triggerReload() {
  location.reload();
}


function deleteUnusedCat() {
  let nb = unusedCatContainer.childElementCount;
  let name = unusedCatContainer.firstChild.innerText;
  unusedCatContainer.removeChild(unusedCatContainer.firstChild);
  util.utilSendHttpRequest("DELETE", gBookmarkServerUrl + "categories/" + name, null, false, nb > 1 ? deleteUnusedCat : triggerReload);
}


function requestPlayerInfo() {
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "info", null, false, requestPlayerInfoSuccess);
}


function requestPlayerInfoSuccess(response) {
  let result = JSON.parse(response);
  if (result) {
    document.getElementById("topversion").innerText = "V" + result.version;
    let playerlist = document.getElementById("playerlist");
    while (playerlist.firstChild) {
      playerlist.removeChild(playerlist.lastChild);
    }
    let defaultPlayerId = result.defaultplayer;
    if (result.players.length > 0) {
      for (let i = 0; i < result.players.length; i++) {
        let playercard = util.utilAddChildObject(playerlist, "div", "", "playercard");
        playercard.setAttribute("data", JSON.stringify(result.players[i]));
        playercard.setAttribute("idx", result.players[i].idx);
        let pclass = result.players[i].idx == defaultPlayerId ? "defaultplayer" : null;
        util.utilAddChildObject(playercard, "div", result.players[i].name, pclass);
        if (result.players[i].type != "Chromecast") {
          let ts = `Typ: '${result.players[i].type}',<br>Adresse: '${result.players[i].address}:${result.players[i].port}'`;
          util.utilAddChildObject(playercard, "div", ts, "paddr");
          playercard.appendChild(util.utilCreateButton("images/gear-blue.svg", "cardright cardBtn", showPlayerConfigDialog));
          playercard.appendChild(util.utilCreateButton("images/delete.svg", "cardBtn", deletePlayerConfigCard));
        }
        else {
          util.utilAddChildObject(playercard, "div", `Typ: Chromecast,<br>"Friendly name: '${result.players[i].address}'`, "paddr");
        }
      }
    }
    gDaysBefore = result.config.minMovieStateAge;

    //Filter:
    setArrayExpanded(document.getElementById("defaultStationList"), result.config.searchChannelInclude);
    setArrayExpanded(document.getElementById("titleFilterList"), result.config.searchTitleFilter);
    setArrayExpanded(document.getElementById("topicFilterList"), result.config.searchTopicFilter);
  }
  loadStatisticsData();
}


function setArrayExpanded(element, arr) {
  element.innerHTML = "\"" + arr.join("\", \"") + "\"";
  element.parentElement.style.display = "block";
}


function loadStatisticsData() {
  util.utilSetWait(true);
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "info/statistics?daysbefore=" + gDaysBefore, null, false, loadStatsSuccess);
}


function showPlayerConfigDialog(event) {
  let doNew = false;
  if ("addPlayerImg" == event.srcElement.id) {
    doNew = true;
    document.getElementById("pName").value = "";
    document.getElementById("mAdresse").innerText = "";
    document.getElementById("mPort").innerText = "";
    document.getElementById("pTypSelect").selectedIndex = -1;
  }
  else {
    let idx = event.currentTarget.parentNode.getAttribute("idx");
    let jsondata = event.currentTarget.parentNode.getAttribute("data");
    let data = JSON.parse(jsondata);
    document.getElementById("dlgm_setPlayer").setAttribute("data", jsondata);
    document.getElementById("dlgm_setPlayer").setAttribute("idx", idx);
    document.getElementById("pName").value = data.name;
    document.getElementById("addrDisplay").children[1].innerText = data.address + ":" + data.port;
    document.getElementById("pTypSelect").selectedIndex = data.type == "kodi" ? 0 : 1;
  }
  document.getElementById("pAuth").value = "";
  document.getElementById("cbDefault").checked = false;
  document.getElementById("addrDisplay").style.display = doNew ? "none" : "block";
  document.getElementById("addrInput").style.display = doNew ? "block" : "none";

  document.getElementById("dlgm_setPlayer").style.display = "block";
}


function savePlayerConfig() {
  let data;
  let neu = document.getElementById("addrInput").style.display == "block";
  if (neu) {
    data = new Object();
    data.address = document.getElementById("mAdresse").value;
    data.port = parseInt(document.getElementById("mPort").value);
  }
  else {
    data = JSON.parse(document.getElementById("dlgm_setPlayer").getAttribute("data"));
    data.port = parseInt(data.port);
  }
  let auth = document.getElementById("pAuth").value;
  if (auth) {
    data.authentification = document.getElementById("pAuth").value;
  }
  let sidx = document.getElementById("pTypSelect").selectedIndex;
  data.type = sidx == 0 ? "kodi" : sidx == 1 ? "vlc" : undefined;
  data.name = document.getElementById("pName").value;
  data.default = document.getElementById("cbDefault").checked;
  util.utilSendHttpRequest("POST", gBookmarkServerUrl + "player", JSON.stringify(data), true, savePlayerConfigResponse, savePlayerConfigResponseError);
  util.utilSetWait(true);
}


function savePlayerConfigResponse() {
  util.utilSetWait(false);
  document.getElementById("dlgm_setPlayer").style.display = "none";
  // refresh player list:
  requestPlayerInfo();
}


function savePlayerConfigResponseError(errno, detail, response) {
  util.utilSetWait(false);
  let result = typeof response == "string" ? JSON.parse(response) : response;
  util.utilViewPopUp("Fehler " + errno + ": <p>Detail: " + result.detail, "cdlg1");
}


function deletePlayerConfigCard(event) {
  let idx = event.currentTarget.parentNode.getAttribute("idx");
  util.utilSendHttpRequest("DELETE", gBookmarkServerUrl + "player/" + idx, null, false, savePlayerConfigResponse, deleteResponseError);
}


function deleteResponseError(errno, detail, response) {
  util.utilSetWait(false);
  let result = typeof response == "string" ? JSON.parse(response) : response;
  util.utilViewPopUp("Fehler " + errno + ": <p>Detail: " + result.detail);
}


function testPlayerConfig() {
  util.utilSetWait(true);
  let idx = document.getElementById("dlgm_setPlayer").getAttribute("idx");
  util.utilSendHttpRequest("GET", gBookmarkServerUrl + "player/" + idx + "/test", null, false, testPlayerConfigResponse, savePlayerConfigResponseError);
}


function testPlayerConfigResponse(response) {
  util.utilSetWait(false);
  let result = JSON.parse(response);
  util.utilViewPopUp("Test: " + (result.success == true ? " Erfolgreich" : " Fehler") + "<br>Detail: " + result.details, "cdlg1");
}


// Filter konfiguration:
let gFiltername;
let gFilterTitleMap = {
  "Durchsuchte Sender": "searchChannelInclude",
  "Titelfilter": "searchTitleFilter",
  "Themenfilter": "searchTopicFilter"
};

function showEditFilterDialog(event) {
  let parent = event.target.parentNode.parentNode;
  let dialog = document.getElementById("dlgm_editFilter");
  gFiltername = parent.children[0].innerText.slice(0, -1);
  document.getElementById("dlgfiltertitle").innerText = gFiltername + " bearbeiten:";
  let filterlist = parent.children[1].children[0].innerText.replaceAll("\"", "").split(", ");
  let displaylist = document.getElementById("dlgfilterlist");
  while (displaylist.firstChild) {
    displaylist.removeChild(displaylist.lastChild);
  }
  for (let k = 0; k < filterlist.length; k++) {
    if (filterlist[k].length > 0) {
      addFilter(filterlist[k], displaylist);
    }
  }
  document.getElementById("mNewFilterName").value = "";
  dialog.style.display = "block";
}


function deleteFilterInDialog(event) {
  let displaylist = document.getElementById("dlgfilterlist");
  let delfilter = event.target.parentNode.parentNode;
  displaylist.removeChild(delfilter);
}


function addNewFilterInDialog(event) {
  let newFilter = event.target.parentNode.children[0].value;
  if (newFilter.length > 0) {
    // Check if exists:
    let isnew = true;
    let filterlist = document.getElementById("dlgfilterlist").childNodes;
    for (let k = 0; k < filterlist.length; k++) {
      if (filterlist[k].firstChild.value == newFilter) {
        isnew = false;
        break;
      }
    }
    if (isnew == true) {
      addFilter(newFilter, document.getElementById("dlgfilterlist"));
    }
    else {
      util.utilViewPopUp("Filter exisitiert bereits", "cdlg2");
    }
  }
  else {
    util.utilViewPopUp("Filter darf nicht leer sein!", "cdlg2");
  }
}


function saveFiltersFromDialog() {
  let filterlist = document.getElementById("dlgfilterlist").childNodes;
  let values = [];
  for (let k = 0; k < filterlist.length; k++) {
    values.push("\"" + filterlist[k].firstChild.value + "\"");
  }
  let config = new Object();
  config["name"] = gFilterTitleMap[gFiltername];
  config["value"] = values.join(",");
  util.utilSendHttpRequest("PATCH", gBookmarkServerUrl + "info/config", JSON.stringify(config), true, patchFilterSuccess, patchFilterError);
}


function patchFilterSuccess() {
  util.utilSetWait(false);
  document.getElementById("dlgm_editFilter").style.display = "none";
  // refresh player list:
  requestPlayerInfo();
}


function patchFilterError(errno, detail, response) {
  util.utilSetWait(false);
  //let result = JSON.parse(response);
  util.utilViewPopUp("Fehler " + errno + ": <p>Detail: " + response.detail, "cdlg2");
}


function addFilter(filtername, filterlist) {
  let idiv = util.utilAddChildObject(filterlist, "div", "", "filterinput");
  let inp = document.createElement("input");
  inp.type = "text";
  inp.value = filtername;
  idiv.appendChild(inp);
  idiv.appendChild(util.utilCreateButton("images/delete.svg", "cardBtn", deleteFilterInDialog));
}


// --------------------------------------------
// Entry point:
document.addEventListener("DOMContentLoaded", () => {
  // Add event handler
  for (let obj of document.getElementsByClassName("card")) {
    obj.onclick = function () {
      let mext = obj.querySelector("#aext");
      if (mext) {
        mext.style.display = mext.style.display == "none" ? "block" : "none";
        let mimg = obj.querySelector("img");
        if (mimg) {
          mimg.style.display = mext.style.display == "none" ? "block" : "none";
        }
      }
    };
  }

  for (let obj of document.getElementsByClassName("card")) {
    let mext = obj.querySelector("#aext");
    if (mext) {
      mext.style.display = "none";
    }
  }

  // Delete unused Category
  document.getElementById("deluncat").onclick = () => {
    deleteUnusedCat();
  };

  // Delete old moviestate
  document.getElementById("deloldmstate").onclick = function () {
    util.utilSendHttpRequest("DELETE", gBookmarkServerUrl + "moviestate?daysbefore=" + gDaysBefore, null, false, triggerReload);
  };

  // Add player Button
  document.getElementById("addPlayer").addEventListener("click", showPlayerConfigDialog);

  document.getElementById("catback").onclick = function () {
    history.back();
  };

  // Add filter Edit Button:
  let btnlist = document.querySelectorAll("#sFilter button");
  for (let k = 0; k < btnlist.length; k++) {
    btnlist[k].addEventListener("click", showEditFilterDialog);
  }
  document.getElementById("mNewFilterButton").addEventListener("click", addNewFilterInDialog);
  document.getElementById("mSaveFiltersButton").addEventListener("click", saveFiltersFromDialog);

  // Config Dialog:
  document.getElementById("mNewPlayerButton").addEventListener("click", savePlayerConfig);
  document.getElementById("mTestPlayerButton").addEventListener("click", testPlayerConfig);

  // Refresh statistics
  document.getElementById("refreshBtn").addEventListener("click", loadStatisticsData);

  if (localStorage.getItem("font-size")) {
    document.body.style.fontSize = localStorage.getItem("font-size") + "%";
  }

  // set base url:
  if (cfgBookmarkServerAddress && cfgBookmarkServerAddress != "") {
    gBookmarkServerUrl = cfgBookmarkServerAddress;
  }
  else {
    gBookmarkServerUrl = window.location.pathname.slice(0, -18); // TBC, if filename changes
  }
  gBookmarkServerUrl += BASE_PATH;

  // Request info:
  requestPlayerInfo();
});
