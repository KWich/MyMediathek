"""
Media player:
Controls the playing of media with Chromecast

SPDX-FileCopyrightText: 2025 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import time
import sys
import re
import json
from xml.etree import cElementTree as ET
import requests
from server import APP_CONFIG
from server.player.chromecast import ChromeCast       # pylint: disable=no-name-in-module
from server.common.logger import Logger as logger     # pylint: disable=no-name-in-module

REQ_TIME_OUT = 5

class MediaPlayer():
  _instance = None


  @staticmethod
  def getInstance():
    if MediaPlayer._instance is None:
      MediaPlayer._instance  = MediaPlayer()
    return MediaPlayer._instance


  def __init__(self):
    self._chromecast = None
    self._isplaying = False
    self.oldTimeStamp = 0


  def playMovie(self, title, filmurl, timestamp, playerIdx=None):
    result = 500
    if timestamp > self.oldTimeStamp:
      self.oldTimeStamp = timestamp
      #import pdb; pdb.set_trace()
      ptype, paddress, pauth = APP_CONFIG.getPlayerData(playerIdx)
      if ptype == 'kodi':
        result = self.playWithKodi(title, filmurl, paddress, pauth)
      elif ptype == 'vlc':
        result = self.playWithVLC(title, filmurl, paddress, pauth)
      elif ptype == "chromecast":
        result = self.playWithChromeCast(title, filmurl)
      elif ptype == 'err':
        result = (500, "Konfigurationsfehler: " + paddress)
      else:
        result = (500, "Player mit Typ '" + ptype + "' wird nicht unterstützt")
    else:
      result = (500, f"Zeitstempel {str(timestamp)} ist älter als gespeicherter Zeitstempel ({str(self.oldTimeStamp)}) => Film wird nicht nochmal abgespielt!")
    return result


  def testMoviePlayer(self, playerid):
    result = (500, "Konfigurationsfehler")
    ptype, paddress, pauth = APP_CONFIG.getPlayerData(playerid)
    if ptype == 'kodi':
      result = self.testKodi(paddress, pauth)
    elif ptype == 'vlc':
      result = self.testVLC(paddress, pauth)
    elif ptype == 'err':
      result = (500, f"Konfigurationsfehler: '{paddress}'")
    return result


  #  --- Chromecast Support ----------
  def playWithChromeCast(self, title, filmurl):
    if self._initChromeCastConnection():
      self._chromecast.playUrl(filmurl,
                               "video/mp4",
                               title = title)
      result = (200, "")
    else:
      result = (500, "Chromecast is nicht verbunden")
    return result


  def _initChromeCastConnection(self):
    rc = False
    if APP_CONFIG.chromeCastName is not None:
      if self._chromecast is None:
        logger.debug("============================ initialize  Chromecast connection ========================")
        self._chromecast = ChromeCast.getInstance(APP_CONFIG.chromeCastName,
                                                  self._cbChromecastStatusChange)
        time.sleep(1)
      rc = self._chromecast.isConnected()
    return rc


  def _cbChromecastStatusChange(self, obj):
    status = obj.getStatus()
    if status['ccConnection'] == "LOST":
      logger.error("Chromecast connection is lost > reset Object!")
      logger.debug("!!!!! ============================ remove Chromecast object !!!! ============================= ")
      ChromeCast.deleteInstance()
      self._chromecast  = None



  # ---- Kodi Support ----
  def playWithKodi(self, title, filmurl, playeraddress, pauth):
    disptitle = " für '" + title + "'" if title else ""
    logger.debug("Aufruf Kodi" + disptitle + " mit URL: '" + filmurl + "'")
    pid = int(round(time.time()*1000))
    kodiurl = "http://" + playeraddress + "/jsonrpc"
    # Check if player is active and stop it:
    pload = { "jsonrpc":"2.0","id": pid, "method":"Player.GetActivePlayers"}
    result = self._snd2kodi(kodiurl, pload, pauth)
    if result[0] == 200:
      res = json.loads(result[1])
      if res['result']:
        #import pdb; pdb.set_trace()
        playerId = res['result'][0]['playerid']
        pload = { "jsonrpc":"2.0","id": pid, "method":"Player.Stop", "params": {"name": playerId}}
        result = self._snd2kodi(kodiurl, pload, pauth)
        time.sleep(0.2)
    # Start new movie
    pload = { "jsonrpc":"2.0","id": pid, "method":"Player.Open", "params": {"item": {"file": filmurl}}}
    result = self._snd2kodi(kodiurl, pload, pauth)
    if result[0] == 200:
      # check if movie was really started:
      time.sleep(2)
      pload = { "jsonrpc":"2.0","id": pid, "method":"Player.GetActivePlayers"}
      result = self._snd2kodi(kodiurl, pload, pauth)
      if result[0] == 200:
        res = json.loads(result[1])
        if not res['result']:
          result = 404, result[1]
    return result


  def _snd2kodi(self, url, jsonload, auth):
    try:
      if auth:
        r = requests.post(url, json=jsonload, auth = tuple(auth.split(":")), timeout=REQ_TIME_OUT)
      else:
        r = requests.post(url, json=jsonload, timeout=REQ_TIME_OUT)
      result = r.status_code,r.text
    except:
      exc = sys.exc_info()[0]
      x = re.search("'(.+)'", str(exc))
      if x:
        exc = x.group()
        err = exc[1:len(exc)-1]
      else:
        err = str(exc)
      result = (500, "Aufruf Kodi verursachte Fehler: " + err)
    return result


  def testKodi(self, playeraddress, pauth):
    logger.debug("Test Kodi mit Address: '" + playeraddress + "'")
    pid = int(round(time.time()*1000))
    kodiurl = "http://" + playeraddress + "/jsonrpc"
    pload = { "jsonrpc":"2.0","id": pid, "method":"JSONRPC.Version", "params": {}}
    try:
      if pauth:
        r = requests.post(kodiurl, json=pload, auth = tuple(pauth.split(":")), timeout=REQ_TIME_OUT)
      else:
        r = requests.post(kodiurl, json=pload, timeout=REQ_TIME_OUT)
      res = json.loads(r.text)
      status = "Kodi version " + str(res['result']['version']['major']) + "." + str(res['result']['version']['minor'])
      result = r.status_code,status
    except:
      ex = sys.exc_info()[0]
      x = re.search("'(.+)'", str(ex))
      if x:
        ex = x.group()
        err = ex[1:len(ex)-1]
      else:
        err = str(ex)
      result = (500, "Aufruf Kodi verursachte Fehler: " + err)
    return result


  # ------ VLC Support ------
  def playWithVLC(self, title, filmurl, playeraddress, pauth):
    disptitle = " für '" + title + "'" if title else ""
    logger.debug ("Aufruf VLC" + disptitle + " mit URL: '" + filmurl + "'")
    playerAuth = pauth + "@" if pauth else ""
    vlcurl = f"http://{playerAuth}{playeraddress}/requests/status.xml"
    try:
      # Check if player is active and stop if necessary:
      r = requests.get(vlcurl, timeout=REQ_TIME_OUT)
      if r.status_code == 200:
        root = ET.fromstring(r.text)
        if root.find('state').text == "playing":
          requests.get(vlcurl + "?command=pl_stop", timeout=REQ_TIME_OUT)

      # Start new movie
      r = requests.get(vlcurl + "?command=in_play&input=" + filmurl, timeout=REQ_TIME_OUT)
      if r.status_code == 200:
        # check if movie was really started:
        time.sleep(1)
        r = requests.get(vlcurl, timeout=REQ_TIME_OUT)
        if r.status_code == 200:
          root = ET.fromstring(r.text)
          if root.find('state').text != "playing":
            r.status_code = 404
      result = r.status_code,''
    except:
      exc = sys.exc_info()[0]
      x = re.search("'(.+)'", str(exc))
      if x:
        exc = x.group()
        err = exc[1:len(exc)-1]
      else:
        err = str(exc)
      result = 500, "Aufruf VLC verursachte Fehler: " + err
    return result


  def testVLC(self, playeraddress, pauth):
    logger.debug(f"Test VLC mit Address: '{playeraddress}'")
    playerAuth = pauth + "@" if pauth else ""
    vlcurl = "http://" + playerAuth + playeraddress + "/requests/status.xml"
    try:
      r = requests.get(vlcurl, timeout=REQ_TIME_OUT)
      status = ""
      if r.status_code == 200:
        root = ET.fromstring(r.text)
        status = "VLC version " + root.find('version').text + ", State: " + root.find('state').text
      result = r.status_code, status
    except:
      ex = sys.exc_info()[0]
      x = re.search("'(.+)'", str(ex))
      if x:
        ex = x.group()
        err = ex[1:len(ex)-1]
      else:
        err = str(ex)
      result = (299, "VLC Test Fehler: " + err)
    return result
