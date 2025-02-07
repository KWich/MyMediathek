# MyMediathek - Technische Details und Entwicklung

[Übersicht](../README.MD) - [Installation](../docs/install.md) - [Bedienung](../docs/usage.md) - [Verwaltung und erweiterte Konfiguration](../docs/config.md) - [Webbrowser Add-On](../docs/addon.md) - Technische Details und Entwicklung
***

## Realisierung ##

Der Server ist eine Python [Flask](https://flask.palletsprojects.com/en/2.2.x/) Anwendung, erweitert mit [FLASK-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/en/3.0.x/)  mit SQL Lite als Datenbank. Das Interface zur Webseite ist RESTartig und mit [SWAGGER/OpenAPI](https://swagger.io/) definiert.

Die Webseite wurde mit HTML, CSS und JavaScript erstellt, ohne spezielle Frameworks.

Das im Projekt enthaltene 'package.json' und die darin enthaltene Node.js Konfiguration wird nur für den Package Build Prozess und als Steuerung für die Entwicklung verwendet, sind aber nicht relevant für die Funktion.

### Server ###

Die Anwendung benutzt den in 'Flask' integrierten WebServer, der eigentlich für Entwicklungszwecke gedacht ist, aber hier völlig ausreicht, solange nur einzelne Benutzer die App benutzen. Der Server beinhaltet **keinerlei** Sicherheit und sollte daher nicht im Internet verfügbar gemacht werden.

Falls mehr Leistung und Zuverlässigkeit benötigt wird, kann die Anwendung in einen regulären Web Server wie 'Apache' oder 'Nginx' integriert werden, entsprechende Information steht in der 'Flask' Dokumentation zur Verfügung.

#### HTTPS ####
In der Standardkonfiguration benutzt der Server HTTP. Falls HTTPS gebraucht wird, kann entweder SSL inder "server.ini" konfiguriert werden oder besser 'MyMediathek' wird hinter einem Reverse Proxy Server wie 'Nginx' betrieben, welches erfolgreich getestet wurde.

## Daten ##

Der Server legt zwei Dateien mit allen gespeicherten Daten an, die sich in der Standardkonfiguration im Unterverzeichnis './data' des Installation Verzeichnisses befinden:

- '*bookmarks.db*' : SQL Lite Datenbasis Datei mit allen gespeicherten Beitragsdaten.
- '*server.ini*' : Server Einstellungen, wie konfigurierte Player, Filter.

<br>

## <a id="serverini"></a>Erweiterte Server Konfiguration ##
Die 'server.ini' die mit im Datenverzeichnis hinterlegt wird, enthält die von den Defaultwerten abweichende Serverkonfigurationsparameter, welche hier angepaßt werden können.

Die Datei benutzt das INI File Format (siehe [Wikipedia Initialisierungsdatei](https://de.wikipedia.org/wiki/Initialisierungsdatei)), folgende Werte werden unterstützt:

|Sektion|Einstellung|Werte||
|---------|-----|-----|---|
|**general**|
||serveraddress|String| Optional der Domain Name des Servers falls nicht die IP Addresse verwebndet werden soll|
||serverport|1024 - 65536| Portnummer des Servers, Standard ist 8081
||servermode| *0/1*| *1* Öffne Port für alle Netzwerkadressen, *0* nur für 127.0.0.1 (Loopback)
||default_player|Player ID|Wird notrmalerweise automatisch gesetzt, falls Chromecast vwrwendet wird muß hier "**cc**" eingetragen werden|
|**execenv**|
||chromeCastFriendlyName|String|"friendly" Chromecast Name, mit dem der Chromecast identifiziert wird|
||chromeCastDisplayName|String|optionaler Chromecast Anzeigenname der in der Webansicht verwendet wird. Falls nicht gesetzt wird der "friendly"2 Name benutzt|
|**security**||||
||ssl_enabled| *true/false* |Aktiviert SSL support im Server, die Webseite kann nur mit HTTPS angesprochen werden|
||ssl_cert|String|SSL Zertifikatsdatei welche in der SSL Verbindung genutzt wird|
||ssl_key|String|SSL Schlüsseldatei welche in der SSL Verbindung genutzt wird|
|**develop**||||
||enable_debug_mode| *true/false* |Schaltet erweiterte Log Ausgaben des Flask Servers ein, u.a. alle HTTP Request/Response|
||enable_swagger_ui| *true/false* |Schaltet die [Swagger UI](https://swagger.io/tools/swagger-ui/) ein zur direkten Interaktion mit dem Server ohne Frontend. Die UI kann dann unter '*\<IPADRESSE>:8081/www/ui*' direkt im Webbrowser aufgerufen werden.|
|playerx|||Enthält Player spezifische Einstellungen die über die Webseite gesetzt werden (Eine sektion für jeden Player)|
<br>

---

<details>
<summary>Beispiel Server.ini Datei</Summary>
<p>


>```
>[general]
>; set server Port, default is 8081
>serverport = 8089
>
>; Set server listening mode:
>;     1 : listens on all external interfaces (default)
>;     0 : listen only on loopback interface
>;servermode = 1
>
>; set loglevel: DEBUG, WARNING, ERROR, default is ERROR
>loglevel = DEBUG
>
>; set default player normally set by Web Interface, for chromecast use cc
>default_player = cc
>
>[execenv]
>; Chromecast configuration
>; set the "friendly" name, which indentifies the Chromecast device in the local network
>chromeCastFriendlyName = "[LG] webOS TV OLED77C27LA"
>
>; optional: set the display name fpr the web interface
>chromeCastDisplayName = "Fernseher"
>
>[security]
>; enable SSL support on the server, default = false
>;ssl_enabled = true
>
>; ssl certificate to be used
>; if no certificate is specified and SSL is activated an 'adhoc' certificate is used
>ssl_cert = data/.ssh/cert.pem
>ssl_key  = "data/.ssh/key.pem"
>
>[develop]
>enable_debug_mode = true
>enable_swagger_ui = false
>```

</p>
</details>

---

<br>


## Interaktion mit Mediatheken ##

Das Web Frontend benutzt die (interne) API von [MediathekViewWeb]( https://mediathekviewweb.de/) um die Information für die Filmliste abzuholen. Es bildet damit eine alternative Web UI für den Webdienst.

Zusätzlich wird für die ARD, ZDF, 3SAT und ARTE Mediatheken weitere Film Information, wie Bild, Verfügbarkeitsdatum, direkt aus den Mediatheken geholt, wobei auch hier die internen APIs der Webseiten benutzt werden.

<br>

## Web Frontend Konfiguration ##

Einige zentrale Konfigurationsparameter für das Web Frontend sind in der Datei 'src\www\config\config.js' definiert und können bei Bedarf auf dem Server angepasst werden. Für eine Erläuterung siehe Kommentare in der Datei.

<br>

## Entwicklungsumgebung ##

Für Entwicklungs- und Testzwecke kann 'MyMediathek' unter Windows/Linux auch direkt aus den Entwicklungssourcen gestartet werden.


### Linux ###
- Vorraussetzung ist das 'python3', 'pip3' und 'npm' auf dem Rechner installiert sind
  (Empfohlen ist node/npm mit nvm zu verwalten, siehe Siehe https://www.tecmint.com/nvm-install-multiple-nodejs-versions-in-linux/)

- installation von pylint
  >sudo apt install pylint

- globale Installation der 'grunt-cli'
  >npm install -g grunt-cli
- Das git Repository klonen oder das Source Archiv herunterladen
- Im Basisverzeichnis die benötigten Abhängigkeiten installieren:
  >npm install
- Erster Start zum Erstellen der Umgebung:
  >npm start
- Start von 'MyMediathek':
  >npm start

- Erstellen der Installationspakete
  >grunt

- Anzeige der verfügbaren 'grunt' tasks
  > grunt -h


### Windows ###

- Vorraussetzung ist das 'python3', 'pip3' und 'npm' auf dem Rechner installiert sind
- installation von pylint
  >pip install pylint
- globale Installation der 'grunt-cli'
  >npm install -g grunt-cli
- Das git Repository klonen oder das Source Archiv herunterladen
- Im Basisverzeichnis die benötigten Abhängigkeiten installieren:
  >npm install
- Erster Start zum Erstellen der Umgebung:
  >npm start
- Start von 'MyMediathek':
  >npm start

- Erstellen der Installationspakete
  >grunt

- Anzeige der verfügbaren 'grunt' tasks
  > grunt -h


### Verwaltung von node.js mit nvm ###

Siehe https://www.tecmint.com/nvm-install-multiple-nodejs-versions-in-linux/

<br>

## Icons ##

Das Projekt verwendet Icons, die dankenswerter Weise kostenlos von Ihren jeweiligen Autoren auf [freeicons.io](https://freeicons.io) zur Verfügung gestellt wurden:

- [mithun](https://freeicons.io/profile/714): download-cloud.svg, gear.svg
- [visuallanguage](https://freeicons.io/profile/3335): delete.svg
- [mithun](https://freeicons.io/profile/714): play.svg, plus.svg
- [Muhammad Haq](https://freeicons.io/profile/823): wait.svg
- [1273358166187522](https://freeicons.io/profile/3117):  download.svg,  menu.svg
