#!/usr/bin/env bash
# 
# (c) 2022-2023 Klaus Wich

echo " Starte MyMediathek Vx.x:"

# get base directory
basedir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

#activate python environment
source "${basedir}/env/bin/activate"

# set environment variables for database:
export BM_DBFILE=$basedir/data/bookmarks.db

#start server
python3 "${basedir}/server/main.py"
