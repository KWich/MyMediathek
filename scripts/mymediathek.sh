#!/usr/bin/env bash
# MyMediathek Vx.x
# (c) 2022-2023 Klaus Wich
#
# Control MyMediathek installation
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

clear
echo
echo "=== MyMediathek Vx.x ==="
echo

update() {
  if [[ -f ${1} ]]; then
    echo " MyMediathek aus dem Archiv >${1}< aktualisieren:"
    mydir=`pwd`
    installDir=`mktemp -d -p $mydir`
    echo -n " * Inhalt des Archives in das temporäre Verzeichnis >$installDir< extrahieren ... "
    tar xfz ${1} -C $installDir
    echo "done"

    if [ -w "$myInstallPath" ]; then
      echo " * Installationsverzeichnisy $myInstallPath ist schreibbar: Ok"
    else
      sudo chmod a+w $myInstallPath;
      echo " * Installationsverzeichnis $myInstallPath wurde schreibbar gemacht"
    fi
    echo " * Server Dateien nach $myInstallPath kopieren ..."
    sudo cp -r $installDir/server/. $myInstallPath/server
    sudo cp -r $installDir/scripts/. $myInstallPath/scripts
    sudo chmod +x $myInstallPath/scripts/*.sh
    sudo rm $myInstallPath/start.sh
    sudo mv $myInstallPath/scripts/start.sh $myInstallPath
    sudo chmod a+x $myInstallPath/start.sh
    echo " Fertig"

    echo -n " * Dateien dem Benutzer ${myServiceUser} zuweisen ..."
    sudo chown -R ${myUser}:${myUser} $myInstallPath
    echo " Fertig"

    echo -n " * temporäres Verzeichnis >$installDir< löschen ... "
    rm -r $installDir
    echo " Fertig"
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
  serviceFiles=(`find ${myInstallPath}/scripts/ -maxdepth 1 -type f -name *.service`)
  if [[ ${#serviceFiles[@]} > 0 ]]; then
    if [[ ${#serviceFiles[@]} > 1 ]]; then
      echo " * ${#serviceFiles[@]} Service gefunden:"
      prefix=" -"
    else
      prefix='-'
    fi

    for item in "${serviceFiles[@]}"; do
      filename=$(basename -- "$item")
      filename="${filename%.*}"
      state=`systemctl is-active ${filename}`
      printf " %s Service %-20s : ${state}\n" ${prefix} ">${filename}<"
    done
  else
    echo " - myMediathek ist für interaktiven Modus konfiguriert"
  fi
}

startService() {
  serviceFiles=(`find ${myInstallPath}/scripts/ -maxdepth 1 -type f -name *.service`)
  if [[ ${#serviceFiles[@]} > 0 ]]; then
    for item in "${serviceFiles[@]}"; do
      filename=$(basename -- "$item")
      printf " * Starte '%s' ... " ${filename}
      ERROR=$(systemctl start ${filename} 2>&1 > /dev/null)
      if [[ ! -z $ERROR ]]; then
        printf "\n\n Start des Services ist fehlgeschlagen!!
              \nFehlerdetails:\n>>>>>>>>>>>>>>\n${ERROR}\n<<<<<<<<<<<<\n\n"
        exit 2
      fi
      state=`systemctl is-active ${filename}`
      printf " : ${state}\n" 
    done
  else
    echo " * keine Services eingerichtet"
  fi
}

stopService() {
  serviceFiles=(`find ${myInstallPath}/scripts/ -maxdepth 1 -type f -name *.service`)
  if [[ ${#serviceFiles[@]} > 0 ]]; then
    for item in "${serviceFiles[@]}"; do
      filename=$(basename -- "$item")
      printf " * Stoppe '%s' ... " ${filename}
      sudo systemctl stop ${filename}
      state=`systemctl is-active ${filename}`
      printf " : ${state}\n" 
    done
  else
    echo " * keine Services eingerichtet"
  fi
}

serviceLog() {
  serviceFiles=(`find ${myInstallPath}/scripts/ -maxdepth 1 -type f -name *.service`)
  if [[ ${#serviceFiles[@]} > 0 ]]; then
    for item in "${serviceFiles[@]}"; do
      filename=$(basename -- "$item")
      printf " * Letzte 100 Einträge für '%s':" ${filename}
      sudo  journalctl -u ${filename} -n 100
    done
  else
    echo " * keine Services eingerichtet"
  fi
}

execute(){
  sudo -u $myUser $myInstallPath/start.sh
}

helpFunc() {
  echo "Benutzung: mymediathek <command>

   run                  : im Vordergrund starten
   status, -s           : aktuellen Status anzeigen
   help, -h             : diese Hilfe anzeigen

  Software install:
   update <archive>     : MyMediathek mit <archive> aktualieren
   uninstall            : MyMediathek deinstallieren

  Service related:
   startService         : Service (neu) starten
   stopService          : Service stoppen
   serviceLog, -l       : Log Ausgabe anzeigen (max 100 Einträge)
   installService       : myMediathek als system service einrichten
   removeService        : myMediathek System Service entfernen
";
exit 0
}


# ====== MAIN ======
if [[ $# = 0 ]]; then
  helpFunc
fi

myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)
if [ "$EUID" -ne 0 ]; then
  if [[ ! ${myUserGroups} =~ "sudo" ]]; then
    printf "   Hinweis:\nEs konnte nicht festgestellt werden ob der Benutzer '${myUserName}' 'sudo' Rechte hat.\n   Ohne sie kann es zu Fehlern beim Ausführen kommen\n\n"
    #while true; do
    #  read -n1 -r -p "   Soll es trotzdem versucht werden (j/n) ?" yn
    #  case $yn in
    #      [YyJj]* ) echo; break;;
    #      [Nn]* ) echo; echo; exit 1;;
    #      * ) echo "   Bitte ja oder nein angeben.";;
    #  esac
    #done
  fi
fi

# get environment
if [[ -L ${BASH_SOURCE[0]} ]]; then
  script=`readlink ${BASH_SOURCE[0]}`
else
  script=${BASH_SOURCE[0]}
fi
scriptDir=$(cd "$(dirname "${script}")" &> /dev/null && pwd)
myInstallPath="$(dirname "$scriptDir")"
myUser=`stat -c "%U" $script`
myGroup=`stat -c "%G" $script`

case "${1}" in
  "run"                         ) execute;;
  "startService"                ) startService;;
  "stopService"                 ) stopService;;
  "uninstall"                   ) ${scriptDir}/uninstall.sh;;
  "update"                      ) update "${2}";;
  "installService"              ) ${scriptDir}/installService.sh;;
  "removeService"               ) ${scriptDir}/removeService.sh;;
  "-s" | "status"               ) serviceStatus;;
  "-l" | "serviceLog"           ) serviceLog;;
  "-h" | *                      ) helpFunc;;
esac
echo
