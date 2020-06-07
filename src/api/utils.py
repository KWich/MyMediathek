from time import strptime, mktime
from datetime import datetime
from math import floor

def convertDate2Stamp(tstring):
  tos = strptime(tstring, '%d.%m.%Y')
  result = int(mktime(tos))
  return result
  
def convertDateTime2Stamp(tstring):
  tos = strptime(tstring, '%d.%m.%Y %H:%M')
  result = int(mktime(tos))
  return result

def isInFutureDay(date, olddatewithtime):
  do = datetime.fromtimestamp(olddatewithtime)
  dv = datetime(do.year, do.month, do.day)
  return date > floor(dv.timestamp())


if __name__ == '__main__':
  tstamp = convertDate2Stamp("26.07.2021")
  print( " 1 OK" if tstamp == 1627250400 else " 1 Fail: " + str(tstamp)  + "/1627250400" )
  tstamp = convertDate2Stamp("05.06.1988")
  print( " 2 OK" if tstamp == 581464800 else " 2 Fail: " + str(tstamp)  + "/581464800" )

  tstamp = convertDateTime2Stamp("26.07.2021 13:40")
  print( " 3 OK" if tstamp == 1627299600 else " 3 Fail: " + str(tstamp)  + "/1627299600" )
  tstamp = convertDateTime2Stamp("25.07.2021 19:30")
  print( " 4 OK" if tstamp == 1627234200 else " 4 Fail: " + str(tstamp)  + "/1627234200" )

  print( " 5 OK" if isInFutureDay(1627250400, 1627234200 ) else " 5 Fail: isInFutureDay" )
  import pdb; pdb.set_trace()
  print( " 6 OK" if not isInFutureDay(1627250400, 1627299600 ) else " 6 Fail: not isInFutureDay" )