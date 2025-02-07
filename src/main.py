"""
Main module of MyMediathek server

SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
SPDX-License-Identifier: EUPL-1.2
"""

import os
import sys
import re
import flask
import click
import requests

from sqlalchemy.sql import text
from flask import render_template
from server import connex_app, db, APP_CONFIG, CONST_DBVERSION



# perform necessary init functions
def init():
  # Read the swagger.yml file to configure the endpoints and db definitions
  connex_app.add_api('swagger.yaml')

  # check if database file exists or create an empty one:
  if not os.path.exists(APP_CONFIG.dbName):
    # check if data directory exists and is writable
    cpath = os.path.dirname(APP_CONFIG.dbName)
    if not os.path.exists(cpath):
      try:
        os.mkdir(cpath)
      except OSError:
        sys.exit(f" ERROR: Database directory >{cpath}< does not exists and could not be created! -> Aborting")

    if not os.access(cpath, os.W_OK):
      if os.path.exists(APP_CONFIG.dbName):
        if not os.access(APP_CONFIG.dbName, os.W_OK):
          sys.exit(f" ERROR: Database file >{APP_CONFIG.dbName}< is not writable! -> Aborting")
      else:
        sys.exit(f" ERROR: Database directory >{cpath}< is not writable and no database file exists! -> Aborting")

    with connex_app.app.app_context():
      db.create_all()
      db.session.execute(text(f"PRAGMA user_version = {CONST_DBVERSION}"))
      db.session.commit()


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
    url = url.replace('https:/','https://', 1)
    url = url.replace('http:/','http://', 1)
    url = url.replace(':///','://', 1)
    requestsFunction = method_requests_mapping[flask.request.method]
    request = requestsFunction(url, stream=True, params=flask.request.args)
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
  return response


#  Run the application
if __name__ == '__main__':
  init()

  #import pdb; pdb.set_trace()
  cli = sys.modules['flask.cli']
  cli.show_server_banner = lambda *x: click.echo("\n   --------------------------------------------------------" + \
                                                 "\n    Die Webseite kann jetzt im Browser unter der Adresse" + \
                                                f"\n    {APP_CONFIG.serverAddress} geoeffnet werden." + \
                                                 "\n   --------------------------------------------------------\n")

  if APP_CONFIG.sslEnabled:
    connex_app.run(
                    port = APP_CONFIG.serverPort,
                    host = "0.0.0.0" if APP_CONFIG.serverMode else "127.0.0.1",
                    debug=APP_CONFIG.getboolean("develop","enable_debug_mode", fallback=None),
                    ssl_context = APP_CONFIG.sslContext
                  )
  else:
    connex_app.run(
                    port = APP_CONFIG.serverPort,
                    host = "0.0.0.0" if APP_CONFIG.serverMode else "127.0.0.1",
                    debug = APP_CONFIG.getboolean("develop","enable_debug_mode", fallback=None)
                  )
