import os
import connexion
import sys
import logging

from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from pathlib import Path
from api.myconfig import myConfig
from werkzeug.serving import WSGIRequestHandler


CONST_VERSION = "Vx.x"


def printInfo():
  print ("\n Player:")
  print (cfgConfig.getPlayerInfo())
  print ("\n Einstellungen:")
  print (" * INI Datei         : " + inifile)
  print (" * Database Datei    : " + dbname)
  print (" * Basisverzeichnis  : " + str(basedir))
  print (" * Debugmodus        : " + ("aktiv" if cfgConfig.getboolean("develop","enable_debug_mode", fallback=False) else "inaktiv"))
  if cfgConfig.getboolean("develop","enable_swagger_ui", fallback=False):
    print (" * Swagger UI        : aktiv")



# ========= MAIN =====================

print ("\nMyMediathek Server Version " + CONST_VERSION) 
print (" * Starte config ...")


basedir = Path(os.path.abspath(os.path.dirname(__file__))).parent

# read config file
cfgConfig = myConfig()
inifile = os.environ["BM_CONFIG_FILE"] if "BM_CONFIG_FILE" in os.environ else os.path.join(basedir.parent,"data","server.ini")
if os.path.exists(inifile):
  cfgConfig.read(inifile)
else:
  print("  NO Ini file provided, using defaults")
  inifile = "None"

if "BM_DBFILE" in os.environ:
  dbname = os.environ["BM_DBFILE"]
else:
  dbname = os.path.join(basedir.parent, 'data', 'bookmarks.db')

# Create the connexion application instance
options = { 'swagger_ui': cfgConfig.getboolean("develop","enable_swagger_ui", fallback=False) }
connex_app = connexion.App(__name__, specification_dir=basedir, options=options)

# Get the underlying Flask app instance
app = connex_app.app

loglevel = logging.DEBUG if cfgConfig.getboolean("develop","enable_debug_mode", fallback=False) else logging.ERROR 

app.logger.setLevel(loglevel)
log = logging.getLogger('werkzeug')
log.setLevel(loglevel)

# Configure the SqlAlchemy part of the app instance
app.config["SQLALCHEMY_ECHO"] = False
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + dbname
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Configure the Flask part of the app instance
app.config["EXPLAIN_TEMPLATE_LOADING"] = cfgConfig.getboolean("develop","explain_template_loading", fallback=False)

# set HTTP 1.1
WSGIRequestHandler.protocol_version = "HTTP/1.1"

# add CORS
CORS(app)

# Create the SqlAlchemy db instance
db = SQLAlchemy(app)

# Initialize Marshmallow
ma = Marshmallow(app)

printInfo()
