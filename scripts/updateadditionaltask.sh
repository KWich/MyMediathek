#!/usr/bin/env bash
#
# (c) 2022-2025 Klaus Wich
#
# Additional update task(s)
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

echo
echo "     - Installationsverzeichnis     : $myInstallPath"
echo "     - Benutzer                     : $myUser"

if [[ -d "${myInstallPath}/server/api" ]]; then
  echo "   - Remove Old API directory"
  sudo rm -r ${myInstallPath}/server/api
fi

if [[ -d "${myInstallPath}/env" ]]; then
  echo "   - Remove Old Environment directory"
  sudo rm -r ${myInstallPath}/env
fi

envactive=0
if [[ ! -d "${myInstallPath}/.venv" ]]; then
  echo "   - Create new environment directory .venv"
  ERROR=$(python3 -m venv ${myInstallPath}/.venv 2>&1 > /dev/null)
  if [[  -z $ERROR && -f "${myInstallPath}/.venv/pyvenv.cfg" ]]; then
    echo " Fertig"
  else
    printf "\n Anlegen der Umgebung ist fehlgeschlagen!! => Installation wird abgebrochen, ist Python 'venv' installiert?
            \nFehlerdetails:\n>>>>>>>>>>>>>>\n${ERROR}\n<<<<<<<<<<<<\n\n"
    exit 2
  fi
  echo "   - Python Umgebung wird aktiviert : Ok"
  source "${myInstallPath}"/.venv/bin/activate
  envactive=1
  echo -n "   - Notwendige Python Komponenten werden installiert ..."
  ERROR=$(pip3 install -q --disable-pip-version-check -r ${myInstallPath}/scripts/python.requirements 2>&1 > /dev/null)
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
fi

# update DB if necessary
if [ ${envactive} = 0 ]; then
  echo "   - Python Umgebung wird aktiviert : Ok"
  source "${myInstallPath}"/.venv/bin/activate
  envactive=1
fi
# start update of DB:
sudo python3 "${myInstallPath}/scripts/support/updateDatabase.py" "${myInstallPath}"
