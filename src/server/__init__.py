"""
SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import os
import logging
from pathlib import Path
import connexion

from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from werkzeug.serving import WSGIRequestHandler      # pylint: disable=no-name-in-module
from server.myconfig import MyConfig


CONST_VERSION = "1.0.3 (07/02/2025)"
CONST_DBVERSION = 3


def printInfo():
  print (f" * Config Datei       : {APP_CONFIG.configFile}\n" + \
         f" * Database Datei     : {APP_CONFIG.dbName}\n" + \
         f" * Basisverzeichnis   : {APP_CONFIG.baseDir}\n" + \
         f" * Server IP Addresse : {APP_CONFIG.serverIpAddress}\n\n" + \
          " * Debugmodus         : " + ("aktiv" if APP_CONFIG.getboolean("develop","enable_debug_mode", fallback=False) else "inaktiv") + \
          "\n * Server SSL         : " + ("aktiv" if APP_CONFIG.sslEnabled else "inaktiv"))
  if APP_CONFIG.sslEnabled:
    if APP_CONFIG.sslError != "":
      print (f"\n      === SSL KONFIGURATIONS FEHLER: ===\n      {APP_CONFIG.sslError}\n      => https ist nicht verfügbar!!\n")

    if APP_CONFIG.sslCert:
      print ("     - ssl Zertifikat : " + APP_CONFIG.sslCert)
      print ("     - ssl Key        : " + APP_CONFIG.sslKey)
    else:
      print ("     - ssl Zertifikat : adhoc (generated during start)")

  if APP_CONFIG.getboolean("develop","enable_swagger_ui", fallback=False):
    print (" * Swagger UI         : aktiv")

  print (APP_CONFIG.getPlayerInfo())


# ========= MAIN =====================

print ("\n======================================================\n\n" + \
         "                MyMediathek Server\n" + \
         "                (Version  " + CONST_VERSION + ")\n\n" + \
         "------------------------------------------------------")


basedir = Path(os.path.abspath(os.path.dirname(__file__))).parent

# read config file
APP_CONFIG = MyConfig(basedir)

# Create the connexion application instance
connex_app = connexion.App(__name__,
                           server_args = {
                                           "template_folder" : APP_CONFIG.templateDir,
                                           "static_folder" : APP_CONFIG.staticDir
                                         },
                           specification_dir = basedir,
                           options = {
                                      'swagger_ui': APP_CONFIG.getboolean("develop","enable_swagger_ui", fallback=False)
                                     }
                          )

# Get the underlying Flask app instance
app = connex_app.app
app.logger.setLevel(APP_CONFIG.logLevel)

log = logging.getLogger('werkzeug')
log.setLevel(APP_CONFIG.logLevel)
log = logging.getLogger('connexion.app')
log.setLevel(APP_CONFIG.logLevel)

# Configure the SqlAlchemy part of the app instance
app.config["SQLALCHEMY_ECHO"] = False
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + APP_CONFIG.dbName
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure the Flask part of the app instance
app.config["EXPLAIN_TEMPLATE_LOADING"] = APP_CONFIG.getboolean("develop","explain_template_loading", fallback=False)

# set HTTP 1.1
WSGIRequestHandler.protocol_version = "HTTP/1.1"

# add CORS
CORS(app)

# Create the SqlAlchemy db instance
db = SQLAlchemy(app)

# Initialize Marshmallow
ma = Marshmallow(app)

printInfo()
