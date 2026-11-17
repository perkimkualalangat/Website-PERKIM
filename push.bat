@echo off
rem ---------------------------------------------------------------
rem  PERKIM Kuala Langat - push satu sentuhan ke GitHub
rem  Guna:  push.bat                        (mesej commit automatik)
rem         push.bat "Betulkan menu"       (mesej sendiri)
rem         push.bat --dry-run             (semak sahaja, tiada push)
rem         push.bat --verify              (uji token sahaja)
rem  Skrip sebenar: "git push one touch\push.js"
rem ---------------------------------------------------------------
setlocal
cd /d "%~dp0"
call "%~dp0git push one touch\push.bat" %*
exit /b %ERRORLEVEL%
