#!/usr/bin/env bash
# MyMediathek Vx.x
# (c) 2022-2023 Klaus Wich
#
# Remove MyMediathek  service
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

clear
echo
echo "=== MyMediathek System Service löschen ==="

myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)
if [ "$EUID" -ne 0 ]; then
  if [[ ! ${myUserGroups} =~ "sudo" ]]; then
    printf "\n   Es konnte nicht festgestellt werden ob Benutzer '${myUserName}' 'sudo' Rechte hat.\n   Ohne sie kann es zu Fehlern beim Ausführen kommen.\n\n"
    while true; do
      read -n1 -r -p "   Soll es trotzdem versucht werden (j/n) ? " yn
      case $yn in
          [YyJj]* ) echo; break;;
          [Nn]* ) echo; echo; exit 1;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
  fi
fi


echo
echo  Schritt: Service Namen bestimmen
scriptDir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
myInstallPath="$(dirname "$scriptDir")"
myUser=`stat -c "%U" $0`
myGroup=`stat -c "%G" $0`

serviceFiles=(`find ${scriptDir} -maxdepth 1 -type f -name *.service`)
if [[ ${#serviceFiles[@]} > 0 ]]; then
  if [[ ${#serviceFiles[@]} > 1 ]]; then
    echo " * ${#serviceFiles[@]} Services gefunden:"
    k=0
    for item in "${serviceFiles[@]}"; do
      filename=$(basename -- "$item")
      filename="${filename%.*}"
      state=`systemctl is-active ${filename}`
      printf "   %d.) %-20s : ${state}\n" $((++k)) ${filename}
    done
    maxidx=${#serviceFiles[@]}
    while true; do
      read -n1 -p "   Bitte Nummer des zu löschenden Services angeben (1-$maxidx) oder 0 für Abbruch: " nb
      if  [[ $nb == "0" ]]; then
        printf "\n\n   => Vom Benutzer beendetr\n"
        exit 0
      fi
      if [[ $nb =~ ^[0-9]+$ ]]; then
        idx=$((--nb))
        #printf "\n   SelectedII >$idx<\n"
        if [[ $idx < $maxidx ]]; then
           printf "\n   SelectedII >$idx<\n"
           serviceName=${serviceFiles[$idx]}
           break;
        else
          printf "\n   Ungültige Nummer\n";
        fi
      else
         printf "\n   Bitte gültige Nummer eingeben\n" >&2;
      fi
    done
    echo
  else
    serviceName=${serviceFiles[0]}
  fi
else
  printf "=> Keinen Service gefunden, FERTIG\n"
  exit 0
fi

serviceFile=${serviceName}
serviceName=$(basename -- "$serviceFile")

printf " * Service Name  : $serviceName
 * Service Datei : $serviceFile\n\n";

while true; do
  read -n1 -p "   Bitte die Entferung von Service '${serviceName}' bestätigen (j/n) ? " yn
  case $yn in
      [YyJj]* ) break;;
      [Nn]* ) printf "\n\n => FERTIG, Vom Benutzer beendetr\n"; exit;;
      * ) echo "   Bitte ja oder nein eingeben";;
  esac
done

printf "\n\nService wird gelöscht\n * Stop des Services '${serviceName}'\n"
sudo systemctl stop ${serviceName}  >/dev/null 2>&1
echo " * Service wird deaktiviert '${serviceName}'"
sudo systemctl disable ${serviceName} >/dev/null 2>&1
echo " * Service Datei wird gelöscht "
sudo rm ${serviceFile}


echo .. Fertig
