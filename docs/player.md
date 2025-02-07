## Verwaltung ##

<br>

### <a id="playerconfig"></a>Player Konfiguration ###

MyMediathek unterstützt VLC und KODI als externe Player, wenn diese vom *Webserver* aus über HTTP erreichbar sind. Damit ist es zum Beispiel möglich Filme über den Fernseher wiederzugeben, wenn KODI an diesen angeschlossen ist.

Ab Version 1.0 wird auch das Chromecast Protokoll unterstüzt. Damit können Filme direkt auf einen Chromecast fähigen Fernseher wiedergegeben werden (z.B. LG mit WebOS 24).

Ein VLC oder KODI Player wird im Verwaltungsmenü eingerichtet, durch Anklicken des plus Zeichens in der Sektion 'Konfigurierte Player' öffnet sich der Konfigurationsdialog:

  <img src="docs/images/PlayerKonfiguration.png" alt="drawing" width="400"/>

- Der Name kann frei vergeben werden und dient zur Anzeige im Auswahlmenü.
- Falls keine Benutzerkennung und Passwort benötigt werden kann das Feld freibleiben.
- Standardplayer bedeutet, dass dieser Player voreingestellt wird, wenn die Webseite neu geladen wird.

Es sollte vor dem Abspeichern auf jeden Fall mit dem Test Button geprüft werden, ob der Player angesprochen werden kann.

Damit MyMediathek den Player ansprechen kann, muss dieser eine externe Steuerung über HTTP zulassen:

#### **KODI Steuerung einrichten** ####

- Im KODI muss unter 'Einstellungen'-'Dienste' die Steuerung über HTTP erlaubt werden:

  <img src="docs/images/kodikonfiguration.png" alt="drawing" width="500"/>

- In demselben Menü kann auch der Benutzername, Passwort und Port eingestellt werden.

#### **VLC Steuerung einrichten** ####
- Im VLC muss in den erweiterten Einstellungen ('Werkzeuge'-'Einstellungen', hier 'Einstellungen anzeigen': alle auswählen) das Web Interface aktiviert werden:

  <img src="docs/images/VLCMainInterface.png" alt="drawing" width="400"/>

  (siehe auch [VLC Wiki](https://wiki.videolan.org/Documentation:Modules/http_intf/#VLC_2.0.0_and_later))

- Im Menüpunkt 'Interface'-'Hauptinterfaces'-'LUA' sollte dann noch ein Passwort für den Zugriff festgelegt werden.
- Der Standard Port für VLC ist 8080, er kann in den erweiterten Einstellungen über den Menüpunkt 'Eingang/Codecs' geändert werden (Nach unten scrollen bis die Netzwerkeinstellungen sichtbar werden und den 'HTTP Server Port' anpassen).


#### **Chromecast einrichten** ####
Ein Chromecastgerät wird über die Konfigurationsdatei eingerichtet, siehe [Verwaltung und erweiterte Konfiguration > Player Konfiguration](../docs/config.md#chromecast) für Details.


<br><br>

- [Firefox Add-On](docs/addon.md)

