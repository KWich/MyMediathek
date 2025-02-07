@echo off
goto :init


:usage
  echo Starte MyMediathek Vx.x - Optionen
  echo.
  echo   %__BAT_NAME% [flags]
  echo.
  echo.  /?, -h, --help           Diese Hilfe Anzeigen
  echo.  /v, -v, --verbose        Detailierte Ausgabe anzeigen
  goto :eof


:init
  cls
  set "__BAT_NAME=%~nx0"
  set "OptVerbose="


:parse
  if "%~1"=="" goto :main

  if /i "%~1"=="/?"         call :usage "%~2" & goto :end
  if /i "%~1"=="-?"         call :usage "%~2" & goto :end
  if /i "%~1"=="-h"         call :usage "%~2" & goto :end
  if /i "%~1"=="--help"     call :usage "%~2" & goto :end

  if /i "%~1"=="/v"         set "OptVerbose=yes"  & shift & goto :parse
  if /i "%~1"=="-v"         set "OptVerbose=yes"  & shift & goto :parse
  if /i "%~1"=="--verbose"  set "OptVerbose=yes"  & shift & goto :parse

  shift
  goto :parse


:main

  echo Starte MyMediathek Vx.x
  echo.

  if defined OptVerbose (
    echo - erweiterte Ausgabe ist eingeschaltet
  )

  cmd /c python --version  >nul 2>&1
  if %errorlevel% equ 0 (
    echo - Python ist installiert
  ) else (
    echo.
    echo Fehler: Python3 ist nicht installiert, bzw. nicht im Pfad vorhanden, kann nicht weitermachen.
    echo.        Bitte zuerst Python3 und PIP3 installieren und dann erneut starten.
    goto end
  )

  set mydir=%~dp0
  if "%MYDIR:~-1%" == "\" set "MYDIR1=%MYDIR:~0,-1%"
  for %%f in ("%MYDIR1%") do set "myfolder=%%~nxf"
  if "%myfolder%" == "scripts" (
    for %%I in ("%~dp0.") do for %%J in ("%%~dpI.") do set basedir=%%~dpnxJ
  ) else (
   set basedir=%mydir1%
  )
  cd %basedir%

  IF NOT EXIST %basedir%\env\pyvenv.cfg (
    cmd /c pip3 --version  >nul 2>&1
    if %errorlevel% equ 0 (
      echo - PIP ist installiert
    ) else (
      echo.
      echo Fehler: PIP3 ist nicht installiert bzw. nicht im Pfad vorhanden, kann nicht weitermachen
      echo.        Bitte zuerst PIP3 installieren und dann erneut starten.
      goto end
    )
    echo - Python Umgebung wird erstellt ...
    python -m venv env
    echo   ...fertig
    echo - Python Umgebung wird aktiviert
    call %basedir%\env\Scripts\activate.bat
    echo - Python Module werden installiert ...
    if defined OptVerbose (
      pip install -r %basedir%\scripts\python.requirements
    ) else (
      echo   das dauert etwas!!
      pip install -r %basedir%\scripts\python.requirements  >nul 2>&1
    )
    echo - Python Module sind installiert

  ) else (
    echo - Python Umgebung wird aktiviert
    call %basedir%\env\Scripts\activate.bat
  )

  echo - Server wird gestartet
  python %basedir%\src\main.py

  deactivate


:end
  set "OptVerbose="
  set "__BAT_NAME="
  exit /B
