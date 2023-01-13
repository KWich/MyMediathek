#!/usr/bin/env bash
#
# (c) 2022-2023 Klaus Wich
#
# Install on Linux systems
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license
#
# Usage:  install.sh [--force]
#
# --force: Ask to continue in case of errors
#

readonly defaultPort=8081
readonly defaultpath="/opt/mymediathek"
readonly defaultscript="mymediathek"

clear
printf "\n=== Installation von %s ===\n\n" "MyMediathek Vx.x)"

checkAptPackage() {
  printf " * Prüfe ob Paket %s installiert ist: ", "$1"
  if [ "$(dpkg-query -W -f='${Status}' "$1" 2>/dev/null | grep -c "ok installed")" -eq 0 ]; then
    echo "nicht vorhanden => Installation von $1"
    sudo apt install "$1";
  else
    echo "Ok"
  fi
}

checkZypperPackage() {
  printf " * Prüfe ob Paket %s installiert ist: ", "$1"
  if [ "$(rpm -q "$1" 2>/dev/null | grep -c "$1-")" -eq 0 ]; then
    echo "nicht vorhanden => Installation von $1"
    sudo zypper install "$1";
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
currentDir=$(pwd)

#Preparation:
if [[ "$1" == "--force" ]]; then
  force=1
else
  force=0
fi


myUserName=${SUDO_USER:-$USER}
myUserGroups=$(groups)
if [ "$EUID" -ne 0 ]; then
  printf " Schritt: Benutzerrechte prüfen\n\n"
  echo -n " * prüfe 'sudo' Rechte für Benutzer ${myUserName} ... "
  if [[ ${myUserGroups} =~ "sudo" ]]; then
    echo " Ok"
  else
    printf "\n\n   Es konnte nicht festgestellt werden ob Benutzer '%s' 'sudo' Rechte hat.\n   Ohne sie kann die Installation kann nicht ausgeführt werden\n\n" "${myUserName}"
    while true; do
      read -n1 -r -p "   Soll die Installation trotzdem versucht werden (j/n) ? " yn
      case $yn in
          [YyJj]* ) break;;
          [Nn]* ) echo; echo; exit 1;;
          * ) echo "   Bitte ja oder nein angeben.";;
      esac
    done
    echo
  fi
fi


printf "\n Schritt: Einstellungen erfragen\n\n"

read -r -p " => Installationsverzeichnis eingeben [$defaultpath]: " myInstallPath
if [ -z "$myInstallPath" ]; then
  myInstallPath="$defaultpath"
fi

# - prompt port:
read -r -p " => Server Portnummer angeben [${defaultPort}]: " myServicePort
if [ -z "$myServicePort" ]; then
  myServicePort=${defaultPort}
fi

# - prompt for user
if [ -x "$(command -v apt)" ]; then
  defaultServiceUser="mmservice"
else
  defaultServiceUser="${myUserName}"
fi

read -r -p " => Benutzername unter dem die Anwendung laufen soll angeben [${defaultServiceUser}]: " myServiceUser
if [ -z "$myServiceUser" ]; then
  myServiceUser="${defaultServiceUser}"
fi

echo
echo " * Installationsverzeichnis : $myInstallPath"
echo " * Server Portnummer        : $myServicePort"
echo " * Benutzername             : $myServiceUser"
echo
while true; do
  read -n1 -r -p " => Sollen diese Werte benutzt werden (j/n) ? " yn
  case $yn in
      [YyJj]* ) break;;
      [Nn]* ) echo; echo; exit;;
      * ) echo "   Bitte ja oder nein angeben.";;
  esac
done

printf "\n\n Schritt: Voraussetzungen überprüfen\n\n"

checkIfPortIsAvailable "${myServicePort}"
if [[ $? == 1 ]]; then
  echo " * Server Port $myServicePort ist verfügbar : Ok"
else
  echo "   !! Server Port $myServicePort ist in Benutzung !! => Bitte Installation neu starten und anderen Port angeben."
  exit 1
fi

if [ -x "$(command -v apt)" ]; then
  echo " * Paket Manager 'apt' gefunden"
  checkAptPackage python3
  checkAptPackage python3-pip
  checkAptPackage python3-venv
elif [ -x "$(command -v zypper)" ]; then
  echo " * Paket Manager 'zypper' gefunden"
  checkZypperPackage python3
  checkZypperPackage python3-pip
  checkZypperPackage python3-virtualenv
  checkZypperPackage python3-devel
else
  echo " * Keinen bekannten Paket Manager (apt oder zypper) gefunden => fehlende Pakete werden nicht automatisch installiert."
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


printf "\n Schritt: Python Umgebung anlegen\n"

cd "$myInstallPath" || { echo " !! Kann Verzeichnis ${myInstallPath} nicht als Arbeitsverzeichnis setzen => Installation wird abgebrochen"; exit 2; }

echo " * Aktuelles Verzeichnis ist Installationsverzeichnis $(pwd): Ok"
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
          \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n", "${ERROR}"
    exit 2
  fi
fi

echo " * Python Umgebung wird aktiviert : Ok"
source "${myInstallPath}"/env/bin/activate
echo -n " * Notwendige Python Komponenten werden installiert ..."
ERROR=$(pip3 install -q --disable-pip-version-check -r "$currentDir"/scripts/python.requirements 2>&1 > /dev/null)
if [[ -z "${ERROR}" ]]; then
  echo " Fertig"
else
  if [[ ${force} == 1 ]]; then
    printf "\n Fehler bei der Installation der Pythonkomponenten:
            \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n", "${ERROR}"
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
            \nFehlerdetails:\n>>>>>>>>>>>>>>\n%s\n<<<<<<<<<<<<\n\n", "${ERROR}"
    exit 3
  fi
fi

echo " * Python Umgebung wird deaktiviert: Ok"
deactivate


printf "\n Schritt: Server installieren\n"

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
sudo ln -sf  "${myInstallPath}"/scripts/$defaultscript.sh /usr/bin/$defaultscript
echo " Fertig"

# end:
echo

echo " * Start des Servers im Vordergrund mit: $defaultscript run"
echo " * Anzeige aller Kommando Optionen mit:  $defaultscript"
echo
echo .. INSTALLATION BEENDET
echo

