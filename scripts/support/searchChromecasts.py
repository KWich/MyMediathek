

import time
import pychromecast
import zeroconf


zconf = zeroconf.Zeroconf()
browser = pychromecast.CastBrowser(pychromecast.SimpleCastListener(lambda uuid, service: print(f"* Chromecast friendly name: \"{browser.devices[uuid].friendly_name}\"")), zconf)
print ("Suche nach Chromecast Geräten im lokalen Netzwerk, bitte sicherstellen das alle Geräte eingeschaltet sind:\n")
browser.start_discovery()
time.sleep(5)
pychromecast.discovery.stop_discovery(browser)
print ("\nFertig ---")
