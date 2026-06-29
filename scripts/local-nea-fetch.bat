@echo off
REM local-nea-fetch.bat — corre el fetch de Entre Surcos/Rosgan desde tu IP de Corrientes
REM y commitea remates-local-nea.json. Pensado para Windows Task Scheduler.
REM
REM Registrar (correr UNA vez en PowerShell, dos veces al día 08:30 y 13:30):
REM   schtasks /Create /TN "consignatarias-nea-fetch" /TR "C:\Users\Usuario\consignatarias\scripts\local-nea-fetch.bat" /SC DAILY /ST 08:30 /F
REM   schtasks /Create /TN "consignatarias-nea-fetch-pm" /TR "C:\Users\Usuario\consignatarias\scripts\local-nea-fetch.bat" /SC DAILY /ST 13:30 /F
REM Quitar:   schtasks /Delete /TN "consignatarias-nea-fetch" /F

cd /d C:\Users\Usuario\consignatarias
node scripts\local-nea-fetch.mjs >> "%TEMP%\consignatarias-nea-fetch.log" 2>&1
