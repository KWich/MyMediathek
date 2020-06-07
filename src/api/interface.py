import connexion
import time

from flask import abort
from sqlalchemy import func

from api import db, cfgConfig, CONST_VERSION
from api.models import *
from api.play import callMoviePlayer, testMoviePlayer
from api.taskexpiry import getExpiry
from api.bookmark import bookmarks_id_get, bookmarks_count_get


def info_get():
  """May be used to verify server connection
  :rtype: Text
  """
  return {
    "name": "MyMediathek Server", 
    "version": CONST_VERSION,
    "players": cfgConfig.getPlayerInfoJSON(),
    "defaultplayer": cfgConfig.getDefaultPlayerIdx(),
    "config": cfgConfig.getConfigDataJSON()
  }


def info_config_patch():
  if connexion.request.is_json:
    body = connexion.request.get_json()
  if body:
    result = cfgConfig.updateConfigValue(
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
  count = len(Bookmark.query.all())
  response["tables"].append({"name": "bookmarks", "nb": count})
  response["bookmarks"]["number"] = count
  mcount = len(MovieState.query.all())
  response["tables"].append({"name": "moviestate", "nb": mcount})
  count = len(Category.query.all())
  response["tables"].append({"name": "categories", "nb": count})
  response["bookmarks"]["categories"] = categories_get()
  response["bookmarks"]["station"] = _getStation()
  #import pdb; pdb.set_trace()
  response["moviestate"] = _getMstateStats(daysbefore, mcount)
  return response


def _getStation():
  rlist = []
  data = db.session.query(Bookmark.sender).distinct()
  for entry in data:
    name = entry[0]
    count = bookmarks_count_get(None,name)
    rlist.append(NameNumber(name, count))
  bm_schema = NameNumberSchema(many=True)
  result = bm_schema.dump(rlist)
  return result


def _getMstateStats(days, count):
  #import pdb; pdb.set_trace()
  ts = int(round(time.time()*1000)) - days * 86400000
  rlist = {}
  rlist["total"] = count;
  qo = MovieState.query.filter(MovieState.bookmarked==True)
  rlist["bookmarked"] = _queryNumResult(qo);
  qo = MovieState.query.filter(MovieState.bookmarked==True, MovieState.seen==False)
  rlist["bookmarkedunseen"] = _queryNumResult(qo);
  qo = MovieState.query.filter(MovieState.modified < ts)
  rlist["oldtotal"] = _queryNumResult(qo);
  qo = MovieState.query.filter(MovieState.modified < ts, MovieState.bookmarked==False)
  rlist["oldnotbookmarked"] = _queryNumResult(qo);
  qo = MovieState.query.filter(MovieState.modified >= ts, MovieState.bookmarked==True)
  rlist["bookmarkedactual"] = _queryNumResult(qo)
  qo = MovieState.query.filter(MovieState.modified < ts, MovieState.bookmarked==True)
  rlist["bookmarkedold"] = _queryNumResult(qo)
  return rlist


def _queryNumResult(query):
  data = query.all()
  return len(data) if data else 0




# Category handling
def categories_get(min=None):
  """Returns the available categories
  """
  rlist = []
  if not min:
    min = 0
  for category in Category.query.order_by(Category.name).all():
    rdata = bookmarks_id_get(category.__repr__())
    count = len(rdata) if rdata else 0
    if count >= min:
      rlist.append(NameNumber(category, count))
  # special case get all entries without category
  rdata = bookmarks_id_get("@NULL")
  count = len(rdata) if rdata else 0
  if count >= min:
    rlist.append(NameNumber("@NULL", count))
  bm_schema = NameNumberSchema(many=True)
  result = bm_schema.dump(rlist)
  return result


def categories_byname_delete(name):
  """Delete given category
  """
  # get category:
  data = Category.query.filter(Category.name==name).one_or_none()
  if not data:
    abort(404, f"Category '{name}' does not exist")
  # check if bookmarks exist with category:
  if bookmarks_id_get(name):
    abort(403, f"Category '{name}' is in use")
  # delete record
  db.session.delete(data)
  db.session.commit()
  return name


def moviestate_get(before=None, limit=None, offset=None):
  rlist = []
  if (before):
    qo = MovieState.query.filter(MovieState.modified<before)
  else:
    qo = db.session.query(MovieState)

  if limit:
    qo = qo.limit(limit)

  if offset:
    qo = qo.offset(offset)

  data = qo.all()
  return MovieStateSchema(many=True).dump(data) if data else {}


def moviestate_post():
  rlist = []
  if connexion.request.is_json:
    body = connexion.request.get_json()
  if body:
    for entry in body:
      #import pdb; pdb.set_trace()
      rec = MovieState.query.filter(MovieState.hashid==entry).one_or_none()
      if not rec:
        rec = MovieState(entry)
      rlist.append(rec)
  bm_schema = MovieStateSchema(many=True)
  result = bm_schema.dump(rlist)
  return result


def moviestate_delete(daysbefore=183, force=None):
  #import pdb; pdb.set_trace()
  ts = int(round(time.time()*1000)) - daysbefore * 86400000
  qo = MovieState.query.filter(MovieState.modified < ts, MovieState.bookmarked==False)
  qo.delete()
  db.session.commit()
  return


def moviestate_id_get(id):
  data = MovieState.query.filter(MovieState.hashid==id).one_or_none()
  #import pdb; pdb.set_trace()
  if not data:
    abort(404, f"ID '{id}' does not exist")
  return MovieStateSchema().dump(data)


def moviestate_id_patch(id, seen=False):
  data = MovieState.query.filter(MovieState.hashid==id).one_or_none()
  if data:  # Data exists in Moviestate
    if data.seen != seen:
      data.seen = seen
      data.modified = int(round(time.time()*1000))  # set timestamp
      if data.bookmarked:
        bdata = Bookmark.query.filter(Bookmark.id==id).one_or_none()
        if bdata.seen != seen:
          bdata.seen = seen
        data.modified = int(round(time.time()*1000))  # set timestamp
      else:
        if not data.seen:
          db.session.delete(data)
  else:
    db.session.add(MovieState(id, seen, False, int(round(time.time()*1000))))
  db.session.commit()
  return


def player_play(playerid=None):
  """ Direct play given movie url
  """
  if connexion.request.is_json:
    body = connexion.request.get_json()
  if body:
    url = body['url']
    title = body['title'] if 'title' in body else None
    ts = body['ts'] if 'ts' in body else int(round(time.time()))
    #if len(cfgPlayerList) == 0:
    #  abort(500, f"Can not play requested url, no player configured")
    playresult = callMoviePlayer(title, url, ts, playerid)
    if playresult[0] != 200:
      abort(playresult[0], f"Film konnte nicht abgespielt werden - " + playresult[1])
  else:
    abort(400, "No URL provided")
  return


def player_new():
  """ Add a new or modify an existing player
  """
  if connexion.request.is_json:
    body = connexion.request.get_json()
  if body:
    error = cfgConfig.addPlayer( body['address'],
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
  return 


def player_test(playerid):
  """ Test the player connection
  """
  testresult = testMoviePlayer(playerid)
  if testresult[0] > 299:
    abort(testresult[0],testresult[1])
  success = testresult[0] < 299
  response = { "success" : success, "details": testresult[1] }
  return response


def player_delete(playerid):
  """Delete given player
  """
  result = cfgConfig.deletePlayer(playerid)
  #import pdb; pdb.set_trace()
  if result[0] != 200:
    abort(result[0], result[1])
  return
