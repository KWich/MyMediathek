@echo off
:: (c) 2022-2023 Klaus Wich
echo Starte MyMediathek Vx.x

cmd /c python --version  >nul 2>&1
if %errorlevel% equ 0 (
  echo - Python ist installiert
) else (
  echo Python ist nicht installiert, kann nicht weitermachen
  goto end
)

cmd /c pip3 --version  >nul 2>&1
if %errorlevel% equ 0 (
  echo - PIP ist installiert
) else (
  echo PIP ist nicht installiert, kann nicht weitermachen
  goto end
)

rem get base directory
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
  echo - Python Environment wird erstellt ...
  python -m venv env
  echo - Environment wird aktiviert
  call %basedir%\env\Scripts\activate.bat
  echo    fertig

  echo - Python Module werden installiert ...
  pip install -r %basedir%\scripts\python.requirements
  echo    fertig

  echo - Environment deaktivieren
  deactivate

) else (
  echo - Python environment existiert
)

echo - Environment wird aktiviert
call %basedir%\env\Scripts\activate.bat

echo - Server wird gestartet
python %basedir%\src\main.py

deactivate

:end
