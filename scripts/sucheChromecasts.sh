#!/usr/bin/env bash
#
# (c) 2025 Klaus Wich

# get base directory
basedir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

#activate python environment
source "${basedir}/../.venv/bin/activate"

#start server
python3 "${basedir}/support/searchChromecasts.py"
