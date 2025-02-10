"""
Configuration file handling

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import logging
import os
import socket
from configparser import ConfigParser
from pathlib import Path


def getOwnIp():
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  s.settimeout(0)
  try:
    # doesn't even have to be reachable
    s.connect(("10.254.254.254", 1))
    ipAddr = s.getsockname()[0]
  except Exception:  # noqa: BLE001
    ipAddr = "127.0.0.1"
  finally:
    s.close()
  return ipAddr


class MyConfig(ConfigParser):  # pylint: disable=too-many-instance-attributes,too-many-public-methods
  def __init__(self, baseDir):  # noqa: PLR0912
    ConfigParser.__init__(self)
    self._baseDir = baseDir
    self.playerList = []

    self._configFile = (
      os.environ["BM_CONFIG_FILE"]
      if "BM_CONFIG_FILE" in os.environ
      else os.path.join(self._baseDir.parent, "data", "server.ini")
    )
    if os.path.exists(self._configFile):  # noqa: PTH110
      super().read(self._configFile, None)
      self._updatePlayerList()
    else:
      print("NO Ini file provided, using default values:")  # noqa: T201
      self._configFile = None

    if "BM_DBFILE" in os.environ:
      self._dbName = os.environ["BM_DBFILE"]
    else:
      self._dbName = os.path.join(self._baseDir.parent, "data", "bookmarks.db")

    self._serverPort = self.get("general", "serverport", fallback=8081)
    self._serverAddress = self.get("general", "serveraddress", fallback=None)
    if not self._serverAddress:
      serverIP = getOwnIp() if self.getboolean("general", "servermode", fallback=True) else "127.0.0.1"
      self._serverAddress = f"http://{serverIP}:{self._serverPort}"
      self._ipAddress = self._serverAddress
    else:
      self._ipAddress = f"http://{getOwnIp()}:{self._serverPort}"

    self._sslError = ""
    self._sslCert = ""
    if self.sslEnabled:
      sslCert = self.get("security", "ssl_cert", fallback="").replace('"', "")
      if sslCert != "":
        sslCert = str(Path(sslCert).resolve())
        if os.path.exists(sslCert):  # noqa: PTH110
          self._sslCert = sslCert
        else:
          self._sslError = f"Zertifikatsdatei {sslCert} ist nicht vorhanden"

      if self._sslError == "":
        sslKey = self.get("security", "ssl_key", fallback="").replace('"', "")
        if sslKey:
          sslKey = str(Path(sslKey).resolve())
          if os.path.exists(sslKey):  # noqa: PTH110
            self._sslKey = sslKey
          else:
            self._sslError = f"Zertifikatsschlüssel {sslKey} ist nicht vorhanden"

    if self.sslEnabled and not self._sslError:
      self._ipAddress = self._ipAddress.replace("http:", "https:")
      self._serverAddress = self._ipAddress.replace("http:", "https:")
    else:
      self._ipAddress = self._ipAddress.replace("https:", "http:")
      self._serverAddress = self._ipAddress.replace("https:", "http:")

    self._chromeCastName = self.get("execenv", "chromeCastFriendlyName", fallback=None)
    if self._chromeCastName:
      self._chromeCastName = self._chromeCastName.strip('"')
      self._chromeCastDisplayName = self.get("execenv", "chromeCastDisplayName", fallback=self._chromeCastName).strip(
        '"'
      )

  def _updatePlayerList(self):
    self.playerList = []
    for section in self.sections():
      if section[0:6] == "player":
        # check content:
        if "address" in self[section] and "port" in self[section] and "type" in self[section]:
          self.playerList.append(section)
        else:
          print(" * ERROR: INI file: In section >" + section + "< mandatory entries are missing => section is ignored")  # noqa: T201

  def getPlayerData(self, idx):
    if not idx:
      idx = self.getDefaultPlayerIdx()
    if idx == "cc" and self._chromeCastName is not None:
      ptype = "chromecast"
      paddress = self._chromeCastName
      pauth = None
    elif idx in self.playerList:
      ptype = self.get(idx, "type", fallback="")
      paddress = self.get(idx, "address", fallback=None)
      if paddress:
        pport = self.get(idx, "port", fallback=None)
        if pport:
          paddress = paddress + ":" + pport
        pauth = self.get(idx, "auth", fallback=None)
      else:
        ptype = "err"
        paddress = f"Keine IP Adresse für Player #{idx} gefunden"
        pauth = None
    else:
      ptype = "err"
      paddress = f"Player #{idx} ist nicht konfiguriert"
      pauth = None
    return ptype, paddress, pauth

  def getDefaultPlayerIdx(self):
    return self.get("general", "default_player", fallback=None)

  def _getConfigArray(self, name, default):
    val = self.get("config", name, fallback=default)
    return val.split(",")

  def getConfigDataJSON(self):
    return {
      "searchChannelInclude": self._getConfigArray("searchChannelInclude", "ARD,ZDF,3SAT,ARTE.DE"),
      "searchTitleFilter": self._getConfigArray("searchTitleFilter", "Audiodeskription,Untertitel,Trailer"),
      "searchTopicFilter": self._getConfigArray("searchTopicFilter", "Trailer"),
      "minMovieStateAge": self.getint("config", "minMovieStateAge", fallback=183),
      "expiryBookmarkWarningDays": self.getint("config", "expiryBookmarkWarningDays", fallback=5),
      "expiryMovieWarningDays": self.getint("config", "expiryMovieWarningDays", fallback=8),
    }

  def getPlayerInfoJSON(self):
    players = []
    for e in self.playerList:
      player = {
        "idx": e,
        "name": self[e]["name"],
        "type": self[e]["type"],
        "address": self[e]["address"],
        "port": self[e]["port"],
      }
      players.append(player)
    if self._chromeCastName is not None:
      players.append(
        {
          "idx": "cc",
          "name": self._chromeCastDisplayName,
          "type": "Chromecast",
          "address": self._chromeCastName,
          "port": -1,
        }
      )
    return players

  def getPlayerInfo(self):
    pc = 0 if self._chromeCastName is None else 1 + len(self.playerList)
    if pc > 0:
      pinfo = f" * {pc} Player sind konfiguriert:" if pc > 1 else " * ein Player ist konfiguriert:"
      pinfo += "\n   Id:        Name:                      Adresse:                       Typ:"
      pdefault = self.getDefaultPlayerIdx()
      for e in self.playerList:
        addr = self[e]["address"] + ":" + self[e]["port"]
        name = self[e]["name"] + "'"
        pinfo += f"\n   {e:10} '{name:25} {addr:30} {self[e]['type']}"
        if e == pdefault:
          pinfo += " (DEFAULT)"
      if self._chromeCastName is not None:
        dname = "'" + self._chromeCastDisplayName + "'"
        pinfo += f"\n   cc         {dname:26} {self._chromeCastName:30} Chromecast"
        if pdefault == "cc":
          pinfo += " (DEFAULT)"
    else:
      pinfo = " * keine Player konfiguriert"
    return pinfo

  def addPlayer(self, address, port, ptype, name, auth, default):  # noqa: C901, PLR0912
    # check if address already exists:
    found = False
    error = None
    section = None
    if port and address:
      for e in self.playerList:
        if self[e]["address"] == address and self[e]["port"] == str(port):
          found = True
          section = e
          break
      if found:
        if name:
          self.set(section, "name", name)
        if auth:
          self.set(section, "auth", auth)
        if ptype:
          self.set(section, "type", ptype)
      elif ptype:
        # create new entry
        # - get highest index:
        idx = 0
        while True:
          idx += 1
          section = "player" + str(idx)
          if section not in self.playerList:
            # check for section in config:
            if section not in self.sections():
              break
        if len(self.playerList) == 1:
          default = True
        self.playerList.append(section)
        self.add_section(section)
        self.set(section, "address", address)
        self.set(section, "port", str(port))
        self.set(section, "name", name if name else f"{address}:{port!s}")
        if auth:
          self.set(section, "auth", auth)
        if ptype:
          self.set(section, "type", ptype)
      else:
        error = 422, "Type is not specified, can not create new player"
    else:
      error = 422, "Port and/or address are missing, can not create/update player"
    # mark default:
    if not error and default:
      if "general" not in self.sections():
        self.add_section("general")
      self.set("general", "default_player", section)
    self.saveConfig2File()
    return error

  def deletePlayer(self, pid):
    result = 200, ""
    if pid in self.playerList:
      defaultidx = self.getDefaultPlayerIdx()
      if "general" not in self.sections():
        self.add_section("general")
      self.set("general", "default_player", str(defaultidx))
      self.remove_section(pid)
      self.saveConfig2File()
      # rebuild index
      self._updatePlayerList()
      if pid == defaultidx:
        defaultidx = self.playerList[0] if len(self.playerList) > 0 else 0
    else:
      result = 400, "Invalid player id specified"
    return result

  def saveConfig2File(self):
    if self._configFile is None:
      self._configFile = os.path.join(self._baseDir.parent, "data", "server.ini")
    with open(self._configFile, "w", encoding="utf-8") as configfile:  # noqa: PTH123
      self.write(configfile)

  def updateConfigValue(self, name, value):
    result = 200, ""
    if not self.has_section("config"):
      self.add_section("config")
    value = value.replace('"', "")
    self.set("config", name, value)
    self.saveConfig2File()
    return result

  @property
  def baseDir(self):
    return self._baseDir

  @property
  def chromeCastName(self):
    return self._chromeCastName

  @property
  def configFile(self):
    return self._configFile if self._configFile is not None else "None"

  @property
  def dbName(self):
    return self._dbName

  @property
  def logLevel(self):
    ll = self.get("general", "loglevel", fallback="ERROR").upper()
    lmap = logging.getLevelNamesMapping()
    return lmap.get(ll, logging.ERROR)

  @property
  def templateDir(self):
    return os.path.join(self._baseDir, "www", "templates")

  @property
  def staticDir(self):
    return os.path.join(self._baseDir, "www")

  @property
  def serverAddress(self):
    return self._serverAddress

  @property
  def serverMode(self):
    return self.getboolean("general", "servermode", fallback=True)

  @property
  def serverPort(self):
    return self._serverPort

  @property
  def serverIpAddress(self):
    return self._ipAddress

  @property
  def sslCert(self):
    return self._sslCert

  @property
  def sslKey(self):
    return self._sslKey

  @property
  def sslContext(self):
    return (self._sslCert, self._sslKey) if self._sslCert else ("adhoc")

  @property
  def sslEnabled(self):
    return self.getboolean("security", "ssl_enabled", fallback=False)

  @property
  def sslError(self):
    return self._sslError
