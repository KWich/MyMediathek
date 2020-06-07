
from api import db, ma
from marshmallow import fields


class Bookmark(db.Model):
  __tablename__ = 'bookmarks'

  id = db.Column(db.Integer, primary_key=True, sqlite_on_conflict_unique='IGNORE')
  modified  = db.Column(db.Integer)
  sender = db.Column(db.String())
  thema = db.Column(db.String())
  titel = db.Column(db.String())
  category = db.Column(db.String())
  url = db.Column(db.String())
  description = db.Column(db.String())
  duration = db.Column(db.Integer())
  seen = db.Column(db.Boolean())
  note = db.Column(db.String())
  expiry = db.Column(db.Integer())
  sendtime = db.Column(db.Integer())
  website = db.Column(db.String())
  imgurl = db.Column(db.String())
  videoformat = db.Column(db.String())

  def __repr__(self):
    return f'Bookmark {self.id}'

  def save(self):
    db.session.add(self)
    db.session.commit()


class BookmarkSchema(ma.Schema):
  class Meta:
    model = Bookmark
    sqla_session = db.session
    fields = ('id','sender','titel','thema','modified','category','url','description','duration','sendtime','seen','expiry','note','website','imgurl','videoformat')


class BMNumber:
  def __init__(self, nb):
      self.nb = nb

  def __repr__(self):
      return "<BMNumber(nb={self.nb!r})>".format(self=self)


class BMNumberSchema(ma.Schema):
  nb = fields.Integer()


class NameNumber:
  def __init__(self, name, nb):
      self.name = name
      self.nb = nb

  def __repr__(self):
      return "<NameNumber({self.name}:{self.nb!r})>".format(self=self)


class NameNumberSchema(ma.Schema):
  name = fields.String(required=True)
  nb = fields.Integer()


class Category(db.Model):
  __tablename__ = 'categories'

  name = db.Column(db.String, primary_key=True)
  modified  = db.Column(db.Integer(), default=0)
  fontcolor = db.Column(db.Integer(), default=-1)
  backgroundcolor = db.Column(db.Integer(), default=-1)

  def __init__(self, name, backgroundcolor=-1, fontcolor = -1, modified = 0):
    self.name = name
    self.modified = modified
    self.fontcolor = fontcolor
    self.backgroundcolor = backgroundcolor

  def __repr__(self):
    return f'{self.name}'
    
  def serialize(self):
    return {"name": self.name,
            "modified": self.modified
           }


class CategorySchema(ma.Schema):
  class Meta:
    model = Category
    sqla_session = db.session
    fields = ('name','modified','fontcolor','backgroundcolor')


class MovieState(db.Model):
  __tablename__ = 'moviestate'

  hashid = db.Column(db.Integer, primary_key=True, sqlite_on_conflict_unique='IGNORE')
  seen = db.Column(db.Boolean())
  bookmarked = db.Column(db.Boolean())
  modified  = db.Column(db.Integer)
  expiry  = db.Column(db.Integer)

  def __init__(self, hashid, seen=False, bookmarked=False, modified = 0, expiry = 0):
    self.hashid = hashid
    self.seen = seen
    self.bookmarked = bookmarked
    self.modified = modified
    self.expiry = expiry

  def save(self):
    db.session.add(self)
    db.session.commit()


class MovieStateSchema(ma.Schema):
  class Meta:
    model = MovieState
    sqla_session = db.session
    fields = ('hashid','seen','bookmarked','modified','expiry')


class StateResult:
  def __init__(self, id, state=False, errmsg=""):
    self.id = id
    self.state = state
    self.errmsg = errmsg

  def __repr__(self):
    return "<CategoryState({self.id!r}:{self.seen})>".format(self=self)

  def serialize(self):
    return {"id": self.id,
            "state": self.state,
            "errmsg" : self.errmsg
           }

