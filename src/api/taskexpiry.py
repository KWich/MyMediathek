import requests
import re
from urllib3.exceptions import InsecureRequestWarning

# Suppress only the single warning from urllib3 needed.
requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)

pattern0 = re.compile('verfügbar bis.*?([0-9]{2}\.[0-9]{2}\.[0-9]{4})', re.IGNORECASE|re.DOTALL)
pattern1 = re.compile('verfügbar.*?bis.*?([0-9]{2}\.[0-9]{2}\.[0-9]{4})', re.IGNORECASE|re.DOTALL)
pattern2 = re.compile('verfügbar.+?bis.+?([0-9]{2}/[0-9]{2}/[0-9]{4})', re.IGNORECASE|re.DOTALL)
pattern3 = re.compile('online.bis.+?([0-9]{2}\.[0-9]{2}\.[0-9]{4})', re.IGNORECASE|re.DOTALL)
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
    #except requests.exceptions.RequestException as e:
      #import pdb; pdb.set_trace()
      #print ("Request exception: " + str(e))
  return expiry


if __name__ == '__main__':
  def test(no,result,url):
    expiry = getExpiry(url)
    if not expiry:
      expiry = ""
    print(str(no) +" OK" if expiry == result else str(no) + " Fail: >" + expiry + "< != >" + result + "<")

  print("NONE: " + ("OK " if getExpiry(None) == None else "Fail" ))
  print("EMPTY: " + ("OK " if getExpiry("") == None else "Fail" ))
  
  #test(1,"14.06.2021","https://www.br.de/mediathek/video/awt-sozialkompetenzen-soft-skills-die-tricks-zum-erfolg-av:5e8d8781f389d20013ae6304")
  #test(2,"13.08.2021", "https://www.3sat.de/film/fernsehfilm/schwarzwaldliebe-102.html")
  test(2,"21.04.2022","https://www.zdf.de/serien/fritzie-der-himmel-muss-warten/probeliegen-100.html");
  #exit()
  test(3,"13.05.2022", "https://www.ardmediathek.de/video/Y3JpZDovL2JyLmRlL3ZpZGVvLzQ0NTYzYmU2LWVjOWYtNDdhNi05MGQyLWRkODZmZDk3NDZiZg/")
  exit()
  #ZDF
  test (4, "20.03.2026" ,"https://www.zdf.de/kinder/die-wg/jungs-wg-auf-mallorca-tag-7-100.html")
  test (5, "15.05.2021", "https://www.zdf.de/serien/shakespeare-and-hathaway/weinende-unschuld-deutschlandpremiere-100.html")
  #ARTE
  test (6, "17.06.2021", "https://www.arte.tv/de/videos/078153-000-A/die-anden/")
  test (7, "18.05.2021", "https://www.arte.tv/de/videos/098801-012-A/stadt-land-kunst-spezial/")
  #3SAT
  #test (8, "25.03.2021", "https://www.3sat.de/gesellschaft/politik-und-gesellschaft/dubai-flucht-einer-prinzessin-102.html")
  #test (9, "16.03.2026", "https://www.3sat.de/gesellschaft/makro/wirtschaftsdokumentation-zurueck-zum-atom-finnlands-nukleare-zukunft-100.html")
