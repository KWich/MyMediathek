"""
Helper file to transform db in new format

Base DB V0.9 to V1.0

SPDX-FileCopyrightText: 2025 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""  # noqa: INP001

import os
import sqlite3
import sys
from pathlib import Path
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
  return f'INSERT INTO bookmarks VALUES ({rec[0]},{rec[1]},"{rec[2]}", \
                                          "{rec[3]}","{equote(rec[4])}","{rec[5]}","{rec[6]}","{equote(rec[7])}", \
                                          {rec[8]},{rec[9]},"{rec[10]}",{rec[11]},{rec[12]}, \
                                          "{rec[13]}","{rec[14]}","{rec[15]}", True)'  # noqa: S608


def createCategoryRecordSql(rec):
  return f'INSERT INTO categories VALUES ("{rec[0]}",{rec[1]},{rec[2]},{rec[3]})'  # noqa: S608


def createMoviestateRecordSQL(rec):
  return f"INSERT INTO moviestate VALUES ({rec[0]},{rec[1]},{rec[2]},{rec[3]},{checkNone(rec[4])})"  # noqa: S608


def checkNone(rec):
  return "NULL" if rec is None else rec


def equote(qrec):
  if qrec is not None:
    return qrec.replace('"', "-")
  return "NULL"


def findtemplate(dirname, sname):
  result = None
  for entry in os.scandir(dirname):
    if entry.is_dir():
      result = findtemplate(entry, sname)
    elif Path(entry).name == sname:
      result = os.path.abspath(entry)  # noqa: PTH100
    if result:
      break
  return result



if __name__ == "__main__":
  basepath = sys.argv[1] if len (sys.argv) > 1 else Path.cwd()
  print("   - Update Datenbasis:")  # noqa: T201

  database_name = sys.argv[2]  if len (sys.argv) > 2 else basepath + "/data/bookmarks.db"  # noqa: PLR2004

  if not Path(database_name).exists:
    print(f"       Datenbasis {database_name} exisitiert nicht => Abbruch")  # noqa: T201
    sys.exit(0)

  # Check version of db:
  connection = sqlite3.connect(database_name)
  version = connection.cursor().execute("PRAGMA user_version").fetchone()[0]
  connection.close()
  if version >= CONST_DBVERSION:
    print(f"     => Datenbasis {database_name} ist bereits auf neuem Stand")  # noqa: T201
    sys.exit(0)

  template = findtemplate(basepath + "/scripts", "bookmarks-template.db")
  if not template or not Path(template).exists:
    print("        Templatedatei wurde nicht gefunden => Abbruch")  # noqa: T201
    sys.exit(0)

  origdb = database_name + ".orig"
  copyfile(database_name, origdb)

  copyfile(template,database_name)

  connection = sqlite3.connect(origdb)
  cursor = connection.cursor()

  connection_new = sqlite3.connect(database_name)
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
  print(f"     => Datenbasis: {database_name} wurde auf Version {CONST_DBVERSION} aktualisert")  # noqa: T201
