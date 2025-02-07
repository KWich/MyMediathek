"""
Bookmark REST routines

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import time
import connexion

from flask import abort
from sqlalchemy import func

from server import db
from server.models import Bookmark, BookmarkSchema, Category, MovieState, StateResult
from server.utils import convertDate2Stamp, isInFutureDay
from server.taskexpiry import getExpiry


CONST_FUTURE_VALUE = 5000000000

def bookmarksByIdDelete(hid):
  """Delete given bookmarks

    :param hid: bookmark hash id to delete
    :type hid: int

  :rtype: None
  """
  data = Bookmark.query.filter(Bookmark.id == hid).one_or_none()
  if data:
    # delete from bookmarks
    db.session.delete(data)
    # update state table
    sdata = MovieState.query.filter(MovieState.hashid == hid).one_or_none()
    if sdata:
      if sdata.seen:
        sdata.bookmarked = False
        sdata.modified = int(round(time.time()*1000)) # set timestamp
      else:
        # delete record
        db.session.delete(sdata)
    db.session.commit()
  else:
    abort(404, { "id": hid, "message": "id does not exist" })
  return { "id": hid, "deleted": True }


def bookmarksByIdGet(hid):
  """Get bookmark

    :param hid: ID of the bookmark to return
    :type hid: int

  :rtype: Bookmark
  """
  data = Bookmark.query.filter(Bookmark.id == hid).one_or_none()
  if not data:
    abort(404, f"Id '{hid}' does not exist")
  #import pdb; pdb.set_trace()
  return BookmarkSchema().dump(data)


def bookmarksByIdPatch(hid):
  """Set bookmark info detail
  """
  fmod = False
  result = StateResult(hid)
  data = Bookmark.query.filter(Bookmark.id == hid).one_or_none()
  if data:
    #import pdb; pdb.set_trace()
    if connexion.request.is_json:
      body = connexion.request.get_json()
      for entry in body:
        if entry["op"] == "replace":
          value = entry["value"]
          if entry["name"] == "category":
            if value == "NULL":
              data.category = None
              fmod = True
            elif value != data.category:
              data.category = value
              # check if category exists:
              iscategory = Category.query.filter(Category.name==value).one_or_none()
              if not iscategory:
                db.session.add(Category(value))
              fmod = True
              result.category = value

          elif entry["name"] == "imgurl":
            if value != data.imgurl:
              data.imgurl = value
              fmod = True

          elif entry["name"] == "videoformat":
            if value != data.videoformat:
              data.videoformat = value
              fmod = True

          elif entry["name"] == "expiry":
            expiry = int(value)
            if expiry == 0:
              data.expiry = CONST_FUTURE_VALUE
            else:
              data.expiry = expiry
              # update moviestate db:
              mdata = MovieState.query.filter(MovieState.hashid == hid).one_or_none()
              if mdata:
                mdata.expiry = expiry
            fmod = True

        elif entry["op"] == "remove":
          if entry["name"] == "category":
            data.category = None
            fmod = True
          elif entry["name"] == "imgurl":
            data.imgurl = None
            fmod = True
          elif entry["name"] == "videoformat":
            data.videoformat = None
            fmod = True
          elif entry["name"] == "expiry":
            data.expiry = CONST_FUTURE_VALUE
            mdata = MovieState.query.filter(MovieState.hashid == hid).one_or_none()
            if mdata:
              mdata.expiry = data.expiry
            fmod = True
          else:
            result.errmsg = "Invalid name for op remove " + entry["name"]
            abort(422, result.serialize())

        else:
          result.errmsg = "Invalid operation " + entry["op"]
          abort(422, result.serialize())

      if fmod:
        result.state = True
        data.modified = int(round(time.time())) # set timestamp
        db.session.commit()

    else:
      result.errmsg = "body is not JSON"
      abort(422, result.serialize())
  else:
    result.errmsg = f"Id '{hid}' does not exist"
    abort(404, result.serialize())
  return result.serialize()


def bookmarksByIdSeenPatch(hid, seen):
  """Set bookmark seen flag """
  fmod = False
  data = Bookmark.query.filter(Bookmark.id == hid).one_or_none()
  #import pdb; pdb.set_trace()
  if data:
    tstamp = int(round(time.time()))
    #if seen != None and seen != data.seen:
    if seen not in (None, data.seen):
      data.seen = seen
      # update moviestate table:
      mstatedata = MovieState.query.filter(MovieState.hashid == hid).one_or_none()
      if not mstatedata:
        mstatedata = MovieState(hid, seen, True, tstamp)
        db.session.add(mstatedata)
      else:
        mstatedata.seen = seen
        mstatedata.modified = tstamp # set timestamp
      fmod = True
    if fmod:
      data.modified = tstamp # set timestamp
      db.session.commit()
  else:
    result = StateResult(hid, False, f"Id '{hid}' does not exist")
    abort(404, result.serialize())


def bookmarksByIdValidPatch(hid, valid):
  """Set bookmark valid flag """
  fmod = False
  data = Bookmark.query.filter(Bookmark.id == hid).one_or_none()
  #import pdb; pdb.set_trace()
  if data:
    tstamp = int(round(time.time()))
    if valid not in (None, data.valid):
      data.valid = valid
      fmod = True
    if fmod:
      data.modified = tstamp # set timestamp
      db.session.commit()
  else:
    result = StateResult(hid, False, f"Id '{hid}' does not exist")
    abort(404, result.serialize())


def bookmarksByIdExpiryGet(hid):
  """Get bookmark expiry date

  :param hid: ID of the bookmark to return
  :type hid: int

  :rtype: Bookmarkstate
  """
  data = Bookmark.query.filter(Bookmark.id == hid).one_or_none()
  if not data:
    abort(404, f"Id '{hid}' does not exist")
  #import pdb; pdb.set_trace()
  expiry = getExpiry(data.website)
  if not expiry:
    abort(404, "Kein Ablaufdatum auf der Webseite gefunden")
  return { 'expiry' : expiry }


def bookmarks_get(category=None, sender=None, sort=None, desc=False, limit=None, offset=None):
  """Retrieve bookmarks

  If no bookmarks are found an empty response is returned.  Optional a category name can be specified as query parameter (e.g. &#39;/bookmarks?category&#x3D;China&#39;), to retrieve only bookmarks with the requested category. If the category does not exit an error is returned, if no bookmarks with the category exist, an empty list is returned. # noqa: E501

  :param category: bookmark category
  :type category: str

  :rtype: List[Bookmark]
  """
  # import pdb; pdb.set_trace()
  if category:
    if category=="@NULL":
      # special case get all entries without category
      qo = Bookmark.query.filter(Bookmark.category is None)
    elif Category.query.filter(Category.name == category).one_or_none():
      qo = Bookmark.query.filter(Bookmark.category == category)
    else:
      abort(404, f"Category '{category}' does not exist")
  elif sender:
    qo = Bookmark.query.filter(Bookmark.sender == sender)
  else:
    qo = db.session.query(Bookmark)

  if sort:
    tn = None
    tn2 = None
    # Check if valid sort
    if sort == "title":
      tn = Bookmark.titel
    elif sort == "date":
      tn = Bookmark.sendtime
      tn2 = Bookmark.titel
    elif sort == "expiry":
      tn = Bookmark.expiry
      tn2 = Bookmark.titel
    elif sort == "duration":
      tn = Bookmark.duration
      tn2 = Bookmark.titel
    elif sort == "theme":
      tn = Bookmark.thema
      tn2 = Bookmark.titel
    else:
      abort(404, f"Sort parameter '{sort}' not allowed")

    if desc:
      qo = qo.order_by(db.desc(func.lower(tn)))
      if tn2:
        qo = qo.order_by(db.desc(func.lower(tn2)))
    else:
      qo = qo.order_by(func.lower(tn))
      if tn2:
        qo = qo.order_by(func.lower(tn2))

  if limit:
    qo = qo.limit(limit)

  if offset:
    qo = qo.offset(offset)

  data = qo.all()
  return BookmarkSchema(many=True).dump(data) if data else {}


def bookmarks_post():
  """Add new bookmark(s)

  :param body: Array/list of bookmark object(s) to be added to the database.
               If an element already exists it will be overwritten if the modification date is older, otherwise the entry is ignored.
               If mandatory elements are missing, an error is returned.
  :type body: list | bytes

  :rtype: None
  """
  body = connexion.request.get_json() if connexion.request.is_json else None
  if body:
    count = 0
    categories = []
    response = { "nb":0, "detail":[] }
    for entry in body:
      bm = Bookmark(**entry)
      if bm.category and(not bm.category.strip() or bm.category == 'Keine Kategorie'):
        bm.category = None
      # get expiry date
      if not bm.expiry or bm.expiry <= 0:
        nexp = CONST_FUTURE_VALUE
        expiry = getExpiry(bm.website)
        if expiry:
          try:
            nd = convertDate2Stamp(expiry)
            if isInFutureDay(nd, bm.sendtime if bm.sendtime else 0):
              nexp = nd
          except ValueError:
            pass
        bm.expiry = nexp
      add = True
      rec = Bookmark.query.filter(Bookmark.id==entry['id']).one_or_none()
      if rec:
        # check for overwrite
        if bm.modified > rec.modified:
          # delete old and add new
          db.session.delete(rec)
        else:
          add = False
      if add:
        detail = {}
        detail["id"] = entry['id']
        detail["expiry"] = bm.expiry if bm.expiry < CONST_FUTURE_VALUE else -1
        response["detail"].append(detail)
        # store category for checking
        if bm.category and not bm.category in categories:
          categories.append(bm.category)
        # add to moviestate db:
        data = MovieState.query.filter(MovieState.hashid==entry['id']).one_or_none()
        if not data:
          data = MovieState(entry['id'], entry['seen'] if 'seen' in entry else False, True, int(round(time.time()*1000)), bm.expiry)
          db.session.add(data)
        else:
          if 'seen' in entry:
            data.seen = entry['seen']
          data.bookmarked = True
          data.modified = int(round(time.time()*1000))  # set timestamp
          if bm.expiry == CONST_FUTURE_VALUE:
            if data.expiry != CONST_FUTURE_VALUE:
              bm.expiry = data.expiry   # take value from movie state
          else:
            data.expiry = bm.expiry
          # no result, check if expiry exists in state db:
        db.session.add(bm)
        count += 1
    response["nb"] = count
    if count > 0:
      # check for categories:
      for name in categories:
        if not Category.query.filter(Category.name==name).one_or_none():
          newcat = Category(name)
          db.session.add(newcat)
      db.session.commit()
  else:
    abort(400, "Invalid body")
  #import pdb; pdb.set_trace()
  return response


def bookmarks_delete():
  """Delete list of bookmark(s) with given id

  :param ids: Array of bookmark id(s) to be removed from the database
  :type ids : list bytes

  :rtype: None
  """
  if connexion.request.is_json:
    ids = connexion.request.get_json()
    #import pdb; pdb.set_trace()
    count = 0
    dbchange = 0
    for idx in ids:
      # get record:
      rec = Bookmark.query.filter(Bookmark.id==idx).one_or_none()
      if rec:
        db.session.delete(rec)
        dbchange = 1
        count += 1
      # update movie state if seen otherwise delete
      data = MovieState.query.filter(MovieState.hashid==idx).one_or_none()
      if data:
        if data.seen:
          data.bookmarked = False
          data.modified = int(round(time.time()*1000))  # set timestamp
        else:
          db.session.delete(data)
        dbchange = 1
    if dbchange > 0:
      db.session.commit()
    else:
      abort(404, "No records deleted")
  else:
    abort(400, "Not supported body")
  return { 'nb' : count }
