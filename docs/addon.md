# MyMediathek - Webbrowser Add-On

[Übersicht](../README.MD) - [Installation](../docs/install.md) - [Bedienung](../docs/usage.md) -[Verwaltung und erweiterte Konfiguration](../docs/config.md) - Webbrowser Add-On - [Technische Details und Entwicklung](../docs/develop.md)
***

Für FireFox und Google Chrome steht jeweils ein Add-on(s) "MyMediathek" zur Verfügung, mit dem die Beiträge von den Seiten der ARD, ZDF, 3SAT und ARTE Mediatheken direkt in die Merkliste übernommen oder mit dem Standardplayer abgespielt werden können.

Die Add-ons können direkt aus den entsprechenden Web Stores im Browser installiert werden:

- Firefox:<br>
Das Add-on steht auf der Mozilla Add-on Seite [https://addons.mozilla.org/de/firefox/](https://addons.mozilla.org/de/firefox/addon/mymediathek) unter dem Namen '[MyMediathek](https://addons.mozilla.org/de/firefox/addon/mymediathek)' zur Verfügung.

- Google Chrome:<br>
Das Add-on kann im "chrome web store" unter  [Home > Extensions > MyMediathek](https://chrome.google.com/webstore/detail/mymediathek/ddpljcidddmeigehfcdadcligkonkndk) heruntergeladen und installiert werden.

Die Links auf die Add-ons stehen auch auf der Konfigurationsseite von 'MyMediathek' zur Verfügung (siehe -> [Verwaltung und erweiterte Konfiguration > Erweiterungen](../docs/config.md#browser-addons).

>**Wichtig:**
>
>***Nach der Add-on Installation **muss** noch die Serveradresse von 'MyMediathek' im Add-on konfiguriert werden, damit die Funktionen zur Verfügung stehen***.
>

<br>

## Add-on Konfiguration ##

<br>

### Firefox: ###

Die Seite zur Verwaltung der Erweiterungen aufrufen, entweder über das Anwendungsmenü oder in der Adressleiste 'about:addons' eingeben.

- In der Seite zum Add-on gehen und die Verwaltung des Add-ons aufrufen: Im Punktemenü auf Verwalten gehen:

  <img src="images/Firefox2.png" alt="Firefox Erweiterungen" width="500"/>

- Unter 'Einstellungen' die Adresse des MyMediathek Servers eintragen:

  <img src="images/Firefox3.png" alt="Add-on Einstellungen" width="500"/>

  Und mit "Speichern" sichern.

  Anschließend kann mit dem Button "Teste Serververbindung" geprüft werden, ob der (richtige) Server erreicht werden kann.

<br>

### Google Chrome: ###

Die Seite zur Verwaltung der Erweiterungen aufrufen, entweder über das 'Einstellungsmenü -> Einstellungen -> Erweiterungen' oder in der Adressleiste 'chrome://extensions/' eingeben

- In der Seite zum Add-on gehen und die Details des Add-ons aufrufen:

  <img src="images/Chrome0.png" alt="Chrome Erweiterungen" width="400"/>

- Unter Details zu den Optionen gehen und öffnen

  <img src="images/Chrome1.png" alt="Chrome Erweiterungen" width="400"/>

- In den Optionen die Adresse des MyMediathek Servers eintragen und speichern:

  <img src="images/Chrome2.png" alt="drawing" width="400"/>

- Anschließend kann mit dem Button "Teste Serververbindung" geprüft werden, ob der (richtige) Server erreicht werden kann:

  <img src="images/Chrome3.png" alt="drawing" width="400"/>

  Wenn alles in Ordnung ist kann die Seite geschlossen werden:

  <img src="images/Chrome4.png" alt="drawing" width="400"/>


<br>

## Bedienung ##

Das Add-on fügt auf den Seiten der unterstützten Mediatheken Buttons und einen Kontext Menü Eintrag 'Filminformation anzeigen ...' hinzu mit dem die Details zu dem Beitrag in einem Seitenfenster angezeigt werden, und von wo aus der Beitrag entweder in der Merkliste gespeichert oder gleich im Standardplayer von 'MyMediathek' abgespielt werden kann.

### Buttons ###

  <img src="images/Firefox6.png" alt="drawing" width="450"/>

  ***Hinweise***:<br>
  - Es kann sein das ein Button nicht funktioniert, da der Filmbeitrag nicht identifziert wird, oder der Eintrag keinen Filmbeitrag beinhaltet. Dieses kann z.B. durch fehlerhafte Links und Markierungen in den Mediathekseiten passieren. Ind diesen Fällen nochmal mit dem Kontextmenü probieren.
  - In der Arte Mediathek erscheinen die Buttons nur wenn die Filmdetails beim Darüberfahren angezeigt werden.
  - In der 3SAT Mediathek werden keine Buttons unterstüzt.


### Kontexteintrag ###

  <img src="images/Firefox4.png" alt="drawing" width="250"/>

***Hinweise***:<br>
- *Der Kontextmenüeintrag wird mit der rechten Maustaste geöffnet.*
- *Der Kontextmenüeintrag wird den Links auf der Webseite hinzugefügt, nicht den Grafiken! Falls er bei einem Eintrag nicht sichtbar wird, ist entweder kein Link vorhanden oder dieser hat das falsche Format.*

Nach dem Anklicken erscheinen an der Seite die detaillierten Informationen zum gewählten Film:

  <img src="images/Firefox5.png" alt="drawing" width="600"/>

<br>

Mit den entsprechenden Buttons kann dann der Film entweder direkt auf dem Standardplayer (z.B. Fernseher) abgespielt werden oder in der Merkliste für später gespeichert werden.

***Hinweis***:

- *Die Buttons sind nur verfügbar wenn der 'MyMediathek' Server konfiguriert und erreichbar ist.

<br>

### Filmauswahl ###

Die Mediatheken stellen ihre Beiträge in mehreren Qualitätsstufen und teilweise in mehreren Sprachversionen zur Verfügung. Das Add-on selektiert automatisch die höchste Qualitätsversion und sofern vorhanden die deutsche Sprachversion. Spezielle Versionen wie Untertitel oder Audiobeschreibung werden nicht berücksichtigt.
