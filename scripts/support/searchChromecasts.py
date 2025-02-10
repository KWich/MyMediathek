"""
Server Logging

SPDX-FileCopyrightText: 2025 Klaus Wich
SPDX-License-Identifier: EUPL-1.2
"""  # noqa: INP001

import time

import pychromecast
import zeroconf

zconf = zeroconf.Zeroconf()
browser = pychromecast.CastBrowser(
  pychromecast.SimpleCastListener(
    lambda uuid, _: print(f'* Chromecast friendly name: "{browser.devices[uuid].friendly_name}"')  # noqa: T201
  ),
  zconf,
)
print("Suche nach Chromecast Geräten im lokalen Netzwerk, bitte sicherstellen das alle Geräte eingeschaltet sind:\n")  # noqa: T201
browser.start_discovery()
time.sleep(5)
pychromecast.discovery.stop_discovery(browser)
print("\nFertig ---")  # noqa: T201
