# MyMediathek - Installation

[Übersicht](../README.MD) - Installation - [Bedienung](../docs/usage.md) -[Verwaltung und erweiterte Konfiguration](../docs/config.md) - [Firefox Add-On](../docs/addon.md) - [Technische Details und Entwicklung](../docs/develop.md)
***

<br>

MyMediathek wird am besten im lokalem Netz als Webservice auf einem Linux System (z.B. Raspberry Pi) installiert, kann aber auch als Python Anwendung auf dem Desktop gestartet werden, z.B. unter Windows.

Für die Installation werden fertige Archive auf [Github Releases](https://github.com/KWich/MyMediathek/releases) zusätzlich zum Source Code zur Verfügung gestellt:
- für Linux: [myMediathek-linux.tgz](https://github.com/KWich/MyMediathek/releases/latest/download/myMediathek-linux.tgz)
- für Windows: [myMediathek-win.zip](https://github.com/KWich/MyMediathek/releases/latest/download/myMediathek-win.zip)

<br>

## Linux Installation ##
In einem Linux System kann MyMediathek entweder als Anwendung oder als 'systemd' Service laufen. Zur Installation:

1. Das bereitgestellte Archiv **myMediathek-linux.tgz** in ein temporären Verzeichnis kopieren und mit '**tar xf myMediathek-linux.tgz**' extrahieren.

2. Installationsskript mit '**chmod +x install.sh**' ausführbar machen.

3. Installation mit '**./install.sh**' starten und den Anweisungen folgen. 

Nach der Installation steht der Befehl '**mymediathek**' zur Verfügung mit dem das Programm kontrolliert wird:
- '**mymediathek**' zeigt alle verfügbaren Optionen an.
- '**mymediathek run**' führt das Programm aus
- '**mymediathek installService**' installiert und startet MyMediathek als Systemservice.   

Hinweise: 
- Das Installationsskript verwendet **'sudo'**, der Benutzer muss über die entsprechenden Rechte verfügen.
- Das Installationsskript ist für Debian basierte Systeme mit 'apt' als Paket Manager. Falls ein anderer Paket Manager benutzt wird, müssen die notwendigen Python Pakete (python3, pip3, python-venv und evtl. python-devel) zuvor von Hand installiert werden. (Es ist nicht garantiert, dass das Installationsskript auf nicht Debian basierten Systemen reibungslos durchläuft, evtl. muß händisch nachkonfiguriert werden). Ansonsten die manuelle Installation wie unter [Alternative Linux Installation](#altLinux) beschreiben wurde

<br>

## Windows Installation ##
Damit MyMediathek auf Windows ausgeführt wird, muss 'python3' mit 'pip' installiert und im PATH verfügbar sein. Python für Windows ist entweder im Microsoft Store oder im Internet auf [python.org](https://www.python.org) verfügbar.

Zur Installation:

1. Das bereitgestellte Archiv **myMediathek-win.zip** in ein temporäres Verzeichnis kopieren. und in das gewünschte Zielverzeichnis extrahieren.

2. Start- und Installationsskript '**start.bat**' starten. Das Script prüft ob die Vorrausetzungen gegeben sind und erstellt beim ersten Lauf die notwendige Python Umgebung. Wenn die Umgebung existiert wird der Server gestartet, und die Webseite im Browser aufgerufen werden.

Hinweise:
- Bei der Erstinstallation wird immer der Port 8081 für den Webserver gesetzt. Er kann anschließend über die Server.ini Datei geändert werden (siehe "Erweiterte Installation und Konfiguration").

<br>

## <a id="altLinux"></a>Alternative Linux Installation ##
Auf Systemen auf denen das '**./install.sh**' nicht funktioniert, kann mit folgendem Vorgehen der Server "von Hand" installiert werden:

- Anlegen des Zielverzeichnisses z.B /opt/mymediathek mit
  >sudo mkdir/opt/mymediathek

- Verzeichnis für den aktuellen Benutzer schreibbar machen
  >sudo chmod a+w /opt/mymediathek

- Archiv in das Verzeichnis entpacken
  >tar -xf myMediathek-0.9.3.tgz -C /opt/mediathek/

- In das Verzeichnis wechseln
  > cd /opt/mymediathek

- Überprüfen ob python3 und pip3 installiert sind:
  > python3 --version
  
  > pip3 --version

  Falls keine Versionen angezeigt werden, entsprechende Pakete installieren. 

- Überprüfen ob das Python Virtual Environment installiert ist und falls notwendig installieren: 
  > sudo apt-get install python3-venv  
  (Debian Befehl gezeigt, für andere Distributionen entsprechend anpassen)
  
- Python Umgebung anlegen (erzeugt den Pfad /opt/mymediathek/env):
  > python3 -m venv env

- Python Umgebung aktiveren:
  > source env/bin/activate

- notwendige Python Komponenten installieren 
  >  pip3 install -r scripts/python.requirements
  
  Hinweis: Falls hier Fehler auftreten muß eventuell noch das Paket 'python-dev' oder 'python-develop' nachinstalliert werden.

- Python Umgebung verlassen
  > deactivate

- Start Skript in das Basis Verzeichnis kopieren:
  > cp scripts/start.sh .

- Start Skript ausführbar machen:
  >chmod +x start.sh

- Der Server kann jetzt gestartet werden mit:
  >start.sh

<br>

### System Service anlegen ###

- In das Skriptverzeichnis wechseln
  >cd /opt/mymediathek/scripts

- Skriptvorlage kopieren
  >cp mymediathek.service-template mymediathek.service

- Service Skript im Editor öffnen
  >z.B. nano mymediathek.service

  Im Service Skript jetzt die Werte für Verzeichnis, Benutzer, Benutzergruppe entsprechend den gewählten Einstellungen ändern, z.B. auf:
  ```
  [Unit]
  Description=My Mediathek Server
  After=network.target

  [Service]
  Type=idle
  User=mmservice
  Group=mmservice
  WorkingDirectory=/opt/mymediathek
  ExecStart=/opt/mymediathek/env/bin/python3 server/main.py
  Restart=on-failure

  [Install]
  WantedBy=multi-user.target
  ```

- Service Skript ins Systemverzeichnis verlinken (kann auch dahin kopiert werden)
  >sudo ln -s /opt/bookmarkserver/scripts/mymediathek.service /etc/systemd/system/mymediathek.service

- Service defintionen neu laden (optional):
  > sudo systemctl daemon-reload

- Service Starten mit:
  > sudo systemctl start mymediathek.service

- Service Aktivieren für Neustart mit:
  > sudo systemctl enable bookmark.service

<br>

### Kontrollskript ###

Der Befehl '**mymediathek**' wird mit folgendem Kommando verfügbar gemacht:
>sudo ln -s /opt/bookmarkserver/scripts/mymediathek.sh /usr/bin/mymediathek

