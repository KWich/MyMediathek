#!/usr/bin/env bash
# MyMediathek Vx.x
# (c) 2022-2023 Klaus Wich
#
# Remove MyMediathek 
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

saveDataDir() {
 datadir=$myInstallPath/data
 echo
 if [[ -d $datadir ]]; then
   target=~/mmdata
   echo " * copy '$datadir' to '$target' ..."
   mkdir -p "$target"
   cp -i ${datadir}/* ${target} 
 else
  echo " * '$datadir' not found"
 fi
}


clear
echo
echo "=== MyMediathek Deinstallieren ==="
echo
myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)

if [ "$EUID" -ne 0 ]; then
  if [[ ! ${myUserGroups} =~ "sudo" ]]; then
    printf "   Es konnte nicht festgestellt werden ob Benutzer '${myUserName}' 'sudo' Rechte hat.\n   Ohne sie kann es zu Fehlern beim Ausführen kommen\n\n"
    while true; do
      read -n1 -r -p "   Soll es trotzdem versucht werden (j/n) ?" yn
      case $yn in
          [YyJj]* ) echo; break;;
          [Nn]* ) echo; echo; exit 1;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
  fi
fi

while true; do
  read -n1 -r -p "Soll myMediathek wirklich entfernt werden (j/n) ? " yn
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
myUser=`stat -c "%U" $0`
myGroup=`stat -c "%G" $0`

removeUserGroup=0
while true; do
  read -n1 -r -p "Soll auch der angelegte Benutzer '${myUser}' gelöscht werden [empfohlen] (j/n) ? " yn
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


while true; do
  read -n1 -r -p "Soll das Datenverzeichnis gesichert werden (j/n) ? " yn
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

serviceFiles=(`find ${myInstallPath}/scripts/ -maxdepth 1 -type f -name *.service`)
if [[ ${#serviceFiles[@]} > 0 ]]; then
  k=0
  for item in "${serviceFiles[@]}"; do
    serviceName=$(basename -- "$item")
    sudo systemctl stop ${serviceName} >/dev/null 2>&1
    sudo systemctl disable ${serviceName} >/dev/null 2>&1
    printf " * Service %-20s deaktiviert\n" $((++k)) ${serviceName}
  done
else
  printf " * Kein Service konfiguriert, nichts zu tun\n"
fi

echo " * Kontollprogramm 'mymediathek' entfernt"
sudo rm "/usr/bin/mymediathek"
echo " * lösche Verzeichnis ${myInstallPath}"
sudo rm -R ${myInstallPath}

if [[ ${removeUserGroup} == 1 ]]; then
  echo " * Benutzer '${myUser}' gelöscht "
  sudo userdel ${myUser}
fi

echo
echo .. FERTIG
echo

