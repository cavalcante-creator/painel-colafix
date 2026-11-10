@echo off
cd /d "%~dp0"
schtasks /Create /F /SC HOURLY /MO 1 /TN "Robo Face ID Entrada" /TR "\"%~dp0rodar.bat\""
echo.
echo Pronto: o robo da entrada da fabrica vai rodar de hora em hora.
pause
