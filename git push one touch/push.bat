@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

where node >nul 2>nul || (
  echo Node.js tidak dijumpai. Pasang dari https://nodejs.org
  pause
  exit /b 1
)

where git >nul 2>nul || (
  echo Git tidak dijumpai. Pasang dari https://git-scm.com
  pause
  exit /b 1
)

node push.js %*
set "EXITCODE=%ERRORLEVEL%"
echo.
if %EXITCODE% neq 0 echo   Push tidak berjaya. Baca mesej di atas.
if /i not "%PUSH_NO_PAUSE%"=="1" pause
exit /b %EXITCODE%