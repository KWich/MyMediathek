"""
Utility routines

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import re
from datetime import datetime
from math import floor
from time import mktime, strptime

import requests


def convertDate2Stamp(tstring):
  tos = strptime(tstring, "%d.%m.%Y")
  return int(mktime(tos))


def convertDateTime2Stamp(tstring):
  tos = strptime(tstring, "%d.%m.%Y %H:%M")
  return int(mktime(tos))


def isInFutureDay(date, olddatewithtime):
  do = datetime.fromtimestamp(olddatewithtime)  # noqa: DTZ006
  dv = datetime(do.year, do.month, do.day)  # noqa: DTZ001
  return date > floor(dv.timestamp())


pattern0 = re.compile(r"verfügbar bis.*?([0-9]{2}\.[0-9]{2}\.[0-9]{4})", re.IGNORECASE | re.DOTALL)
pattern1 = re.compile(r"verfügbar.*?bis.*?([0-9]{2}\.[0-9]{2}\.[0-9]{4})", re.IGNORECASE | re.DOTALL)
pattern2 = re.compile(r"verfügbar.+?bis.+?([0-9]{2}/[0-9]{2}/[0-9]{4})", re.IGNORECASE | re.DOTALL)
pattern3 = re.compile(r"online.bis.+?([0-9]{2}\.[0-9]{2}\.[0-9]{4})", re.IGNORECASE | re.DOTALL)
patterns = [pattern0, pattern1, pattern2, pattern3]

def getExpiry(url):
  expiry = None
  if url:
    try:
      response = requests.get(url, verify=False, timeout=2)  # noqa: S501
      if response.status_code == 200:  # noqa: PLR2004
        page = response.text
        if len(page) > 0:
          for p in patterns:
            match = p.search(page)
            if match:
              expiry = match.group(1).replace("/", ".")
              break
    except requests.exceptions.RequestException:
      pass
  return expiry


if __name__ == "__main__":
  tstamp = convertDate2Stamp("26.07.2021")
  print(" 1 OK" if tstamp == 1627250400 else " 1 Fail: " + str(tstamp) + "/1627250400")  # noqa: PLR2004, T201
  tstamp = convertDate2Stamp("05.06.1988")
  print(" 2 OK" if tstamp == 581464800 else " 2 Fail: " + str(tstamp) + "/581464800")  # noqa: PLR2004, T201

  tstamp = convertDateTime2Stamp("26.07.2021 13:40")
  print(" 3 OK" if tstamp == 1627299600 else " 3 Fail: " + str(tstamp) + "/1627299600")  # noqa: PLR2004, T201
  tstamp = convertDateTime2Stamp("25.07.2021 19:30")
  print(" 4 OK" if tstamp == 1627234200 else " 4 Fail: " + str(tstamp) + "/1627234200")  # noqa: PLR2004, T201

  print(" 5 OK" if isInFutureDay(1627250400, 1627234200) else " 5 Fail: isInFutureDay")  # noqa: T201
  print(" 6 OK" if not isInFutureDay(1627250400, 1627299600) else " 6 Fail: not isInFutureDay")  # noqa: T201
