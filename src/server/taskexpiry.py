"""
Routines to determine movie expiry date

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import re
import requests

#from urllib3.exceptions import InsecureRequestWarning

# Suppress only the single warning from urllib3 needed.
#requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

pattern0 = re.compile(r'verfügbar bis.*?([0-9]{2}\.[0-9]{2}\.[0-9]{4})', re.IGNORECASE|re.DOTALL)
pattern1 = re.compile(r'verfügbar.*?bis.*?([0-9]{2}\.[0-9]{2}\.[0-9]{4})', re.IGNORECASE|re.DOTALL)
pattern2 = re.compile(r'verfügbar.+?bis.+?([0-9]{2}/[0-9]{2}/[0-9]{4})', re.IGNORECASE|re.DOTALL)
pattern3 = re.compile(r'online.bis.+?([0-9]{2}\.[0-9]{2}\.[0-9]{4})', re.IGNORECASE|re.DOTALL)
patterns = [pattern0, pattern1, pattern2, pattern3]

def getExpiry(url):
  #import pdb; pdb.set_trace()
  expiry = None
  if url:
    try:
      response = requests.get(url, verify=False, timeout=2)
      if response.status_code == 200:
        page = response.text
        if len(page) > 0:
          for p in patterns:
            match = p.search(page)
            if match:
              expiry = match.group(1).replace('/','.')
              break
    except requests.exceptions.RequestException:
      pass
  return expiry


if __name__ == '__main__':
  def test(no,result,url):
    expiry = getExpiry(url)
    if not expiry:
      expiry = ""
    print(str(no) +" OK" if expiry == result else str(no) + " Fail: >" + expiry + "< != >" + result + "<")

  print("NONE: " + ("OK " if getExpiry(None) is None else "Fail" ))
  print("EMPTY: " + ("OK " if getExpiry("") is None else "Fail" ))

  test(1,"14.06.2021",r"https://www.br.de/mediathek/video/awt-sozialkompetenzen-soft-skills-die-tricks-zum-erfolg-av:5e8d8781f389d20013ae6304")
  test(2,"13.08.2021", r"https://www.3sat.de/film/fernsehfilm/schwarzwaldliebe-102.html")
  #test(2,"21.04.2022",r"https://www.zdf.de/serien/fritzie-der-himmel-muss-warten/probeliegen-100.html")
