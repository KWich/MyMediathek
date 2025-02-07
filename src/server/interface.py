"""
Info routines

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import time
import connexion

from flask import abort
from sqlalchemy import select, delete, func, and_

from server import db, APP_CONFIG, CONST_VERSION
from server.models import Bookmark, NameNumber, NameNumberSchema, Category, MovieState, MovieStateSchema
from server.player.mediaPlayer import MediaPlayer



def info_get():
  """May be used to verify server connection
  :rtype: Text
  """
  return {
    "name": "MyMediathek Server",
    "version": CONST_VERSION,
    "players": APP_CONFIG.getPlayerInfoJSON(),
    "defaultplayer": APP_CONFIG.getDefaultPlayerIdx(),
    "config": APP_CONFIG.getConfigDataJSON()
  }


def info_config_patch():
  body = connexion.request.get_json() if connexion.request.is_json else connexion.request.get_data()
  if body:
    result = APP_CONFIG.updateConfigValue(
      body['name'],
      body['value']
    )
    if result[0] != 200:
      abort(result[0], result[1])
  else:
    abort(400, "No config data provided")
  return result


def info_statistics_get(daysbefore=183):
  response = { "daysbefore": daysbefore, "tables" : [],  "bookmarks": {}, "moviestate": {}}
  count = db.session.scalar(select(func.count()).select_from(Bookmark))
  response["tables"].append({"name": "bookmarks", "nb": count})
  response["bookmarks"]["number"] = count
  count = db.session.scalar(select(func.count()).select_from(MovieState))
  response["tables"].append({"name": "moviestate", "nb": count})
  response["moviestate"] = _getMstateStats(daysbefore, count)
  count = db.session.scalar(select(func.count()).select_from(Category))
  response["tables"].append({"name": "categories", "nb": count})
  response["bookmarks"]["categories"] = categories_get()
  response["bookmarks"]["station"] = _getStation()
  return response


def _getStation():
  rlist = []
  #import pdb; pdb.set_trace()
  data = db.session.scalars(select(Bookmark.sender).distinct()).all()
  for sender in data:
    count = db.session.scalar(select(func.count()).select_from(Bookmark).where(Bookmark.sender == sender))
    rlist.append(NameNumber(sender, count))
  bmSchema = NameNumberSchema(many=True)
  result = bmSchema.dump(rlist)
  return result


# pylint: disable=singleton-comparison
def _getMstateStats(days, count):
  #import pdb; pdb.set_trace()
  ts = int(round(time.time()*1000)) - days * 86400000
  rlist = {}
  rlist["total"] = count
  rlist["bookmarked"]  = _queryNbResult(select(MovieState).where(MovieState.bookmarked == True))
  rlist["bookmarkedunseen"]  = _queryNbResult(select(MovieState).where(and_(MovieState.seen == False, MovieState.bookmarked == True)))
  rlist["oldtotal"]  = _queryNbResult(select(MovieState).where(MovieState.modified < ts))
  rlist["oldnotbookmarked"]  = _queryNbResult(select(MovieState).where(and_(MovieState.modified < ts,MovieState.bookmarked == False)))
  rlist["bookmarkedactual"]  = _queryNbResult(select(MovieState).where(and_(MovieState.modified >= ts,MovieState.bookmarked == True)))
  rlist["bookmarkedold"]  = _queryNbResult(select(MovieState).where(and_(MovieState.modified < ts,MovieState.bookmarked == True)))
  return rlist


def _queryNbResult(query):
  results = db.session.execute(query).all()
  return len(results) if results else 0


# Category handling
def categories_get(minNb=0, maxNb=-1):
  """Returns the available categories
  """
  rlist = []
  for category in db.session.scalars(select(Category.name).order_by(Category.name)).all():
    count = db.session.scalar(select(func.count()).select_from(Bookmark).where(Bookmark.category == category))
    if count >= minNb and (maxNb < 0 or count <= maxNb):
      rlist.append(NameNumber(category, count))
  # special case: w/o category
  count = db.session.scalar(select(func.count()).select_from(Bookmark).where(Bookmark.category == None))
  if count >= minNb and (maxNb < 0 or count <= maxNb):
    rlist.append(NameNumber("@NULL", count))
  bmSchema = NameNumberSchema(many=True)
  result = bmSchema.dump(rlist)
  return result


def categories_byname_delete(name):
  """Delete given category
  """
  data = db.session.execute(select(Category).filter_by(name=name)).one_or_none()
  if not data:
    abort(404, f"Category '{name}' does not exist")
  # check if bookmarks exist with category:
  if db.session.scalar(select(func.count()).select_from(Bookmark).where(Bookmark.category == name)) > 0:
    abort(403, f"Category '{name}' is in use")
  # delete record
  db.session.delete(data)
  db.session.commit()
  return name


def movieStateGet(before=None, limit=None, offset=None):
  qo = select(MovieState)
  if before:
    qo = qo.where(MovieState.modified < before)
  if offset:
    qo = qo.offset(offset)
  if limit:
    qo = qo.limit(limit)
  data = db.session.scalars(qo).all()
  return MovieStateSchema(many=True).dump(data) if data else {}


def movieStatePost():
  rlist = []
  body = connexion.request.get_json() if connexion.request.is_json else connexion.request.get_data()
  if body:
    for hid in body:
      rec = db.session.scalar(select(MovieState).where(MovieState.hashid == hid))
      if not rec:
        rec = MovieState(hid)
      rlist.append(rec)
  bmSchema = MovieStateSchema(many=True)
  result = bmSchema.dump(rlist)
  return result


def movieStateDelete(daysbefore=183):
  #import pdb; pdb.set_trace()
  ts = int(round(time.time()*1000)) - daysbefore * 86400000
  #qo = MovieState.query.filter(MovieState.modified < ts, MovieState.bookmarked==False)
  qo = delete(MovieState).where(and_(MovieState.modified < ts, MovieState.bookmarked == False))
  db.session.execute(qo)
  db.session.commit()


def movieStateIdGet(hid):
  data = db.session.scalar(select(MovieState).where(MovieState.hashid == hid))
  if not data:
    abort(404, f"ID '{hid}' does not exist")
  return MovieStateSchema().dump(data)


def movieStateIdPatch(hid, seen=False):
  data = db.session.scalar(select(MovieState).where(MovieState.hashid == hid))
  if data:  # Data exists in Moviestate
    if data.seen != seen:
      data.seen = seen
      data.modified = int(round(time.time()*1000))  # set timestamp
      if data.bookmarked:
        bdata = db.session.scalar(select(Bookmark).where(Bookmark.id == hid))
        if bdata.seen != seen:
          bdata.seen = seen
        data.modified = int(round(time.time()*1000))  # set timestamp
      else:
        if not data.seen:
          db.session.delete(data)
  else:
    db.session.add(MovieState(hid, seen, False, int(round(time.time()*1000))))
  db.session.commit()


def player_play(playerid=None):
  """ Direct play given movie url
  """
  body = connexion.request.get_json() if connexion.request.is_json else connexion.request.get_data()
  if body:
    url = body['url']
    title = body['title'] if 'title' in body else None
    ts = body['ts'] if 'ts' in body else int(round(time.time()))
    playresult = MediaPlayer.getInstance().playMovie(title, url, ts, playerid)
    if playresult[0] != 200:
      abort(playresult[0], "Film konnte nicht abgespielt werden - " + playresult[1])
  else:
    abort(400, "No URL provided")


def player_new():
  """ Add a new or modify an existing player
  """
  body = connexion.request.get_json() if connexion.request.is_json else connexion.request.get_data()
  if body:
    error = APP_CONFIG.addPlayer( body['address'],
                         body['port'] if 'port' in body else None,
                         body['type'] if 'type' in body else None,
                         body['name'] if 'name' in body else None,
                         body['authentification'] if 'authentification' in body else None,
                         body['default'] if 'default' in body else False
                       )
    if error:
      abort(error[0], error[1])
  else:
    abort(400, "No player info provided")


def player_test(playerid):
  """ Test the player connection
  """
  testresult = MediaPlayer.getInstance().testMoviePlayer(playerid)
  if testresult[0] > 299:
    abort(testresult[0],testresult[1])
  success = testresult[0] < 299
  response = { "success" : success, "details": testresult[1] }
  return response


def player_delete(playerid):
  """Delete given player
  """
  result = APP_CONFIG.deletePlayer(playerid)
  #import pdb; pdb.set_trace()
  if result[0] != 200:
    abort(result[0], result[1])
