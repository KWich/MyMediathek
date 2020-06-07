from configparser import ConfigParser

class myConfig(ConfigParser):

  playerList=[]
  filename = None

  def read(self, filenames, encoding=None):
    super().read(filenames, encoding)
    self.updatePlayerList()
    self.filename = filenames

  def updatePlayerList(self):
    self.playerList=[]
    for section in self.sections():
      if section[0:6] == "player":
        # check content:
        if 'address' in self[section] and 'port' in self[section] and 'type' in self[section]:
          self.playerList.append(section)
        else:
          print (" * ERROR: INI file: In section >" + section + "< mandatory entries are missing => section is ignored")

  def isValidPlayerIdx(self, idx):
    return len(self.playerList) >= idx

  def getPlayerData(self,id):
    if not id:
      id = self.getDefaultPlayerIdx()
    #import pdb; pdb.set_trace()
    if id in self.playerList:
      ptype = self.get(id, 'type', fallback='')
      paddress = self.get(id, 'address', fallback=None)
      if paddress:
        pport = self.get(id, 'port', fallback=None)
        if pport:
          paddress = paddress + ":" + pport
        pauth = self.get(id, 'auth', fallback=None)
      else:
        ptype = 'err'
        paddress =  f"Keine IP Adresse für Player #{id} gefunden"
        patuth = None
    else:
      ptype = 'err'
      paddress =  f"Player #{id} ist nicht konfiguriert"
      pauth = None
    return ptype, paddress, pauth

  def getDefaultPlayerIdx(self):
    return self.get('general', 'default_player', fallback=None)

  def _getConfigArray(self, name, default):
    val = self.get('config', name, fallback=default)
    return val.split(",")

  def getConfigDataJSON(self):
    #import pdb; pdb.set_trace()
    aList = {
      "searchChannelInclude" : self._getConfigArray("searchChannelInclude", "ARD,ZDF,3SAT,ARTE.DE"),
      "searchTitleFilter": self._getConfigArray("searchTitleFilter", "Audiodeskription,Untertitel,Trailer"),
      "searchTopicFilter": self._getConfigArray("searchTopicFilter", "Trailer"),
      "minMovieStateAge": self.getint('config', 'minMovieStateAge', fallback = 183),
      "expiryWarningDays": self.getint('config', 'expiryWarningDays', fallback = 5)
    }
    return aList

  def getPlayerInfoJSON(self):
    players = []
    for e in self.playerList:
      player = { "idx": e, "name" : self[e]['name'], "type" : self[e]['type'], "address" : self[e]['address'] , "port" : self[e]['port']}
      players.append(player)
    return players

  def getPlayerInfo(self):
    if len(self.playerList) > 0:
      pinfo = " * " + str(len(self.playerList)) + " Player sind konfiguriert:"
      pinfo += ("\n   Id:        Name:                           Adresse:             Typ:")
      pdefault = self.getDefaultPlayerIdx()
      for e in self.playerList:
        addr = self[e]['address'] + ":" + self[e]['port']
        name = self[e]['name'] + "'"
        pinfo += (f"\n   {e:10} '{name:30} {addr:20} {self[e]['type']}")
        if e == pdefault:
          pinfo += " (DEFAULT)"
    else:
      pinfo = " * keine Player konfiguriert"
    return pinfo

  def addPlayer(self, address, port, type, name, auth, default):
    # check if address already exists:
    found = False
    error = None
    section = None
    #import pdb; pdb.set_trace()
    if port and address: 
      for e in self.playerList:
        if self[e]['address'] == address and self[e]['port'] == str(port):
          found = True
          section = e
          break
      if found:
        if name:
          self.set(section, 'name', name)
        if auth:
          self.set(section, 'auth', auth)
        if type:
          self.set(section, 'type', type)
      else:
        if type:
          # create new entry
          # - get highest index:
          idx = 0
          while True:
            idx+=1
            section = "player" + str(idx)
            if not section in self.playerList:
              # check for section in config:
              if not section in self.sections():
                break 
          if len(self.playerList) == 1:
            default = True
          self.playerList.append(section)
          self.add_section(section)
          self.set(section, 'address', address)
          self.set(section, 'port', str(port))
          self.set(section, 'name', name if name else f"{address}:{str(port)}")
          if auth:
            self.set(section, 'auth', auth)
          if type:
            self.set(section, 'type', type)
        else:
          error = 422, "Type is not specified, can not create new player"
    else:
      error = 422, "Port and/or address are missing, can not create/update player"
    # mark default:
    if not error and default:
      if not 'general' in self.sections():
        self.add_section('general')
      self.set('general', 'default_player', section)
    self.saveConfig2File()
    return error

  def deletePlayer(self,id):
    result = 200, ""
    if id in self.playerList:
      defaultidx = self.getDefaultPlayerIdx()
      if not 'general' in self.sections():
        self.add_section('general')
      self.set('general', 'default_player', str(defaultidx))
      self.remove_section(id)
      self.saveConfig2File()
      # rebuild index
      self.updatePlayerList()
      if id == defaultidx:
        defaultidx = self.playerList[0] if len(self.playerList) > 0 else 0
    else:
      result = 400, "Invalid player id specified"
    return result


  def saveConfig2File(self):
    with open(self.filename, 'w') as configfile:
      self.write(configfile)


  def updateConfigValue(self, name, value):
    result = 200, ""
    #import pdb; pdb.set_trace()
    if not self.has_section('config'):
      self.add_section('config')
    value = value.replace('"', '')
    self.set('config', name, value)
    self.saveConfig2File()
    return result

