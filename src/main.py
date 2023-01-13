"""
Main module of MyMediathek server
"""

import os
import requests
import flask
import socket
import sys
import re
import click

from flask import render_template
from api import connex_app, db, dbname, cfgConfig
from api.models import *


def get_ip():
  s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
  s.settimeout(0)
  try:
      # doesn't even have to be reachable
      s.connect(('10.254.254.254', 1))
      IP = s.getsockname()[0]
  except Exception:
      IP = '127.0.0.1'
  finally:
      s.close()
  return IP


# perform necessary init functions
def init():
  # check if database file exists or create an empty one:
  if not os.path.exists(dbname):
    # check if data directory exists and is writable
    cpath = os.path.dirname(dbname)
    if not os.path.exists(cpath):
      try:
        os.mkdir(cpath)
      except OSError:
        sys.exit(f" ERROR: Database directory >{cpath}< does not exists and could not be created! -> Aborting")

    if not os.access(cpath, os.W_OK):
      if os.path.exists(dbname):
        if not os.access(dbname, os.W_OK):
          sys.exit(f" ERROR: Database file >{dbname}< is not writable! -> Aborting")
      else:
        sys.exit(f" ERROR: Database directory >{cpath}< is not writable and no database file exists! -> Aborting")
    
    with connex_app.app.app_context():
      db.create_all()
      db.session.commit()

  # Read the swagger.yml file to configure the endpoints
  connex_app.add_api('swagger.yaml')


@connex_app.route('/')
def home():
  return render_template('index.html')


# CORS Proxy:
method_requests_mapping = {
  'GET': requests.get,
  'HEAD': requests.head,
  'POST': requests.post,
  'PUT': requests.put,
  'DELETE': requests.delete,
  'PATCH': requests.patch,
  'OPTIONS': requests.options
}

@connex_app.route('/corsproxy/<path:url>', methods=method_requests_mapping.keys())
def proxy(url):
  try:
    requests_function = method_requests_mapping[flask.request.method]
    request = requests_function(url, stream=True, params=flask.request.args)
    response = flask.Response(flask.stream_with_context(request.iter_content()),
                              content_type=request.headers['content-type'],
                              status=request.status_code)
    response.headers['Access-Control-Allow-Origin'] = '*'
  except:
    e = sys.exc_info()[0]
    x = re.search("'(.+)'", str(e))
    if x:
      e = x.group()
      err = e[1:len(e)-1]
    else:
      err = ""
    response = err, 500
  finally:
    return response


# If we're running in stand alone mode, run the application
if __name__ == '__main__':
  init()

  # Set Server mode:
  # BM_SERVER_MODE = 1 : listens on all external interfaces
  #                  0 or missing means use loopback interface
  if cfgConfig.getboolean('general', 'servermode', fallback = True):
    bmServerMode = '0.0.0.0'
    serverip = get_ip();
  else:
    bmServerMode = '127.0.0.1'
    serverip = bmServerMode;
  bmServerPort = cfgConfig.get('general', 'serverport', fallback = 8081)
  #import pdb; pdb.set_trace()
  cli = sys.modules['flask.cli']
  cli.show_server_banner = lambda *x: click.echo("\n------------------------------------------------------\nDie Webseite kann jetzt im Browser unter der Adresse\n    http://" + serverip + ":" + str(bmServerPort) +" geöffnet werden.\n------------------------------------------------------\n\n")

  connex_app.run(port=bmServerPort, host=bmServerMode, debug=cfgConfig.getboolean("develop","enable_debug_mode", fallback=None))
