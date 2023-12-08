# MyMediathek - Technische Details und Entwicklung

[Übersicht](../README.MD) - [Installation](../docs/install.md) - [Bedienung](../docs/usage.md) -[Verwaltung und erweiterte Konfiguration](../docs/config.md) - [Webbrowser Add-On](../docs/addon.md) - Technische Details und Entwicklung
***

## Realisierung ##

Der Server ist eine Python [Flask](https://flask.palletsprojects.com/en/2.2.x/) Anwendung, erweitert mit [FLASK-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/en/3.0.x/)  mit SQL Lite als Datenbank. Das Interface zur Webseite ist RESTartig und mit [SWAGGER/OpenAPI](https://swagger.io/) definiert.

Die Webseite wurde mit HTML, CSS und JavaScript erstellt, ohne spezielle Frameworks.

Das im Projekt enthaltene 'package.json' und die darin enthaltene Node.js Konfiguration wird nur für den Package Build Prozess und als Steuerung für die Entwicklung verwendet, sind aber nicht relevant für die Funktion.

### Server ###

Die Anwendung benutzt den in 'Flask' integrierten WebServer, der eigentlich für Entwicklungszwecke gedacht ist, aber hier völlig ausreicht, solange nur einzelne Benutzer die App benutzen. Der Server beinhaltet **keinerlei** Sicherheit und sollte daher nicht im Internet verfügbar gemacht werden.

Falls mehr Leistung und Zuverlässigkeit benötigt wird, kann die Anwendung in einen regulären Web Server wie 'Apache' oder 'Nginx' integriert werden, entsprechende Information steht in der 'Flask' Dokumentation zur Verfügung. 

#### HTTPS ####
In der Standardkonfiguration benutzt der Server HTTP. Falls HTTPS gebraucht wird, kann und sollte 'MyMediathek' hinter einem Reverse Proxy Server wie 'Nginx' betrieben werden, welches erfolgreich getestet wurde. 

## Daten ##

Der Server legt zwei Dateien mit allen gespeicherten Daten an, die sich in der Standardkonfiguration im Unterverzeichnis './data' des Installation Verzeichnisses befinden:

- '*bookmarks.db*' : SQL Lite Datenbasis Datei mit allen gespeicherten Beitragsdaten.
- '*server.ini*' : Server Einstellungen, wie konfigurierte Player, Filter.

<br>

## Erweiterte Server Konfiguration ##
In der 'server.ini' können folgende Einstellungen geändert werden:
 ```
 [general]
 serverport = 8081
 servermode = 1

 [develop]
 enable_debug_mode = true
 enable_swagger_ui = false
 ````

|Einstellung|Werte||
|-----------|-----|---|
|serverport|1024 - 65536| Portnummer des Servers, Standard ist 8081
|servermode| *0/1*| *1* Öffne Port für alle Netzwerkadressen, *0* nur für 127.0.0.1 (Loopback)
|enable_debug_mode| *true/false* |Schaltet erweiterte Log Ausgaben des Flask Servers ein, u.a. alle HTTP Request/Response|
|enable_swagger_ui| *true/false* |Schaltet die [Swagger UI](https://swagger.io/tools/swagger-ui/) ein zur direkten Interaktion mit dem Server ohne Frontend. Die UI kann dann unter '*\<IPADRESSE>:8081/api/ui*' direkt im Webbrowser aufgerufen werden.|

<br>

## Interaktion mit Mediatheken ##

Das Web Frontend benutzt die (interne) API von [MediathekViewWeb]( https://mediathekviewweb.de/) um die Information für die Filmliste abzuholen. Es bildet damit eine alternative Web UI für den Webdienst.

Zusätzlich wird für die ARD, ZDF, 3SAT und ARTE Mediatheken weitere Film Information, wie Bild, Verfügbarkeitsdatum, direkt aus den Mediatheken geholt, wobei auch hier die internen APIs der Webseiten benutzt werden.

<br>

## Web Frontend Konfiguration ##

Einige zentrale Konfigurationsparameter für das Web Frontend sind in der Datei 'src\api\static\config\config.js' definiert und können bei Bedarf auf dem Server angepasst werden. Für eine Erläuterung siehe Kommentare in der Datei.

<br>

## Entwicklungsumgebung ##

Für Entwicklungs- und Testzwecke kann 'MyMediathek' unter Windows/Linux auch direkt aus den Entwicklungssourcen gestartet werden.

- Voraussetzung ist das 'python3', 'pip3' und 'npm' auf dem Rechner installiert sind
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


<br>

## Icons ##

Das Projekt verwendet Icons, die dankenswerter Weise kostenlos von Ihren jeweiligen Autoren auf [freeicons.io](https://freeicons.io) zur Verfügung gestellt wurden:

- [mithun](https://freeicons.io/profile/714): download-cloud.svg, gear.svg
- [visuallanguage](https://freeicons.io/profile/3335): delete.svg
- [mithun](https://freeicons.io/profile/714): play.svg, plus.svg
- [Muhammad Haq](https://freeicons.io/profile/823): wait.svg
- [1273358166187522](https://freeicons.io/profile/3117):  download.svg,  menu.svg
