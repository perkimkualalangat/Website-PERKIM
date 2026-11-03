@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem ---------------------------------------------------------------
rem  PERKIM Kuala Langat - pelayan pralihat tempatan
rem  Guna:  start.bat            (port 8081, buka pelayar)
rem         start.bat 8090       (port lain)
rem         start.bat --no-open  (jangan buka pelayar)
rem ---------------------------------------------------------------

set "PORT=8081"
set "OPEN=1"

:parse
if "%~1"=="" goto run
if /i "%~1"=="--no-open" goto setnopen
set "PORT=%~1"
shift
goto parse

:setnopen
set "OPEN=0"
shift
goto parse

:run
set "URL=http://localhost:%PORT%"

echo.
echo   ==========================================
echo    PERKIM Kuala Langat - pralihat tempatan
echo   ==========================================
echo    Folder : %CD%
echo    URL    : %URL%
echo    Henti  : Ctrl+C
echo.

set "PYTHON_CMD="
where py >nul 2>nul
if not errorlevel 1 set "PYTHON_CMD=py"
if not defined PYTHON_CMD (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON_CMD=python"
)

if defined PYTHON_CMD (
  echo   Menjana indeks aktiviti daripada folder program...
  %PYTHON_CMD% "tools\bina_aktiviti.py"
  if errorlevel 1 (
    echo.
    echo   Ralat: data aktiviti tidak dijana. Betulkan mesej di atas dahulu.
    pause
    exit /b 1
  )
) else (
  echo   Amaran: Python tiada; guna data\aktiviti.json sedia ada.
)
echo.

if "%OPEN%"=="1" start "" "%URL%"

where node >nul 2>nul
if not errorlevel 1 (
  node "tools\serve.mjs" %PORT%
  goto done
)

where py >nul 2>nul
if not errorlevel 1 (
  echo   Nota: Node.js tiada, guna Python.
  py -m http.server %PORT%
  goto done
)

where python >nul 2>nul
if not errorlevel 1 (
  echo   Nota: Node.js tiada, guna Python.
  python -m http.server %PORT%
  goto done
)

echo   Ralat: Node.js atau Python tidak dijumpai.
echo   Pasang Node.js daripada https://nodejs.org/ dan jalankan semula.
echo.
pause
exit /b 1

:done
echo.
echo   Pelayan dihentikan.
pause
