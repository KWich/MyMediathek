"""
Communication with chromecast

Singleton Pattern

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import threading
from dataclasses import dataclass
from enum import Enum

import pychromecast
from pychromecast import Chromecast
from pychromecast.controllers.media import MediaStatus
from pychromecast.controllers.receiver import CastStatus
from pychromecast.error import RequestFailed, RequestTimeout  # pylint: disable=no-name-in-module
from pychromecast.response_handler import CallbackType  # pylint: disable=no-name-in-module

from server.common.logger import Logger  # pylint: disable=no-name-in-module

IDLE_TIMER = 5

# CHROMECAST STATUS:
CC_NONE = 0
CC_CONNECTED = 3
CC_ERROR = 20
CC_UNKNOWN = 30


class CCStatusMap(Enum):
  NONE = 0
  IDLE = 1
  CONNECTING = 2
  CONNECTED = 3
  FOUND = 4
  PLAYING = 5
  PAUSED = 6
  FINISHED = 7  # derived from IDLE + idle_reason
  INTERRUPTED = 8  # derived from IDLE + idle_reason
  STOPPED = 9  # derived from IDLE + idle_reason
  RESUMED = 10
  DISCONNECTING = 12
  DISCONNECTED = 13
  BUFFERING = 14
  ERROR = 20
  NOT_FOUND = 21
  LOST = 22
  FAILED = 23
  UNKNOWN = 30


# pylint: disable=too-many-public-methods, too-many-public-methods, too-many-instance-attributes)
@dataclass
class ChromeCastMediaInfo:
  mediaAlbum: str = None
  mediaArtist: str = None
  mediaDuration: int = 0
  mediaImageUrl: str = None
  mediaTitle: str = None
  mediaTrackId: int = -1
  mediaAlbumId: int = -1
  mediaLoved: int = 0
  mediaRate: int = 0

  def setMediaRating(self, ratestr):
    sr = ratestr.split(",")
    self.mediaLoved = int(sr[0])
    self.mediaRate = int(sr[1])


@dataclass
class ChromeCastMediaStatus:
  mediaPlayerState: int = CCStatusMap.NONE.value
  mediaCurrentPosition: int = 0
  mediaContentId: str = ""


# pylint: disable=too-many-public-methods, too-many-public-methods, too-many-instance-attributes)
class ChromeCast:
  _instance = None
  _browser = None
  _isplaying = False

  @staticmethod
  def getInstance(friendlyName: str, statuscallback=None, mediacallback=None):
    if ChromeCast._instance is None:
      ChromeCast._instance = ChromeCast(friendlyName, statuscallback, mediacallback)
    return ChromeCast._instance

  @staticmethod
  def deleteInstance():
    if ChromeCast._instance is not None:
      try:
        ChromeCast._instance.disconnect()
      except Exception:  # ignore all errors during disconnect # noqa: BLE001, S110
        pass
      Logger.debug("ChromeCast delete instance: %s", str(ChromeCast._instance))
      if ChromeCast._browser is not None:
        ChromeCast._browser.stop_discovery()
        ChromeCast._browser = None
      ChromeCast._instance = None

  def __init__(self, friendlyName: str, statuscallback=None, mediacallback=None):
    self._connectionStatusCallback = statuscallback
    self._mediaCallback = mediacallback

    self._cast = None
    self._ccConnected = False
    self._friendlyName = friendlyName
    self._currentMediaStatus = ChromeCastMediaStatus()
    self._currentMediaInfo = ChromeCastMediaInfo()
    self._currentConnectionStatus = {"castStatus": CCStatusMap.NONE.value, "ccConnection": CC_NONE}

    if self._currentConnectionStatus["castStatus"] == CC_CONNECTED:
      Logger.debug("ChromeCast connection already connected")
    else:
      try:
        Logger.debug("Creating the ChromeCast connection")
        self._browser = pychromecast.get_chromecasts(
          blocking=False, tries=None, retry_wait=5, timeout=5, callback=self.cbNewChromecastFound
        )

      except Exception as inst:  # noqa: BLE001
        Logger.error("Exception >%s< during chromecast connect", str(inst))
        self._currentConnectionStatus["castStatus"] = CC_ERROR

  def cbNewChromecastFound(self, cc: Chromecast):
    if cc.name == self._friendlyName:
      self._cast = cc
      # add status listener
      self._cast.register_connection_listener(self)  # Type ConnectionStatusListener:new_connection_status
      self._cast.register_status_listener(self)  # Type CastStatusListener:new_cast_status
      # add media controller listener
      self._cast.media_controller.register_status_listener(
        self
      )  # Type MediaStatusListener:new_media_status, load_media_failed
      try:
        self._cast.wait(0.1)
      except RequestTimeout:
        pass
    else:
      Logger.debug(f"ChromeCast >{cc.name}< ignored (looking for >{self._friendlyName}<)")

  def getStatus(self):
    return self._currentConnectionStatus

  def isActive(self):
    return self._isplaying

  def isConnected(self):
    return self._ccConnected

  def getMediaPlayerState(self):
    _, result = self._createMediaStatus(True)  # noqa: FBT003
    return result

  def getPlayingTrackId(self):
    return self._currentMediaInfo.mediaTrackId

  def _mapPlayerState(self, state, idleReason):
    try:
      mappedState = CCStatusMap[state].value
      if mappedState == CCStatusMap.IDLE.value:
        if idleReason is not None:
          if idleReason == "FINISHED":
            mappedState = CCStatusMap.FINISHED.value
          elif idleReason == "INTERRUPTED":
            mappedState = CCStatusMap.INTERRUPTED.value
          elif idleReason == "CANCELLED":
            mappedState = CCStatusMap.STOPPED.value
    except Exception:  # noqa: BLE001
      mappedState = CCStatusMap.UNKNOWN.value
      Logger.error("Unknown state %s mapped to UNKNOWN", state)
    return mappedState

  # --- internal callbacks:
  def _resetPlaying(self):
    if self._currentMediaStatus.mediaPlayerState in (CCStatusMap.FINISHED.value, CCStatusMap.STOPPED.value):
      self._isplaying = False
      Logger.debug("### CC playing set to %s ###", self._isplaying)
    else:
      Logger.debug("CC playing status is %s ###", self._currentMediaStatus.mediaPlayerState)

  def new_media_status(self, status: MediaStatus):  # pylint: disable=invalid-name  # noqa: C901, PLR0912, PLR0915
    Logger.debug("==> Media status: " + str(status))
    process = False
    updatemedia = False
    clientInform = False
    result = None

    nState = self._mapPlayerState(status.player_state, status.idle_reason)
    if nState == CCStatusMap.PLAYING.value and self._currentMediaStatus.mediaPlayerState == CCStatusMap.PAUSED.value:
      nState = CCStatusMap.RESUMED.value
      process = True

    if self._currentMediaStatus.mediaContentId != status.content_id:
      process = True

    if nState == CCStatusMap.PLAYING.value:
      curtime = int(status.current_time)

      if curtime == 0 and self._currentMediaStatus.mediaContentId != status.content_id:
        self._currentMediaStatus.mediaContentId = status.content_id
        process = True
        updatemedia = True

      if (curtime - self._currentMediaStatus.mediaCurrentPosition) > 5:  # noqa: PLR2004
        process = True

      if updatemedia or process:
        self._currentMediaStatus.mediaCurrentPosition = curtime

    if nState != self._currentMediaStatus.mediaPlayerState:
      self._currentMediaStatus.mediaPlayerState = nState
      process = True

    if updatemedia:
      self._currentMediaInfo = ChromeCastMediaInfo(
        status.album_name,
        status.artist if status.artist else status.album_artist,
        status.duration,
        status.images[0].url if status.images else None,
        status.title,
      )
      ridx = status.content_id.find("&rate=")
      if ridx > -1:
        self._currentMediaInfo.setMediaRating(status.content_id[ridx + 6 :])
        tidx = status.content_id.find("&trackId=")
        if tidx > -1:
          self._currentMediaInfo.mediaTrackId = status.content_id[tidx + 9 : ridx]
          aidx = status.content_id.find("?albumId=")
          if aidx > -1:
            self._currentMediaInfo.mediaAlbumId = status.content_id[aidx + 9 : tidx]

    if process:
      clientInform, result = self._createMediaStatus(updatemedia)
      # overall player state:
      match self._currentMediaStatus.mediaPlayerState:
        case CCStatusMap.PLAYING.value:
          self._isplaying = True
          Logger.debug("### CC playing is %s ###", self._isplaying)

        case CCStatusMap.FINISHED.value:
          timer = threading.Timer(IDLE_TIMER, self._resetPlaying)
          timer.start()

        case CCStatusMap.STOPPED.value:
          self._isplaying = False

    else:
      Logger.debug("=>>>> not processed")

    if clientInform and self._mediaCallback:
      self._mediaCallback(result)
    else:
      Logger.debug("=>>>> no client inform")

  def _createMediaStatus(self, updatemedia):
    result = {"state": self._currentMediaStatus.mediaPlayerState, "trackId": self._currentMediaInfo.mediaTrackId}
    clientInform = True
    match self._currentMediaStatus.mediaPlayerState:
      case CCStatusMap.PAUSED.value:
        Logger.debug(f"=> Track {self._currentMediaInfo.mediaTrackId} is paused")

      case CCStatusMap.RESUMED.value:
        Logger.debug(f"=> Track {self._currentMediaInfo.mediaTrackId} is resumed")

      case CCStatusMap.FINISHED.value:
        Logger.debug(f"=> Track {self._currentMediaInfo.mediaTrackId} has finished")

      case CCStatusMap.INTERRUPTED.value:
        Logger.debug(f"=> Track {self._currentMediaInfo.mediaTrackId} was interrupted")

      case CCStatusMap.PLAYING.value:
        if updatemedia:
          result["mediaTitle"] = self._currentMediaInfo.mediaTitle
          result["mediaDuration"] = self._currentMediaInfo.mediaDuration
          result["mediaAlbum"] = self._currentMediaInfo.mediaAlbum
          result["mediaArtist"] = self._currentMediaInfo.mediaArtist
          result["mediaContentId"] = self._currentMediaStatus.mediaContentId
          result["mediaAlbumId"] = self._currentMediaInfo.mediaAlbumId
          result["mediaImageUrl"] = self._currentMediaInfo.mediaImageUrl
          result["mediaLoved"] = self._currentMediaInfo.mediaLoved
          result["mediaRate"] = self._currentMediaInfo.mediaRate
        else:
          result["mediaCurrentPosition"] = self._currentMediaStatus.mediaCurrentPosition

      case CCStatusMap.STOPPED.value:
        Logger.debug("=> ### Media Player was stopped ###")

      case _:
        clientInform = False

    Logger.debug("==> Media_status : " + CCStatusMap(self._currentMediaStatus.mediaPlayerState).name)

    return clientInform, result

  def load_media_failed(self, queue_item_id: int, error_code: int):  # pylint: disable=invalid-name
    Logger.error("Chromecast: load media failed (id:%s, errorcode: %s)", queue_item_id, error_code)

  # from ConnectionStatusListener
  def new_connection_status(self, status):  # pylint: disable=invalid-name
    Logger.debug("==> Connection status: " + str(status))
    mappedStatus = self._mapPlayerState(status.status, None)
    if mappedStatus != self._currentConnectionStatus["ccConnection"]:
      self._currentConnectionStatus["ccConnection"] = mappedStatus
      Logger.info(
        "Chromecast new connection status: %s  (%s , %s)",
        self._currentConnectionStatus["ccConnection"],
        status.status,
        status.address,
      )
      self._ccConnected = mappedStatus == CC_CONNECTED
      if self._connectionStatusCallback:
        self._connectionStatusCallback(self)

  def new_cast_status(self, status: CastStatus) -> None:  # pylint: disable=invalid-name
    pass

  # --- Chromecast control ---
  def playUrl(
    self,
    url,
    mediatype,
    title=None,
    subtitles=None,
    metaData=None,
    enqueue: bool = False,  # noqa: FBT001, FBT002
    # contentId = None,  # noqa: ERA001
    callbackFunction: CallbackType | None = None,  # noqa: FA102
  ):  # pylint: disable=too-many-arguments
    if self._ccConnected:
      self._cast.media_controller.play_media(
        url,
        mediatype,
        title=title,
        thumb=metaData["thumb"] if metaData else None,
        subtitles=subtitles,
        subtitles_lang="DE",
        metadata=metaData,
        enqueue=enqueue,
        # contentId=contentId,  # noqa: ERA001
        stream_type=pychromecast.STREAM_TYPE_BUFFERED,
        callback_function=callbackFunction,
      )
      self._cast.media_controller.block_until_active()

  def stop(self):
    if self._ccConnected:
      try:
        self._cast.media_controller.stop()
      except RequestFailed:
        pass

  def pause(self):
    if self._ccConnected:
      self._cast.media_controller.pause()

  def play(self):
    if self._ccConnected:
      self._cast.media_controller.play()

  def forward(self, ts):
    if self._ccConnected:
      self._cast.media_controller.update_status()
      newpos = self._cast.media_controller.status.current_time + ts
      self._cast.media_controller.seek(newpos)

  def back(self, ts):
    if self._ccConnected:
      self._cast.media_controller.update_status()
      newpos = self._cast.media_controller.status.current_time - ts
      newpos = max(newpos, 0)
      self._cast.media_controller.seek(newpos)

  def seek(self, ts):
    if self._ccConnected:
      self._cast.media_controller.seek(ts)

  def queueNext(self):
    if self._ccConnected:
      self._cast.media_controller.queue_next()
    else:
      Logger.warning("cc not connected")

  def queueJump(self, steps):
    if self._ccConnected:
      self._cast.media_controller.queue_jump(steps)
    else:
      Logger.warning("cc not connected")

  def queuePrevious(self):
    if self._ccConnected:
      self._cast.media_controller.queue_prev()

  # -- finish routines
  def disconnect(self):
    if self._cast:
      self._cast.disconnect()
