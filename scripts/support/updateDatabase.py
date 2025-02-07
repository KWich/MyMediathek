"""
Helper file to transform db in new format

Base DB V0.9 to V1.0

SPDX-FileCopyrightText: 2025 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import sqlite3
import os
import sys
from shutil import copyfile


CONST_DBVERSION = 3

# Mapping Bookmark table:
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
  newsql = f'INSERT INTO bookmarks VALUES ({rec[0]},{rec[1]},"{rec[2]}", \
                                          "{rec[3]}","{equote(rec[4])}","{rec[5]}","{rec[6]}","{equote(rec[7])}", \
                                          {rec[8]},{rec[9]},"{rec[10]}",{rec[11]},{rec[12]}, \
                                          "{rec[13]}","{rec[14]}","{rec[15]}", True)'
  return newsql


def createCategoryRecordSql(rec):
  newsql = f'INSERT INTO categories VALUES ("{rec[0]}",{rec[1]},{rec[2]},{rec[3]})'
  return newsql


def createMoviestateRecordSQL(rec):
  newsql = f'INSERT INTO moviestate VALUES ({rec[0]},{rec[1]},{rec[2]},{rec[3]},{checkNone(rec[4])})'
  return newsql


def checkNone(rec):
  return "NULL" if rec is None else rec


def equote(qrec):
  if qrec is not None:
    return qrec.replace('"','-')
  return "NULL"


def findtemplate(dirname, sname):
  result = None
  for entry in os.scandir(dirname):
    if entry.is_dir():
      result = findtemplate(entry, sname)
    else:
      if os.path.basename(entry) == sname:
        result = os.path.abspath(entry)
    if result:
      break
  return result



if __name__ == '__main__':
  basepath = sys.argv[1] if len (sys.argv) > 1 else os.getcwd()
  print("   - Update Datenbasis:")

  if len (sys.argv) > 2:
    dataBaseName = sys.argv[2]
  else:
    # Try to use db in standard directoy:
    dataBaseName = basepath + "/data/bookmarks.db"

  if not os.path.exists(dataBaseName):
    print(f"       Datenbasis {dataBaseName} exisitiert nicht => Abbruch")
    sys.exit(0)

  # Check version of db:
  connection = sqlite3.connect(dataBaseName)
  version = connection.cursor().execute("PRAGMA user_version").fetchone()[0]
  connection.close()
  if version >= CONST_DBVERSION:
    print(f"     => Datenbasis {dataBaseName} ist bereits auf neuem Stand")
    sys.exit(0)

  dataPath = os.path.dirname(dataBaseName)

  template = findtemplate(basepath + "/scripts", "bookmarks-template.db")
  if not template or not os.path.exists(template):
    print("        Templatedatei wurde nicht gefunden => Abbruch")
    sys.exit(0)

  origdb = dataBaseName + ".orig"
  copyfile(dataBaseName, origdb)

  copyfile(template,dataBaseName)

  connection = sqlite3.connect(origdb)
  cursor = connection.cursor()

  connection_new = sqlite3.connect(dataBaseName)
  cursor_new = connection_new.cursor()

  # Bookmark table:
  cursor.execute("SELECT * FROM bookmarks")
  for record in cursor:
    cursor_new.execute(createNewBookmarkRecordSql(record))
    connection_new.commit()

  # Category table:
  cursor.execute("SELECT * FROM categories")
  for record in cursor:
    cursor_new.execute(createCategoryRecordSql(record))
    connection_new.commit()

  # Movie state table:
  cursor.execute("SELECT * FROM moviestate")
  for record in cursor:
    cursor_new.execute(createMoviestateRecordSQL(record))
    connection_new.commit()

  # Verbindung beenden
  connection.close()
  connection_new.close()
  print(f"     => Datenbasis: {dataBaseName} wurde auf Version {CONST_DBVERSION} aktualisert")
