#!/usr/bin/env bash
#
# (c) 2022-2023 Klaus Wich
#
# Additional update task(s)
#
# This file is copyright under the latest version of the EUPL.
# Please see LICENSE file for your rights under this license

echo
echo "   - Start cleanup:"
echo "   - Installationsverzeichnis     : $myInstallPath"
echo "   - Benutzer                     : $myUser"

if [[ -d "${myInstallPath}/server/api/static/addon" ]]; then
  echo "   - Remove Addon directory"
  sudo rm -r ${myInstallPath}/server/api/static/addon
fi

echo "     Cleanup done"
