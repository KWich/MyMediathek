"""
Helper file to transform db in new format

Base DB V0.9 to V1.0

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import sqlite3
import os
import sys
from shutil import copyfile

# Mapping:
#    old                   new
#    idx    name
#
#     0     id            =>       0
#     1     modified      =>       1
#     2     sender        =>       2    VARCHAR
#     3     thema         =>       3    VARCHAR
#     4     titel         =>       4    VARCHAR
#     5     category      =>       5    VARCHAR
#     6     url           =>       6    VARCHAR
#     7     description   =>       7    VARCHAR
#     8     duration      =>       8
#     9     seen          =>       9
#    10     note          =>      10    VARCHAR
#    11     expiry        =>      11
#    12     sendtime      =>      12
#    13     website       =>      13    VARCHAR
#    14     imgurl        =>      14    VARCHAR
#    15     videoformat   =>      15    VARCHAR
#           valid         =>      16    BOOL (new!!)


def createNewBookmarkRecordSql(rec):
  #import pdb; pdb.set_trace()
  newsql = f'INSERT INTO bookmarks VALUES ({rec[0]},{rec[1]},"{rec[2]}", \
                                          "{rec[3]}","{equote(rec[4])}","{rec[5]}","{rec[6]}","{equote(rec[7])}", \
                                          {rec[8]},{rec[9]},"{rec[10]}",{rec[11]},{rec[12]}, \
                                          "{rec[13]}","{rec[14]}","{rec[15]}", True)'
  #print(newsql)
  return newsql

def createCategoryRecordSql(rec):
  newsql = f'INSERT INTO categories VALUES ("{rec[0]}",{rec[1]},{rec[2]},{rec[3]})'
  #print(newsql)
  return newsql

def createMoviestateRecordSQL(rec):
  newsql = f'INSERT INTO moviestate VALUES ({rec[0]},{rec[1]},{rec[2]},{rec[3]},{checkNone(rec[4])})'
  #print(newsql)
  #import pdb; pdb.set_trace()
  return newsql

def checkNone(rec):
  return "NULL" if rec is None else rec

def equote(qrec):
  if qrec is not None:
    return qrec.replace('"','-')
  return "NULL"


seclist = [1,60,3600]
def getseconds(secstr):
  if secstr is not None:
    e = secstr.split(":")
    k = 0
    sec = 0
    for i in reversed(e):
      #import pdb; pdb.set_trace()
      sec += seclist[k] * int(i)
      k += 1
  else:
    sec = "NULL"
  return sec

def testgetseconds(no, tstr, sec):
  print(str(no) +" OK" if sec == getseconds(tstr) else str(no) + " Fail: >" + tstr + "< != >" + sec + "<")


if __name__ == '__main__':
  #DATAPATH="../../../data"
  DATAPATH="data"
  if not os.path.exists(DATAPATH):
    print(f"Datenpfad {DATAPATH} exisitiert nicht => Abbruch, Arbeitsverzeichnis:" + os.getcwd())
    sys.exit(0)

  OLDDB = DATAPATH + "/old/bookmarks.db"
  NEWDB = DATAPATH + "/new/bookmarks.db"
  TMPDB = DATAPATH + "/bookmarks-template-10.db"

  if not os.path.exists(OLDDB):
    print(f"Ausgangsdatei {OLDDB} exisitiert nicht => Abbruch")
    sys.exit(0)

  if not os.path.exists(TMPDB):
    print(f"Templatedatei {TMPDB} exisitiert nicht => Abbruch")
    sys.exit(0)

  if os.path.exists(NEWDB):
    print(f"Zieldatei {NEWDB} exisitiert => gelöscht")
    os.remove(NEWDB)
  copyfile(TMPDB,NEWDB)

  connection = sqlite3.connect(OLDDB)
  cursor = connection.cursor()

  connection_new = sqlite3.connect(NEWDB)
  cursor_new = connection_new.cursor()

  # Bookmark table:
  cursor.execute("SELECT * FROM bookmarks")
  for record in cursor:
    cursor_new.execute(createNewBookmarkRecordSql(record))
  #connection_new.commit()

  # Category table:
  cursor.execute("SELECT * FROM categories")
  for record in cursor:
    cursor_new.execute(createCategoryRecordSql(record))
  #connection_new.commit()

  # Movie state table:
  cursor.execute("SELECT * FROM moviestate")
  for record in cursor:
    cursor_new.execute(createMoviestateRecordSQL(record))

  # write changes
  connection_new.commit()

  # Verbindung beenden
  connection.close()
  connection_new.close()
