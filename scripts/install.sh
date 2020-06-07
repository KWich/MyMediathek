#!/usr/bin/env bash
# MyMediathek Vx.x
# (c) 2022-2023 Klaus Wich
#
# Install MyMediathek on Linux systems
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license
#
# Usage:  install.sh [--force]
#
# --force: Ask to continue in case of errors

readonly defaultPort=8081

checkInstallPackage() {
  printf " * prüfe ob Paket $1 installiert ist: "
  if [ $(dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -c "ok installed") -eq 0 ]; then
    echo "nicht vorhanden => Installation von $1"
    sudo apt install "$1";
  else
    echo "Ok"
  fi
}

checkIfPortIsAvailable() {
  available=1
  out=$(ss -tulpn | grep LISTEN | grep "$1")
  if [[ ${out} =~ "command not found" ]]; then
    # e.g. raspberry pi
    out=$(netstat -tulpn | grep LISTEN | grep "$1")
  fi
  if [[ ${out} =~ $1 ]]; then
    available=0
  fi
  return $available
}

weiter() {
  read -n1 -r -p "   Weiter (j/n) ? " yn
  while true; do
    case $yn in
      [YyJj]* ) echo; break;;
      [Nn]* ) echo; echo; exit 1;;
    esac
  done
}

# === MAIN ===
whichapt=`which apt`
if [ "$whichapt" == "" ]; then
 doPkgInstall=0
else
 doPkgInstall=1
fi


currentDir=$(pwd)

#Preparation:
clear
printf "\n=== Installation von MyMediathek Vx.x ===\n\n"

if [[ "$1" == "--force" ]]; then
  force=1
else
  force=0
fi


myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)
if [ "$EUID" -ne 0 ]; then
  echo  Schritt: Benutzerrechte prüfen
  echo -n " * prüfe 'sudo' Rechte für Benutzer ${myUserName} ... "
  if [[ ${myUserGroups} =~ "sudo" ]]; then
    echo " Ok"
  else
    printf "\n\n   Es konnte nicht festgestellt werden ob Benutzer '${myUserName}' 'sudo' Rechte hat.\n   Ohne sie kann die Installation kann nicht ausgeführt werden\n\n"
    while true; do
      read -n1 -r -p "   Soll die Installation trotzdem versucht werden (j/n) ? " yn
      case $yn in
          [YyJj]* ) break;;
          [Nn]* ) echo; echo; exit 1;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
  fi
fi


printf "\n\nSchritt: Einstellungen erfragen\n\n"

read -r -p " => Installationsverzeichnis eingeben [/opt/mymediathek]: " myInstallPath
if [ -z "$myInstallPath" ]; then
  myInstallPath="/opt/mymediathek"
fi

# - prompt port:
read -r -p " => Server Portnummer angeben [${defaultPort}]: " myServicePort
if [ -z "$myServicePort" ]; then
  myServicePort=${defaultPort}
fi

# - prompt for user
read -r -p " => Benutzername unter dem die Anwendung laufen soll angeben [mmservice]: " myServiceUser
if [ -z "$myServiceUser" ]; then
  myServiceUser="mmservice"
fi

echo
echo " * Installationsverzeichnis : $myInstallPath"
echo " * Server Portnummer        : $myServicePort"
echo " * Benutzername             : $myServiceUser"

while true; do
  read -n1 -r -p "   Sollen diese Werte benutzt werden (j/n) ? " yn
  case $yn in
      [YyJj]* ) break;;
      [Nn]* ) echo; echo; exit;;
      * ) echo "   Bitte ja oder nein angeben.";;
  esac
done

echo
echo
echo  Schritt: Voraussetzungen überprüfen

checkIfPortIsAvailable "${myServicePort}"
if [[ $? == 1 ]]; then
  echo " * Server Port $myServicePort ist verfügbar : Ok"
else
  echo "   !! Server Port $myServicePort ist in Benutzung !! => Bitte Installation neu starten und anderen Port angeben."
  exit 1
fi

if [ ${doPkgInstall} == 1 ]; then
  checkInstallPackage python3
  checkInstallPackage python3-pip
  checkInstallPackage python3-venv
else
  echo " * Kein 'apt' Paket Manager => Pakete werden nicht automatisch installiert."
fi

# check if python is installed:
myPython=$(python3 --version 2>/dev/null)
echo -n " * Prüfe ob Python3 vorhanden ist ... "
if [[ ${myPython} =~ "Python 3" ]]; then
  echo " Ok"
else
  printf "\n\n   !! Python3 ist nicht installiert !! => Installation kann nicht ausgeführt werden.\n\n"
  exit 1
fi

echo -n " * Prüfe ob 'pip3' vorhanden ist ... "
myPip=$(pip3 --version 2>/dev/null)
if [[ ${myPip} =~ "pip " ]]; then
  echo " Ok"
else
  printf "\n\n   !! pip3 ist nicht installiert !! => Installation kann nicht ausgeführt werden.\n\n"
  exit 1
fi

#  check if path exists and is writable or create path
if [ -d "$myInstallPath" ]; then
  echo " * Installationsverzeichnis $myInstallPath ist vorhanden: Ok"
else
  sudo mkdir -p "$myInstallPath";
  echo " * Installationsverzeichnis $myInstallPath wurde angelegt: Ok"
fi

if [ -w "$myInstallPath" ]; then
  echo " * Installationsverzeichnisy $myInstallPath ist schreibbar: Ok"
else
  sudo chmod a+w "$myInstallPath";
  echo " * Installationsverzeichnis $myInstallPath wurde schreibbar gemacht"
fi

# - create user:
if id "${myServiceUser}" &>/dev/null; then
  echo " * Benutzer $myServiceUser ist angelegt: Ok"
else
  sudo useradd -r -U "${myServiceUser}"
  sudo usermod -L "${myServiceUser}"
  if id "${myServiceUser}" &>/dev/null; then
    echo " * Benutzer $myServiceUser wurde angelegt"
  fi
fi

bg=$(groups "${myServiceUser}")
bmgroups=${bg#*:}
read -ra garr <<< "$bmgroups"
myServiceGroup=${garr[0]}
echo " * Benutzer ${myServiceUser} gehört zu der Gruppe ${myServiceGroup}."

echo
echo  Schritt: Python Umgebung anlegen

cd "$myInstallPath" 
if [[ $(pwd) != "$myInstallPath" ]]; then
  echo " !! Kann Verzeichnis ${myInstallPath} nicht als Arbeitsverzeichnis setzen => Installation wird abgebrochen"
  cd "$currentDir" || exit
  exit 2
fi
echo " * Aktuelles Verzeichnis ist Installationsverzeichnis $(pwd): Ok"

if [ -f "$myInstallPath/env/pyvenv.cfg" ]; then
  echo " * Python Umgebung existiert: Ok"
else
  echo -n " * Python Umgebung wird angelegt ..."
  ERROR=$(python3 -m venv env 2>&1 > /dev/null)
  if [[  -z $ERROR && -f "$myInstallPath/env/pyvenv.cfg" ]]; then
    echo " Fertig"
  else
    printf "\n Anlegen der Umgebung ist fehlgeschlagen!! => Installation wird abgebrochen, ist Python 'venv' installiert?
          \nFehlerdetails:\n>>>>>>>>>>>>>>\n${ERROR}\n<<<<<<<<<<<<\n\n"
    exit 2
  fi
fi

echo " * Python Umgebung wird aktiviert : Ok"
source "$myInstallPath"/env/bin/activate
echo -n " * Notwendige Python Komponenten werden installiert ..."
ERROR=$(pip3 install -q -r "$currentDir"/scripts/python.requirements 2>&1 > /dev/null)
if [[ -z "${ERROR}" ]]; then
  echo " Fertig"
else
  if [[ ${force} == 1 ]]; then
    printf "\n Fehler bei der Installation der Pythonkomponenten:
            \nFehlerdetails:\n>>>>>>>>>>>>>>\n${ERROR}\n<<<<<<<<<<<<\n\n"
    while true; do
      read -n1 -r -p "   Soll die Installation trotzdem fortgesetzt werden (j/n) ? " yn
      case $yn in
          [YyJj]* ) echo; break;;
          [Nn]* ) echo; echo; exit 3;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
  else
    printf "\n Installation fehlgeschlagen!! => Installation wird abgebrochen, sind die Voraussetzungen vorhanden ?
            \nFehlerdetails:\n>>>>>>>>>>>>>>\n${ERROR}\n<<<<<<<<<<<<\n\n"
    exit 3
  fi
fi

echo " * Python Umgebung wird deaktiviert: Ok"
deactivate


echo
echo  Schritt: Server installieren

echo -n " * kopiere Serverdateinen nach $myInstallPath ..."
sudo cp -r "$currentDir"/server/. "$myInstallPath"/server
sudo cp -r "$currentDir"/scripts/. "$myInstallPath"/scripts
sudo chmod +x "$myInstallPath"/scripts/*.sh
sudo mv "$myInstallPath"/scripts/start.sh "$myInstallPath"
sudo chmod a+x "$myInstallPath"/start.sh
echo " Fertig"

serverIniFile="${myInstallPath}/data/server.ini"
if [[ ${myServicePort} != "${defaultPort}" || -f "${serverIniFile}" ]]; then
  if [[ -f "${serverIniFile}" ]]; then
    echo -n " * Server Ini Datei ${serverIniFile} existiert => Server Port wird auf ${myServicePort} geändert"
    if grep -q "serverport=" "${serverIniFile}" ; then
      sudo sed -i "/serverport=/c serverport=${myServicePort}" "${serverIniFile}"
    else
      if grep -q "[general]" "${serverIniFile}"; then
        sudo sed -i "/\[general\]/a serverport=${myServicePort}" "${serverIniFile}"
      else
        cat << EOF | sudo tee -a "${serverIniFile}" &>/dev/null
[general]
serverport=${myServicePort}
EOF
      fi
    fi
  else
    echo -n " * Lege neue Server Ini Datei ${serverIniFile} mit Server Port ${myServicePort} an"
    sudo mkdir -p "${myInstallPath}"/data
    sudo touch "${serverIniFile}"
    sudo chmod a+w "${serverIniFile}"
    cat << EOF | sudo tee "${serverIniFile}" &>/dev/null
[general]
serverport=${myServicePort}
EOF
  fi
  echo ": Ok"
fi

echo -n " * Dateien dem Benutzer ${myServiceUser} und der Gruppe ${myServiceGroup} zuweisen ..."
sudo chown -R "${myServiceUser}":"${myServiceGroup}" "$myInstallPath"
echo " Fertig"

echo -n " * Symbolischen Link zum Kontroll Script anlegen ..."
sudo ln -sf  "${myInstallPath}"/scripts/mymediathek.sh /usr/bin/mymediathek
echo " Fertig"

# end:
echo
echo .. INSTALLATION BEENDET
echo 
echo Start des Servers mit 'mymediathek run' oder nur 'mymediathek' für alle Optionen
echo 
