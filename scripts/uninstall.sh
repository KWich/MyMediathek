#!/usr/bin/env bash
#
# (c) 2022-2023 Klaus Wich
#
# Remove web server
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

readonly defaultscript="mymediathek"

clear
echo
echo "=== MyMediathek Vx.x Deinstallieren ==="
echo


saveDataDir() {
 datadir=$myInstallPath/data
 echo
 if [[ -d $datadir ]]; then
   target=~/mmdata
   echo " * copy '$datadir' to '$target' ..."
   mkdir -p "$target"
   cp -i "${datadir}"/* ${target} 
 else
  echo " * '$datadir' not found"
 fi
}

myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)

if [ "$EUID" -ne 0 ]; then
  if [[ ! ${myUserGroups} =~ "sudo" ]]; then
    printf "   Es konnte nicht festgestellt werden ob Benutzer '%s' 'sudo' Rechte hat.\n   Ohne sie kann es zu Fehlern beim Ausführen kommen\n\n" "${myUserName}"
    while true; do
      read -n1 -r -p "   Soll es trotzdem versucht werden (j/n) ?" yn
      case $yn in
          [YyJj]* ) echo; break;;
          [Nn]* ) echo; echo; exit 1;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
    echo
  fi
fi

while true; do
  read -n1 -r -p " Soll das Programm wirklich entfernt werden (j/n) ? " yn
  case $yn in
      [YyJj]* ) break;;
      [Nn]* ) echo; echo; exit;;
      * ) echo "   Bitte ja oder nein angeben.";;
  esac
done
echo
#echo  Step: Get path and user
scriptDir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
myInstallPath="$(dirname "$scriptDir")"
myUser=$(stat -c "%U" "$0")

removeUserGroup=0
if [[ "${myUser}" !=  "${myUserName}" ]]; then
  while true; do
    read -n1 -r -p " Soll auch der extra angelegte Benutzer '${myUser}' gelöscht werden (j/n) ? " yn
    case $yn in
      [YyJj]* )
        echo
        removeUserGroup=1
        break
        ;;
      [Nn]* )
        break
        ;;
      * ) echo "   Bitte ja oder nein angeben.";;
    esac
  done
  echo
fi


while true; do
  read -n1 -r -p " Soll das Datenverzeichnis gesichert werden (j/n) ? " yn
  case $yn in
    [YyJj]* )
      echo
      saveDataDir
      break
      ;;
    [Nn]* )
      break
      ;;
    * ) echo "   Bitte ja oder nein angeben.";;
  esac
done
echo

serviceFiles=$(find "${myInstallPath}"/scripts/ -maxdepth 1 -type f -name "*.service")
if [ -z "$serviceFiles" ]; then
  echo " * Kein Service für eingerichtet, weiter"
else
  if [[ ${#serviceFiles[@]} -gt 0 ]]; then
    k=0
    for item in ${#serviceFiles[@]}; do
      serviceName=$(basename -- "$item")
      sudo systemctl stop "${serviceName}" >/dev/null 2>&1
      sudo systemctl disable "${serviceName}" >/dev/null 2>&1
      printf " * Service %-20s deaktiviert\n" $((++k)) "${serviceName}"
    done
  else
    printf " * Kein Service konfiguriert, nichts zu tun\n"
  fi
fi

echo " * Kontollprogramm '$defaultscript' wird entfernt"
sudo rm "/usr/bin/$defaultscript"
echo " * lösche Verzeichnis ${myInstallPath}"
sudo rm -R "${myInstallPath}"

if [[ ${removeUserGroup} == 1 ]]; then
  echo " * Benutzer '${myUser}' wird gelöscht "
  sudo userdel "${myUser}"
fi

echo
echo .. FERTIG
echo

