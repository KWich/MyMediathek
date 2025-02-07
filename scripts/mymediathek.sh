#!/usr/bin/env bash
#
# (c) 2022-2023 Klaus Wich
#
# Control program installation
#
# SPDX-FileCopyrightText: 2024 Klaus Wich <software@awasna.de>
# SPDX-License-Identifier: EUPL-1.2

clear

cVERSION="1.0.3"

echo
echo "=== MyMediathek ${cVERSION} ==="
echo

readonly defaultTitle="MyMediathek"
readonly defaultscript="mymediathek"

update() {
  if [[ -f ${1} ]]; then
    echo " $defaultTitle aus dem Archiv >${1}< aktualisieren:"
    mydir=$(pwd)
    installDir=$(mktemp -d -p "$mydir")
    echo -n " * Inhalt des Archives in das temporäre Verzeichnis >$installDir< extrahieren ... "
    tar xfz "${1}" -C "$installDir"
    echo "done"

    if [ -w "$myInstallPath" ]; then
      echo " * Installationsverzeichnis ${myInstallPath} ist schreibbar: Ok"
    else
      sudo chmod a+w "$myInstallPath";
      echo " * Installationsverzeichnis ${myInstallPath} wurde schreibbar gemacht"
    fi
    echo -n " * Server Dateien nach $myInstallPath kopieren ..."
    echo
    sudo cp -r "$installDir"/server/. "$myInstallPath"/server
    sudo cp -r "$installDir"/scripts/. "$myInstallPath"/scripts
    sudo chmod +x "$myInstallPath"/scripts/*.sh
    sudo rm "$myInstallPath"/start.sh
    sudo mv "$myInstallPath"/scripts/start.sh "$myInstallPath"
    sudo chmod a+x "$myInstallPath"/start.sh
    echo "    Fertig"

    echo -n " * Zusätzliche Update Aufgaben durchführen: "
    if [[ -f "${installDir}/scripts/updateadditionaltask.sh" ]]; then
      source ${installDir}/scripts/updateadditionaltask.sh
    else
      echo " keine konfiguriert"
    fi

    echo -n " * Dateien dem Benutzer ${myUserName} zuweisen ..."
    sudo chown -R "${myUser}":"${myUser}" "$myInstallPath"
    echo "Fertig"

    echo -n " * temporäres Verzeichnis >$installDir< löschen ... "
    rm -r "$installDir"
    echo "Fertig"
    echo
    echo " Bitte den Service neu starten"
    echo
  else
    echo " Fehler bei Aktualisierung: Archiv '${1}' nicht gefunden => Abbruch"
  fi
}

serviceStatus() {
  echo " - Installationsverzeichnis     : $myInstallPath"
  echo " - Benutzer                     : $myUser"

  # ini file:
  serverIniFile="${myInstallPath}/data/server.ini"
  # get port number:
  if [[ -f "${serverIniFile}" ]]; then
    echo " - Ini File                     : $serverIniFile"
    portstring=$(grep "serverport" "${serverIniFile}")
    portnumber="${portstring:11}"
  else
    echo " - Ini File                     : nicht vorhanden"
    portnumber=8081
  fi

  # get service or interaktive
  serviceFiles=$(find "$myInstallPath"/scripts/ -maxdepth 1 -type f -name "*.service")
  if [ -z "$serviceFiles" ]; then
    echo " - System Service               : nicht konfiguriert"
  else
    if [[ ${#serviceFiles[@]} -gt 0 ]]; then
      if [[ ${#serviceFiles[@]} -gt 1 ]]; then
        echo " * ${#serviceFiles[@]} Service gefunden:"
        prefix=" -"
      else
        prefix='-'
      fi

      for item in "${serviceFiles[@]}"; do
        filename=$(basename -- "$item")
        filename="${filename%.*}"
        state=$(systemctl is-active "${filename}")
        printf " %s Service %-20s : %s\n" "${prefix}" "'${filename}'" "${state}"
      done
    else
      echo " - System Service               : nicht konfiguriert"
    fi
  fi

  ip4addr=$(hostname -I| cut -d ' ' -f1)
  echo " - Server Addresse              : ${ip4addr}:${portnumber}"

  procno=`ps -ef | grep ${myInstallPath}/start.sh -m1 | grep -v grep | tr -s ' '  | cut -d  ' ' -f2`
  if [[ ! -z "${procno}" ]]; then
    echo
    echo " - ${defaultTitle} Process          : aktiv im Vordergrund, stop mit 'mymediathek stop'"
  fi
}

startService() {
  serviceFiles=$(find "$myInstallPath"/scripts/ -maxdepth 1 -type f -name "*.service")
  if [ -z "$serviceFiles" ]; then
    echo " - Kein Service für $defaultTitle eingerichtet."
  else
    if [[ ${#serviceFiles[@]} -gt 0 ]]; then
      for item in "${serviceFiles[@]}"; do
        filename=$(basename -- "$item")
        printf " * Starte '%s' ... " "${filename}"
        ERROR=$(sudo systemctl start "${filename}" 2>&1 > /dev/null)
        if [[ -n $ERROR ]]; then
          printf "\n\n Start des Services ist fehlgeschlagen!!
                \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n" "$ERROR"
          exit 2
        fi
        state=$(systemctl is-active "$filename")
        printf " : %s\n" "$state"
      done
    else
      echo " * keine Services eingerichtet"
    fi
  fi
}

stopService() {
  serviceFiles=$(find "$myInstallPath"/scripts/ -maxdepth 1 -type f -name "*.service")
  if [ -z "$serviceFiles" ]; then
    echo " - Kein Service für $defaultTitle eingerichtet."
  else
    if [[ ${#serviceFiles[@]} -gt 0 ]]; then
      for item in "${serviceFiles[@]}"; do
        filename=$(basename -- "$item")
        printf " * Stoppe '%s' ... " "$filename"
        sudo systemctl stop "$filename"
        state=$(systemctl is-active "$filename")
        printf " : %s\n" "$state"
      done
    else
      echo " * keine Services eingerichtet"
    fi
  fi
}

restartService() {
  serviceFiles=$(find "$myInstallPath"/scripts/ -maxdepth 1 -type f -name "*.service")
  if [ -z "$serviceFiles" ]; then
    echo " - Kein Service für $defaultTitle eingerichtet."
  else
    if [[ ${#serviceFiles[@]} -gt 0 ]]; then
      for item in "${serviceFiles[@]}"; do
        filename=$(basename -- "$item")
        printf " * Stoppe '%s' ... " "$filename"
        sudo systemctl stop "$filename"
        state=$(systemctl is-active "$filename")
        printf " : %s\n" "$state"
      done
      for item in "${serviceFiles[@]}"; do
        filename=$(basename -- "$item")
        printf " * Starte '%s' ... " "${filename}"
        ERROR=$(sudo systemctl start "${filename}" 2>&1 > /dev/null)
        if [[ -n $ERROR ]]; then
          printf "\n\n Start des Services ist fehlgeschlagen!!
                \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n" "$ERROR"
          exit 2
        fi
        state=$(systemctl is-active "$filename")
        printf " : %s\n" "$state"
      done
    else
      echo " * keine Services eingerichtet"
    fi
  fi
}

serviceLog() {
  if [ -n "$1" ] && [ "$1" -eq "$1" ] 2>/dev/null; then
    count="$1"
  else
    count=50
  fi
  serviceFiles=$(find "${myInstallPath}"/scripts/ -maxdepth 1 -type f -name "*.service")
  if [ -z "$serviceFiles" ]; then
    echo " - Kein Service für $defaultTitle eingerichtet."
  else
    if [[ ${#serviceFiles[@]} -gt 0 ]]; then
      for item in "${serviceFiles[@]}"; do
        filename=$(basename -- "$item")
        printf " * Letzten %d Einträge für '%s' anzeigen:\n" "$count" "$filename"
        sudo  journalctl -u "$filename" -n "$count"
      done
    else
      echo " * keine Services eingerichtet"
    fi
  fi
}


execute() {
  sudo -u "$myUser" "$myInstallPath"/start.sh &
}


stop() {
  procno=`ps -ef | grep ${myInstallPath}/start.sh -m1 | grep -v grep | tr -s ' '  | cut -d  ' ' -f2`
  if [[ ! -z "${procno}" ]]; then
    sudo kill -9 ${procno}
    echo "${defaultTitle} wurde gestopped"
  else
    echo "${defaultTitle} ist nicht im Vordergrund aktiv"
  fi
}


helpFunc() {
  echo "Benutzung: $defaultscript <command>

   run                  : $defaultTitle starten
   stop                 : $defaultTitle stoppen

   status, -s           : aktuellen Status anzeigen
   help, -h             : diese Hilfe anzeigen

  Installation:
   checkversion         : nach neuer Version suchen
   update <archive>     : $defaultTitle aus Archiv aktualisieren
   uninstall            : $defaultTitle deinstallieren

   searchCC             : nach Chromecast Geräten im lokalen Netzwerk suchen

  Hintergrunddienst :
   startService         : System Service (neu)starten
   stopService          : System Service stoppen
   restartService       : System Service neu starten
   serviceLog, -l [n]   : Letzten n Einträge der Service Log Ausgabe anzeigen, default für n = 50
   installService       : $defaultTitle als System Service einrichten
   removeService        : $defaultTitle System Service entfernen
";
exit 0
}


searchCC() {
  sudo -u "$myUser" "$myInstallPath"/scripts/sucheChromecasts.sh
}


checkversion() {
  cGITHUB=https://github.com/KWich/MyMediathek
  cPACKAGEFILE=https://raw.githubusercontent.com/KWich/MyMediathek/refs/heads/master/package.json

  printf "  Suche nach neuer Version:\n\n"
  packagefile=$(wget -qO- ${cPACKAGEFILE})
  if [[ $packagefile =~ "\"version\":" ]]; then
    v=$(echo ${packagefile} | cut -d , -f 2)
    v1=${v/\"version\":/}
    v2=${v1//\"/}
    version=${v2// /}
    if [[ $version > ${cVERSION} ]]; then
      printf "  Version ${version} verfügbar in GitHub ist neuer als die eigene Version ${cVERSION}\n\n   => Bitte aktualiseren\n\n"
    else
      printf "  Keine neuere Version verfügbar in GitHub\n\n  - eigene Version ${cVERSION}\n  - GitHub version ${version}\n\n"
    fi
  else
    printf "   Konnte keine Remote Version finden\n"
  fi
  printf "  (Github URL: ${cGITHUB})\n"
}


# ====== MAIN ======
if [[ $# = 0 ]]; then
  helpFunc
fi

myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)
if [ "$EUID" -ne 0 ]; then
  if [[ ! ${myUserGroups} =~ "sudo" ]]; then
    printf "   Hinweis:\n   Es konnte nicht festgestellt werden ob der Benutzer '%s' 'sudo' Rechte hat.\n   Ohne sie kann es zu Fehlern beim Ausführen kommen\n\n" "$myUserName"
  fi
fi

# get environment
if [[ -L ${BASH_SOURCE[0]} ]]; then
  script=$(readlink "${BASH_SOURCE[0]}")
else
  script="${BASH_SOURCE[0]}"
fi
scriptDir=$(cd "$(dirname "${script}")" &> /dev/null && pwd)
myInstallPath="$(dirname "$scriptDir")"
myUser=$(stat -c "%U" "$script")

case "${1}" in
  "run"                         ) execute;;
  "stop"                        ) stop;;
  "startService"                ) startService;;
  "stopService"                 ) stopService;;
  "restartService"              ) restartService;;
  "uninstall"                   ) "$scriptDir"/uninstall.sh;;
  "checkversion"                ) checkversion;;
  "update"                      ) update "${2}";;
  "installService"              ) "$scriptDir"/installService.sh;;
  "removeService"               ) "$scriptDir"/removeService.sh;;
  "searchCC"                    ) searchCC;;
  "-s" | "status"               ) serviceStatus;;
  "-l" | "serviceLog"           ) serviceLog "${2}";;
  "-h" | *                      ) helpFunc;;
esac
echo
