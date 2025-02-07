# MyMediathek - Installation

[Übersicht](../README.MD) - Installation - [Bedienung](../docs/usage.md) - [Verwaltung und erweiterte Konfiguration](../docs/config.md) - [Webbrowser Add-On](../docs/addon.md) - [Technische Details und Entwicklung](../docs/develop.md)
***

<br>

MyMediathek wird am besten im lokalem Netz als Webservice auf einem Linux System (z.B. Raspberry Pi) installiert, kann aber auch als Python Anwendung auf dem Desktop gestartet werden, z.B. unter Windows.

Für die Installation werden fertige Archive auf [Github Releases](https://github.com/KWich/MyMediathek/releases) zusätzlich zum Source Code zur Verfügung gestellt:
- für Linux: [myMediathek-linux.tgz](https://github.com/KWich/MyMediathek/releases/latest/download/myMediathek-linux.tgz)
- für Windows: [myMediathek-win.zip](https://github.com/KWich/MyMediathek/releases/latest/download/myMediathek-win.zip)

<br>

## Linux ##
In einem Linux System kann MyMediathek entweder als Anwendung oder als 'systemd' Service laufen.

### Installation ###

1. Das bereitgestellte Archiv **myMediathek-linux.tgz** in ein temporären Verzeichnis kopieren und mit '**tar xf myMediathek-linux.tgz**' extrahieren.

2. Installationsskript mit '**chmod +x install.sh**' ausführbar machen.

3. Installation mit '**./install.sh**' starten und den Anweisungen folgen.

---
<details>
<summary>Beispiel: Installation auf Debian</Summary>
<p>

>```
>=== Installation von MyMediathek 1.0.3 (07/02/2025)) ===
>
> Schritt: Benutzerrechte prüfen
>
> * prüfe 'sudo' Rechte für Benutzer user ...  Ok
>
> Schritt: Einstellungen erfragen
>
> => Installationsverzeichnis eingeben [/opt/mymediathek]:
> => Server Portnummer angeben [8081]:
> => Benutzername unter dem die Anwendung laufen soll angeben [mmservice]: user
>
> * Installationsverzeichnis : /opt/mymediathek
> * Server Portnummer        : 8081
> * Benutzername             : user
>
> => Sollen diese Werte benutzt werden (j/n) ? j
>
> Schritt: Voraussetzungen überprüfen
>
> * Server Port 8081 ist verfügbar : Ok
> * Paket Manager 'apt' gefunden
> * Prüfe ob Paket python3 installiert ist: ,Ok
> * Prüfe ob Paket python3-pip installiert ist: ,Ok
> * Prüfe ob Paket python3-venv installiert ist: ,Ok
> * Prüfe ob Python3 vorhanden ist ...  Ok
> * Prüfe ob 'pip3' vorhanden ist ...  Ok
> * Installationsverzeichnis /opt/mymediathek wurde angelegt: Ok
> * Installationsverzeichnis /opt/mymediathek wurde schreibbar gemacht
> * Benutzer user ist angelegt: Ok
> * Benutzer user gehört zu der Gruppe user.
>
> Schritt: Python Umgebung anlegen
> * Aktuelles Verzeichnis ist Installationsverzeichnis /opt/mymediathek: Ok
> * Python Umgebung wird angelegt ... Fertig
> * Python Umgebung wird aktiviert : Ok
> * Notwendige Python Komponenten werden installiert ... Fertig
> * Python Umgebung wird deaktiviert: Ok
>
> Schritt: Server installieren
> * kopiere Serverdateinen nach /opt/mymediathek ... Fertig
> * Dateien dem Benutzer user und der Gruppe user zuweisen ... Fertig
> * Symbolischen Link zum Kontroll Script anlegen ... Fertig
>
> * Start des Servers im Vordergrund mit: mymediathek run
> * Anzeige aller Kommando Optionen mit:  mymediathek
>
>.. INSTALLATION BEENDET```

</p>
</details>

---

<br>
Nach der Installation steht der Befehl '**mymediathek**' aud der Kommandozeile zur Verfügung mit dem das Programm kontrolliert wird:
<br><br>

- '**mymediathek run**' führt das Programm aus

- '**mymediathek**' zeigt alle verfügbaren Optionen an:

---
<details>
<summary>mymediathek Optionen</Summary>
<p>

>```
>=== MyMediathek 1.0.3 ===
>
>Benutzung: mymediathek <command>
>
>   run                  : MyMediathek starten
>   stop                 : MyMediathek stoppen
>
>   status, -s           : aktuellen Status anzeigen
>   help, -h             : diese Hilfe anzeigen
>
>  Installation:
>   checkversion         : nach neuer Version suchen
>   update <archive>     : MyMediathek aus Archiv aktualisieren
>   uninstall            : MyMediathek deinstallieren
>
>   searchCC             : nach Chromecast Geräten im lokalen Netzwerk suchen
>
>  Hintergrunddienst :
>   startService         : System Service (neu)starten
>   stopService          : System Service stoppen
>   restartService       : System Service neu starten
>   serviceLog, -l [n]   : Letzten n Einträge der Service Log Ausgabe anzeigen, default für n = 50
>   installService       : MyMediathek als System Service einrichten
>   removeService        : MyMediathek System Service entfernen
>```

</p>
</details>

---


<br>

#### Hinweise: ####
- Das Installationsskript verwendet **'sudo'**, der Benutzer muss über die entsprechenden Rechte verfügen.
- Das Installationsskript unterstützt 'apt' bzw. 'zypper' als Paketmanager (Debian oder openSuse basierte Distributionen. Falls ein anderer Paket Manager benutzt wird, müssen die notwendigen Python Pakete (python3, pip3, python-venv und python-dev bzw. python-devel) zuvor von Hand installiert werden. (Es ist nicht garantiert, dass das Installationsskript auf diesen Systemen reibungslos durchläuft, evtl. muß händisch nachkonfiguriert werden). Ansonsten die manuelle Installation wie unter [Alternative Linux Installation](#altLinux) beschreiben wurde verwenden.
- Falls eine Firewall verwendet wird, muss in dieser der verwendete Port geöffnet werden, damit der Server von außerhalb erreichbar ist (z.B. openSuse).
- Bei manchen Distributionen (z.B. openSuse) kann es Schwierigkeiten geben, wenn ein eigener Benutzername für den  Server verwendet wird, da ein passwortloser Systemaccount nicht erstellt werden kann, bzw. beim Aufruf trotzdem ein Passwort anfordert. Hier für die Installation einen bestehenden User verwenden. Nachträglich kann der Benutzer mit folgendem Kommando noch geändert werden:
>>  `sudo chown -R ich:users /opt/mymediathek`


#### Servicekonfiguration

Ein Systemservice der myMediathek automatisch started und im Hintergrund am laufen hält kann mit '**mymediathek installService**' installiert werden. Das Kommando '**mymediathek**' stellt weitere Optionen zur verfügung mit denen der Service kontrolliert werden und die Logdatei eingesehen werden kann.


#### Weitere Schritte

Nach der Erstinstallation können jetzt die Abspilegeräte wie Chreomcast, VLC oder Kodi eingerichtet werden, siehe [Verwaltung und erweiterte Konfiguration](../docs/config.md) für Details.

Falls notwendig können die Web Server Konfigurationseinstellungen wie port, adresse, ssl usw. können über die server.ini Datei angepasst werden, siehe [Technische Details und Entwicklung - Erweiterte Server Konfiguration ](../docs/develop.md#serverini) für Details.


### Update

Der Update einer bestehenden Installation wird mit den Optionen in mymediatek durchgeführt:

1.) Mit '**mymediathek checkversion**' kann nachgeschaut werden ob auf GitHub eine neue Version zur Verfügung steht.

2.) Nach dem manuellen Herunterladen des neuen tgz Archives kann der Update direkt mit dem Kommando '**mymediathek update \<archivename\>**' durchgeführt werden.

3.) Nach einem Neustart ist die neue Version verfügbar.

#### Update Hinweise: ####
- Die Updateprozedur geht von der Standardkonfiguration aus. Falls die Datenbasis sich nicht im Standardpfad befindet, kann sein das ein Update schiefgeht. In diesem Fall ist es besser den Server zu deinstallieren und neu zu installieren.

<br>

## Windows Installation ##
Damit MyMediathek auf Windows ausgeführt wird, muss 'python3' mit 'pip' installiert und im PATH verfügbar sein. Python für Windows ist entweder im Microsoft Store oder im Internet auf [python.org](https://www.python.org) verfügbar.

### Installieren: ###

1. Das bereitgestellte Archiv **myMediathek-win.zip** in ein temporäres Verzeichnis kopieren und in das gewünschte Zielverzeichnis extrahieren.

2. Start- und Installationsskript '**start.bat**' starten. Das Script prüft ob die Voraussetzungen gegeben sind und erstellt beim ersten Lauf die notwendige Python Umgebung. Wenn die Umgebung existiert wird der Server gestartet, und die Webseite kann im Browser aufgerufen werden:
<br><br>

---
<details>
<summary>Beispiel: Start Ausgabe</Summary>
<p>

>
>```
>Starte MyMediathek 0.9.1 (13/01/2023)
>
>- Python ist installiert
>- PIP ist installiert
>- Python Umgebung wird erstellt ...
>   ...fertig
>- Python Umgebung wird aktiviert
>- Python Module werden installiert ...
>   das dauert etwas!!
>- Python Module sind installiert
>- Server wird gestartet
>
>MyMediathek Server Version 0.9.1 (13/01/2023)
> * Starte config ...
>  NO Ini file provided, using defaults
>
> Player:
> * keine Player konfiguriert
>
> Einstellungen:
> * INI Datei         : None
> * Database Datei    : D:\MyMediathek\data\bookmarks.db
> * Basisverzeichnis  : D:\MyMediathek\src
> * Debugmodus        : inaktiv
>
>------------------------------------------------------
>Die Webseite kann jetzt im Browser unter der Adresse
>   http://192.168.10.26:8081 geöffnet werden.
>------------------------------------------------------
>```

</p>
</details>

---
<br>

### Hinweise: ###
- Bei der Erstinstallation wird immer der Port 8081 für den Webserver gesetzt. Er kann anschließend über die Server.ini Datei geändert werden (siehe "Erweiterte Installation und Konfiguration").
- Damit der Server von anderen Rechnern erreichbar ist muss eventuell der verwendete Port (Standard:8081) in der Windows Firewall freigegeben werden.
- Für eine ausführliche Ausgabe, z.B. zur Fehlersuche kann das Startskript mit der Option '-v' gestartet werden:

>```
>   start.bat -v
>```

<br>

## <a id="altLinux"></a>Alternative Linux Installation ##
Auf Systemen auf denen das '**./install.sh**' nicht funktioniert, kann mit folgendem Vorgehen der Server "von Hand" installiert werden:

### Voraussetzungen schaffen: ###
  Pakete 'python3', 'pip3', 'python3-dev' bzw. 'python3-develop' und 'python3-venv' installieren.

### Installation Server: ###

- Anlegen des Zielverzeichnisses z.B /opt/mymediathek mit
  >```sudo mkdir/opt/mymediathek```

- Verzeichnis für den aktuellen Benutzer schreibbar machen
  >`sudo chmod a+w /opt/mymediathek`

- Archiv in das Verzeichnis entpacken
  >`tar -xf myMediathek-0.9.3.tgz -C /opt/mediathek/`

- In das Verzeichnis wechseln
  > `cd /opt/mymediathek`

- Optional überprüfen ob python3 und pip3 installiert sind:
  > `python3 --version`
  >
  > `pip3 --version`

  Falls keine Versionen angezeigt werden, entsprechende Pakete installieren.

- Überprüfen ob das Python Virtual Environment installiert ist und falls notwendig installieren:
  > `sudo apt install python3-venv `
  (Debian Befehl gezeigt, für andere Distributionen entsprechend anpassen)

- Python Umgebung anlegen (erzeugt den Pfad /opt/mymediathek/.venv):
  > `python3 -m venv .venv`

- Python Umgebung aktiveren:
  > `source .venv/bin/activate`

- notwendige Python Komponenten installieren
  >  `pip3 install -r scripts/python.requirements`

  Hinweis: Falls hier Fehler auftreten muß eventuell noch das Paket 'python-dev' oder 'python-develop' nachinstalliert werden.

- Python Umgebung verlassen
  > `deactivate`

- Start Skript in das Basis Verzeichnis kopieren:
  > `cp scripts/start.sh .`

- Start Skript ausführbar machen:
  > `chmod +x start.sh`

- Der Server kann jetzt gestartet werden mit:
  > `start.sh`

<br>

### System Service anlegen (Systemd service): ###

- In das Skriptverzeichnis wechseln
  > `cd /opt/mymediathek/scripts`

- Skriptvorlage kopieren
  >`cp mymediathek.service-template mymediathek.service`

- Service Skript im Editor (hier 'nano' öffnen
  >`nano mymediathek.service`

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
  ExecStart=/opt/mymediathek/.venv/bin/python3 server/main.py
  Restart=on-failure

  [Install]
  WantedBy=multi-user.target
  ```

- Service Skript ins Systemverzeichnis verlinken (kann auch dahin kopiert werden)
  > `sudo ln -s /opt/bookmarkserver/scripts/mymediathek.service /etc/systemd/system/mymediathek.service`

- Service defintionen neu laden (optional):
  > `sudo systemctl daemon-reload`

- Service Starten mit:
  > `sudo systemctl start mymediathek.service`

- Service Aktivieren für Neustart mit:
  > `sudo systemctl enable bookmark.service`

<br>

### Kontrollskript ###

Der Befehl '**mymediathek**' wird mit folgendem Kommando verfügbar gemacht:
> `sudo ln -s /opt/bookmarkserver/scripts/mymediathek.sh /usr/bin/mymediathek`

