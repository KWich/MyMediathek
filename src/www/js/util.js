/*
 * MyMediathek: Utility functions
 */
"use strict";

import {cfgMessagePopUpDuration} from "../config/config.js";

let utilActiveHTTPRequest = false;
let msgTimeOutFuncId;

export function noPendingHTTPRequest() {
  return !utilActiveHTTPRequest;
}


/**
 * Sends a HTTP Request to a server and waits for the response (async)
 * @param {type} Type of request one of GET,POST,PATCH,DELETE,OPTION
 * @param {url}  Server URL
 * @param {load} Body to be sent (for POST)
 * @param {usejsontype} If True set necessary HTTP header for JSON body
 * @param {funcsuccess}  Optional Function called in case of success (200 or 204 response), defaults to none
 * @param {funcerr}  Optional Function called in case of error (4xx or 5xx response), defaults to none
 * @param {addheader} Additional header to be send with message
 *
 * Note: Sets wait to False if no success or error function is specified
 */
export function utilSendHttpRequest(type, url, load, usejsontype, funcsuccess, funcerr, addheader, timeout) {
  let xhttp = new XMLHttpRequest();
  xhttp.open(type, url, true);
  if (usejsontype) {
    xhttp.responseType = "json";
    xhttp.setRequestHeader("Content-Type", type == "PATCH" ? "application/json-patch+json;charset=UTF-8" : "application/json;charset=UTF-8");
    xhttp.setRequestHeader("Accept", "application/json");
  }
  if (addheader) {
    xhttp.setRequestHeader(addheader.name, addheader.content);
  }
  if (timeout) {
    xhttp.timeout = timeout;
  }
  xhttp.onreadystatechange = function() {
    if (this.readyState == 4) {
      utilActiveHTTPRequest = false;
      if (this.status == 200 || this.status == 204) {
        if (funcsuccess) {
          funcsuccess(this.response);
        }
        else {
          utilSetWait(false);
        }
      }
      else if (funcerr) {
        funcerr(this.status, this.statusText, this.response);
      }
      else {
        utilSetWait(false);
        let detail = "";
        if (this.response) {
          let result = typeof this.response === "string" ? JSON.parse(this.response) : this.response;
          if (result.status) {
            detail = result.status + " " + result.title + ": " + JSON.stringify(result.detail);
          }
        }
        else if (this.status == 0) {
          detail = "Konnte keine Verbindung zu<br><br>'" + this.responseURL + "'<br><br> aufbauen.<br><br>Ist der Server verf�gbar und konfiguriert?";
        }
        else {
          detail = this.status + " - " + this.statusText;
        }
        utilViewPopUp("<h2>Netzwerkfehler:</h2> " + detail, "err");
      }
    }
  };
  utilActiveHTTPRequest = true;
  if (load) {
    xhttp.send(load);
  }
  else {
    xhttp.send();
  }
}

export function utilNetworkErrorMsg(msg) {
  utilViewPopUp("<h2>Netzwerkfehler:</h2> " + msg, "err");
}

/**
 * Shows the message popup
 * @param {msg} Message to be displayed
 * @param {winno} Window selector
 **/
export function utilViewPopUp(msg, winno = "") {
  let ele = document.getElementById("msgpopup" + winno);
  ele.innerHTML = msg;
  ele.style.visibility = "visible";
  ele.style.display = "block";
  if (msgTimeOutFuncId) {
    clearTimeout(msgTimeOutFuncId);
  }
  msgTimeOutFuncId = setTimeout(function() {
    let ele = document.getElementById("msgpopup" + winno);
    ele.style.visibility = "hidden";
    ele.style.display = "none";
    msgTimeOutFuncId = null;
  }, cfgMessagePopUpDuration * (winno == "err" ? 2 : 1));
}


/**
 * Shows or hides the waiting symbol
 * @param {show} True/False
 **/
export function utilSetWait(show) {
  document.getElementById("wait").style.display = show ? "block" : "none";
}


// --- Build HTML ------
export function utilAddChildObject(obj, type, otext, oclass = null) {
  let child = document.createElement(type);
  child.innerHTML = otext;
  if (oclass != null) {
    child.setAttribute("class", oclass);
  }
  obj.appendChild(child);
  return child;
}

export function utilCreateButton(bimg, bclass, action) {
  let btn = document.createElement("button");
  btn.setAttribute("class", bclass);
  btn.addEventListener("click", action);
  let btnimg = document.createElement("img");
  btnimg.src = bimg;
  //btnimg.height = 48;
  btn.appendChild(btnimg);
  return btn;
}

export function utilAddTableRow(table, valarray, rowclass) {
  let trow = utilAddChildObject(table, "tr", "", rowclass);
  valarray.forEach(element => utilAddChildObject(trow, "td", element));
  table.appendChild(trow);
  return trow;
}


// ---- Supportfunktionen ---------------------
export function utilJsonParse(raw) {
  try {
    return JSON.parse(raw);
  }
  catch {
    return false;
  }
}

export function utilHashID(s) {
  let h;
  for(let i = 0; i < s.length; i++)
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h >= 0 ? h : -h;
}

//--- Time funktionen

/**
* Formatiert String 26.07.1963 20:00 nach timestamp in sekunden
**/
export function utilLocalStringToDate(date) {
  let yyyy = date.substring(6, 10);
  let MMM = date.substring(3, 5);
  let dd = date.substring(0, 2);
  let hh = date.substring(11, 13);
  let mm = date.substring(14, 16);
  let dvalue = new Date(yyyy, MMM - 1, dd, hh, mm);
  return dvalue / 1000;
}

/** Convert String yyyy-mm-dd nach time stamp */
export function utilConvertInputDate(str) {
  let w = str.trim().split("-");
  let mdate = new Date(w[0], parseInt(w[1]) - 1, w[2], 23, 59, 59);
  return mdate.getTime() / 1000;
}


export function utilToTimeHHMMSSString(seconds) {
  let hr = Math.floor(seconds / 3600);
  let min = Math.floor(seconds % 3600 / 60);
  let sec = Math.floor(seconds % 3600 % 60);
  return (hr > 0 ? "" + hr + ":" + ("0" + min).slice(-2) : min ) + ":" + ("0" + sec).slice(-2);
}

/**
 * Timestamp to Format dd.mm.yyyy<br>hh:mm
 **/
export function utilToDateString(stamp) {
  let dobj = new Date(stamp * 1000);
  let dd = String(dobj.getDate()).padStart(2, "0");
  let mm = String(dobj.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = String(dobj.getFullYear());
  let hh = String(dobj.getHours());
  let min = String(dobj.getMinutes()).padStart(2, "0");
  return dd + "." + mm + "." + yyyy + "<br>" + hh + ":" + min;
}

/**
 * Timestamp to Format dd.mm.yyyy
 **/
export function utilToShortDateString(stamp) {
  let dobj = new Date(stamp * 1000);
  let dd = String(dobj.getDate()).padStart(2, "0");
  let mm = String(dobj.getMonth() + 1).padStart(2, "0"); //January is 0!
  let yyyy = String(dobj.getFullYear());
  return dd + "." + mm + "." + yyyy;
}

/**
* Convert Date string 22.03.2022T11:13:00Z To internal Date format
**/
export function utilDateString2InternalStamp(n) {
  //let n = str.replace(/(\r\n|\n|\r)/gm, "");
  let k = n.indexOf("T");
  let d = n.substr(0, 10);
  let w = d.split("-");
  let t = n.substr(k + 1, 8);
  let x = t.split(":");
  let mdate = new Date(w[0], parseInt(w[1]) - 1, w[2], x[0], x[1], 0);
  return mdate.getTime() / 1000;
}

export function utilRetrieveDate(str) {
  let n = str.replace(/(\r\n|\n|\r)/gm, "");
  let k = n.indexOf(":");
  let d = n.substr(k + 1, 10);
  let w = d.trim().split(".");
  let t = n.substr(k + 11).trim();
  let x = t.split(":");
  let mdate = new Date(w[2], parseInt(w[1]) - 1, w[0], x[0], x[1], 0);
  return mdate.getTime() / 1000;
}


const timeMulti = [1, 60, 3600];
export function utilTimeStr2Int(str) {
  let a = str.split(":");
  let t = 0;
  let k = 0;
  for (let i = a.length - 1; i >= 0; i--) {
    t += a[i] * timeMulti[k];
    k++;
  }
  return t;
}

export function utilGetTodayStr() {
  let today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1; //January is 0!
  let yyyy = today.getFullYear();
  if (dd < 10) {
    dd = "0" + dd;
  }
  if (mm < 10) {
    mm = "0" + mm;
  }
  return yyyy + "-" + mm + "-" + dd;
}

export function utilCreateInputDate(str) {
  let w = str.trim().split(".");
  return w[2] + "-" + w[1] + "-" + w[0];
}


// JSON related:
export function utilCreateJSONPatchReplaceObj(name, value) {
  return {op: "replace", name: name, value: value};
}

export function utilToggleOption(opt) {
  //opt.selected = opt.selected == 'selected' ? '' : 'selected';
  opt.selected = !opt.selected;
  if (opt.selected) {
    opt.innerHTML = "&check; " + opt.innerHTML;
  }
  else {
    opt.innerHTML = opt.innerHTML.substring(2);
  }
}
