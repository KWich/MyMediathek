#!/usr/bin/env bash
#
# (c) 2022-2023 Klaus Wich
#
# Setup as service
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

readonly defaultname="mymediathek"

clear
echo
echo "=== Installiere System Service ==="
echo
echo  Step: Check and setup prerequisites
myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)
if [ "$EUID" -ne 0 ]; then
  if [[ ! ${myUserGroups} =~ "sudo" ]]; then
    printf "\n Es konnte nicht festgestellt werden ob Benutzer '%s' 'sudo' Rechte hat.\n Ohne sie kann es zu Fehlern beim Ausführen kommen\n\n" "${myUserName}"
    while true; do
      read -n1 -r -p " Soll es trotzdem versucht werden (j/n) ? " yn
      case $yn in
          [YyJj]* ) echo; break;;
          [Nn]* ) echo; echo; exit 1;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
  fi
fi

echo
read -r -p " Servicenamen eingeben oder ENTER drücken für default '$defaultname': " myServiceName
if [ -z "$myServiceName" ]; then
  myServiceName="$defaultname"
fi
myServiceFileName="${myServiceName}.service"

scriptDir=$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)
myInstallPath="$(dirname "$scriptDir")"
myUser=$(stat -c "%U" "$0")
myGroup=$(stat -c "%G" "$0")
serviceFile=${scriptDir}/${myServiceFileName}
echo
if [ -f "${serviceFile}" ]; then
  printf " * FEHLER: Service mit dem Namen '%s' existiert bereits\n   => Serviceinstallation neu starten und anderen Namen angeben\n" "${myServiceFileName}"
  exit 2
fi

echo " * Installationsverzeichnis: $myInstallPath
 * Benutzer                : $myUser
 * Gruppe                  : $myGroup
 * Script Verzeichnis      : $scriptDir
 * Service Datei           : $serviceFile
";

while true; do
  read -r -n1 -p " Sollen diese Einstellungen benutzt werden (j/n) ? " yn
  case $yn in
      [YyJj]* ) break;;
      [Nn]* ) printf "\n\n   => Fertig, durch Benutzer beeendet"; exit;;
      * ) echo "   Bitte ja oder nein eingeben.";;
  esac
done

printf "\n\n * Prüfe ob Python Environment vorhanden ist ... "
if [ -f "$myInstallPath/env/pyvenv.cfg" ]; then
  echo ": Ok"
else
  echo ": Fehler !! Python Environment wurde nicht gefunden !!"
  exit 2
fi

echo -n " * Prüfe ob 'systemd' Verzeichnis existiert ... "
if [ -d "/etc/systemd/system" ]; then
  echo ": Ok"
else
  echo ": Fehler, Systemd Verzeichnis wurde nicht gefunden => Bitte Service von Hand konfigurieren"
  exit 2
fi

printf "\nSchritt: Service anlegen\n * Servicedatei erstellen "
sudo touch "${serviceFile}"
sudo chmod a+w "${serviceFile}"
sudo cat << EOF > "${serviceFile}"
[Unit]
Description=My Mediathek Server
After=network.target

[Service]
Type=idle
User=${myUser}
Group=${myGroup}
WorkingDirectory=${myInstallPath}
ExecStart=${myInstallPath}/env/bin/python3 server/main.py
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
sudo chown "${myUser}":"${myGroup}" "${serviceFile}"
sudo chmod 755 "${serviceFile}"
echo ": Ok"

printf " * Service link erstellen"
sudo ln -s "${serviceFile}" /etc/systemd/system/"${myServiceFileName}" &>/dev/null
printf ": ok\n\n"

while true; do
  read -r -n1 -p "   Soll der Service jetzt aktiviert und gestartet werden (j/n) ? " yn
  case $yn in
    [YyJj]* )
      printf "\n * Service wird aktiviert\n"
      ERROR=$(sudo systemctl enable "${myServiceFileName}" 2>&1 > /dev/null)
      #if [[ ! -z $ERROR ]]; then
      #  printf "\n Aktivieren des Services ist fehlgeschlagen!! => Ende
      #        \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n", "${ERROR}"
      #  exit 2
      #fi
      echo " * Service wird gestartet"
      ERROR=$(sudo systemctl start "${myServiceFileName}" 2>&1 > /dev/null)
      if [[ -n $ERROR ]]; then
        printf "\n Start des Services ist fehlgeschlagen!!
              \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n", "${ERROR}"
        exit 2
      fi
      break
      ;;
    [Nn]* )
      echo
      break
      ;;
    * )
      echo "   Bitte ja oder nein angeben."
      ;;
  esac
done

echo -n " * Service Status: "
systemctl is-active "${myServiceFileName}"

printf "\n... Fertig\n"
