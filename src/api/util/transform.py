# Help file to transform db in new format

import sqlite3
import os, sys
from shutil import copyfile

# Mapping:
#    old                   new 
#    idx    name       
#
#     0     id            =>      0
#     1     modified      =>      1
#     2     sender        =>      2
#     3     thema         =>      3
#     4     titel         =>      4
#     5     category      =>      5
#     6     url           =>      6
#     7     urlklein      
#     8     highQuality   
#     9     description   =>      7
#     10    dauer         =>      8  (convert!! to s)
#     11    sendDate      
#     12    seen          =>      9
#     13    expiry        
#     14    note          =>      10
#     15    exptimestamp  =>      11
#     16    sendtimestamp =>      12
#     17    website       =>      13
def createNewBookmarkRecordSQL(rec):
  #import pdb; pdb.set_trace()
  duration = getseconds(rec[10])
  newsql = f'INSERT INTO bookmarks VALUES ({rec[0]},{rec[1]},"{rec[2]}","{rec[3]}","{equote(rec[4])}","{rec[5]}","{rec[6]}","{equote(rec[9])}",{duration},{rec[12]},"{rec[14]}",{rec[15]},{rec[16]},"{rec[17]}")'
  #print(newsql)
  return newsql

def createCategoryRecordSQL(rec):
  newsql = f'INSERT INTO categories VALUES ("{rec[0]}",{rec[1]},{rec[2]},{rec[3]})'
  #print(newsql)
  return newsql

def createMoviestateRecordSQL(rec):
  newsql = f'INSERT INTO moviestate VALUES ({rec[0]},{rec[1]},{rec[2]},{rec[3]},{checkNone(rec[4])})'
  #print(newsql)
  #import pdb; pdb.set_trace()
  return newsql

def checkNone(rec):
  return "NULL" if rec == None else rec

def equote(rec):
  if rec != None:
    return rec.replace('"','-')
  else:
    return "NULL"


seclist = [1,60,3600]
def getseconds(str):
  if str != None:
    e = str.split(":")
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
  #testgetseconds(1,"0:45",45)
  #testgetseconds(2,"1:01",61)
  #testgetseconds(3,"2:01:01",7261)
  #testgetseconds(4,"0:01:03",63)

  olddb = "../../../data/pi/bookmarks-old.db"
  newdb = "../../../data/bookmarks.db"
  tmpdb = "../../../data/bookmarks-template.db"
  
  if not os.path.exists(olddb):
    print(f"Ausgangsdatei {olddb} exisitiert nicht => Abbruch")
    sys.exit(0)
    
  if not os.path.exists(tmpdb):
    print(f"Templatedatei {tmpdb} exisitiert nicht => Abbruch")
    sys.exit(0)
  
  if os.path.exists(newdb):
    print(f"Zieldatei {newdb} exisitiert => gelöscht")
    os.remove(newdb)
  copyfile(tmpdb,newdb)
    
  connection = sqlite3.connect(olddb)
  cursor = connection.cursor()
  
  connection_new = sqlite3.connect(newdb)
  cursor_new = connection_new.cursor()

  # Bookmark table:
  sql = "SELECT * FROM bookmarks"
  cursor.execute(sql)
  for rec in cursor:
    sql = createNewBookmarkRecordSQL(rec)
    cursor_new.execute(sql)
    connection_new.commit()
    
  # Category table:
  sql = "SELECT * FROM categories"
  cursor.execute(sql)
  for rec in cursor:
    sql = createCategoryRecordSQL(rec)
    cursor_new.execute(sql)
    connection_new.commit()

  # Movie state table:
  sql = "SELECT * FROM moviestate"
  cursor.execute(sql)
  for rec in cursor:
    sql = createMoviestateRecordSQL(rec)
    cursor_new.execute(sql)
    connection_new.commit()

  # Verbindung beenden
  connection.close()
  connection_new.close()