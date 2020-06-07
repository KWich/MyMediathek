
"""
  Try to start movie with given url
"""
import os
import requests
import time
import sys
import re
import json 
from api import cfgConfig
from xml.etree import cElementTree as ET


oldtimestamp = 0
def callMoviePlayer(title, filmurl, timestamp, playerIdx=None):
  result = 500
  global oldtimestamp
  if timestamp > oldtimestamp:
    oldtimestamp = timestamp
    #import pdb; pdb.set_trace()
    ptype, paddress, pauth = cfgConfig.getPlayerData(playerIdx)
    if ptype == 'kodi':
      result = playWithKodi(title, filmurl, paddress, pauth)
    elif ptype == 'vlc':
      result = playWithVLC(title, filmurl, paddress, pauth)
    elif ptype == 'err':
      result = (500, "Konfigurationsfehler: '" + paddress)
    else:
      result = (500, "Player mit Typ '" + ptype + "' wird nicht unterstützt")
  else:
    result = (500,"Zeitstempel " + str(timestamp) + " ist älter als gespeicherter Zeitstempel ("+ str(oldtimestamp) + ") => Film wird nicht nochmal abgespielt!")

  if (result[0] != 200):
    print("   " + result[1])
  return result


def playWithKodi(title, filmurl, playeraddress, pauth):
  disptitle = " für '" + title + "'" if title else "";
  print (" * Aufruf Kodi" + disptitle + " mit URL: '" + filmurl + "'")
  id = int(round(time.time()*1000))
  kodiurl = "http://" + playeraddress + "/jsonrpc"
  pload = { "jsonrpc":"2.0","id": id, "method":"Player.Open", "params": {"item": {"file": filmurl}}}
  try:
    if pauth:
      r = requests.post(kodiurl, json=pload, auth = tuple(pauth.split(":")))
    else:
      r = requests.post(kodiurl, json=pload)
    result = r.status_code,''
  except:
    e = sys.exc_info()[0]
    x = re.search("'(.+)'", str(e))
    if x:
      e = x.group()
      err = e[1:len(e)-1]
    else:
      err = str(e)
    result = (500, "Aufruf Kodi verursachte Fehler: " + err)
  return result


def playWithVLC(title, filmurl, playeraddress, pauth):
  #import pdb; pdb.set_trace()
  disptitle = " für '" + title + "'" if title else "";
  print (" * Aufruf VLC" + disptitle + " mit URL: '" + filmurl + "'")
  player_auth = pauth + "@" if pauth else ""
  vlcurl = "http://" + player_auth + playeraddress + "/requests/status.xml?command=in_play&input=" + filmurl
  try:
    r = requests.get(vlcurl)
    result = r.status_code,''
  except:
    e = sys.exc_info()[0]
    x = re.search("'(.+)'", str(e))
    if x:
      e = x.group()
      err = e[1:len(e)-1]
    else:
      err = str(e)
    result = (500, "Aufruf VLC verursachte Fehler: " + err)
  return result


def testMoviePlayer(playerid):
  #import pdb; pdb.set_trace()
  ptype, paddress, pauth = cfgConfig.getPlayerData(playerid)
  if ptype == 'kodi':
    result = testKodi(paddress, pauth)
  elif ptype == 'vlc':
    result = testVLC(paddress, pauth)
  elif ptype == 'err':
    result = (500, "Konfigurationsfehler: '" + paddress)
  if (result[0] != 200):
    print("   " + result[1])
  return result


def testVLC(playeraddress, pauth):
  print (" * Test VLC mit Address: '" + playeraddress + "'")
  player_auth = pauth + "@" if pauth else ""
  vlcurl = "http://" + player_auth + playeraddress + "/requests/status.xml"
  try:
    r = requests.get(vlcurl)
    status = ""
    #import pdb; pdb.set_trace()
    if r.status_code == 200:
      root = ET.fromstring(r.text)
      status = "VLC version " + root.find('version').text + ", State: " + root.find('state').text
    result = r.status_code,status
  except:
    e = sys.exc_info()[0]
    x = re.search("'(.+)'", str(e))
    if x:
      e = x.group()
      err = e[1:len(e)-1]
    else:
      err = str(e)
    result = (299, "VLC Test Fehler: " + err)
  return result


def testKodi(playeraddress, pauth):
  print (" * Test Kodi mit Address: '" + playeraddress + "'")
  id = int(round(time.time()*1000))
  kodiurl = "http://" + playeraddress + "/jsonrpc"
  pload = { "jsonrpc":"2.0","id": id, "method":"JSONRPC.Version", "params": {}}
  try:
    status = ""
    if pauth:
      r = requests.post(kodiurl, json=pload, auth = tuple(pauth.split(":")))
    else:
      r = requests.post(kodiurl, json=pload)
    #import pdb; pdb.set_trace()
    res = json.loads(r.text)
    status = "Kodi version " + str(res['result']['version']['major']) + "." + str(res['result']['version']['minor'])
    result = r.status_code,status
  except:
    e = sys.exc_info()[0]
    x = re.search("'(.+)'", str(e))
    if x:
      e = x.group()
      err = e[1:len(e)-1]
    else:
      err = str(e)
    result = (500, "Aufruf Kodi verursachte Fehler: " + err)
  return result
