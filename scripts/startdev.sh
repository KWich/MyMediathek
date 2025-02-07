#!/usr/bin/env bash
#
# (c) 2022-2024 Klaus Wich

# get base directory
basedir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
basename="$(basename "$basedir")"
if [[ ${basename} == "scripts" ]]; then
  basedir="$(dirname "$basedir")"
  cd ${basedir}
fi

# check environment
if [[ ! -d "${basedir}/.venv" ]]; then
  printf " - Python Environment ${basedir}/.venv does not exist\n   => Trying to create it\n"
  python3 -m venv .venv
  printf "      Done\n"
  source "${basedir}/.venv/bin/activate"
  printf " - Python Module werden installiert"
  pip install -r "${basedir}/scripts/python.requirements"
  #exit 1
else
  #activate python environment
  source "${basedir}/.venv/bin/activate"
fi

# set environment variables for database:
export BM_DBFILE=$basedir/data/bookmarks.db

#start server
python3 "${basedir}/src/main.py"

deactivate
